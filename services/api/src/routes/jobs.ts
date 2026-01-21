/**
 * Job Routes
 * Handles all job-related endpoints
 */

import { Router, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireTier } from '../middleware/subscription';
import { prisma } from '../lib/prisma';
import { SubscriptionService } from '../services/subscriptionService';
import { AuditService } from '../services/auditService';

const router = Router();
const subscriptionService = new SubscriptionService();
const auditService = new AuditService();

router.use(authenticate);

/**
 * GET /api/jobs
 * List all jobs
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('status').optional().isIn(['DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD']),
  query('customerId').optional().isString(),
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601(),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    if (!req.userId || !req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { page = 1, limit = 20, status, customerId, dateFrom, dateTo } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { userId: req.userId };
    if (req.user.teamId) where.teamId = req.user.teamId;
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;

    if (dateFrom || dateTo) {
      where.scheduledStart = {};
      if (dateFrom) where.scheduledStart.gte = new Date(dateFrom as string);
      if (dateTo) where.scheduledStart.lte = new Date(dateTo as string);
    }

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { scheduledStart: 'desc' },
        include: {
          customer: { select: { id: true, name: true, email: true } },
          site: { select: { id: true, name: true, addressLine1: true, postcode: true } },
        },
      }),
      prisma.job.count({ where }),
    ]);

    res.json({
      jobs,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    console.error('List jobs error:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

/**
 * GET /api/jobs/:id
 * Get a single job
 */
router.get('/:id', [param('id').isString().notEmpty()], async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const job = await prisma.job.findFirst({
      where: { id, userId: req.userId },
      include: {
        customer: true,
        site: true,
        invoiceItems: { include: { invoice: { select: { id: true, invoiceNumber: true, status: true } } } },
        expenses: true,
        notes: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    res.json({ job });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

/**
 * POST /api/jobs
 * Create a new job
 */
router.post('/', [
  body('customerId').isString().notEmpty(),
  body('title').trim().isLength({ min: 1, max: 200 }),
  body('scheduledStart').isISO8601(),
  body('scheduledEnd').optional().isISO8601(),
  body('priority').optional().isIn(['LOW', 'NORMAL', 'HIGH', 'URGENT']),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    if (!req.userId || !req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { customerId, siteId, title, description, jobType, scheduledStart, scheduledEnd, priority = 'NORMAL', estimatedValue } = req.body;

    // Verify customer
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, userId: req.userId, deletedAt: null },
    });

    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    // Check subscription limits
    const jobCount = await prisma.job.count({
      where: {
        userId: req.userId,
        scheduledStart: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
        },
      },
    });

    const limitCheck = await subscriptionService.checkJobLimit(req.user.subscriptionTier, jobCount, new Date());

    if (!limitCheck.allowed) {
      res.status(403).json({
        error: 'Job limit reached for this month',
        limit: limitCheck.limit,
        current: limitCheck.current,
        upgradeRequired: true,
      });
      return;
    }

    const job = await prisma.job.create({
      data: {
        userId: req.userId,
        teamId: req.user.teamId || null,
        customerId,
        siteId: siteId || null,
        title, description, jobType,
        scheduledStart: new Date(scheduledStart),
        scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null,
        priority, estimatedValue: estimatedValue || null,
        status: 'SCHEDULED',
      },
      include: { customer: { select: { id: true, name: true } }, site: true },
    });

    await prisma.customer.update({
      where: { id: customerId },
      data: { lastJobAt: new Date() },
    });

    await auditService.log({
      userId: req.userId,
      teamId: req.user.teamId,
      action: 'create_job',
      entityType: 'job',
      entityId: job.id,
    });

    res.status(201).json({ job });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

/**
 * PUT /api/jobs/:id
 * Update a job
 */
router.put('/:id', [param('id').isString().notEmpty()], async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const existing = await prisma.job.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    const updateData = { ...req.body, updatedAt: new Date() };
    if (req.body.scheduledStart) updateData.scheduledStart = new Date(req.body.scheduledStart);
    if (req.body.scheduledEnd) updateData.scheduledEnd = new Date(req.body.scheduledEnd);

    const updated = await prisma.job.update({
      where: { id },
      data: updateData,
      include: { customer: true, site: true },
    });

    await auditService.log({
      userId: req.userId,
      action: 'update_job',
      entityType: 'job',
      entityId: id,
    });

    res.json({ job: updated });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

/**
 * DELETE /api/jobs/:id
 * Delete a job
 */
router.delete('/:id', [param('id').isString().notEmpty()], async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const job = await prisma.job.findFirst({
      where: { id, userId: req.userId },
    });

    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    const hasInvoices = await prisma.invoiceItem.count({ where: { jobId: id } }) > 0;

    if (hasInvoices) {
      res.status(400).json({ error: 'Cannot delete job with associated invoices' });
      return;
    }

    await prisma.job.delete({ where: { id } });

    await auditService.log({
      userId: req.userId,
      action: 'delete_job',
      entityType: 'job',
      entityId: id,
    });

    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

/**
 * POST /api/jobs/:id/start
 * Start a job
 */
router.post('/:id/start', [param('id').isString().notEmpty()], async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const job = await prisma.job.findFirst({
      where: { id, userId: req.userId },
    });

    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    if (job.status !== 'SCHEDULED' && job.status !== 'DRAFT') {
      res.status(400).json({ error: 'Job cannot be started in current status' });
      return;
    }

    const updated = await prisma.job.update({
      where: { id },
      data: { status: 'IN_PROGRESS', actualStart: new Date() },
    });

    res.json({ job: updated });
  } catch (error) {
    console.error('Start job error:', error);
    res.status(500).json({ error: 'Failed to start job' });
  }
});

/**
 * POST /api/jobs/:id/complete
 * Complete a job
 */
router.post('/:id/complete', [param('id').isString().notEmpty()], async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { completionNotes, actualValue, photos = [], signatureData } = req.body;

    const job = await prisma.job.findFirst({
      where: { id, userId: req.userId },
    });

    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    const updated = await prisma.job.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        actualEnd: new Date(),
        completionNotes,
        actualValue: actualValue || job.estimatedValue,
        photos,
        signatureData,
      },
    });

    await auditService.log({
      userId: req.userId,
      action: 'complete_job',
      entityType: 'job',
      entityId: id,
    });

    res.json({ job: updated });
  } catch (error) {
    console.error('Complete job error:', error);
    res.status(500).json({ error: 'Failed to complete job' });
  }
});

/**
 * GET /api/jobs/schedule/calendar
 * Get jobs for calendar view
 */
router.get('/schedule/calendar', [
  query('start').isISO8601(),
  query('end').isISO8601(),
], async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId || !req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { start, end } = req.query;

    const where: any = {
      userId: req.userId,
      scheduledStart: {
        gte: new Date(start as string),
        lte: new Date(end as string),
      },
    };

    if (req.user.teamId) where.teamId = req.user.teamId;

    const jobs = await prisma.job.findMany({
      where,
      select: {
        id: true,
        title: true,
        status: true,
        scheduledStart: true,
        scheduledEnd: true,
        priority: true,
        customer: { select: { id: true, name: true } },
        site: { select: { id: true, name: true, addressLine1: true, postcode: true } },
      },
      orderBy: { scheduledStart: 'asc' },
    });

    res.json({ jobs });
  } catch (error) {
    console.error('Get calendar error:', error);
    res.status(500).json({ error: 'Failed to fetch calendar' });
  }
});

export { router as jobsRouter };
