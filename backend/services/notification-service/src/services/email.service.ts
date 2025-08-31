import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';
import { logger } from '@daorsagro/utils';
import { config } from '@daorsagro/config';
import { NotificationPriority } from '../models/notification.model';

interface EmailPayload {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
  priority?: NotificationPriority;
  replyTo?: string;
}

interface EmailResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
}

export class EmailService {
  private transporter: Transporter | null = null;
  private isInitialized: boolean = false;

  async initialize(): Promise<void> {
    try {
      const emailConfig = config.email || {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      };

      this.transporter = nodemailer.createTransporter({
        host: emailConfig.host,
        port: emailConfig.port,
        secure: emailConfig.secure,
        auth: emailConfig.auth,
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateLimit: 10, // 10 emails per second
        rateDelta: 1000
      });

      // Verify connection
      if (this.transporter) {
        await this.transporter.verify();
        this.isInitialized = true;
        logger.info('Email service initialized successfully', {
          host: emailConfig.host,
          port: emailConfig.port
        });
      }
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      throw error;
    }
  }

  async sendEmail(payload: EmailPayload): Promise<EmailResult> {
    if (!this.isInitialized || !this.transporter) {
      throw new Error('Email service not initialized');
    }

    try {
      logger.info('Sending email', {
        to: Array.isArray(payload.to) ? payload.to.length : 1,
        subject: payload.subject,
        priority: payload.priority
      });

      const mailOptions: SendMailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: payload.to,
        cc: payload.cc,
        bcc: payload.bcc,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
        attachments: payload.attachments,
        replyTo: payload.replyTo,
        priority: this.mapPriority(payload.priority)
      };

      const result = await this.transporter.sendMail(mailOptions);

      logger.info('Email sent successfully', {
        messageId: result.messageId,
        accepted: result.accepted.length,
        rejected: result.rejected.length
      });

      return {
        messageId: result.messageId,
        accepted: result.accepted,
        rejected: result.rejected
      };
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw error;
    }
  }

  async sendBulkEmail(
    recipients: string[],
    payload: Omit<EmailPayload, 'to'>
  ): Promise<EmailResult[]> {
    if (!this.isInitialized || !this.transporter) {
      throw new Error('Email service not initialized');
    }

    logger.info('Sending bulk email', {
      recipientCount: recipients.length,
      subject: payload.subject
    });

    const promises = recipients.map(async (recipient) => {
      try {
        return await this.sendEmail({ ...payload, to: recipient });
      } catch (error) {
        logger.error('Failed to send email to recipient', {
          recipient,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
      }
    });

    return Promise.allSettled(promises).then(results =>
      results
        .filter((result): result is PromiseFulfilledResult<EmailResult> =>
          result.status === 'fulfilled'
        )
        .map(result => result.value)
    );
  }

  async sendTemplatedEmail(
    templateName: string,
    templateData: Record<string, any>,
    payload: Omit<EmailPayload, 'html' | 'text'>
  ): Promise<EmailResult> {
    const template = await this.getTemplate(templateName);
    
    const processedHtml = this.processTemplate(template.html, templateData);
    const processedText = this.processTemplate(template.text || '', templateData);
    const processedSubject = this.processTemplate(payload.subject, templateData);

    return this.sendEmail({
      ...payload,
      subject: processedSubject,
      html: processedHtml,
      text: processedText
    });
  }

  async testConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }

  async getDeliveryStatus(messageId: string): Promise<{
    status: 'delivered' | 'bounced' | 'complained' | 'pending' | 'unknown';
    timestamp?: Date;
    details?: string;
  }> {
    // In a production environment, this would integrate with email service providers
    // like AWS SES, SendGrid, etc. to get delivery status
    logger.info('Checking delivery status', { messageId });
    
    return {
      status: 'pending',
      timestamp: new Date(),
      details: 'Delivery status checking not implemented'
    };
  }

  async disconnect(): Promise<void> {
    if (this.transporter) {
      this.transporter.close();
      this.transporter = null;
      this.isInitialized = false;
      logger.info('Email service disconnected');
    }
  }

  private mapPriority(priority?: NotificationPriority): 'high' | 'normal' | 'low' {
    switch (priority) {
      case NotificationPriority.URGENT:
        return 'high';
      case NotificationPriority.HIGH:
        return 'high';
      case NotificationPriority.NORMAL:
        return 'normal';
      case NotificationPriority.LOW:
        return 'low';
      default:
        return 'normal';
    }
  }

  private async getTemplate(templateName: string): Promise<{
    html: string;
    text: string;
  }> {
    // In production, this would fetch templates from database or file system
    const templates: Record<string, { html: string; text: string }> = {
      welcome: {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to DaorsAgro!</h2>
            <p>Dear {{name}},</p>
            <p>Welcome to DaorsAgro, your comprehensive agricultural financial management platform.</p>
            <p>We're excited to help you streamline your farm operations and financial management.</p>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3>What you can do with DaorsAgro:</h3>
              <ul>
                <li>Track income and expenses</li>
                <li>Apply for government subsidies</li>
                <li>Compare insurance policies</li>
                <li>Monitor weather conditions</li>
                <li>Analyze farm performance</li>
              </ul>
            </div>
            <p>Get started by logging into your dashboard.</p>
            <p>Best regards,<br>The DaorsAgro Team</p>
          </div>
        `,
        text: `Welcome to DaorsAgro!\n\nDear {{name}},\n\nWelcome to DaorsAgro, your comprehensive agricultural financial management platform.\n\nWe're excited to help you streamline your farm operations and financial management.\n\nBest regards,\nThe DaorsAgro Team`
      },
      transaction_alert: {
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Transaction Alert</h2>
            <p>A new transaction has been recorded in your account:</p>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px;">
              <p><strong>Type:</strong> {{type}}</p>
              <p><strong>Amount:</strong> {{amount}}</p>
              <p><strong>Category:</strong> {{category}}</p>
              <p><strong>Date:</strong> {{date}}</p>
              {{#description}}<p><strong>Description:</strong> {{description}}</p>{{/description}}
            </div>
            <p>View full details in your dashboard.</p>
          </div>
        `,
        text: `Transaction Alert\n\nA new transaction has been recorded:\n\nType: {{type}}\nAmount: {{amount}}\nCategory: {{category}}\nDate: {{date}}\n\nView full details in your dashboard.`
      }
    };

    return templates[templateName] || { html: '', text: '' };
  }

  private processTemplate(template: string, data: Record<string, any>): string {
    let result = template;
    
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    });

    return result;
  }
}