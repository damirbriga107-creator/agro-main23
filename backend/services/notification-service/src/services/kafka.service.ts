import { Kafka, Consumer, Producer, EachMessagePayload } from 'kafkajs';
import { logger } from '@daorsagro/utils';
import { config } from '@daorsagro/config';
import { NotificationService } from './notification.service';
import { 
  NotificationChannel, 
  NotificationPriority, 
  NotificationType 
} from '../models/notification.model';

interface EventMessage {
  type: string;
  userId: string;
  farmId?: string;
  data: Record<string, any>;
  timestamp: string;
  source: string;
}

export class KafkaService {
  private kafka: Kafka | null = null;
  private consumer: Consumer | null = null;
  private producer: Producer | null = null;
  private notificationService: NotificationService | null = null;
  private isInitialized: boolean = false;

  async initialize(): Promise<void> {
    try {
      const kafkaConfig = config.kafka || {
        clientId: 'notification-service',
        brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
        groupId: 'notification-consumer-group'
      };

      this.kafka = new Kafka({
        clientId: kafkaConfig.clientId,
        brokers: kafkaConfig.brokers,
        retry: {
          initialRetryTime: 100,
          retries: 8
        }
      });

      this.consumer = this.kafka.consumer({
        groupId: kafkaConfig.groupId,
        sessionTimeout: 30000,
        heartbeatInterval: 3000
      });

      this.producer = this.kafka.producer({
        maxInFlightRequests: 1,
        idempotent: true,
        transactionTimeout: 30000
      });

      await this.consumer.connect();
      await this.producer.connect();

      // Subscribe to relevant topics
      await this.consumer.subscribe({
        topics: [
          'financial.transactions',
          'financial.budgets',
          'subsidy.applications',
          'subsidy.programs',
          'insurance.claims',
          'insurance.policies',
          'weather.alerts',
          'weather.forecasts',
          'iot.sensors',
          'user.events',
          'system.events'
        ]
      });

      // Start consuming messages
      await this.consumer.run({
        eachMessage: this.handleMessage.bind(this)
      });

      this.isInitialized = true;
      logger.info('Kafka service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Kafka service:', error);
      throw error;
    }
  }

  setNotificationService(notificationService: NotificationService): void {
    this.notificationService = notificationService;
  }

  async publishNotificationEvent(
    topic: string,
    event: {
      type: string;
      userId: string;
      farmId?: string;
      data: Record<string, any>;
    }
  ): Promise<void> {
    if (!this.producer) {
      throw new Error('Kafka producer not initialized');
    }

    try {
      const message = {
        type: event.type,
        userId: event.userId,
        farmId: event.farmId,
        data: event.data,
        timestamp: new Date().toISOString(),
        source: 'notification-service'
      };

      await this.producer.send({
        topic,
        messages: [
          {
            key: event.userId,
            value: JSON.stringify(message),
            timestamp: Date.now().toString()
          }
        ]
      });

      logger.info('Notification event published', {
        topic,
        type: event.type,
        userId: event.userId
      });
    } catch (error) {
      logger.error('Failed to publish notification event:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.consumer) {
        await this.consumer.disconnect();
      }
      if (this.producer) {
        await this.producer.disconnect();
      }
      
      this.isInitialized = false;
      logger.info('Kafka service disconnected');
    } catch (error) {
      logger.error('Error disconnecting Kafka service:', error);
      throw error;
    }
  }

  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    try {
      const { topic, message } = payload;
      
      if (!message.value) {
        logger.warn('Received empty message', { topic });
        return;
      }

      const eventMessage: EventMessage = JSON.parse(message.value.toString());
      
      logger.info('Processing Kafka message', {
        topic,
        type: eventMessage.type,
        userId: eventMessage.userId
      });

      await this.processEvent(topic, eventMessage);
    } catch (error) {
      logger.error('Failed to handle Kafka message:', error);
    }
  }

  private async processEvent(topic: string, event: EventMessage): Promise<void> {
    if (!this.notificationService) {
      logger.warn('Notification service not set, skipping event processing');
      return;
    }

    try {
      switch (topic) {
        case 'financial.transactions':
          await this.handleFinancialEvent(event);
          break;

        case 'financial.budgets':
          await this.handleBudgetEvent(event);
          break;

        case 'subsidy.applications':
          await this.handleSubsidyEvent(event);
          break;

        case 'subsidy.programs':
          await this.handleSubsidyProgramEvent(event);
          break;

        case 'insurance.claims':
          await this.handleInsuranceClaimEvent(event);
          break;

        case 'insurance.policies':
          await this.handleInsurancePolicyEvent(event);
          break;

        case 'weather.alerts':
          await this.handleWeatherAlertEvent(event);
          break;

        case 'weather.forecasts':
          await this.handleWeatherForecastEvent(event);
          break;

        case 'iot.sensors':
          await this.handleIoTSensorEvent(event);
          break;

        case 'user.events':
          await this.handleUserEvent(event);
          break;

        case 'system.events':
          await this.handleSystemEvent(event);
          break;

        default:
          logger.warn('Unknown topic, skipping event', { topic });
      }
    } catch (error) {
      logger.error('Failed to process event:', error);
    }
  }

  private async handleFinancialEvent(event: EventMessage): Promise<void> {
    switch (event.type) {
      case 'transaction_created':
        await this.notificationService!.sendNotification({
          userId: event.userId,
          farmId: event.farmId,
          type: NotificationType.TRANSACTION_CREATED,
          title: 'New Transaction Recorded',
          message: `A new ${event.data.type} transaction of ${event.data.amount} has been recorded.`,
          channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH],
          priority: NotificationPriority.NORMAL,
          templateId: 'transaction_alert',
          templateData: {
            type: event.data.type,
            amount: event.data.amount,
            category: event.data.category,
            date: event.data.date
          }
        });
        break;

      case 'large_transaction':
        await this.notificationService!.sendNotification({
          userId: event.userId,
          farmId: event.farmId,
          type: NotificationType.TRANSACTION_CREATED,
          title: 'Large Transaction Alert',
          message: `A large ${event.data.type} transaction of ${event.data.amount} requires your attention.`,
          channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH, NotificationChannel.SMS],
          priority: NotificationPriority.HIGH,
          data: { transactionId: event.data.transactionId }
        });
        break;
    }
  }

  private async handleBudgetEvent(event: EventMessage): Promise<void> {
    switch (event.type) {
      case 'budget_exceeded':
        await this.notificationService!.sendNotification({
          userId: event.userId,
          farmId: event.farmId,
          type: NotificationType.BUDGET_EXCEEDED,
          title: 'Budget Exceeded',
          message: `Your ${event.data.category} budget has been exceeded by ${event.data.overageAmount}.`,
          channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH, NotificationChannel.SMS],
          priority: NotificationPriority.HIGH,
          data: { 
            budgetId: event.data.budgetId,
            category: event.data.category,
            budgetAmount: event.data.budgetAmount,
            currentAmount: event.data.currentAmount
          }
        });
        break;

      case 'budget_warning':
        await this.notificationService!.sendNotification({
          userId: event.userId,
          farmId: event.farmId,
          type: NotificationType.BUDGET_EXCEEDED,
          title: 'Budget Warning',
          message: `Your ${event.data.category} budget is ${event.data.percentage}% spent.`,
          channels: [NotificationChannel.PUSH],
          priority: NotificationPriority.NORMAL,
          data: { budgetId: event.data.budgetId }
        });
        break;
    }
  }

  private async handleSubsidyEvent(event: EventMessage): Promise<void> {
    switch (event.type) {
      case 'application_submitted':
        await this.notificationService!.sendNotification({
          userId: event.userId,
          farmId: event.farmId,
          type: NotificationType.SUBSIDY_APPROVED,
          title: 'Subsidy Application Submitted',
          message: `Your application for ${event.data.programName} has been submitted successfully.`,
          channels: [NotificationChannel.EMAIL],
          priority: NotificationPriority.NORMAL,
          data: { applicationId: event.data.applicationId }
        });
        break;

      case 'application_approved':
        await this.notificationService!.sendNotification({
          userId: event.userId,
          farmId: event.farmId,
          type: NotificationType.SUBSIDY_APPROVED,
          title: 'Subsidy Application Approved',
          message: `Great news! Your application for ${event.data.programName} has been approved for ${event.data.amount}.`,
          channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH, NotificationChannel.SMS],
          priority: NotificationPriority.HIGH,
          data: { 
            applicationId: event.data.applicationId,
            amount: event.data.amount
          }
        });
        break;

      case 'application_rejected':
        await this.notificationService!.sendNotification({
          userId: event.userId,
          farmId: event.farmId,
          type: NotificationType.SUBSIDY_REJECTED,
          title: 'Subsidy Application Update',
          message: `Your application for ${event.data.programName} requires attention. ${event.data.reason}`,
          channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH],
          priority: NotificationPriority.HIGH,
          data: { 
            applicationId: event.data.applicationId,
            reason: event.data.reason
          }
        });
        break;
    }
  }

  private async handleSubsidyProgramEvent(event: EventMessage): Promise<void> {
    switch (event.type) {
      case 'new_program_available':
        await this.notificationService!.sendNotification({
          userId: event.userId,
          farmId: event.farmId,
          type: NotificationType.NEW_SUBSIDY_PROGRAM,
          title: 'New Subsidy Program Available',
          message: `A new subsidy program "${event.data.programName}" is now available. Deadline: ${event.data.deadline}`,
          channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH],
          priority: NotificationPriority.NORMAL,
          data: { programId: event.data.programId }
        });
        break;

      case 'deadline_reminder':
        await this.notificationService!.sendNotification({
          userId: event.userId,
          farmId: event.farmId,
          type: NotificationType.SUBSIDY_DEADLINE,
          title: 'Subsidy Deadline Reminder',
          message: `The application deadline for ${event.data.programName} is in ${event.data.daysLeft} days.`,
          channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH],
          priority: NotificationPriority.HIGH,
          templateId: 'subsidy_deadline',
          templateData: {
            programName: event.data.programName,
            deadline: event.data.deadline
          }
        });
        break;
    }
  }

  private async handleInsuranceClaimEvent(event: EventMessage): Promise<void> {
    switch (event.type) {
      case 'claim_submitted':
        await this.notificationService!.sendNotification({
          userId: event.userId,
          farmId: event.farmId,
          type: NotificationType.CLAIM_UPDATE,
          title: 'Insurance Claim Submitted',
          message: `Your insurance claim ${event.data.claimNumber} has been submitted and is under review.`,
          channels: [NotificationChannel.EMAIL],
          priority: NotificationPriority.NORMAL,
          data: { claimId: event.data.claimId }
        });
        break;

      case 'claim_approved':
        await this.notificationService!.sendNotification({
          userId: event.userId,
          farmId: event.farmId,
          type: NotificationType.CLAIM_UPDATE,
          title: 'Insurance Claim Approved',
          message: `Your insurance claim ${event.data.claimNumber} has been approved for ${event.data.amount}.`,
          channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH, NotificationChannel.SMS],
          priority: NotificationPriority.HIGH,
          templateId: 'insurance_claim',
          templateData: {
            claimNumber: event.data.claimNumber,
            status: 'Approved',
            details: `Payment of ${event.data.amount} will be processed within 5-7 business days.`
          }
        });
        break;
    }
  }

  private async handleInsurancePolicyEvent(event: EventMessage): Promise<void> {
    switch (event.type) {
      case 'policy_renewal_reminder':
        await this.notificationService!.sendNotification({
          userId: event.userId,
          farmId: event.farmId,
          type: NotificationType.POLICY_RENEWAL,
          title: 'Policy Renewal Reminder',
          message: `Your ${event.data.policyType} policy expires in ${event.data.daysLeft} days. Renew now to avoid coverage gaps.`,
          channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH],
          priority: NotificationPriority.HIGH,
          data: { policyId: event.data.policyId }
        });
        break;
    }
  }

  private async handleWeatherAlertEvent(event: EventMessage): Promise<void> {
    switch (event.type) {
      case 'severe_weather_alert':
        await this.notificationService!.sendNotification({
          userId: event.userId,
          farmId: event.farmId,
          type: NotificationType.WEATHER_ALERT,
          title: `Weather Alert: ${event.data.alertType}`,
          message: `${event.data.alertType} expected in your area. ${event.data.description}`,
          channels: [NotificationChannel.PUSH, NotificationChannel.SMS],
          priority: NotificationPriority.URGENT,
          templateId: 'weather_alert',
          templateData: {
            alertType: event.data.alertType,
            description: event.data.description
          }
        });
        break;

      case 'frost_warning':
        await this.notificationService!.sendNotification({
          userId: event.userId,
          farmId: event.farmId,
          type: NotificationType.FROST_WARNING,
          title: 'Frost Warning',
          message: `Frost conditions expected tonight. Protect sensitive crops and livestock.`,
          channels: [NotificationChannel.PUSH, NotificationChannel.SMS],
          priority: NotificationPriority.URGENT
        });
        break;
    }
  }

  private async handleWeatherForecastEvent(event: EventMessage): Promise<void> {
    // Handle weather forecast events if needed
  }

  private async handleIoTSensorEvent(event: EventMessage): Promise<void> {
    switch (event.type) {
      case 'sensor_offline':
        await this.notificationService!.sendNotification({
          userId: event.userId,
          farmId: event.farmId,
          type: NotificationType.SENSOR_OFFLINE,
          title: 'Sensor Offline',
          message: `Sensor ${event.data.sensorName} has gone offline. Check device connection.`,
          channels: [NotificationChannel.PUSH],
          priority: NotificationPriority.HIGH,
          data: { sensorId: event.data.sensorId }
        });
        break;

      case 'soil_moisture_low':
        await this.notificationService!.sendNotification({
          userId: event.userId,
          farmId: event.farmId,
          type: NotificationType.SOIL_MOISTURE_LOW,
          title: 'Low Soil Moisture',
          message: `Soil moisture in ${event.data.location} is critically low (${event.data.moisture}%). Consider irrigation.`,
          channels: [NotificationChannel.PUSH, NotificationChannel.SMS],
          priority: NotificationPriority.HIGH,
          data: { 
            sensorId: event.data.sensorId,
            location: event.data.location,
            moisture: event.data.moisture
          }
        });
        break;
    }
  }

  private async handleUserEvent(event: EventMessage): Promise<void> {
    switch (event.type) {
      case 'user_registered':
        await this.notificationService!.sendNotification({
          userId: event.userId,
          type: NotificationType.WELCOME,
          title: 'Welcome to DaorsAgro!',
          message: 'Thank you for joining DaorsAgro. Get started by setting up your farm profile.',
          channels: [NotificationChannel.EMAIL],
          priority: NotificationPriority.NORMAL,
          templateId: 'welcome',
          templateData: {
            name: event.data.name || 'Farmer'
          }
        });
        break;
    }
  }

  private async handleSystemEvent(event: EventMessage): Promise<void> {
    switch (event.type) {
      case 'maintenance_scheduled':
        // Send to all users - would need different implementation
        logger.info('System maintenance notification', event);
        break;
    }
  }
}