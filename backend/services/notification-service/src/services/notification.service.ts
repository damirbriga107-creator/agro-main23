import { logger } from '@daorsagro/utils';
import { NotificationTemplate, NotificationChannel, NotificationPriority, NotificationStatus } from '../models/notification.model';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { PushService } from './push.service';

interface NotificationPayload {
  userId: string;
  farmId?: string;
  type: string;
  title: string;
  message: string;
  channels: NotificationChannel[];
  priority: NotificationPriority;
  data?: Record<string, any>;
  templateId?: string;
  templateData?: Record<string, any>;
  scheduledAt?: Date;
  expiresAt?: Date;
}

interface NotificationResult {
  id: string;
  status: NotificationStatus;
  channels: {
    [key in NotificationChannel]?: {
      status: 'sent' | 'failed' | 'pending';
      error?: string;
      messageId?: string;
    };
  };
}

export class NotificationService {
  private emailService: EmailService;
  private smsService: SmsService;
  private pushService: PushService;
  private templates: Map<string, NotificationTemplate> = new Map();

  constructor(
    emailService: EmailService,
    smsService: SmsService,
    pushService: PushService
  ) {
    this.emailService = emailService;
    this.smsService = smsService;
    this.pushService = pushService;
    this.loadDefaultTemplates();
  }

  /**
   * Send notification through specified channels
   */
  async sendNotification(payload: NotificationPayload): Promise<NotificationResult> {
    const notificationId = this.generateId();
    
    logger.info('Sending notification', {
      id: notificationId,
      userId: payload.userId,
      type: payload.type,
      channels: payload.channels,
      priority: payload.priority
    });

    const result: NotificationResult = {
      id: notificationId,
      status: NotificationStatus.PENDING,
      channels: {}
    };

    try {
      // Process template if specified
      let finalTitle = payload.title;
      let finalMessage = payload.message;

      if (payload.templateId && payload.templateData) {
        const template = this.templates.get(payload.templateId);
        if (template) {
          finalTitle = this.processTemplate(template.title, payload.templateData);
          finalMessage = this.processTemplate(template.content, payload.templateData);
        }
      }

      // Send through each specified channel
      const channelPromises = payload.channels.map(async (channel) => {
        try {
          switch (channel) {
            case NotificationChannel.EMAIL:
              const emailResult = await this.emailService.sendEmail({
                to: await this.getUserEmail(payload.userId),
                subject: finalTitle,
                html: finalMessage,
                text: this.stripHtml(finalMessage),
                priority: payload.priority
              });
              
              result.channels[channel] = {
                status: 'sent',
                messageId: emailResult.messageId
              };
              break;

            case NotificationChannel.SMS:
              const smsResult = await this.smsService.sendSms({
                to: await this.getUserPhone(payload.userId),
                message: finalMessage,
                priority: payload.priority
              });
              
              result.channels[channel] = {
                status: 'sent',
                messageId: smsResult.messageId
              };
              break;

            case NotificationChannel.PUSH:
              const pushResult = await this.pushService.sendPushNotification({
                userId: payload.userId,
                title: finalTitle,
                body: finalMessage,
                data: payload.data,
                priority: payload.priority
              });
              
              result.channels[channel] = {
                status: 'sent',
                messageId: pushResult.messageId
              };
              break;

            case NotificationChannel.IN_APP:
              await this.saveInAppNotification({
                userId: payload.userId,
                title: finalTitle,
                message: finalMessage,
                type: payload.type,
                data: payload.data,
                expiresAt: payload.expiresAt
              });
              
              result.channels[channel] = {
                status: 'sent'
              };
              break;

            default:
              throw new Error(`Unsupported notification channel: ${channel}`);
          }
        } catch (error) {
          logger.error(`Failed to send notification via ${channel}`, {
            notificationId,
            channel,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          
          result.channels[channel] = {
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      });

      await Promise.all(channelPromises);

      // Determine overall status
      const statuses = Object.values(result.channels).map(c => c?.status);
      if (statuses.every(s => s === 'sent')) {
        result.status = NotificationStatus.SENT;
      } else if (statuses.some(s => s === 'sent')) {
        result.status = NotificationStatus.PARTIAL;
      } else {
        result.status = NotificationStatus.FAILED;
      }

      logger.info('Notification processing completed', {
        id: notificationId,
        status: result.status,
        channels: result.channels
      });

      return result;
    } catch (error) {
      logger.error('Notification processing failed', {
        id: notificationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      result.status = NotificationStatus.FAILED;
      return result;
    }
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotification(
    userIds: string[],
    payload: Omit<NotificationPayload, 'userId'>
  ): Promise<NotificationResult[]> {
    logger.info('Sending bulk notification', {
      userCount: userIds.length,
      type: payload.type,
      channels: payload.channels
    });

    const promises = userIds.map(userId => 
      this.sendNotification({ ...payload, userId })
    );

    return Promise.all(promises);
  }

  /**
   * Schedule notification for later delivery
   */
  async scheduleNotification(
    payload: NotificationPayload,
    scheduledAt: Date
  ): Promise<string> {
    const notificationId = this.generateId();

    logger.info('Scheduling notification', {
      id: notificationId,
      scheduledAt: scheduledAt.toISOString(),
      type: payload.type
    });

    // In a production environment, this would be stored in a database
    // and processed by a scheduler service (e.g., node-cron, Bull queue)
    setTimeout(async () => {
      await this.sendNotification(payload);
    }, scheduledAt.getTime() - Date.now());

    return notificationId;
  }

  /**
   * Create notification template
   */
  createTemplate(template: NotificationTemplate): void {
    this.templates.set(template.id, template);
    logger.info('Notification template created', { templateId: template.id });
  }

  /**
   * Get notification preferences for user
   */
  async getUserPreferences(userId: string): Promise<{
    channels: NotificationChannel[];
    types: string[];
    schedule?: {
      quietHours?: { start: string; end: string };
      timezone?: string;
    };
  }> {
    // In production, this would fetch from user preferences database
    return {
      channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH, NotificationChannel.IN_APP],
      types: ['financial', 'subsidy', 'insurance', 'weather', 'system'],
      schedule: {
        quietHours: { start: '22:00', end: '07:00' },
        timezone: 'UTC'
      }
    };
  }

  /**
   * Update notification preferences for user
   */
  async updateUserPreferences(
    userId: string,
    preferences: {
      channels?: NotificationChannel[];
      types?: string[];
      schedule?: {
        quietHours?: { start: string; end: string };
        timezone?: string;
      };
    }
  ): Promise<void> {
    logger.info('Updating notification preferences', { userId, preferences });
    // In production, this would update the user preferences in database
  }

  /**
   * Get notification history for user
   */
  async getNotificationHistory(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      type?: string;
      channel?: NotificationChannel;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{
    notifications: any[];
    total: number;
    hasMore: boolean;
  }> {
    // In production, this would fetch from notification history database
    return {
      notifications: [],
      total: 0,
      hasMore: false
    };
  }

  private loadDefaultTemplates(): void {
    const templates: NotificationTemplate[] = [
      {
        id: 'welcome',
        name: 'Welcome Message',
        title: 'Welcome to DaorsAgro, {{name}}!',
        content: `<h2>Welcome {{name}}</h2>
                 <p>Thank you for joining DaorsAgro. We're excited to help you manage your agricultural finances.</p>
                 <p>Get started by setting up your farm profile and exploring our financial management tools.</p>`,
        variables: ['name'],
        type: 'system'
      },
      {
        id: 'transaction_alert',
        name: 'Transaction Alert',
        title: 'New Transaction: {{amount}}',
        content: `<p>A new {{type}} transaction has been recorded:</p>
                 <ul>
                   <li>Amount: {{amount}}</li>
                   <li>Category: {{category}}</li>
                   <li>Date: {{date}}</li>
                 </ul>`,
        variables: ['amount', 'type', 'category', 'date'],
        type: 'financial'
      },
      {
        id: 'subsidy_deadline',
        name: 'Subsidy Deadline Reminder',
        title: 'Subsidy Application Deadline Approaching',
        content: `<p>The application deadline for <strong>{{programName}}</strong> is approaching.</p>
                 <p>Deadline: {{deadline}}</p>
                 <p>Don't miss this opportunity - apply now!</p>`,
        variables: ['programName', 'deadline'],
        type: 'subsidy'
      },
      {
        id: 'weather_alert',
        name: 'Weather Alert',
        title: 'Weather Alert: {{alertType}}',
        content: `<p><strong>{{alertType}}</strong> expected in your area.</p>
                 <p>{{description}}</p>
                 <p>Please take appropriate precautions for your crops and livestock.</p>`,
        variables: ['alertType', 'description'],
        type: 'weather'
      },
      {
        id: 'insurance_claim',
        name: 'Insurance Claim Update',
        title: 'Insurance Claim Update - {{claimNumber}}',
        content: `<p>Your insurance claim <strong>{{claimNumber}}</strong> has been updated:</p>
                 <p>Status: {{status}}</p>
                 <p>{{details}}</p>`,
        variables: ['claimNumber', 'status', 'details'],
        type: 'insurance'
      }
    ];

    templates.forEach(template => {
      this.templates.set(template.id, template);
    });

    logger.info('Default notification templates loaded', { count: templates.length });
  }

  private processTemplate(template: string, data: Record<string, any>): string {
    let result = template;
    
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    });

    return result;
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }

  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getUserEmail(userId: string): Promise<string> {
    // In production, this would fetch from user database
    return `user${userId}@example.com`;
  }

  private async getUserPhone(userId: string): Promise<string> {
    // In production, this would fetch from user database
    return `+1234567890`;
  }

  private async saveInAppNotification(notification: {
    userId: string;
    title: string;
    message: string;
    type: string;
    data?: Record<string, any>;
    expiresAt?: Date;
  }): Promise<void> {
    logger.info('Saving in-app notification', {
      userId: notification.userId,
      type: notification.type
    });
    // In production, this would save to database
  }
}