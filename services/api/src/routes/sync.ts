/**
 * Sync Routes
 * Placeholder for offline sync endpoints
 */

import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', async (req: AuthRequest, res: Response) => {
  res.json({
    message: 'Sync endpoint - coming soon',
    synced: [],
    conflicts: [],
  });
});

router.get('/status', async (req: AuthRequest, res: Response) => {
  res.json({
    lastSyncAt: null,
    pendingChanges: 0,
    status: 'ok',
  });
});

export { router as syncRouter };
