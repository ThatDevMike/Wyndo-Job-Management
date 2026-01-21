/**
 * Request Logger Middleware
 * Logs all incoming requests
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (config.env === 'development') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
  }
  next();
}
