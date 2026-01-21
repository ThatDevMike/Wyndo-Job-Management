/**
 * Customer Routes
 * Handles all customer-related endpoints
 */

import { Router, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { SubscriptionService } from '../services/subscriptionService';
import { AuditService } from '../services/auditService';

const router = Router();
const subscriptionService = new SubscriptionService();
const auditService = new AuditService();

router.use(authenticate);

/**
 * GET /api/customers
 * List all customers
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('search').optional().trim(),
  query('status').optional().isIn(['ACTIVE', 'INACTIVE', 'ARCHIVED']),
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

    const { page = 1, limit = 20, search, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      userId: req.userId,
      deletedAt: null,
    };

    if (req.user.teamId) where.teamId = req.user.teamId;
    if (status) where.status = status;

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { jobs: true, invoices: true },
          },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    res.json({
      customers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('List customers error:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

/**
 * GET /api/customers/:id
 * Get a single customer
 */
router.get('/:id', [param('id').isString().notEmpty()], async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const customer = await prisma.customer.findFirst({
      where: {
        id,
        userId: req.userId,
        deletedAt: null,
      },
      include: {
        sites: { orderBy: { isDefault: 'desc' } },
        jobs: {
          take: 10,
          orderBy: { scheduledStart: 'desc' },
          select: {
            id: true,
            title: true,
            status: true,
            scheduledStart: true,
          },
        },
        invoices: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            total: true,
            dueDate: true,
          },
        },
        _count: {
          select: { jobs: true, invoices: true },
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
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

/**
 * POST /api/customers
 * Create a new customer
 */
router.post('/', [
  body('name').trim().isLength({ min: 1, max: 200 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().trim().isLength({ max: 20 }),
  body('addressLine1').optional().trim().isLength({ max: 200 }),
  body('city').optional().trim().isLength({ max: 100 }),
  body('postcode').optional().trim().isLength({ max: 20 }),
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

    // Check subscription limits
    const customerCount = await prisma.customer.count({
      where: { userId: req.userId, deletedAt: null },
    });

    const limitCheck = await subscriptionService.checkCustomerLimit(
      req.user.subscriptionTier,
      customerCount
    );

    if (!limitCheck.allowed) {
      res.status(403).json({
        error: 'Customer limit reached',
        limit: limitCheck.limit,
        current: customerCount,
        upgradeRequired: true,
      });
      return;
    }

    const {
      name, email, phone, mobile, addressLine1, addressLine2,
      city, county, postcode, country = 'GB', companyName,
      vatNumber, notes, tags = [],
    } = req.body;

    const customer = await prisma.customer.create({
      data: {
        userId: req.userId,
        teamId: req.user.teamId || null,
        name, email, phone, mobile, addressLine1, addressLine2,
        city, county, postcode, country, companyName, vatNumber,
        notes, tags, status: 'ACTIVE',
      },
    });

    await auditService.log({
      userId: req.userId,
      teamId: req.user.teamId,
      action: 'create_customer',
      entityType: 'customer',
      entityId: customer.id,
    });

    res.status(201).json({ customer });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

/**
 * PUT /api/customers/:id
 * Update a customer
 */
router.put('/:id', [param('id').isString().notEmpty()], async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const existing = await prisma.customer.findFirst({
      where: { id, userId: req.userId, deletedAt: null },
    });

    if (!existing) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: { ...req.body, updatedAt: new Date() },
    });

    await auditService.log({
      userId: req.userId,
      action: 'update_customer',
      entityType: 'customer',
      entityId: id,
    });

    res.json({ customer: updated });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

/**
 * DELETE /api/customers/:id
 * Delete (archive) a customer
 */
router.delete('/:id', [param('id').isString().notEmpty()], async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const customer = await prisma.customer.findFirst({
      where: { id, userId: req.userId, deletedAt: null },
    });

    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    await prisma.customer.update({
      where: { id },
      data: { status: 'ARCHIVED', deletedAt: new Date() },
    });

    await auditService.log({
      userId: req.userId,
      action: 'delete_customer',
      entityType: 'customer',
      entityId: id,
    });

    res.json({ message: 'Customer archived successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

/**
 * POST /api/customers/:id/sites
 * Add a site to a customer
 */
router.post('/:id/sites', [
  param('id').isString().notEmpty(),
  body('name').trim().isLength({ min: 1, max: 200 }),
], async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { name, addressLine1, addressLine2, city, county, postcode, country, isDefault } = req.body;

    const customer = await prisma.customer.findFirst({
      where: { id, userId: req.userId, deletedAt: null },
    });

    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    if (isDefault) {
      await prisma.site.updateMany({
        where: { customerId: id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const site = await prisma.site.create({
      data: {
        customerId: id,
        name, addressLine1, addressLine2, city, county,
        postcode, country: country || 'GB', isDefault: isDefault || false,
      },
    });

    res.status(201).json({ site });
  } catch (error) {
    console.error('Add site error:', error);
    res.status(500).json({ error: 'Failed to add site' });
  }
});

export { router as customersRouter };
