/**
 * Subscription tier middleware
 * Checks if user has required subscription tier for feature access
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export type SubscriptionTier = 'FREE' | 'PROFESSIONAL' | 'BUSINESS' | 'ENTERPRISE';

const tierHierarchy: Record<SubscriptionTier, number> = {
  FREE: 0,
  PROFESSIONAL: 1,
  BUSINESS: 2,
  ENTERPRISE: 3,
};

/**
 * Middleware to require minimum subscription tier
 */
export function requireTier(minTier: SubscriptionTier) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userTier = req.user.subscriptionTier as SubscriptionTier;
    const userTierLevel = tierHierarchy[userTier] || 0;
    const requiredTierLevel = tierHierarchy[minTier] || 0;

    if (userTierLevel < requiredTierLevel) {
      res.status(403).json({
        error: 'Subscription upgrade required',
        requiredTier: minTier,
        currentTier: userTier,
        upgradeUrl: '/pricing',
      });
      return;
    }

    next();
  };
}

/**
 * Check if user has access to feature based on tier
 */
export function hasTierAccess(userTier: SubscriptionTier, requiredTier: SubscriptionTier): boolean {
  const userTierLevel = tierHierarchy[userTier] || 0;
  const requiredTierLevel = tierHierarchy[requiredTier] || 0;
  return userTierLevel >= requiredTierLevel;
}
