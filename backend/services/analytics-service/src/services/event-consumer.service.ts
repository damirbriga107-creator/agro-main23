import { KafkaConnection, Logger, ClickHouseConnection } from '@daorsagro/utils';
import { Consumer } from 'kafkajs';

/**
 * Event consumer service for processing events from other services
 */
export class EventConsumerService {
  private logger: Logger;
  private kafka: KafkaConnection;
  private clickhouse: ClickHouseConnection;
  private consumers: Consumer[] = [];
  private isRunning: boolean = false;

  constructor() {
    this.logger = new Logger('analytics-event-consumer');
    this.kafka = KafkaConnection.getInstance();
    this.clickhouse = ClickHouseConnection.getInstance();
  }

  /**
   * Start event consumers
   */
  async start(): Promise<void> {
    try {
      this.logger.info('Starting event consumers');

      // Create consumers for different event types
      await Promise.all([
        this.startFinancialEventConsumer(),
        this.startUserEventConsumer(),
        this.startSubsidyEventConsumer(),
        this.startInsuranceEventConsumer(),
        this.startProductionEventConsumer(),
        this.startIoTEventConsumer()
      ]);

      this.isRunning = true;
      this.logger.info('All event consumers started successfully');

    } catch (error) {
      this.logger.error('Failed to start event consumers', error);
      throw error;
    }
  }

  /**
   * Stop all event consumers
   */
  async stop(): Promise<void> {
    try {
      this.logger.info('Stopping event consumers');
      this.isRunning = false;

      await Promise.all(
        this.consumers.map(consumer => consumer.disconnect())
      );

      this.consumers = [];
      this.logger.info('All event consumers stopped');

    } catch (error) {
      this.logger.error('Error stopping event consumers', error);
      throw error;
    }
  }

  /**
   * Start financial events consumer
   */
  private async startFinancialEventConsumer(): Promise<void> {
    const consumer = await this.kafka.createConsumer('analytics-financial-group');
    await consumer.subscribe({ topic: 'financial-events' });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value?.toString() || '{}');
          await this.processFinancialEvent(event);
        } catch (error) {
          this.logger.error('Error processing financial event', error);
        }
      },
    });

    this.consumers.push(consumer);
    this.logger.info('Financial events consumer started');
  }

  /**
   * Start user events consumer
   */
  private async startUserEventConsumer(): Promise<void> {
    const consumer = await this.kafka.createConsumer('analytics-user-group');
    await consumer.subscribe({ topic: 'user-events' });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value?.toString() || '{}');
          await this.processUserEvent(event);
        } catch (error) {
          this.logger.error('Error processing user event', error);
        }
      },
    });

    this.consumers.push(consumer);
    this.logger.info('User events consumer started');
  }

  /**
   * Start subsidy events consumer
   */
  private async startSubsidyEventConsumer(): Promise<void> {
    const consumer = await this.kafka.createConsumer('analytics-subsidy-group');
    await consumer.subscribe({ topic: 'subsidy-events' });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value?.toString() || '{}');
          await this.processSubsidyEvent(event);
        } catch (error) {
          this.logger.error('Error processing subsidy event', error);
        }
      },
    });

    this.consumers.push(consumer);
    this.logger.info('Subsidy events consumer started');
  }

  /**
   * Start insurance events consumer
   */
  private async startInsuranceEventConsumer(): Promise<void> {
    const consumer = await this.kafka.createConsumer('analytics-insurance-group');
    await consumer.subscribe({ topic: 'insurance-events' });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value?.toString() || '{}');
          await this.processInsuranceEvent(event);
        } catch (error) {
          this.logger.error('Error processing insurance event', error);
        }
      },
    });

    this.consumers.push(consumer);
    this.logger.info('Insurance events consumer started');
  }

  /**
   * Start production events consumer
   */
  private async startProductionEventConsumer(): Promise<void> {
    const consumer = await this.kafka.createConsumer('analytics-production-group');
    await consumer.subscribe({ topic: 'production-events' });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value?.toString() || '{}');
          await this.processProductionEvent(event);
        } catch (error) {
          this.logger.error('Error processing production event', error);
        }
      },
    });

    this.consumers.push(consumer);
    this.logger.info('Production events consumer started');
  }

  /**
   * Start IoT events consumer
   */
  private async startIoTEventConsumer(): Promise<void> {
    const consumer = await this.kafka.createConsumer('analytics-iot-group');
    await consumer.subscribe({ topic: 'iot-events' });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value?.toString() || '{}');
          await this.processIoTEvent(event);
        } catch (error) {
          this.logger.error('Error processing IoT event', error);
        }
      },
    });

    this.consumers.push(consumer);
    this.logger.info('IoT events consumer started');
  }

  /**
   * Process financial event and store in ClickHouse
   */
  private async processFinancialEvent(event: any): Promise<void> {
    try {
      const client = this.clickhouse.getClient();
      
      await client.insert({
        table: 'financial_events',
        values: [{
          timestamp: new Date(event.timestamp || Date.now()).toISOString(),
          event_id: event.eventId,
          user_id: event.userId,
          farm_id: event.farmId,
          type: event.type, // 'revenue', 'expense', 'profit'
          amount: event.amount || 0,
          currency: event.currency || 'USD',
          category: event.category,
          description: event.description || '',
          metadata: JSON.stringify(event.metadata || {})
        }],
        format: 'JSONEachRow'
      });

      this.logger.debug('Financial event processed successfully', { eventId: event.eventId });

    } catch (error) {
      this.logger.error('Failed to process financial event', error);
      throw error;
    }
  }

  /**
   * Process user event and store in ClickHouse
   */
  private async processUserEvent(event: any): Promise<void> {
    try {
      const client = this.clickhouse.getClient();
      
      await client.insert({
        table: 'user_events',
        values: [{
          timestamp: new Date(event.timestamp || Date.now()).toISOString(),
          event_id: event.eventId,
          user_id: event.userId,
          event_type: event.eventType, // 'login', 'logout', 'registration', 'profile_update'
          session_id: event.sessionId || '',
          session_duration: event.sessionDuration || 0,
          ip_address: event.ipAddress || '',
          user_agent: event.userAgent || '',
          metadata: JSON.stringify(event.metadata || {})
        }],
        format: 'JSONEachRow'
      });

      this.logger.debug('User event processed successfully', { eventId: event.eventId });

    } catch (error) {
      this.logger.error('Failed to process user event', error);
      throw error;
    }
  }

  /**
   * Process subsidy event and store in ClickHouse
   */
  private async processSubsidyEvent(event: any): Promise<void> {
    try {
      const client = this.clickhouse.getClient();
      
      await client.insert({
        table: 'subsidy_events',
        values: [{
          timestamp: new Date(event.timestamp || Date.now()).toISOString(),
          event_id: event.eventId,
          application_id: event.applicationId,
          user_id: event.userId,
          farm_id: event.farmId,
          subsidy_type: event.subsidyType,
          amount: event.amount || 0,
          status: event.status, // 'pending', 'approved', 'rejected'
          processing_days: event.processingDays || 0,
          metadata: JSON.stringify(event.metadata || {})
        }],
        format: 'JSONEachRow'
      });

      this.logger.debug('Subsidy event processed successfully', { eventId: event.eventId });

    } catch (error) {
      this.logger.error('Failed to process subsidy event', error);
      throw error;
    }
  }

  /**
   * Process insurance event and store in ClickHouse
   */
  private async processInsuranceEvent(event: any): Promise<void> {
    try {
      const client = this.clickhouse.getClient();
      
      await client.insert({
        table: 'insurance_events',
        values: [{
          timestamp: new Date(event.timestamp || Date.now()).toISOString(),
          event_id: event.eventId,
          policy_id: event.policyId,
          user_id: event.userId,
          farm_id: event.farmId,
          event_type: event.eventType, // 'premium_payment', 'claim', 'policy_update'
          premium_amount: event.premiumAmount || 0,
          claim_amount: event.claimAmount || 0,
          coverage_type: event.coverageType || '',
          metadata: JSON.stringify(event.metadata || {})
        }],
        format: 'JSONEachRow'
      });

      this.logger.debug('Insurance event processed successfully', { eventId: event.eventId });

    } catch (error) {
      this.logger.error('Failed to process insurance event', error);
      throw error;
    }
  }

  /**
   * Process production event and store in ClickHouse
   */
  private async processProductionEvent(event: any): Promise<void> {
    try {
      const client = this.clickhouse.getClient();
      
      await client.insert({
        table: 'production_events',
        values: [{
          timestamp: new Date(event.timestamp || Date.now()).toISOString(),
          event_id: event.eventId,
          farm_id: event.farmId,
          user_id: event.userId,
          crop_type: event.cropType,
          quantity: event.quantity || 0,
          unit: event.unit || 'kg',
          quality_score: event.qualityScore || 0,
          harvest_date: event.harvestDate || new Date().toISOString(),
          metadata: JSON.stringify(event.metadata || {})
        }],
        format: 'JSONEachRow'
      });

      this.logger.debug('Production event processed successfully', { eventId: event.eventId });

    } catch (error) {
      this.logger.error('Failed to process production event', error);
      throw error;
    }
  }

  /**
   * Process IoT event and store in ClickHouse
   */
  private async processIoTEvent(event: any): Promise<void> {
    try {
      const client = this.clickhouse.getClient();
      
      await client.insert({
        table: 'iot_events',
        values: [{
          timestamp: new Date(event.timestamp || Date.now()).toISOString(),
          event_id: event.eventId,
          device_id: event.deviceId,
          farm_id: event.farmId,
          sensor_type: event.sensorType, // 'temperature', 'humidity', 'soil_moisture'
          value: event.value || 0,
          unit: event.unit || '',
          location_lat: event.location?.lat || 0,
          location_lng: event.location?.lng || 0,
          metadata: JSON.stringify(event.metadata || {})
        }],
        format: 'JSONEachRow'
      });

      this.logger.debug('IoT event processed successfully', { eventId: event.eventId });

    } catch (error) {
      this.logger.error('Failed to process IoT event', error);
      throw error;
    }
  }

  /**
   * Check if consumers are running
   */
  isHealthy(): boolean {
    return this.isRunning && this.consumers.length > 0;
  }
}