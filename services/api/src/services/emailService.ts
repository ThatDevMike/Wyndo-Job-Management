/**
 * Email Service
 * Handles all email sending (mock implementation for development)
 */

import { config } from '../config';

export class EmailService {
  private isInitialized = false;

  constructor() {
    if (config.email.apiKey) {
      this.isInitialized = true;
    }
  }

  /**
   * Send email (mock in development)
   */
  private async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<void> {
    if (config.env === 'development' || !this.isInitialized) {
      console.log('📧 Email (mock):', {
        to: options.to,
        subject: options.subject,
      });
      return;
    }

    // In production, use SendGrid or AWS SES
    // For now, just log
    console.log('📧 Email sent:', options.to, options.subject);
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Welcome to Wyndo! 🎉',
      html: `
        <h1>Welcome to Wyndo!</h1>
        <p>Hi ${name || 'there'},</p>
        <p>Welcome to Wyndo! We're excited to have you on board.</p>
        <p>You're starting with a 14-day free trial of our Business tier.</p>
        <p>Best regards,<br>The Wyndo Team</p>
      `,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, resetToken: string, name?: string): Promise<void> {
    const resetUrl = `${config.appUrl}/auth/reset-password?token=${resetToken}`;
    
    await this.sendEmail({
      to: email,
      subject: 'Reset Your Wyndo Password',
      html: `
        <h1>Reset Your Password</h1>
        <p>Hi ${name || 'there'},</p>
        <p>We received a request to reset your password.</p>
        <p><a href="${resetUrl}">Click here to reset your password</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      `,
    });
  }

  /**
   * Send invoice email
   */
  async sendInvoiceEmail(
    email: string,
    invoice: any,
    pdfBuffer: Buffer,
    name?: string
  ): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `Invoice ${invoice.invoiceNumber} from Wyndo`,
      html: `
        <h1>Invoice ${invoice.invoiceNumber}</h1>
        <p>Hi ${name || 'there'},</p>
        <p>Please find your invoice attached.</p>
        <p>Amount: £${invoice.total.toFixed(2)}</p>
        <p>Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}</p>
        <p>Thank you for your business!</p>
      `,
    });
  }
}
