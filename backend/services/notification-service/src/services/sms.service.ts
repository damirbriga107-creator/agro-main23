import { logger } from '@daorsagro/utils';
import { config } from '@daorsagro/config';
import { NotificationPriority } from '../models/notification.model';

interface SmsPayload {
  to: string;
  message: string;
  priority?: NotificationPriority;
  sender?: string;
}

interface SmsResult {
  messageId: string;
  status: 'sent' | 'failed' | 'queued';
  cost?: number;
  parts?: number;
}

interface SmsProvider {
  sendSms(payload: SmsPayload): Promise<SmsResult>;
  getDeliveryStatus(messageId: string): Promise<{
    status: 'delivered' | 'failed' | 'pending' | 'unknown';
    timestamp?: Date;
  }>;
}

// Twilio SMS Provider Implementation
class TwilioSmsProvider implements SmsProvider {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor(accountSid: string, authToken: string, fromNumber: string) {
    this.accountSid = accountSid;
    this.authToken = authToken;
    this.fromNumber = fromNumber;
  }

  async sendSms(payload: SmsPayload): Promise<SmsResult> {
    try {
      // In production, this would use the actual Twilio SDK
      logger.info('Sending SMS via Twilio', {
        to: payload.to,
        messageLength: payload.message.length,
        priority: payload.priority
      });

      // Mock implementation - replace with actual Twilio API call
      const messageId = `tw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 100));

      return {
        messageId,
        status: 'sent',
        cost: 0.0075, // Mock cost in USD
        parts: Math.ceil(payload.message.length / 160)
      };
    } catch (error) {
      logger.error('Failed to send SMS via Twilio:', error);
      throw error;
    }
  }

  async getDeliveryStatus(messageId: string): Promise<{
    status: 'delivered' | 'failed' | 'pending' | 'unknown';
    timestamp?: Date;
  }> {
    // Mock implementation
    logger.info('Checking SMS delivery status via Twilio', { messageId });
    return {
      status: 'delivered',
      timestamp: new Date()
    };
  }
}

// AWS SNS SMS Provider Implementation
class AwsSnsSmsProvider implements SmsProvider {
  private accessKeyId: string;
  private secretAccessKey: string;
  private region: string;

  constructor(accessKeyId: string, secretAccessKey: string, region: string) {
    this.accessKeyId = accessKeyId;
    this.secretAccessKey = secretAccessKey;
    this.region = region;
  }

  async sendSms(payload: SmsPayload): Promise<SmsResult> {
    try {
      logger.info('Sending SMS via AWS SNS', {
        to: payload.to,
        messageLength: payload.message.length,
        priority: payload.priority
      });

      // Mock implementation - replace with actual AWS SNS SDK call
      const messageId = `sns_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await new Promise(resolve => setTimeout(resolve, 100));

      return {
        messageId,
        status: 'sent',
        cost: 0.00645, // Mock cost in USD
        parts: Math.ceil(payload.message.length / 160)
      };
    } catch (error) {
      logger.error('Failed to send SMS via AWS SNS:', error);
      throw error;
    }
  }

  async getDeliveryStatus(messageId: string): Promise<{
    status: 'delivered' | 'failed' | 'pending' | 'unknown';
    timestamp?: Date;
  }> {
    logger.info('Checking SMS delivery status via AWS SNS', { messageId });
    return {
      status: 'delivered',
      timestamp: new Date()
    };
  }
}

export class SmsService {
  private provider: SmsProvider | null = null;
  private isInitialized: boolean = false;
  private defaultSender: string;

  async initialize(): Promise<void> {
    try {
      const smsConfig = config.sms || {
        provider: process.env.SMS_PROVIDER || 'twilio',
        defaultSender: process.env.SMS_SENDER || 'DaorsAgro'
      };

      this.defaultSender = smsConfig.defaultSender;

      switch (smsConfig.provider) {
        case 'twilio':
          this.provider = new TwilioSmsProvider(
            process.env.TWILIO_ACCOUNT_SID || '',
            process.env.TWILIO_AUTH_TOKEN || '',
            process.env.TWILIO_PHONE_NUMBER || ''
          );
          break;

        case 'aws-sns':
          this.provider = new AwsSnsSmsProvider(
            process.env.AWS_ACCESS_KEY_ID || '',
            process.env.AWS_SECRET_ACCESS_KEY || '',
            process.env.AWS_REGION || 'us-east-1'
          );
          break;

        default:
          throw new Error(`Unsupported SMS provider: ${smsConfig.provider}`);
      }

      this.isInitialized = true;
      logger.info('SMS service initialized successfully', {
        provider: smsConfig.provider
      });
    } catch (error) {
      logger.error('Failed to initialize SMS service:', error);
      throw error;
    }
  }

  async sendSms(payload: SmsPayload): Promise<SmsResult> {
    if (!this.isInitialized || !this.provider) {
      throw new Error('SMS service not initialized');
    }

    try {
      // Validate phone number format
      const cleanedPhone = this.validateAndCleanPhoneNumber(payload.to);
      
      // Check message length and truncate if necessary
      const processedMessage = this.processMessage(payload.message);

      logger.info('Sending SMS', {
        to: cleanedPhone,
        messageLength: processedMessage.length,
        priority: payload.priority
      });

      const result = await this.provider.sendSms({
        ...payload,
        to: cleanedPhone,
        message: processedMessage,
        sender: payload.sender || this.defaultSender
      });

      logger.info('SMS sent successfully', {
        messageId: result.messageId,
        status: result.status,
        cost: result.cost,
        parts: result.parts
      });

      return result;
    } catch (error) {
      logger.error('Failed to send SMS:', error);
      throw error;
    }
  }

  async sendBulkSms(
    phoneNumbers: string[],
    message: string,
    options: {
      priority?: NotificationPriority;
      sender?: string;
      batchSize?: number;
      delayBetweenBatches?: number;
    } = {}
  ): Promise<SmsResult[]> {
    if (!this.isInitialized || !this.provider) {
      throw new Error('SMS service not initialized');
    }

    const {
      priority = NotificationPriority.NORMAL,
      sender,
      batchSize = 10,
      delayBetweenBatches = 1000
    } = options;

    logger.info('Sending bulk SMS', {
      recipientCount: phoneNumbers.length,
      messageLength: message.length,
      batchSize
    });

    const results: SmsResult[] = [];
    
    // Process in batches to avoid rate limits
    for (let i = 0; i < phoneNumbers.length; i += batchSize) {
      const batch = phoneNumbers.slice(i, i + batchSize);
      
      const batchPromises = batch.map(phoneNumber =>
        this.sendSms({
          to: phoneNumber,
          message,
          priority,
          sender
        }).catch(error => {
          logger.error('Failed to send SMS in batch', {
            phoneNumber,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          return {
            messageId: '',
            status: 'failed' as const,
            cost: 0,
            parts: 0
          };
        })
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Delay between batches if not the last batch
      if (i + batchSize < phoneNumbers.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }

    const successCount = results.filter(r => r.status === 'sent').length;
    logger.info('Bulk SMS completed', {
      total: phoneNumbers.length,
      successful: successCount,
      failed: phoneNumbers.length - successCount
    });

    return results;
  }

  async getDeliveryStatus(messageId: string): Promise<{
    status: 'delivered' | 'failed' | 'pending' | 'unknown';
    timestamp?: Date;
  }> {
    if (!this.provider) {
      throw new Error('SMS service not initialized');
    }

    return this.provider.getDeliveryStatus(messageId);
  }

  async validatePhoneNumber(phoneNumber: string): Promise<{
    isValid: boolean;
    formatted?: string;
    country?: string;
    carrier?: string;
  }> {
    try {
      const cleaned = this.validateAndCleanPhoneNumber(phoneNumber);
      
      // Basic validation - in production, use a proper phone validation service
      const isValid = /^\+[1-9]\d{1,14}$/.test(cleaned);
      
      return {
        isValid,
        formatted: isValid ? cleaned : undefined,
        country: 'Unknown', // Would be determined by actual validation service
        carrier: 'Unknown'   // Would be determined by actual validation service
      };
    } catch {
      return { isValid: false };
    }
  }

  private validateAndCleanPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters except +
    let cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // Ensure it starts with +
    if (!cleaned.startsWith('+')) {
      // Assume US/Canada if no country code
      if (cleaned.length === 10) {
        cleaned = '+1' + cleaned;
      } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
        cleaned = '+' + cleaned;
      } else {
        throw new Error(`Invalid phone number format: ${phoneNumber}`);
      }
    }

    // Basic validation
    if (cleaned.length < 10 || cleaned.length > 16) {
      throw new Error(`Invalid phone number length: ${phoneNumber}`);
    }

    return cleaned;
  }

  private processMessage(message: string): string {
    // SMS messages should be concise
    const maxLength = 1600; // 10 SMS parts max
    
    if (message.length > maxLength) {
      logger.warn('SMS message too long, truncating', {
        originalLength: message.length,
        maxLength
      });
      return message.substring(0, maxLength - 3) + '...';
    }

    return message;
  }
}