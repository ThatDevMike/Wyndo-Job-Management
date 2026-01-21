/**
 * Subscription Routes
 * Placeholder for subscription-related endpoints
 */

import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { SubscriptionService } from '../services/subscriptionService';

const router = Router();
const subscriptionService = new SubscriptionService();

router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const limits = subscriptionService.getTierLimits(req.user.subscriptionTier);
  
  res.json({
    tier: req.user.subscriptionTier,
    limits,
  });
});

router.get('/plans', async (req: AuthRequest, res: Response) => {
  res.json({
    plans: [
      {
        id: 'FREE',
        name: 'Free',
        price: 0,
        features: ['Up to 30 customers', 'Up to 15 jobs/month', '1GB storage'],
      },
      {
        id: 'PROFESSIONAL',
        name: 'Professional',
        price: 15,
        priceYearly: 129,
        features: ['Unlimited customers', 'Unlimited jobs', '10GB storage', 'Custom branding'],
      },
      {
        id: 'BUSINESS',
        name: 'Business',
        price: 35,
        priceYearly: 299,
        features: ['5 team members included', '50GB storage', 'HMRC tax reports', 'Route optimization'],
      },
      {
        id: 'ENTERPRISE',
        name: 'Enterprise',
        price: 79,
        priceYearly: 699,
        features: ['Unlimited team members', 'Unlimited storage', 'White-label', 'API access'],
      },
    ],
  });
});

export { router as subscriptionRouter };
