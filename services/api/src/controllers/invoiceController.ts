import { Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { AuditService } from '../services/auditService';
import { PDFService } from '../services/pdfService';
import { EmailService } from '../services/emailService';
import crypto from 'crypto';

const auditService = new AuditService();
const pdfService = new PDFService();
const emailService = new EmailService();

export class InvoiceController {
  // List invoices with pagination and filtering
  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const {
        page = 1,
        limit = 20,
        status,
        customerId,
        dateFrom,
        dateTo,
        sortBy = 'createdAt',
        sortOrder = 'desc',
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

      if (dateFrom || dateTo) {
        where.issueDate = {};
        if (dateFrom) {
          where.issueDate.gte = new Date(dateFrom as string);
        }
        if (dateTo) {
          where.issueDate.lte = new Date(dateTo as string);
        }
      }

      // Get total count
      const total = await prisma.invoice.count({ where });

      // Get invoices
      const invoices = await prisma.invoice.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortBy as string]: sortOrder },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              items: true,
              payments: true,
            },
          },
        },
      });

      res.json({
        invoices,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error('List invoices error:', error);
      res.status(500).json({ error: 'Failed to list invoices' });
    }
  }

  // Get single invoice by ID
  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      const invoice = await prisma.invoice.findFirst({
        where: { id, userId },
        include: {
          customer: true,
          items: {
            include: {
              job: {
                select: {
                  id: true,
                  title: true,
                  scheduledStart: true,
                },
              },
            },
          },
          payments: true,
        },
      });

      if (!invoice) {
        res.status(404).json({ error: 'Invoice not found' });
        return;
      }

      res.json({ invoice });
    } catch (error) {
      console.error('Get invoice error:', error);
      res.status(500).json({ error: 'Failed to get invoice' });
    }
  }

  // Create new invoice
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.userId!;
      const {
        customerId,
        title,
        description,
        items,
        taxRate = 0,
        dueDate,
        paymentTerms,
        notes,
      } = req.body;

      // Verify customer belongs to user
      const customer = await prisma.customer.findFirst({
        where: { id: customerId, userId, deletedAt: null },
      });

      if (!customer) {
        res.status(404).json({ error: 'Customer not found' });
        return;
      }

      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber(userId);

      // Calculate totals
      let subtotal = 0;
      const processedItems = items.map((item: any, index: number) => {
        const itemTotal = item.quantity * item.unitPrice;
        subtotal += itemTotal;
        return {
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: itemTotal,
          jobId: item.jobId || null,
          sortOrder: index,
        };
      });

      const taxAmount = subtotal * (taxRate / 100);
      const total = subtotal + taxAmount;

      const invoice = await prisma.invoice.create({
        data: {
          userId,
          teamId: req.user?.teamId || null,
          customerId,
          invoiceNumber,
          title,
          description,
          status: 'DRAFT',
          subtotal,
          taxRate,
          taxAmount,
          total,
          amountDue: total,
          issueDate: new Date(),
          dueDate: new Date(dueDate),
          paymentTerms,
          notes,
          items: {
            create: processedItems,
          },
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          items: true,
        },
      });

      // Audit log
      await auditService.log({
        userId,
        teamId: req.user?.teamId,
        action: 'CREATE',
        entityType: 'Invoice',
        entityId: invoice.id,
        changes: { invoiceNumber, customerId, total },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(201).json({ invoice });
    } catch (error) {
      console.error('Create invoice error:', error);
      res.status(500).json({ error: 'Failed to create invoice' });
    }
  }

  // Update invoice
  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.userId!;
      const { id } = req.params;

      // Check if invoice exists and belongs to user
      const existing = await prisma.invoice.findFirst({
        where: { id, userId },
      });

      if (!existing) {
        res.status(404).json({ error: 'Invoice not found' });
        return;
      }

      // Can only update draft invoices
      if (existing.status !== 'DRAFT') {
        res.status(400).json({ error: 'Only draft invoices can be edited' });
        return;
      }

      const {
        title,
        description,
        items,
        taxRate,
        dueDate,
        paymentTerms,
        notes,
      } = req.body;

      // Delete existing items and recreate
      await prisma.invoiceItem.deleteMany({
        where: { invoiceId: id },
      });

      // Calculate totals
      let subtotal = 0;
      const processedItems = items.map((item: any, index: number) => {
        const itemTotal = item.quantity * item.unitPrice;
        subtotal += itemTotal;
        return {
          invoiceId: id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: itemTotal,
          jobId: item.jobId || null,
          sortOrder: index,
        };
      });

      const newTaxRate = taxRate ?? existing.taxRate;
      const taxAmount = subtotal * (newTaxRate / 100);
      const total = subtotal + taxAmount;

      // Create new items
      await prisma.invoiceItem.createMany({
        data: processedItems,
      });

      const invoice = await prisma.invoice.update({
        where: { id },
        data: {
          title,
          description,
          subtotal,
          taxRate: newTaxRate,
          taxAmount,
          total,
          amountDue: total - existing.amountPaid,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          paymentTerms,
          notes,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          items: true,
        },
      });

      // Audit log
      await auditService.log({
        userId,
        teamId: req.user?.teamId,
        action: 'UPDATE',
        entityType: 'Invoice',
        entityId: invoice.id,
        changes: req.body,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.json({ invoice });
    } catch (error) {
      console.error('Update invoice error:', error);
      res.status(500).json({ error: 'Failed to update invoice' });
    }
  }

  // Send invoice
  async send(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const { id } = req.params;
      const { email } = req.body;

      const invoice = await prisma.invoice.findFirst({
        where: { id, userId },
        include: {
          customer: true,
          items: true,
          user: {
            select: {
              name: true,
              businessName: true,
              email: true,
            },
          },
        },
      });

      if (!invoice) {
        res.status(404).json({ error: 'Invoice not found' });
        return;
      }

      const recipientEmail = email || invoice.customer.email;
      if (!recipientEmail) {
        res.status(400).json({ error: 'No email address available' });
        return;
      }

      // Generate PDF
      const pdfBuffer = await pdfService.generateInvoicePDF(invoice);

      // Send email
      await emailService.sendInvoiceEmail(
        recipientEmail,
        invoice,
        pdfBuffer,
        invoice.customer.name
      );

      // Update invoice status
      await prisma.invoice.update({
        where: { id },
        data: {
          status: invoice.status === 'DRAFT' ? 'SENT' : invoice.status,
          sentAt: new Date(),
        },
      });

      res.json({ message: 'Invoice sent successfully' });
    } catch (error) {
      console.error('Send invoice error:', error);
      res.status(500).json({ error: 'Failed to send invoice' });
    }
  }

  // Mark invoice as paid
  async markPaid(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const { id } = req.params;
      const { amount, method = 'CASH', reference, notes } = req.body;

      const invoice = await prisma.invoice.findFirst({
        where: { id, userId },
      });

      if (!invoice) {
        res.status(404).json({ error: 'Invoice not found' });
        return;
      }

      const paymentAmount = amount || invoice.amountDue;

      // Create payment record
      await prisma.payment.create({
        data: {
          userId,
          teamId: req.user?.teamId || null,
          customerId: invoice.customerId,
          invoiceId: id,
          amount: paymentAmount,
          method,
          status: 'COMPLETED',
          reference,
          notes,
          processedAt: new Date(),
        },
      });

      // Update invoice
      const newAmountPaid = invoice.amountPaid + paymentAmount;
      const newAmountDue = invoice.total - newAmountPaid;
      const newStatus = newAmountDue <= 0 ? 'PAID' : 'PARTIAL';

      await prisma.invoice.update({
        where: { id },
        data: {
          amountPaid: newAmountPaid,
          amountDue: newAmountDue,
          status: newStatus,
          paidAt: newStatus === 'PAID' ? new Date() : null,
        },
      });

      res.json({ message: 'Payment recorded', amountDue: newAmountDue });
    } catch (error) {
      console.error('Mark paid error:', error);
      res.status(500).json({ error: 'Failed to record payment' });
    }
  }

  // Generate PDF
  async downloadPdf(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      const invoice = await prisma.invoice.findFirst({
        where: { id, userId },
        include: {
          customer: true,
          items: true,
          user: {
            select: {
              name: true,
              businessName: true,
              email: true,
            },
          },
        },
      });

      if (!invoice) {
        res.status(404).json({ error: 'Invoice not found' });
        return;
      }

      const pdfBuffer = await pdfService.generateInvoicePDF(invoice);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Download PDF error:', error);
      res.status(500).json({ error: 'Failed to generate PDF' });
    }
  }

  // Generate unique invoice number
  private async generateInvoiceNumber(userId: string): Promise<string> {
    const year = new Date().getFullYear();
    
    // Get count of invoices this year
    const count = await prisma.invoice.count({
      where: {
        userId,
        createdAt: {
          gte: new Date(`${year}-01-01`),
        },
      },
    });

    return `INV-${year}-${String(count + 1).padStart(4, '0')}`;
  }
}
