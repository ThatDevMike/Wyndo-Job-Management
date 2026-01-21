/**
 * Error Handler Middleware
 * Centralized error handling
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Error:', err);

  // Prisma errors
  if (err.code === 'P2002') {
    res.status(409).json({
      error: 'Duplicate entry',
      field: err.meta?.target?.[0],
    });
    return;
  }

  if (err.code === 'P2025') {
    res.status(404).json({
      error: 'Record not found',
    });
    return;
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    res.status(400).json({
      error: 'Validation error',
      details: err.message,
    });
    return;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      error: 'Invalid token',
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      error: 'Token expired',
    });
    return;
  }

  // Default error
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(config.env === 'development' && { stack: err.stack }),
  });
}
