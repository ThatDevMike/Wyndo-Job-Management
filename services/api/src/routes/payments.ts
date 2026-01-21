/**
 * Payment Routes
 * Placeholder for payment-related endpoints
 */

import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response) => {
  res.json({ message: 'Payments endpoint - coming soon', payments: [] });
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

export { router as paymentsRouter };
