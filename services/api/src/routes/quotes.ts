/**
 * Quote Routes
 * Placeholder for quote-related endpoints
 */

import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response) => {
  res.json({ message: 'Quotes endpoint - coming soon', quotes: [] });
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

router.post('/', async (req: AuthRequest, res: Response) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

export { router as quotesRouter };
