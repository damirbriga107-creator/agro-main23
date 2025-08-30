import { Kafka, Producer, Consumer, KafkaMessage } from 'kafkajs';
import { logger } from '@daorsagro/utils';

export class KafkaService {
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;
  private isConnected: boolean = false;

  constructor() {
    const brokers = process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'];
    
    this.kafka = new Kafka({
      clientId: 'document-service',
      brokers,
      retry: {
        initialRetryTime: 300,
        retries: 5
      }
    });

    this.producer = this.kafka.producer({
      allowAutoTopicCreation: true,
      transactionTimeout: 30000
    });

    this.consumer = this.kafka.consumer({
      groupId: 'document-service-group',
      allowAutoTopicCreation: true
    });
  }

  async connect(): Promise<void> {
    try {
      await Promise.all([
        this.producer.connect(),
        this.consumer.connect()
      ]);

      // Subscribe to relevant topics
      await this.consumer.subscribe({
        topics: [
          'document.process.request',
          'subsidy.application.created',
          'insurance.claim.created'
        ]
      });

      // Start consuming messages
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          await this.handleMessage(topic, message);
        }
      });

      this.isConnected = true;
      logger.info('Kafka service connected successfully');
    } catch (error) {
      logger.error('Failed to connect to Kafka', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await Promise.all([
        this.producer.disconnect(),
        this.consumer.disconnect()
      ]);

      this.isConnected = false;
      logger.info('Kafka service disconnected');
    } catch (error) {
      logger.error('Failed to disconnect from Kafka', error);
      throw error;
    }
  }

  async publishEvent(topic: string, event: any): Promise<void> {
    try {
      if (!this.isConnected) {
        logger.warn('Kafka not connected, skipping event publication', { topic });
        return;
      }

      const message = {
        key: event.documentId || event.id || Date.now().toString(),
        value: JSON.stringify({
          ...event,
          timestamp: new Date().toISOString(),
          service: 'document-service'
        }),
        headers: {
          'content-type': 'application/json',
          'event-type': topic
        }
      };

      await this.producer.send({
        topic,
        messages: [message]
      });

      logger.info('Event published to Kafka', {
        topic,
        eventType: topic,
        key: message.key
      });
    } catch (error) {
      logger.error('Failed to publish event to Kafka', { topic, error });
      // Don't throw error to avoid breaking the main flow
    }
  }

  private async handleMessage(topic: string, message: KafkaMessage): Promise<void> {
    try {
      const value = message.value?.toString();
      if (!value) return;

      const event = JSON.parse(value);
      
      logger.info('Received Kafka message', {
        topic,
        key: message.key?.toString(),
        event: event.type || 'unknown'
      });

      switch (topic) {
        case 'document.process.request':
          await this.handleDocumentProcessRequest(event);
          break;
        case 'subsidy.application.created':
          await this.handleSubsidyApplicationCreated(event);
          break;
        case 'insurance.claim.created':
          await this.handleInsuranceClaimCreated(event);
          break;
        default:
          logger.warn('Unhandled Kafka topic', { topic });
      }
    } catch (error) {
      logger.error('Failed to handle Kafka message', { topic, error });
    }
  }

  private async handleDocumentProcessRequest(event: any): Promise<void> {
    try {
      logger.info('Processing document process request', {
        documentId: event.documentId,
        processType: event.processType
      });

      // TODO: Implement document processing logic
      // This could trigger OCR, thumbnail generation, etc.

      // Publish completion event
      await this.publishEvent('document.process.completed', {
        documentId: event.documentId,
        processType: event.processType,
        status: 'completed'
      });
    } catch (error) {
      logger.error('Failed to process document process request', error);
      
      // Publish failure event
      await this.publishEvent('document.process.failed', {
        documentId: event.documentId,
        processType: event.processType,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async handleSubsidyApplicationCreated(event: any): Promise<void> {
    try {
      logger.info('Handling subsidy application created event', {
        applicationId: event.applicationId,
        userId: event.userId
      });

      // TODO: Set up document requirements for subsidy application
      // This could create document templates or requirements
    } catch (error) {
      logger.error('Failed to handle subsidy application created event', error);
    }
  }

  private async handleInsuranceClaimCreated(event: any): Promise<void> {
    try {
      logger.info('Handling insurance claim created event', {
        claimId: event.claimId,
        userId: event.userId
      });

      // TODO: Set up document requirements for insurance claim
      // This could create document templates or requirements
    } catch (error) {
      logger.error('Failed to handle insurance claim created event', error);
    }
  }

  // Utility methods for specific event types
  async publishDocumentUploaded(documentId: string, userId: string, metadata: any): Promise<void> {
    await this.publishEvent('document.uploaded', {
      documentId,
      userId,
      ...metadata
    });
  }

  async publishDocumentDeleted(documentId: string, userId: string): Promise<void> {
    await this.publishEvent('document.deleted', {
      documentId,
      userId
    });
  }

  async publishDocumentProcessed(documentId: string, processingResult: any): Promise<void> {
    await this.publishEvent('document.processed', {
      documentId,
      ...processingResult
    });
  }

  async publishOcrCompleted(documentId: string, extractedText: string, confidence: number): Promise<void> {
    await this.publishEvent('document.ocr.completed', {
      documentId,
      extractedText,
      confidence,
      textLength: extractedText.length
    });
  }

  async requestDocumentProcessing(documentId: string, processType: string): Promise<void> {
    await this.publishEvent('document.process.request', {
      documentId,
      processType,
      requestedAt: new Date().toISOString()
    });
  }
}