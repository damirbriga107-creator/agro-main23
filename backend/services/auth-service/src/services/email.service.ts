import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';
import { Logger } from '../utils/logger';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
  replyTo?: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export interface EmailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: any[];
}

/**
 * Enhanced Email Service with templating and queue support
 */
export class EmailService {
  private transporter: Transporter;
  private logger: Logger;
  private config: EmailConfig;
  private isConfigured: boolean = false;

  constructor(config?: Partial<EmailConfig>) {
    this.logger = new Logger('email-service');
    this.config = {
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      },
      from: process.env.SMTP_FROM || 'noreply@daorsagro.com',
      replyTo: process.env.SMTP_REPLY_TO,
      ...config
    };

    this.createTransporter();
  }

  /**
   * Initialize email service
   */
  async initialize(): Promise<void> {
    try {
      // Verify SMTP connection if configured
      if (this.isConfigured) {
        await this.transporter.verify();
        this.logger.info('Email service initialized successfully');
      } else {
        this.logger.info('Email service started without configuration');
      }
    } catch (error) {
      this.logger.warn('Email service initialization failed, continuing without email functionality', { error });
    }
  }

  /**
   * Create nodemailer transporter
   */
  private createTransporter(): void {
    try {
      this.transporter = nodemailer.createTransporter({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: this.config.auth,
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 5
      });

      this.isConfigured = true;
      this.logger.info('Email transporter configured successfully');
    } catch (error) {
      this.logger.error('Failed to configure email transporter', error);
      this.isConfigured = false;
    }
  }

  /**
   * Verify email configuration
   */
  public async verifyConnection(): Promise<boolean> {
    try {
      if (!this.isConfigured) {
        throw new Error('Email service not configured');
      }

      await this.transporter.verify();
      this.logger.info('Email connection verified successfully');
      return true;
    } catch (error) {
      this.logger.error('Email connection verification failed', error);
      return false;
    }
  }

  /**
   * Send email
   */
  public async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      if (!this.isConfigured) {
        throw new Error('Email service not configured');
      }

      const mailOptions: SendMailOptions = {
        from: this.config.from,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(', ') : options.cc) : undefined,
        bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc) : undefined,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments,
        replyTo: this.config.replyTo
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      this.logger.info('Email sent successfully', {
        messageId: info.messageId,
        to: options.to,
        subject: options.subject
      });

      return true;
    } catch (error) {
      this.logger.error('Failed to send email', error, {
        to: options.to,
        subject: options.subject
      });
      return false;
    }
  }

  /**
   * Send welcome email
   */
  public async sendWelcomeEmail(email: string, name: string, verificationUrl?: string): Promise<boolean> {
    const template = this.getWelcomeTemplate(name, verificationUrl);
    
    return this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }

  /**
   * Send password reset email
   */
  public async sendPasswordResetEmail(email: string, name: string, resetUrl: string): Promise<boolean> {
    const template = this.getPasswordResetTemplate(name, resetUrl);
    
    return this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }

  /**
   * Send email verification
   */
  public async sendEmailVerification(email: string, name: string, verificationUrl: string): Promise<boolean> {
    const template = this.getEmailVerificationTemplate(name, verificationUrl);
    
    return this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }

  /**
   * Send two-factor authentication code
   */
  public async send2FACode(email: string, name: string, code: string): Promise<boolean> {
    const template = this.get2FACodeTemplate(name, code);
    
    return this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }

  /**
   * Send account locked notification
   */
  public async sendAccountLockedEmail(email: string, name: string, unlockUrl?: string): Promise<boolean> {
    const template = this.getAccountLockedTemplate(name, unlockUrl);
    
    return this.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }

  /**
   * Get welcome email template
   */
  private getWelcomeTemplate(name: string, verificationUrl?: string): EmailTemplate {
    const verificationSection = verificationUrl ? `
      <p>Please verify your email address by clicking the button below:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
      </div>
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
    ` : '';

    return {
      subject: 'Welcome to DaorsAgro - Agricultural Financial Management Platform',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to DaorsAgro</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
            <h1 style="color: #2E7D32; text-align: center; margin-bottom: 30px;">Welcome to DaorsAgro! 🌱</h1>
            
            <p>Dear ${name},</p>
            
            <p>Welcome to DaorsAgro, your comprehensive agricultural financial management platform! We're excited to help you modernize your farm operations with our integrated financial tracking, subsidy management, and analytics tools.</p>
            
            ${verificationSection}
            
            <div style="background-color: #E8F5E8; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #2E7D32; margin-top: 0;">What you can do with DaorsAgro:</h3>
              <ul style="margin: 10px 0;">
                <li>Track and forecast your agricultural finances</li>
                <li>Discover and apply for government subsidies</li>
                <li>Compare insurance policies and manage claims</li>
                <li>Access business intelligence and predictive analytics</li>
                <li>Monitor your farm with IoT sensor integration</li>
              </ul>
            </div>
            
            <p>If you have any questions or need assistance, our support team is here to help.</p>
            
            <p>Best regards,<br>The DaorsAgro Team</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding: 20px; border-top: 1px solid #ddd;">
            <p style="color: #666; font-size: 12px;">
              This email was sent to ${name}. If you didn't create an account with DaorsAgro, please ignore this email.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `Welcome to DaorsAgro!\n\nDear ${name},\n\nWelcome to DaorsAgro, your comprehensive agricultural financial management platform! We're excited to help you modernize your farm operations.\n\n${verificationUrl ? `Please verify your email by visiting: ${verificationUrl}\n\n` : ''}Best regards,\nThe DaorsAgro Team`
    };
  }

  /**
   * Get password reset email template
   */
  private getPasswordResetTemplate(name: string, resetUrl: string): EmailTemplate {
    return {
      subject: 'Reset Your DaorsAgro Password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Password Reset - DaorsAgro</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
            <h1 style="color: #D32F2F; text-align: center; margin-bottom: 30px;">Password Reset Request 🔒</h1>
            
            <p>Dear ${name},</p>
            
            <p>We received a request to reset your DaorsAgro account password. If you made this request, click the button below to reset your password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #D32F2F; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
            </div>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${resetUrl}</p>
            
            <div style="background-color: #FFF3E0; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #FF9800;">
              <p style="margin: 0;"><strong>Security Note:</strong> This link will expire in 15 minutes for your security. If you didn't request this password reset, please ignore this email and your password will remain unchanged.</p>
            </div>
            
            <p>If you continue to have problems, please contact our support team.</p>
            
            <p>Best regards,<br>The DaorsAgro Team</p>
          </div>
        </body>
        </html>
      `,
      text: `Password Reset Request\n\nDear ${name},\n\nWe received a request to reset your DaorsAgro account password. If you made this request, visit this link to reset your password:\n\n${resetUrl}\n\nThis link will expire in 15 minutes for your security.\n\nIf you didn't request this password reset, please ignore this email.\n\nBest regards,\nThe DaorsAgro Team`
    };
  }

  /**
   * Get email verification template
   */
  private getEmailVerificationTemplate(name: string, verificationUrl: string): EmailTemplate {
    return {
      subject: 'Verify Your Email Address - DaorsAgro',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Email Verification - DaorsAgro</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
            <h1 style="color: #1976D2; text-align: center; margin-bottom: 30px;">Verify Your Email Address 📧</h1>
            
            <p>Dear ${name},</p>
            
            <p>Thank you for signing up for DaorsAgro! To complete your registration and secure your account, please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="background-color: #1976D2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
            </div>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
            
            <div style="background-color: #E3F2FD; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Important:</strong> This verification link will expire in 24 hours. Once verified, you'll have full access to all DaorsAgro features.</p>
            </div>
            
            <p>If you didn't create an account with DaorsAgro, please ignore this email.</p>
            
            <p>Best regards,<br>The DaorsAgro Team</p>
          </div>
        </body>
        </html>
      `,
      text: `Email Verification\n\nDear ${name},\n\nThank you for signing up for DaorsAgro! Please verify your email address by visiting:\n\n${verificationUrl}\n\nThis link will expire in 24 hours.\n\nIf you didn't create an account with DaorsAgro, please ignore this email.\n\nBest regards,\nThe DaorsAgro Team`
    };
  }

  /**
   * Get 2FA code email template
   */
  private get2FACodeTemplate(name: string, code: string): EmailTemplate {
    return {
      subject: 'Your DaorsAgro Security Code',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Security Code - DaorsAgro</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
            <h1 style="color: #FF6F00; text-align: center; margin-bottom: 30px;">Your Security Code 🔐</h1>
            
            <p>Dear ${name},</p>
            
            <p>You requested a security code for your DaorsAgro account. Use the code below to complete your login:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="background-color: #FF6F00; color: white; padding: 20px; border-radius: 10px; font-size: 32px; font-weight: bold; letter-spacing: 8px; display: inline-block;">
                ${code}
              </div>
            </div>
            
            <div style="background-color: #FFF8E1; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Security Note:</strong> This code will expire in 5 minutes. Never share this code with anyone. DaorsAgro will never ask for this code via phone or email.</p>
            </div>
            
            <p>If you didn't request this code, please secure your account immediately and contact our support team.</p>
            
            <p>Best regards,<br>The DaorsAgro Team</p>
          </div>
        </body>
        </html>
      `,
      text: `Your Security Code\n\nDear ${name},\n\nYour DaorsAgro security code is: ${code}\n\nThis code will expire in 5 minutes. Never share this code with anyone.\n\nIf you didn't request this code, please secure your account immediately.\n\nBest regards,\nThe DaorsAgro Team`
    };
  }

  /**
   * Get account locked email template
   */
  private getAccountLockedTemplate(name: string, unlockUrl?: string): EmailTemplate {
    const unlockSection = unlockUrl ? `
      <p>You can unlock your account by clicking the button below:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${unlockUrl}" style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Unlock Account</a>
      </div>
    ` : '<p>Please contact our support team to unlock your account.</p>';

    return {
      subject: 'Account Security Alert - DaorsAgro',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Account Locked - DaorsAgro</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
            <h1 style="color: #D32F2F; text-align: center; margin-bottom: 30px;">Account Security Alert 🚨</h1>
            
            <p>Dear ${name},</p>
            
            <p>Your DaorsAgro account has been temporarily locked due to multiple failed login attempts. This is a security measure to protect your account.</p>
            
            ${unlockSection}
            
            <div style="background-color: #FFEBEE; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #D32F2F;">
              <h3 style="color: #D32F2F; margin-top: 0;">Security Tips:</h3>
              <ul style="margin: 10px 0;">
                <li>Use a strong, unique password</li>
                <li>Enable two-factor authentication</li>
                <li>Never share your login credentials</li>
                <li>Log out when using shared computers</li>
              </ul>
            </div>
            
            <p>If you suspect unauthorized access to your account, please contact our support team immediately.</p>
            
            <p>Best regards,<br>The DaorsAgro Security Team</p>
          </div>
        </body>
        </html>
      `,
      text: `Account Security Alert\n\nDear ${name},\n\nYour DaorsAgro account has been temporarily locked due to multiple failed login attempts.\n\n${unlockUrl ? `You can unlock your account by visiting: ${unlockUrl}\n\n` : 'Please contact our support team to unlock your account.\n\n'}If you suspect unauthorized access, please contact our support team immediately.\n\nBest regards,\nThe DaorsAgro Security Team`
    };
  }

  /**
   * Health check for email service
   */
  public async healthCheck(): Promise<{ status: string; configured: boolean }> {
    return {
      status: this.isConfigured ? 'healthy' : 'not_configured',
      configured: this.isConfigured
    };
  }

  /**
   * Cleanup email service
   */
  public async cleanup(): Promise<void> {
    try {
      if (this.transporter) {
        this.transporter.close();
        this.logger.info('Email service cleaned up successfully');
      }
    } catch (error) {
      this.logger.error('Error during email service cleanup', error);
    }
  }
}