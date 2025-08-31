import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { logger } from '@daorsagro/utils';
import { requirePermission, optionalApiKey } from '../middleware/auth.middleware';

const router = Router();

interface AuthenticatedRequest extends Request {
  apiKey?: string;
  clientId?: string;
}

// Validation middleware
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

// Email delivery webhooks (from email providers like SendGrid, Mailgun, etc.)
router.post(
  '/email/delivery',
  optionalApiKey,
  [
    body('event')
      .isString()
      .isIn(['delivered', 'bounced', 'dropped', 'opened', 'clicked', 'unsubscribed', 'spam_report'])
      .withMessage('Invalid email event type'),
    body('email')
      .isEmail()
      .withMessage('Valid email address is required'),
    body('messageId')
      .isString()
      .withMessage('Message ID is required'),
    body('timestamp')
      .optional()
      .isNumeric()
      .withMessage('Timestamp must be numeric')
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { event, email, messageId, timestamp, reason, url, userAgent, ip } = req.body;

      logger.info('Email delivery webhook received', {
        event,
        email,
        messageId,
        timestamp,
        provider: req.get('User-Agent')
      });

      // Process the email delivery event
      await processEmailDeliveryEvent({
        event,
        email,
        messageId,
        timestamp: timestamp ? new Date(timestamp * 1000) : new Date(),
        reason,
        url,
        userAgent,
        ip
      });

      res.json({
        success: true,
        message: 'Webhook processed successfully'
      });
    } catch (error) {
      logger.error('Failed to process email delivery webhook:', error);
      res.status(500).json({
        error: 'WebhookError',
        message: 'Failed to process email delivery webhook'
      });
    }
  }
);

// SMS delivery webhooks (from providers like Twilio, AWS SNS, etc.)
router.post(
  '/sms/delivery',
  optionalApiKey,
  [
    body('MessageStatus')
      .optional()
      .isString()
      .withMessage('MessageStatus must be a string'),
    body('MessageSid')
      .optional()
      .isString()
      .withMessage('MessageSid must be a string'),
    body('To')
      .optional()
      .isString()
      .withMessage('To must be a string'),
    body('status')
      .optional()
      .isString()
      .withMessage('Status must be a string'),
    body('messageId')
      .optional()
      .isString()
      .withMessage('Message ID must be a string')
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Handle both Twilio and AWS SNS format
      const status = req.body.MessageStatus || req.body.status;
      const messageId = req.body.MessageSid || req.body.messageId;
      const phoneNumber = req.body.To || req.body.phoneNumber;
      const errorCode = req.body.ErrorCode;
      const errorMessage = req.body.ErrorMessage;

      logger.info('SMS delivery webhook received', {
        status,
        messageId,
        phoneNumber,
        errorCode,
        provider: req.get('User-Agent')
      });

      // Process the SMS delivery event
      await processSmsDeliveryEvent({
        status,
        messageId,
        phoneNumber,
        errorCode,
        errorMessage,
        timestamp: new Date()
      });

      res.json({
        success: true,
        message: 'SMS webhook processed successfully'
      });
    } catch (error) {
      logger.error('Failed to process SMS delivery webhook:', error);
      res.status(500).json({
        error: 'WebhookError',
        message: 'Failed to process SMS delivery webhook'
      });
    }
  }
);

// Push notification webhooks (from FCM, APNs feedback, etc.)
router.post(
  '/push/feedback',
  optionalApiKey,
  [
    body('results')
      .optional()
      .isArray()
      .withMessage('Results must be an array'),
    body('failure')
      .optional()
      .isNumeric()
      .withMessage('Failure count must be numeric'),
    body('success')
      .optional()
      .isNumeric()
      .withMessage('Success count must be numeric')
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { results, failure, success, canonical_ids, multicast_id } = req.body;

      logger.info('Push notification feedback received', {
        failure,
        success,
        canonical_ids,
        multicast_id,
        resultsCount: results?.length || 0
      });

      // Process FCM feedback
      if (results && Array.isArray(results)) {
        await processPushFeedback(results);
      }

      res.json({
        success: true,
        message: 'Push feedback processed successfully'
      });
    } catch (error) {
      logger.error('Failed to process push feedback webhook:', error);
      res.status(500).json({
        error: 'WebhookError',
        message: 'Failed to process push feedback webhook'
      });
    }
  }
);

// Generic webhook endpoint for custom integrations
router.post(
  '/generic/:webhookId',
  optionalApiKey,
  [
    param('webhookId')
      .isString()
      .isLength({ min: 1, max: 50 })
      .withMessage('Valid webhook ID is required')
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { webhookId } = req.params;
      const payload = req.body;
      const headers = req.headers;

      logger.info('Generic webhook received', {
        webhookId,
        payloadSize: JSON.stringify(payload).length,
        contentType: headers['content-type'],
        userAgent: headers['user-agent']
      });

      // Process generic webhook
      await processGenericWebhook(webhookId, payload, headers as Record<string, string>);

      res.json({
        success: true,
        message: 'Webhook processed successfully'
      });
    } catch (error) {
      logger.error('Failed to process generic webhook:', error);
      res.status(500).json({
        error: 'WebhookError',
        message: 'Failed to process generic webhook'
      });
    }
  }
);

// Unsubscribe webhook (for email unsubscribes)
router.post(
  '/unsubscribe',
  optionalApiKey,
  [
    body('email')
      .isEmail()
      .withMessage('Valid email address is required'),
    body('type')
      .optional()
      .isString()
      .withMessage('Unsubscribe type must be a string'),
    body('reason')
      .optional()
      .isString()
      .withMessage('Reason must be a string')
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { email, type = 'general', reason, timestamp } = req.body;

      logger.info('Unsubscribe webhook received', {
        email,
        type,
        reason,
        timestamp
      });

      // Process unsubscribe request
      await processUnsubscribe({
        email,
        type,
        reason,
        timestamp: timestamp ? new Date(timestamp) : new Date()
      });

      res.json({
        success: true,
        message: 'Unsubscribe processed successfully'
      });
    } catch (error) {
      logger.error('Failed to process unsubscribe webhook:', error);
      res.status(500).json({
        error: 'WebhookError',
        message: 'Failed to process unsubscribe webhook'
      });
    }
  }
);

// Webhook verification endpoint (for providers that require verification)
router.get(
  '/verify/:provider',
  [
    param('provider')
      .isString()
      .isIn(['sendgrid', 'mailgun', 'twilio', 'fcm'])
      .withMessage('Invalid provider')
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { provider } = req.params;
      const { challenge, token, hub_challenge } = req.query;

      logger.info('Webhook verification requested', {
        provider,
        challenge,
        token,
        hub_challenge
      });

      // Handle different verification methods
      switch (provider) {
        case 'sendgrid':
          // SendGrid webhook verification
          if (challenge) {
            res.status(200).send(challenge);
            return;
          }
          break;

        case 'mailgun':
          // Mailgun webhook verification
          if (token && hub_challenge) {
            res.status(200).send(hub_challenge);
            return;
          }
          break;

        default:
          break;
      }

      res.status(400).json({
        error: 'BadRequest',
        message: 'Invalid verification request'
      });
    } catch (error) {
      logger.error('Failed to verify webhook:', error);
      res.status(500).json({
        error: 'WebhookError',
        message: 'Failed to verify webhook'
      });
    }
  }
);

// Webhook status and statistics
router.get(
  '/stats',
  requirePermission('system.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // In production, this would fetch actual webhook statistics
      const stats = {
        totalWebhooks: 0,
        webhooksToday: 0,
        webhooksThisWeek: 0,
        byType: {
          email: { delivered: 0, bounced: 0, opened: 0, clicked: 0 },
          sms: { delivered: 0, failed: 0 },
          push: { delivered: 0, failed: 0 },
          unsubscribe: 0
        },
        recentWebhooks: []
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Failed to get webhook stats:', error);
      res.status(500).json({
        error: 'WebhookError',
        message: 'Failed to retrieve webhook statistics'
      });
    }
  }
);

// Helper functions for processing different webhook types
async function processEmailDeliveryEvent(event: {
  event: string;
  email: string;
  messageId: string;
  timestamp: Date;
  reason?: string;
  url?: string;
  userAgent?: string;
  ip?: string;
}): Promise<void> {
  // In production, this would update notification delivery status in database
  logger.info('Processing email delivery event', event);
  
  switch (event.event) {
    case 'delivered':
      // Update notification status to delivered
      break;
    case 'bounced':
      // Mark email as bounced, possibly disable future emails to this address
      break;
    case 'opened':
      // Track email open event for analytics
      break;
    case 'clicked':
      // Track email click event for analytics
      break;
    case 'unsubscribed':
      // Process unsubscribe request
      await processUnsubscribe({
        email: event.email,
        type: 'email',
        reason: event.reason || 'User requested',
        timestamp: event.timestamp
      });
      break;
  }
}

async function processSmsDeliveryEvent(event: {
  status: string;
  messageId: string;
  phoneNumber: string;
  errorCode?: string;
  errorMessage?: string;
  timestamp: Date;
}): Promise<void> {
  logger.info('Processing SMS delivery event', event);
  
  // In production, update notification delivery status in database
  switch (event.status?.toLowerCase()) {
    case 'delivered':
      // Mark SMS as delivered
      break;
    case 'failed':
    case 'undelivered':
      // Mark SMS as failed, log error
      break;
    case 'sent':
      // SMS sent to carrier, awaiting delivery confirmation
      break;
  }
}

async function processPushFeedback(results: any[]): Promise<void> {
  logger.info('Processing push notification feedback', { resultsCount: results.length });
  
  results.forEach((result, index) => {
    if (result.error) {
      logger.warn('Push notification failed', {
        index,
        error: result.error,
        registration_id: result.registration_id
      });
      
      // Handle different types of errors
      if (result.error === 'NotRegistered' || result.error === 'InvalidRegistration') {
        // Remove invalid token from database
      }
    } else if (result.registration_id) {
      // Update token if changed (canonical ID)
      logger.info('Push notification delivered', { index });
    }
  });
}

async function processGenericWebhook(
  webhookId: string,
  payload: any,
  headers: Record<string, string>
): Promise<void> {
  logger.info('Processing generic webhook', { webhookId, payload, headers });
  
  // In production, this would route to appropriate handlers based on webhookId
  // Could be used for custom integrations or third-party services
}

async function processUnsubscribe(event: {
  email: string;
  type: string;
  reason?: string;
  timestamp: Date;
}): Promise<void> {
  logger.info('Processing unsubscribe request', event);
  
  // In production, this would:
  // 1. Add email to unsubscribe list
  // 2. Update user preferences to disable email notifications
  // 3. Log unsubscribe event for analytics
}

export default router;