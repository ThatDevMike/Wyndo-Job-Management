import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { SubscriptionService } from '../services/subscriptionService';
import { AuditService } from '../services/auditService';
import { SubscriptionTier } from '../middleware/subscription';

const subscriptionService = new SubscriptionService();
const auditService = new AuditService();

export class JobController {
  // List jobs with pagination and filtering
  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const {
        page = 1,
        limit = 20,
        status,
        customerId,
        assignedToId,
        dateFrom,
        dateTo,
        priority,
        sortBy = 'scheduledStart',
        sortOrder = 'asc',
      } = req.query;

      const pageNum = Number(page);
      const limitNum = Number(limit);
      const skip = (pageNum - 1) * limitNum;

      // Build where clause
      const where: any = {
        userId,
      };

      if (status) {
        where.status = status;
      }

      if (customerId) {
        where.customerId = customerId;
      }

      if (assignedToId) {
        where.assignedToId = assignedToId;
      }

      if (priority) {
        where.priority = priority;
      }

      if (dateFrom || dateTo) {
        where.scheduledStart = {};
        if (dateFrom) {
          where.scheduledStart.gte = new Date(dateFrom as string);
        }
        if (dateTo) {
          where.scheduledStart.lte = new Date(dateTo as string);
        }
      }

      // Get total count
      const total = await prisma.job.count({ where });

      // Get jobs
      const jobs = await prisma.job.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortBy as string]: sortOrder },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
              mobile: true,
            },
          },
          site: {
            select: {
              id: true,
              name: true,
              addressLine1: true,
              postcode: true,
            },
          },
        },
      });

      res.json({
        jobs,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error('List jobs error:', error);
      res.status(500).json({ error: 'Failed to list jobs' });
    }
  }

  // Get single job by ID
  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      const job = await prisma.job.findFirst({
        where: { id, userId },
        include: {
          customer: true,
          site: true,
          invoiceItems: {
            include: {
              invoice: true,
            },
          },
          notes: true,
        },
      });

      if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
      }

      res.json({ job });
    } catch (error) {
      console.error('Get job error:', error);
      res.status(500).json({ error: 'Failed to get job' });
    }
  }

  // Create new job
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.userId!;
      const userTier = req.user?.subscriptionTier as SubscriptionTier;

      // Check subscription limits (jobs per month for free tier)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const jobsThisMonth = await prisma.job.count({
        where: {
          userId,
          createdAt: { gte: startOfMonth },
        },
      });

      const limitCheck = await subscriptionService.checkJobLimit(userTier, jobsThisMonth);
      if (!limitCheck.allowed) {
        res.status(403).json({
          error: 'Monthly job limit reached',
          limit: limitCheck.limit,
          upgradeUrl: '/pricing',
        });
        return;
      }

      const {
        customerId,
        siteId,
        title,
        description,
        jobType,
        priority,
        scheduledStart,
        scheduledEnd,
        estimatedValue,
        assignedToId,
      } = req.body;

      // Verify customer belongs to user
      const customer = await prisma.customer.findFirst({
        where: { id: customerId, userId, deletedAt: null },
      });

      if (!customer) {
        res.status(404).json({ error: 'Customer not found' });
        return;
      }

      const job = await prisma.job.create({
        data: {
          userId,
          teamId: req.user?.teamId || null,
          customerId,
          siteId,
          title,
          description,
          jobType,
          priority: priority || 'NORMAL',
          status: 'SCHEDULED',
          scheduledStart: new Date(scheduledStart),
          scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null,
          estimatedValue,
          assignedToId,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
          site: true,
        },
      });

      // Update customer's lastJobAt
      await prisma.customer.update({
        where: { id: customerId },
        data: { lastJobAt: new Date() },
      });

      // Audit log
      await auditService.log({
        userId,
        teamId: req.user?.teamId,
        action: 'CREATE',
        entityType: 'Job',
        entityId: job.id,
        changes: { title, customerId, scheduledStart },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(201).json({ job });
    } catch (error) {
      console.error('Create job error:', error);
      res.status(500).json({ error: 'Failed to create job' });
    }
  }

  // Update job
  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.userId!;
      const { id } = req.params;

      // Check if job exists and belongs to user
      const existing = await prisma.job.findFirst({
        where: { id, userId },
      });

      if (!existing) {
        res.status(404).json({ error: 'Job not found' });
        return;
      }

      const {
        title,
        description,
        jobType,
        priority,
        status,
        scheduledStart,
        scheduledEnd,
        estimatedValue,
        siteId,
        assignedToId,
      } = req.body;

      const job = await prisma.job.update({
        where: { id },
        data: {
          title,
          description,
          jobType,
          priority,
          status,
          scheduledStart: scheduledStart ? new Date(scheduledStart) : undefined,
          scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : undefined,
          estimatedValue,
          siteId,
          assignedToId,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
          site: true,
        },
      });

      // Audit log
      await auditService.log({
        userId,
        teamId: req.user?.teamId,
        action: 'UPDATE',
        entityType: 'Job',
        entityId: job.id,
        changes: req.body,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.json({ job });
    } catch (error) {
      console.error('Update job error:', error);
      res.status(500).json({ error: 'Failed to update job' });
    }
  }

  // Delete job
  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      // Check if job exists and belongs to user
      const existing = await prisma.job.findFirst({
        where: { id, userId },
      });

      if (!existing) {
        res.status(404).json({ error: 'Job not found' });
        return;
      }

      // Check if job has invoices
      const hasInvoices = await prisma.invoiceItem.count({
        where: { jobId: id },
      });

      if (hasInvoices > 0) {
        res.status(400).json({ error: 'Cannot delete job with associated invoices' });
        return;
      }

      await prisma.job.delete({
        where: { id },
      });

      // Audit log
      await auditService.log({
        userId,
        teamId: req.user?.teamId,
        action: 'DELETE',
        entityType: 'Job',
        entityId: id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.json({ message: 'Job deleted' });
    } catch (error) {
      console.error('Delete job error:', error);
      res.status(500).json({ error: 'Failed to delete job' });
    }
  }

  // Start job
  async start(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      const job = await prisma.job.findFirst({
        where: { id, userId },
      });

      if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
      }

      if (job.status !== 'SCHEDULED') {
        res.status(400).json({ error: 'Job cannot be started from current status' });
        return;
      }

      const updatedJob = await prisma.job.update({
        where: { id },
        data: {
          status: 'IN_PROGRESS',
          actualStart: new Date(),
        },
      });

      res.json({ job: updatedJob });
    } catch (error) {
      console.error('Start job error:', error);
      res.status(500).json({ error: 'Failed to start job' });
    }
  }

  // Complete job
  async complete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const { id } = req.params;
      const { completionNotes, actualValue, photos, signatureData } = req.body;

      const job = await prisma.job.findFirst({
        where: { id, userId },
      });

      if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
      }

      if (job.status !== 'IN_PROGRESS' && job.status !== 'SCHEDULED') {
        res.status(400).json({ error: 'Job cannot be completed from current status' });
        return;
      }

      const updatedJob = await prisma.job.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          actualEnd: new Date(),
          completedAt: new Date(),
          completionNotes,
          actualValue,
          photos: photos ? JSON.stringify(photos) : undefined,
          signatureData,
        },
      });

      res.json({ job: updatedJob });
    } catch (error) {
      console.error('Complete job error:', error);
      res.status(500).json({ error: 'Failed to complete job' });
    }
  }

  // Cancel job
  async cancel(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const { id } = req.params;
      const { reason } = req.body;

      const job = await prisma.job.findFirst({
        where: { id, userId },
      });

      if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
      }

      if (job.status === 'COMPLETED' || job.status === 'CANCELLED') {
        res.status(400).json({ error: 'Job cannot be cancelled' });
        return;
      }

      const updatedJob = await prisma.job.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          completionNotes: reason || 'Cancelled',
        },
      });

      res.json({ job: updatedJob });
    } catch (error) {
      console.error('Cancel job error:', error);
      res.status(500).json({ error: 'Failed to cancel job' });
    }
  }

  // Get calendar view
  async getCalendar(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const { start, end } = req.query;

      if (!start || !end) {
        res.status(400).json({ error: 'Start and end dates are required' });
        return;
      }

      const jobs = await prisma.job.findMany({
        where: {
          userId,
          scheduledStart: {
            gte: new Date(start as string),
            lte: new Date(end as string),
          },
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
          site: {
            select: {
              id: true,
              name: true,
              addressLine1: true,
              postcode: true,
            },
          },
        },
        orderBy: { scheduledStart: 'asc' },
      });

      // Transform to calendar events
      const events = jobs.map((job) => ({
        id: job.id,
        title: job.title,
        start: job.scheduledStart,
        end: job.scheduledEnd || job.scheduledStart,
        status: job.status,
        priority: job.priority,
        customer: job.customer,
        site: job.site,
      }));

      res.json({ events });
    } catch (error) {
      console.error('Get calendar error:', error);
      res.status(500).json({ error: 'Failed to get calendar' });
    }
  }
}
