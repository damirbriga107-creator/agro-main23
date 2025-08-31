import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { logger } from '@daorsagro/utils';
import { 
  NotificationChannel, 
  NotificationPriority, 
  NotificationType,
  isValidChannel,
  isValidPriority,
  isValidType
} from '../models/notification.model';
import { requirePermission } from '../middleware/auth.middleware';
import { strictRateLimiter } from '../middleware/rate-limiter.middleware';
import { notificationService } from '../index';

const router = Router();

interface AuthenticatedRequest extends Request {
  apiKey?: string;
  clientId?: string;
}

// Validation middleware
const validateNotification = [
  body('userId')
    .isString()
    .isLength({ min: 1 })
    .withMessage('User ID is required'),
  body('type')
    .isString()
    .custom((value) => {
      if (!isValidType(value)) {
        throw new Error(`Invalid notification type. Must be one of: ${Object.values(NotificationType).join(', ')}`);
      }
      return true;
    }),
  body('title')
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('message')
    .isString()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message must be between 1 and 2000 characters'),
  body('channels')
    .isArray({ min: 1 })
    .withMessage('At least one channel is required')
    .custom((channels) => {
      if (!Array.isArray(channels) || !channels.every(isValidChannel)) {
        throw new Error(`Invalid channels. Must be array of: ${Object.values(NotificationChannel).join(', ')}`);
      }
      return true;
    }),
  body('priority')
    .optional()
    .custom((value) => {
      if (value && !isValidPriority(value)) {
        throw new Error(`Invalid priority. Must be one of: ${Object.values(NotificationPriority).join(', ')}`);
      }
      return true;
    }),
  body('farmId')
    .optional()
    .isString(),
  body('data')
    .optional()
    .isObject(),
  body('templateId')
    .optional()
    .isString(),
  body('templateData')
    .optional()
    .isObject(),
  body('scheduledAt')
    .optional()
    .isISO8601()
    .withMessage('Scheduled time must be a valid ISO 8601 date'),
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Expiry time must be a valid ISO 8601 date')
];

const handleValidationErrors = (req: Request, res: Response, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'ValidationError',
      message: 'Invalid request data',
      details: errors.array()
    });
  }
  next();
};

// Send single notification
router.post(
  '/send',
  requirePermission('notifications.send'),
  validateNotification,
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        userId,
        farmId,
        type,
        title,
        message,
        channels,
        priority = NotificationPriority.NORMAL,
        data,
        templateId,
        templateData,
        scheduledAt,
        expiresAt
      } = req.body;

      logger.info('Sending notification', {
        userId,
        type,
        channels,
        priority,
        clientId: req.clientId
      });

      const payload = {
        userId,
        farmId,
        type,
        title,
        message,
        channels,
        priority,
        data,
        templateId,
        templateData,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined
      };

      const result = await notificationService.sendNotification(payload);

      res.status(201).json({
        success: true,
        data: {
          id: result.id,
          status: result.status,
          channels: result.channels
        }
      });
    } catch (error) {
      logger.error('Failed to send notification:', error);
      res.status(500).json({
        error: 'NotificationError',
        message: 'Failed to send notification'
      });
    }
  }
);

// Send bulk notifications
router.post(
  '/send-bulk',
  requirePermission('notifications.bulk'),
  strictRateLimiter,
  [
    body('userIds')
      .isArray({ min: 1, max: 1000 })
      .withMessage('User IDs must be an array with 1-1000 items'),
    body('userIds.*')
      .isString()
      .withMessage('Each user ID must be a string'),
    ...validateNotification.slice(1) // Skip userId validation for bulk
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        userIds,
        farmId,
        type,
        title,
        message,
        channels,
        priority = NotificationPriority.NORMAL,
        data,
        templateId,
        templateData,
        scheduledAt,
        expiresAt
      } = req.body;

      logger.info('Sending bulk notification', {
        userCount: userIds.length,
        type,
        channels,
        priority,
        clientId: req.clientId
      });

      const payload = {
        farmId,
        type,
        title,
        message,
        channels,
        priority,
        data,
        templateId,
        templateData,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined
      };

      const results = await notificationService.sendBulkNotification(userIds, payload);

      const successCount = results.filter(r => r.status === 'sent').length;
      const partialCount = results.filter(r => r.status === 'partial').length;
      const failedCount = results.filter(r => r.status === 'failed').length;

      res.status(201).json({
        success: true,
        data: {
          total: userIds.length,
          successful: successCount,
          partial: partialCount,
          failed: failedCount,
          results: results.map(r => ({
            id: r.id,
            status: r.status,
            channelCount: Object.keys(r.channels).length
          }))
        }
      });
    } catch (error) {
      logger.error('Failed to send bulk notification:', error);
      res.status(500).json({
        error: 'NotificationError',
        message: 'Failed to send bulk notification'
      });
    }
  }
);

// Schedule notification
router.post(
  '/schedule',
  requirePermission('notifications.send'),
  [
    ...validateNotification,
    body('scheduledAt')
      .isISO8601()
      .withMessage('Scheduled time is required and must be a valid ISO 8601 date')
      .custom((value) => {
        const scheduledDate = new Date(value);
        if (scheduledDate <= new Date()) {
          throw new Error('Scheduled time must be in the future');
        }
        return true;
      })
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        userId,
        farmId,
        type,
        title,
        message,
        channels,
        priority = NotificationPriority.NORMAL,
        data,
        templateId,
        templateData,
        scheduledAt,
        expiresAt
      } = req.body;

      const payload = {
        userId,
        farmId,
        type,
        title,
        message,
        channels,
        priority,
        data,
        templateId,
        templateData,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined
      };

      const notificationId = await notificationService.scheduleNotification(
        payload,
        new Date(scheduledAt)
      );

      res.status(201).json({
        success: true,
        data: {
          id: notificationId,
          scheduledAt: scheduledAt,
          status: 'scheduled'
        }
      });
    } catch (error) {
      logger.error('Failed to schedule notification:', error);
      res.status(500).json({
        error: 'NotificationError',
        message: 'Failed to schedule notification'
      });
    }
  }
);

// Get user notification preferences
router.get(
  '/preferences/:userId',
  requirePermission('preferences.read'),
  [
    param('userId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Valid user ID is required')
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      
      const preferences = await notificationService.getUserPreferences(userId);

      res.json({
        success: true,
        data: preferences
      });
    } catch (error) {
      logger.error('Failed to get user preferences:', error);
      res.status(500).json({
        error: 'NotificationError',
        message: 'Failed to retrieve preferences'
      });
    }
  }
);

// Update user notification preferences
router.put(
  '/preferences/:userId',
  requirePermission('preferences.manage'),
  [
    param('userId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Valid user ID is required'),
    body('channels')
      .optional()
      .isArray()
      .custom((channels) => {
        if (channels && !channels.every(isValidChannel)) {
          throw new Error(`Invalid channels. Must be array of: ${Object.values(NotificationChannel).join(', ')}`);
        }
        return true;
      }),
    body('types')
      .optional()
      .isArray(),
    body('schedule')
      .optional()
      .isObject()
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      const preferences = req.body;

      await notificationService.updateUserPreferences(userId, preferences);

      res.json({
        success: true,
        message: 'Preferences updated successfully'
      });
    } catch (error) {
      logger.error('Failed to update user preferences:', error);
      res.status(500).json({
        error: 'NotificationError',
        message: 'Failed to update preferences'
      });
    }
  }
);

// Get notification history
router.get(
  '/history/:userId',
  requirePermission('notifications.read'),
  [
    param('userId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Valid user ID is required'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be a non-negative integer'),
    query('type')
      .optional()
      .custom((value) => {
        if (value && !isValidType(value)) {
          throw new Error('Invalid notification type');
        }
        return true;
      }),
    query('channel')
      .optional()
      .custom((value) => {
        if (value && !isValidChannel(value)) {
          throw new Error('Invalid notification channel');
        }
        return true;
      })
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      const {
        limit = 20,
        offset = 0,
        type,
        channel,
        startDate,
        endDate
      } = req.query;

      const options = {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        type: type as string,
        channel: channel as NotificationChannel,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      };

      const history = await notificationService.getNotificationHistory(userId, options);

      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      logger.error('Failed to get notification history:', error);
      res.status(500).json({
        error: 'NotificationError',
        message: 'Failed to retrieve notification history'
      });
    }
  }
);

// Create notification template
router.post(
  '/templates',
  requirePermission('system.manage'),
  [
    body('id')
      .isString()
      .isLength({ min: 1, max: 50 })
      .withMessage('Template ID must be between 1 and 50 characters'),
    body('name')
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('Template name must be between 1 and 100 characters'),
    body('title')
      .isString()
      .isLength({ min: 1, max: 200 })
      .withMessage('Template title must be between 1 and 200 characters'),
    body('content')
      .isString()
      .isLength({ min: 1, max: 5000 })
      .withMessage('Template content must be between 1 and 5000 characters'),
    body('variables')
      .isArray()
      .withMessage('Variables must be an array'),
    body('type')
      .isString()
      .withMessage('Template type is required')
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const template = req.body;

      notificationService.createTemplate(template);

      res.status(201).json({
        success: true,
        message: 'Template created successfully',
        data: { id: template.id }
      });
    } catch (error) {
      logger.error('Failed to create template:', error);
      res.status(500).json({
        error: 'NotificationError',
        message: 'Failed to create template'
      });
    }
  }
);

// Test notification endpoint (for development)
router.post(
  '/test',
  requirePermission('system.manage'),
  [
    body('userId')
      .isString()
      .withMessage('User ID is required'),
    body('channels')
      .optional()
      .isArray()
      .withMessage('Channels must be an array')
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId, channels = [NotificationChannel.EMAIL] } = req.body;

      const result = await notificationService.sendNotification({
        userId,
        type: NotificationType.WELCOME,
        title: 'Test Notification',
        message: 'This is a test notification from the DaorsAgro notification service.',
        channels,
        priority: NotificationPriority.NORMAL,
        data: { test: true, timestamp: new Date().toISOString() }
      });

      res.json({
        success: true,
        message: 'Test notification sent',
        data: {
          id: result.id,
          status: result.status,
          channels: result.channels
        }
      });
    } catch (error) {
      logger.error('Failed to send test notification:', error);
      res.status(500).json({
        error: 'NotificationError',
        message: 'Failed to send test notification'
      });
    }
  }
);

export default router;