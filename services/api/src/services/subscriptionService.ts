/**
 * Subscription Service
 * Handles subscription limit checks and feature access
 */

import { config } from '../config';

type SubscriptionTier = 'FREE' | 'PROFESSIONAL' | 'BUSINESS' | 'ENTERPRISE';

export class SubscriptionService {
  /**
   * Check if user can create more customers
   */
  async checkCustomerLimit(
    tier: string,
    currentCount: number
  ): Promise<{ allowed: boolean; limit: number | null }> {
    const limits: Record<SubscriptionTier, number | null> = {
      FREE: config.subscription.freeTierLimits.maxCustomers,
      PROFESSIONAL: null,
      BUSINESS: null,
      ENTERPRISE: null,
    };

    const limit = limits[tier as SubscriptionTier] ?? null;

    if (limit === null) {
      return { allowed: true, limit: null };
    }

    return {
      allowed: currentCount < limit,
      limit,
    };
  }

  /**
   * Check if user can create more jobs this month
   */
  async checkJobLimit(
    tier: string,
    currentCount: number,
    date: Date
  ): Promise<{ allowed: boolean; limit: number | null; current: number }> {
    const limits: Record<SubscriptionTier, number | null> = {
      FREE: config.subscription.freeTierLimits.maxJobsPerMonth,
      PROFESSIONAL: null,
      BUSINESS: null,
      ENTERPRISE: null,
    };

    const limit = limits[tier as SubscriptionTier] ?? null;

    if (limit === null) {
      return { allowed: true, limit: null, current: currentCount };
    }

    return {
      allowed: currentCount < limit,
      limit,
      current: currentCount,
    };
  }

  /**
   * Get tier limits
   */
  getTierLimits(tier: string): {
    maxCustomers: number | null;
    maxJobsPerMonth: number | null;
    maxStorageGB: number;
    maxTeamMembers: number;
  } {
    const tierLimits = {
      FREE: {
        maxCustomers: config.subscription.freeTierLimits.maxCustomers,
        maxJobsPerMonth: config.subscription.freeTierLimits.maxJobsPerMonth,
        maxStorageGB: config.subscription.freeTierLimits.maxStorageGB,
        maxTeamMembers: 1,
      },
      PROFESSIONAL: {
        maxCustomers: null,
        maxJobsPerMonth: null,
        maxStorageGB: 10,
        maxTeamMembers: 1,
      },
      BUSINESS: {
        maxCustomers: null,
        maxJobsPerMonth: null,
        maxStorageGB: 50,
        maxTeamMembers: 5,
      },
      ENTERPRISE: {
        maxCustomers: null,
        maxJobsPerMonth: null,
        maxStorageGB: -1, // Unlimited
        maxTeamMembers: -1, // Unlimited
      },
    };

    return tierLimits[tier as SubscriptionTier] || tierLimits.FREE;
  }
}
