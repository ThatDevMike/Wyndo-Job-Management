import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { SubscriptionService } from '../services/subscriptionService';
import { AuditService } from '../services/auditService';
import { SubscriptionTier } from '../middleware/subscription';

const subscriptionService = new SubscriptionService();
const auditService = new AuditService();

export class CustomerController {
  // List customers with pagination and filtering
  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const {
        page = 1,
        limit = 20,
        search,
        status,
        tags,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const pageNum = Number(page);
      const limitNum = Number(limit);
      const skip = (pageNum - 1) * limitNum;

      // Build where clause
      const where: any = {
        userId,
        deletedAt: null,
      };

      if (search) {
        where.OR = [
          { name: { contains: search as string } },
          { email: { contains: search as string } },
          { phone: { contains: search as string } },
          { companyName: { contains: search as string } },
        ];
      }

      if (status) {
        where.status = status;
      }

      if (tags) {
        // For SQLite, tags is stored as JSON string
        where.tags = { contains: tags as string };
      }

      // Get total count
      const total = await prisma.customer.count({ where });

      // Get customers
      const customers = await prisma.customer.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortBy as string]: sortOrder },
        include: {
          sites: true,
          _count: {
            select: {
              jobs: true,
              invoices: true,
            },
          },
        },
      });

      res.json({
        customers,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error('List customers error:', error);
      res.status(500).json({ error: 'Failed to list customers' });
    }
  }

  // Get single customer by ID
  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      const customer = await prisma.customer.findFirst({
        where: {
          id,
          userId,
          deletedAt: null,
        },
        include: {
          sites: true,
          jobs: {
            take: 10,
            orderBy: { scheduledStart: 'desc' },
          },
          invoices: {
            take: 10,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!customer) {
        res.status(404).json({ error: 'Customer not found' });
        return;
      }

      res.json({ customer });
    } catch (error) {
      console.error('Get customer error:', error);
      res.status(500).json({ error: 'Failed to get customer' });
    }
  }

  // Create new customer
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.userId!;
      const userTier = req.user?.subscriptionTier as SubscriptionTier;

      // Check subscription limits
      const currentCount = await prisma.customer.count({
        where: { userId, deletedAt: null },
      });

      const limitCheck = await subscriptionService.checkCustomerLimit(userTier, currentCount);
      if (!limitCheck.allowed) {
        res.status(403).json({
          error: 'Customer limit reached',
          limit: limitCheck.limit,
          upgradeUrl: '/pricing',
        });
        return;
      }

      const {
        name,
        email,
        phone,
        mobile,
        addressLine1,
        addressLine2,
        city,
        county,
        postcode,
        country,
        companyName,
        vatNumber,
        notes,
        tags,
      } = req.body;

      const customer = await prisma.customer.create({
        data: {
          userId,
          teamId: req.user?.teamId || null,
          name,
          email: email?.toLowerCase(),
          phone,
          mobile,
          addressLine1,
          addressLine2,
          city,
          county,
          postcode,
          country: country || 'GB',
          companyName,
          vatNumber,
          notes,
          tags: tags ? JSON.stringify(tags) : null,
        },
        include: {
          sites: true,
        },
      });

      // Audit log
      await auditService.log({
        userId,
        teamId: req.user?.teamId,
        action: 'CREATE',
        entityType: 'Customer',
        entityId: customer.id,
        changes: { name, email },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(201).json({ customer });
    } catch (error) {
      console.error('Create customer error:', error);
      res.status(500).json({ error: 'Failed to create customer' });
    }
  }

  // Update customer
  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.userId!;
      const { id } = req.params;

      // Check if customer exists and belongs to user
      const existing = await prisma.customer.findFirst({
        where: { id, userId, deletedAt: null },
      });

      if (!existing) {
        res.status(404).json({ error: 'Customer not found' });
        return;
      }

      const {
        name,
        email,
        phone,
        mobile,
        addressLine1,
        addressLine2,
        city,
        county,
        postcode,
        country,
        companyName,
        vatNumber,
        notes,
        tags,
        status,
      } = req.body;

      const customer = await prisma.customer.update({
        where: { id },
        data: {
          name,
          email: email?.toLowerCase(),
          phone,
          mobile,
          addressLine1,
          addressLine2,
          city,
          county,
          postcode,
          country,
          companyName,
          vatNumber,
          notes,
          tags: tags ? JSON.stringify(tags) : undefined,
          status,
        },
        include: {
          sites: true,
        },
      });

      // Audit log
      await auditService.log({
        userId,
        teamId: req.user?.teamId,
        action: 'UPDATE',
        entityType: 'Customer',
        entityId: customer.id,
        changes: req.body,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.json({ customer });
    } catch (error) {
      console.error('Update customer error:', error);
      res.status(500).json({ error: 'Failed to update customer' });
    }
  }

  // Delete (archive) customer
  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      // Check if customer exists and belongs to user
      const existing = await prisma.customer.findFirst({
        where: { id, userId, deletedAt: null },
      });

      if (!existing) {
        res.status(404).json({ error: 'Customer not found' });
        return;
      }

      // Soft delete
      await prisma.customer.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          status: 'ARCHIVED',
        },
      });

      // Audit log
      await auditService.log({
        userId,
        teamId: req.user?.teamId,
        action: 'DELETE',
        entityType: 'Customer',
        entityId: id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.json({ message: 'Customer deleted' });
    } catch (error) {
      console.error('Delete customer error:', error);
      res.status(500).json({ error: 'Failed to delete customer' });
    }
  }

  // Add site to customer
  async addSite(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.userId!;
      const { id: customerId } = req.params;

      // Check if customer exists and belongs to user
      const customer = await prisma.customer.findFirst({
        where: { id: customerId, userId, deletedAt: null },
      });

      if (!customer) {
        res.status(404).json({ error: 'Customer not found' });
        return;
      }

      const {
        name,
        addressLine1,
        addressLine2,
        city,
        county,
        postcode,
        country,
        accessInstructions,
        parkingInfo,
        latitude,
        longitude,
        isDefault,
      } = req.body;

      // If setting as default, unset other defaults
      if (isDefault) {
        await prisma.site.updateMany({
          where: { customerId },
          data: { isDefault: false },
        });
      }

      const site = await prisma.site.create({
        data: {
          customerId,
          name,
          addressLine1,
          addressLine2,
          city,
          county,
          postcode,
          country: country || 'GB',
          accessInstructions,
          parkingInfo,
          latitude,
          longitude,
          isDefault: isDefault || false,
        },
      });

      res.status(201).json({ site });
    } catch (error) {
      console.error('Add site error:', error);
      res.status(500).json({ error: 'Failed to add site' });
    }
  }

  // Get customer stats
  async getStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      // Check if customer exists and belongs to user
      const customer = await prisma.customer.findFirst({
        where: { id, userId, deletedAt: null },
      });

      if (!customer) {
        res.status(404).json({ error: 'Customer not found' });
        return;
      }

      const [jobStats, invoiceStats] = await Promise.all([
        prisma.job.groupBy({
          by: ['status'],
          where: { customerId: id },
          _count: true,
        }),
        prisma.invoice.aggregate({
          where: { customerId: id },
          _sum: { total: true, amountPaid: true },
          _count: true,
        }),
      ]);

      res.json({
        jobs: jobStats,
        invoices: {
          count: invoiceStats._count,
          totalValue: invoiceStats._sum.total || 0,
          totalPaid: invoiceStats._sum.amountPaid || 0,
          outstanding: (invoiceStats._sum.total || 0) - (invoiceStats._sum.amountPaid || 0),
        },
      });
    } catch (error) {
      console.error('Get customer stats error:', error);
      res.status(500).json({ error: 'Failed to get customer stats' });
    }
  }
}
