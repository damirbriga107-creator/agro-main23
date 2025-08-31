import { logger } from '@daorsagro/utils';
import { config } from '@daorsagro/config';
import { NotificationPriority } from '../models/notification.model';

interface PushPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  priority?: NotificationPriority;
  badge?: number;
  sound?: string;
  icon?: string;
  image?: string;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  silent?: boolean;
  tag?: string;
  clickAction?: string;
  url?: string;
}

interface PushResult {
  messageId: string;
  status: 'sent' | 'failed' | 'partial';
  devices: {
    [deviceId: string]: {
      status: 'sent' | 'failed';
      error?: string;
    };
  };
}

interface DeviceToken {
  deviceId: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  userId: string;
  isActive: boolean;
  lastUsed: Date;
}

// Mock device token storage - in production this would be a database
const deviceTokens = new Map<string, DeviceToken[]>();

export class PushService {
  private fcmServerKey: string | null = null;
  private apnsKey: string | null = null;
  private webPushKeys: { publicKey: string; privateKey: string } | null = null;
  private isInitialized: boolean = false;

  async initialize(): Promise<void> {
    try {
      const pushConfig = config.push || {
        fcm: {
          serverKey: process.env.FCM_SERVER_KEY
        },
        apns: {
          keyId: process.env.APNS_KEY_ID,
          teamId: process.env.APNS_TEAM_ID,
          key: process.env.APNS_KEY
        },
        webPush: {
          publicKey: process.env.WEB_PUSH_PUBLIC_KEY,
          privateKey: process.env.WEB_PUSH_PRIVATE_KEY,
          email: process.env.WEB_PUSH_EMAIL
        }
      };

      this.fcmServerKey = pushConfig.fcm?.serverKey || null;
      this.apnsKey = pushConfig.apns?.key || null;
      this.webPushKeys = pushConfig.webPush?.publicKey && pushConfig.webPush?.privateKey
        ? {
            publicKey: pushConfig.webPush.publicKey,
            privateKey: pushConfig.webPush.privateKey
          }
        : null;

      this.isInitialized = true;
      
      logger.info('Push notification service initialized', {
        fcmEnabled: !!this.fcmServerKey,
        apnsEnabled: !!this.apnsKey,
        webPushEnabled: !!this.webPushKeys
      });
    } catch (error) {
      logger.error('Failed to initialize push service:', error);
      throw error;
    }
  }

  async sendPushNotification(payload: PushPayload): Promise<PushResult> {
    if (!this.isInitialized) {
      throw new Error('Push service not initialized');
    }

    try {
      logger.info('Sending push notification', {
        userId: payload.userId,
        title: payload.title,
        priority: payload.priority
      });

      const userDevices = this.getUserDevices(payload.userId);
      
      if (userDevices.length === 0) {
        logger.warn('No device tokens found for user', { userId: payload.userId });
        return {
          messageId: this.generateMessageId(),
          status: 'failed',
          devices: {}
        };
      }

      const result: PushResult = {
        messageId: this.generateMessageId(),
        status: 'sent',
        devices: {}
      };

      // Send to each device
      const devicePromises = userDevices.map(async (device) => {
        try {
          switch (device.platform) {
            case 'android':
              await this.sendAndroidPush(device, payload);
              result.devices[device.deviceId] = { status: 'sent' };
              break;

            case 'ios':
              await this.sendIosPush(device, payload);
              result.devices[device.deviceId] = { status: 'sent' };
              break;

            case 'web':
              await this.sendWebPush(device, payload);
              result.devices[device.deviceId] = { status: 'sent' };
              break;

            default:
              throw new Error(`Unsupported platform: ${device.platform}`);
          }
        } catch (error) {
          logger.error('Failed to send push to device', {
            deviceId: device.deviceId,
            platform: device.platform,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          
          result.devices[device.deviceId] = {
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      });

      await Promise.all(devicePromises);

      // Determine overall status
      const deviceStatuses = Object.values(result.devices);
      const sentCount = deviceStatuses.filter(d => d.status === 'sent').length;
      
      if (sentCount === 0) {
        result.status = 'failed';
      } else if (sentCount < deviceStatuses.length) {
        result.status = 'partial';
      }

      logger.info('Push notification sent', {
        messageId: result.messageId,
        status: result.status,
        deviceCount: deviceStatuses.length,
        sentCount
      });

      return result;
    } catch (error) {
      logger.error('Failed to send push notification:', error);
      throw error;
    }
  }

  async sendBulkPushNotification(
    userIds: string[],
    payload: Omit<PushPayload, 'userId'>
  ): Promise<PushResult[]> {
    logger.info('Sending bulk push notification', {
      userCount: userIds.length,
      title: payload.title
    });

    const promises = userIds.map(userId =>
      this.sendPushNotification({ ...payload, userId })
    );

    return Promise.all(promises);
  }

  async registerDeviceToken(
    userId: string,
    deviceId: string,
    token: string,
    platform: 'ios' | 'android' | 'web',
    metadata?: Record<string, any>
  ): Promise<void> {
    logger.info('Registering device token', {
      userId,
      deviceId,
      platform
    });

    const userDevices = deviceTokens.get(userId) || [];
    
    // Remove existing token for this device
    const filteredDevices = userDevices.filter(d => d.deviceId !== deviceId);
    
    // Add new token
    filteredDevices.push({
      deviceId,
      token,
      platform,
      userId,
      isActive: true,
      lastUsed: new Date()
    });

    deviceTokens.set(userId, filteredDevices);

    logger.info('Device token registered successfully', {
      userId,
      deviceId,
      platform,
      totalDevices: filteredDevices.length
    });
  }

  async unregisterDeviceToken(userId: string, deviceId: string): Promise<void> {
    logger.info('Unregistering device token', { userId, deviceId });

    const userDevices = deviceTokens.get(userId) || [];
    const filteredDevices = userDevices.filter(d => d.deviceId !== deviceId);
    
    if (filteredDevices.length > 0) {
      deviceTokens.set(userId, filteredDevices);
    } else {
      deviceTokens.delete(userId);
    }

    logger.info('Device token unregistered', {
      userId,
      deviceId,
      remainingDevices: filteredDevices.length
    });
  }

  async getUserDevices(userId: string): Promise<DeviceToken[]> {
    return deviceTokens.get(userId) || [];
  }

  async updateDeviceLastUsed(deviceId: string): Promise<void> {
    for (const [userId, devices] of deviceTokens.entries()) {
      const device = devices.find(d => d.deviceId === deviceId);
      if (device) {
        device.lastUsed = new Date();
        break;
      }
    }
  }

  async cleanupInactiveTokens(inactiveDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);

    let removedCount = 0;

    for (const [userId, devices] of deviceTokens.entries()) {
      const activeDevices = devices.filter(d => d.lastUsed > cutoffDate);
      removedCount += devices.length - activeDevices.length;

      if (activeDevices.length > 0) {
        deviceTokens.set(userId, activeDevices);
      } else {
        deviceTokens.delete(userId);
      }
    }

    logger.info('Cleaned up inactive device tokens', {
      removedCount,
      inactiveDays
    });

    return removedCount;
  }

  private async sendAndroidPush(device: DeviceToken, payload: PushPayload): Promise<void> {
    if (!this.fcmServerKey) {
      throw new Error('FCM server key not configured');
    }

    // Mock FCM API call - replace with actual implementation
    logger.info('Sending Android push via FCM', {
      deviceId: device.deviceId,
      token: device.token.substring(0, 20) + '...'
    });

    const fcmPayload = {
      to: device.token,
      notification: {
        title: payload.title,
        body: payload.body,
        icon: payload.icon || 'ic_notification',
        sound: payload.sound || 'default',
        tag: payload.tag,
        click_action: payload.clickAction
      },
      data: payload.data || {},
      priority: this.mapPriorityToFcm(payload.priority),
      android: {
        notification: {
          sound: payload.sound || 'default',
          priority: this.mapPriorityToFcm(payload.priority),
          notification_priority: 'PRIORITY_HIGH'
        }
      }
    };

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async sendIosPush(device: DeviceToken, payload: PushPayload): Promise<void> {
    if (!this.apnsKey) {
      throw new Error('APNs key not configured');
    }

    // Mock APNs API call - replace with actual implementation
    logger.info('Sending iOS push via APNs', {
      deviceId: device.deviceId,
      token: device.token.substring(0, 20) + '...'
    });

    const apnsPayload = {
      aps: {
        alert: {
          title: payload.title,
          body: payload.body
        },
        badge: payload.badge,
        sound: payload.sound || 'default',
        'mutable-content': 1,
        'content-available': payload.silent ? 1 : 0
      },
      data: payload.data || {}
    };

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async sendWebPush(device: DeviceToken, payload: PushPayload): Promise<void> {
    if (!this.webPushKeys) {
      throw new Error('Web Push keys not configured');
    }

    // Mock Web Push API call - replace with actual implementation
    logger.info('Sending web push', {
      deviceId: device.deviceId,
      token: device.token.substring(0, 20) + '...'
    });

    const webPushPayload = {
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icon-192x192.png',
      badge: '/badge-72x72.png',
      image: payload.image,
      data: payload.data || {},
      actions: payload.actions || [],
      requireInteraction: payload.requireInteraction || false,
      silent: payload.silent || false,
      tag: payload.tag,
      url: payload.url
    };

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private mapPriorityToFcm(priority?: NotificationPriority): 'high' | 'normal' {
    switch (priority) {
      case NotificationPriority.URGENT:
      case NotificationPriority.HIGH:
        return 'high';
      default:
        return 'normal';
    }
  }

  private generateMessageId(): string {
    return `push_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}