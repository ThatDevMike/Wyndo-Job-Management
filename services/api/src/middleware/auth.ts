/**
 * Authentication middleware
 * Verifies JWT tokens and attaches user to request
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../lib/prisma';

export interface AuthRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    email: string;
    subscriptionTier: string;
    teamId?: string;
    teamRole?: string;
  };
}

/**
 * Verify JWT access token
 * Attaches userId and user to request if valid
 */
export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret) as { userId: string };

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        subscriptionTier: true,
        teamId: true,
        teamRole: true,
        subscriptionStatus: true,
        deletedAt: true,
      },
    });

    if (!user || user.deletedAt) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    // Check if subscription is active (unless free tier)
    if (
      user.subscriptionTier !== 'FREE' &&
      user.subscriptionStatus !== 'ACTIVE' &&
      user.subscriptionStatus !== 'TRIAL'
    ) {
      res.status(403).json({
        error: 'Subscription required',
        subscriptionStatus: user.subscriptionStatus,
      });
      return;
    }

    // Attach user to request
    req.userId = user.id;
    req.user = {
      id: user.id,
      email: user.email,
      subscriptionTier: user.subscriptionTier,
      teamId: user.teamId || undefined,
      teamRole: user.teamRole || undefined,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    next(error);
  }
}

/**
 * Optional authentication - doesn't fail if no token
 */
export async function optionalAuthenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    await authenticate(req, res, next);
  } catch (error) {
    next();
  }
}
