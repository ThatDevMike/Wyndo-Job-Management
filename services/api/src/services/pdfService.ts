/**
 * PDF Service
 * Generates PDFs for invoices, quotes, and reports
 */

import PDFDocument from 'pdfkit';

export class PDFService {
  /**
   * Generate invoice PDF
   */
  async generateInvoicePDF(invoice: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('INVOICE', { align: 'right' });
      doc.moveDown();
      doc.fontSize(12).text(`Invoice #: ${invoice.invoiceNumber}`, { align: 'right' });
      doc.text(`Date: ${new Date(invoice.issueDate).toLocaleDateString()}`, { align: 'right' });
      doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, { align: 'right' });
      doc.moveDown();

      // Customer info
      doc.fontSize(14).text('Bill To:');
      doc.fontSize(10);
      doc.text(invoice.customer?.name || 'Customer');
      if (invoice.customer?.addressLine1) {
        doc.text(invoice.customer.addressLine1);
      }
      if (invoice.customer?.city) {
        doc.text(`${invoice.customer.city} ${invoice.customer.postcode || ''}`);
      }
      doc.moveDown();

      // Items
      doc.fontSize(12).text('Items:', { underline: true });
      doc.moveDown(0.5);

      if (invoice.items) {
        invoice.items.forEach((item: any) => {
          doc.fontSize(10);
          doc.text(`${item.description} - Qty: ${item.quantity} x £${item.unitPrice.toFixed(2)} = £${item.total.toFixed(2)}`);
        });
      }

      // Totals
      doc.moveDown();
      doc.text(`Subtotal: £${invoice.subtotal?.toFixed(2) || '0.00'}`);
      if (invoice.taxAmount > 0) {
        doc.text(`VAT (${(invoice.taxRate * 100).toFixed(0)}%): £${invoice.taxAmount.toFixed(2)}`);
      }
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text(`Total: £${invoice.total?.toFixed(2) || '0.00'}`);

      // Footer
      doc.font('Helvetica').fontSize(8);
      doc.text('Thank you for your business!', 50, doc.page.height - 100, { align: 'center' });

      doc.end();
    });
  }

  /**
   * Generate quote PDF
   */
  async generateQuotePDF(quote: any): Promise<Buffer> {
    return this.generateInvoicePDF(quote);
  }
}
