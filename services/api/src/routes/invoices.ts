/**
 * Invoice Routes
 * Handles all invoice-related endpoints
 */

import { Router, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireTier } from '../middleware/subscription';
import { prisma } from '../lib/prisma';
import { AuditService } from '../services/auditService';
import { PDFService } from '../services/pdfService';
import { EmailService } from '../services/emailService';

const router = Router();
const auditService = new AuditService();
const pdfService = new PDFService();
const emailService = new EmailService();

router.use(authenticate);

/**
 * GET /api/invoices
 * List all invoices
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('status').optional().isIn(['DRAFT', 'SENT', 'VIEWED', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED']),
  query('customerId').optional().isString(),
], async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId || !req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { page = 1, limit = 20, status, customerId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { userId: req.userId };
    if (req.user.teamId) where.teamId = req.user.teamId;
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, email: true } },
          items: true,
          payments: { select: { id: true, amount: true, method: true, status: true, createdAt: true } },
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    res.json({
      invoices,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    console.error('List invoices error:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

/**
 * GET /api/invoices/:id
 * Get a single invoice
 */
router.get('/:id', [param('id').isString().notEmpty()], async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const invoice = await prisma.invoice.findFirst({
      where: { id, userId: req.userId },
      include: {
        customer: true,
        items: { include: { job: { select: { id: true, title: true, status: true } } } },
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    res.json({ invoice });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

/**
 * POST /api/invoices
 * Create a new invoice
 */
router.post('/', [
  body('customerId').isString().notEmpty(),
  body('title').trim().isLength({ min: 1, max: 200 }),
  body('items').isArray({ min: 1 }),
  body('items.*.description').trim().isLength({ min: 1, max: 500 }),
  body('items.*.quantity').isFloat({ min: 0 }),
  body('items.*.unitPrice').isFloat({ min: 0 }),
  body('dueDate').isISO8601(),
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

    const { customerId, title, description, items, dueDate, taxRate = 0, paymentTerms, notes, jobIds = [] } = req.body;

    // Verify customer
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, userId: req.userId, deletedAt: null },
    });

    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    // Calculate totals
    const subtotal = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(req.userId);

    // Create invoice
    const invoice = await prisma.invoice.create({
      data: {
        userId: req.userId,
        teamId: req.user.teamId || null,
        customerId,
        invoiceNumber,
        title, description,
        subtotal, taxRate, taxAmount, total,
        amountDue: total,
        dueDate: new Date(dueDate),
        paymentTerms, notes,
        status: 'DRAFT',
        issueDate: new Date(),
        consolidatedJobIds: jobIds,
        isConsolidated: jobIds.length > 1,
      },
    });

    // Create invoice items
    await Promise.all(
      items.map(async (item: any, index: number) => {
        await prisma.invoiceItem.create({
          data: {
            invoiceId: invoice.id,
            jobId: item.jobId || null,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
            sortOrder: index,
          },
        });
      })
    );

    const created = await prisma.invoice.findUnique({
      where: { id: invoice.id },
      include: { customer: true, items: true },
    });

    await auditService.log({
      userId: req.userId,
      teamId: req.user.teamId,
      action: 'create_invoice',
      entityType: 'invoice',
      entityId: invoice.id,
    });

    res.status(201).json({ invoice: created });
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

/**
 * PUT /api/invoices/:id
 * Update an invoice
 */
router.put('/:id', [param('id').isString().notEmpty()], async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { items, ...updateData } = req.body;

    const existing = await prisma.invoice.findFirst({
      where: { id, userId: req.userId, status: 'DRAFT' },
    });

    if (!existing) {
      res.status(404).json({ error: 'Invoice not found or cannot be updated' });
      return;
    }

    let totals = {
      subtotal: existing.subtotal,
      taxAmount: existing.taxAmount,
      total: existing.total,
      amountDue: existing.amountDue,
    };

    if (items) {
      const subtotal = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);
      const taxAmount = subtotal * (existing.taxRate || 0);
      const total = subtotal + taxAmount;
      const amountDue = total - existing.amountPaid;

      totals = { subtotal, taxAmount, total, amountDue };

      await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });

      await Promise.all(
        items.map(async (item: any, index: number) => {
          await prisma.invoiceItem.create({
            data: {
              invoiceId: id,
              jobId: item.jobId || null,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.quantity * item.unitPrice,
              sortOrder: index,
            },
          });
        })
      );
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: { ...updateData, ...totals, updatedAt: new Date() },
      include: { customer: true, items: true },
    });

    await auditService.log({
      userId: req.userId,
      action: 'update_invoice',
      entityType: 'invoice',
      entityId: id,
    });

    res.json({ invoice: updated });
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

/**
 * POST /api/invoices/:id/send
 * Send invoice to customer
 */
router.post('/:id/send', [param('id').isString().notEmpty()], requireTier('PROFESSIONAL'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId || !req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const invoice = await prisma.invoice.findFirst({
      where: { id, userId: req.userId },
      include: { customer: true, items: true },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    if (!invoice.customer.email) {
      res.status(400).json({ error: 'Customer email is required' });
      return;
    }

    const pdfBuffer = await pdfService.generateInvoicePDF(invoice);
    await emailService.sendInvoiceEmail(invoice.customer.email, invoice, pdfBuffer, invoice.customer.name || undefined);

    const updated = await prisma.invoice.update({
      where: { id },
      data: { status: 'SENT', sentAt: new Date() },
    });

    await auditService.log({
      userId: req.userId,
      teamId: req.user.teamId,
      action: 'send_invoice',
      entityType: 'invoice',
      entityId: id,
    });

    res.json({ invoice: updated, message: 'Invoice sent successfully' });
  } catch (error) {
    console.error('Send invoice error:', error);
    res.status(500).json({ error: 'Failed to send invoice' });
  }
});

/**
 * POST /api/invoices/:id/mark-paid
 * Mark invoice as paid
 */
router.post('/:id/mark-paid', [
  param('id').isString().notEmpty(),
  body('amount').isFloat({ min: 0 }),
  body('method').isIn(['CASH', 'CHEQUE', 'BANK_TRANSFER', 'STRIPE', 'PAYPAL']),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { amount, method, reference, notes } = req.body;

    const invoice = await prisma.invoice.findFirst({
      where: { id, userId: req.userId },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    const newAmountPaid = invoice.amountPaid + amount;
    const newAmountDue = invoice.total - newAmountPaid;

    let newStatus = invoice.status;
    if (newAmountDue <= 0) newStatus = 'PAID';
    else if (newAmountPaid > 0) newStatus = 'PARTIAL';

    await prisma.payment.create({
      data: {
        userId: req.userId,
        teamId: req.user?.teamId || null,
        customerId: invoice.customerId,
        invoiceId: invoice.id,
        amount, method,
        status: 'COMPLETED',
        reference, notes,
        processedAt: new Date(),
      },
    });

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        amountPaid: newAmountPaid,
        amountDue: newAmountDue,
        status: newStatus,
        paidAt: newAmountDue <= 0 ? new Date() : invoice.paidAt,
      },
    });

    await auditService.log({
      userId: req.userId,
      action: 'mark_invoice_paid',
      entityType: 'invoice',
      entityId: id,
      changes: { amount, method, status: newStatus },
    });

    res.json({ invoice: updated });
  } catch (error) {
    console.error('Mark paid error:', error);
    res.status(500).json({ error: 'Failed to mark invoice as paid' });
  }
});

/**
 * POST /api/invoices/consolidate
 * Consolidate multiple jobs into one invoice
 */
router.post('/consolidate', [
  body('customerId').isString().notEmpty(),
  body('jobIds').isArray({ min: 1 }),
  body('dueDate').isISO8601(),
], requireTier('BUSINESS'), async (req: AuthRequest, res: Response) => {
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

    const { customerId, jobIds, dueDate, title, description } = req.body;

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, userId: req.userId, deletedAt: null },
    });

    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    const jobs = await prisma.job.findMany({
      where: { id: { in: jobIds }, customerId, userId: req.userId },
      include: { invoiceItems: true },
    });

    if (jobs.length !== jobIds.length) {
      res.status(400).json({ error: 'Some jobs not found' });
      return;
    }

    const alreadyInvoiced = jobs.some(job => job.invoiceItems.length > 0);
    if (alreadyInvoiced) {
      res.status(400).json({ error: 'Some jobs are already invoiced' });
      return;
    }

    const items = jobs.map(job => ({
      jobId: job.id,
      description: job.title,
      quantity: 1,
      unitPrice: job.actualValue || job.estimatedValue || 0,
      total: job.actualValue || job.estimatedValue || 0,
    }));

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const taxRate = 0.2;
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;

    const invoiceNumber = await generateInvoiceNumber(req.userId);

    const invoice = await prisma.invoice.create({
      data: {
        userId: req.userId,
        teamId: req.user.teamId || null,
        customerId,
        invoiceNumber,
        title: title || `Consolidated Invoice for ${jobs.length} jobs`,
        description,
        subtotal, taxRate, taxAmount, total,
        amountDue: total,
        dueDate: new Date(dueDate),
        status: 'DRAFT',
        issueDate: new Date(),
        consolidatedJobIds: jobIds,
        isConsolidated: true,
      },
    });

    await Promise.all(
      items.map(async (item, index) => {
        await prisma.invoiceItem.create({
          data: {
            invoiceId: invoice.id,
            jobId: item.jobId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
            sortOrder: index,
          },
        });
      })
    );

    const created = await prisma.invoice.findUnique({
      where: { id: invoice.id },
      include: { customer: true, items: true },
    });

    await auditService.log({
      userId: req.userId,
      teamId: req.user.teamId,
      action: 'consolidate_invoice',
      entityType: 'invoice',
      entityId: invoice.id,
      changes: { jobIds, consolidated: true },
    });

    res.status(201).json({ invoice: created });
  } catch (error) {
    console.error('Consolidate invoice error:', error);
    res.status(500).json({ error: 'Failed to consolidate invoice' });
  }
});

// Helper function
async function generateInvoiceNumber(userId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  const lastInvoice = await prisma.invoice.findFirst({
    where: { userId, invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: 'desc' },
  });

  let sequence = 1;
  if (lastInvoice) {
    const lastSequence = parseInt(lastInvoice.invoiceNumber.replace(prefix, ''));
    sequence = lastSequence + 1;
  }

  return `${prefix}${sequence.toString().padStart(6, '0')}`;
}

export { router as invoicesRouter };
