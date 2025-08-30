import mqtt, { MqttClient } from 'mqtt';
import { MongoClient } from 'mongodb';
import { Producer } from 'kafkajs';
import { Logger } from '@daorsagro/utils';
import { EnvironmentUtils } from '@daorsagro/config';
import { DataProcessingService } from './data-processing.service';

const logger = new Logger('mqtt-handler');

export class MqttHandler {
  private mqttClient: MqttClient;
  private mongoClient: MongoClient;
  private kafkaProducer: Producer;
  private dataProcessingService: DataProcessingService;
  private isConnected: boolean = false;
  private subscriptions: Set<string> = new Set();

  constructor(mongoClient: MongoClient, kafkaProducer: Producer) {
    this.mongoClient = mongoClient;
    this.kafkaProducer = kafkaProducer;
    this.dataProcessingService = new DataProcessingService(mongoClient);
  }

  /**
   * Initialize MQTT connection and subscriptions
   */
  async initialize(): Promise<void> {
    try {
      const mqttUrl = EnvironmentUtils.get('MQTT_BROKER_URL', 'mqtt://localhost:1883');
      const clientId = EnvironmentUtils.get('MQTT_CLIENT_ID', `iot-service-${Date.now()}`);
      const username = EnvironmentUtils.get('MQTT_USERNAME');
      const password = EnvironmentUtils.get('MQTT_PASSWORD');

      const options: any = {
        clientId,
        clean: true,
        connectTimeout: 4000,
        reconnectPeriod: 1000,
        keepalive: 60
      };

      if (username && password) {
        options.username = username;
        options.password = password;
      }

      this.mqttClient = mqtt.connect(mqttUrl, options);

      this.setupEventHandlers();
      this.setupTopicSubscriptions();

      await this.waitForConnection();
      
      logger.info('MQTT handler initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize MQTT handler:', error);
      throw error;
    }
  }

  /**
   * Setup MQTT event handlers
   */
  private setupEventHandlers(): void {
    this.mqttClient.on('connect', () => {
      this.isConnected = true;
      logger.info('MQTT client connected successfully');
    });

    this.mqttClient.on('disconnect', () => {
      this.isConnected = false;
      logger.warn('MQTT client disconnected');
    });

    this.mqttClient.on('error', (error) => {
      logger.error('MQTT client error:', error);
    });

    this.mqttClient.on('message', async (topic, message) => {
      try {
        await this.handleMessage(topic, message);
      } catch (error) {
        logger.error('Failed to handle MQTT message:', error);
      }
    });

    this.mqttClient.on('offline', () => {
      this.isConnected = false;
      logger.warn('MQTT client is offline');
    });

    this.mqttClient.on('reconnect', () => {
      logger.info('MQTT client attempting to reconnect');
    });
  }

  /**
   * Setup topic subscriptions
   */
  private setupTopicSubscriptions(): void {
    // Device data topics
    const dataTopics = [
      'devices/+/data',           // Device sensor data
      'devices/+/status',         // Device status updates
      'devices/+/heartbeat',      // Device heartbeat
      'devices/+/alerts',         // Device alerts
      'devices/+/config/response', // Configuration responses
      'gateways/+/devices/+/data' // Gateway-relayed device data
    ];

    dataTopics.forEach(topic => {
      this.mqttClient.subscribe(topic, { qos: 1 }, (error) => {
        if (error) {
          logger.error(`Failed to subscribe to topic ${topic}:`, error);
        } else {
          this.subscriptions.add(topic);
          logger.info(`Subscribed to topic: ${topic}`);
        }
      });
    });
  }

  /**
   * Handle incoming MQTT messages
   */
  private async handleMessage(topic: string, message: Buffer): Promise<void> {
    try {
      const messageStr = message.toString();
      let payload: any;

      try {
        payload = JSON.parse(messageStr);
      } catch (parseError) {
        logger.warn('Failed to parse MQTT message as JSON:', { topic, message: messageStr });
        return;
      }

      logger.debug('Received MQTT message', { topic, payload });

      // Extract device ID from topic
      const deviceId = this.extractDeviceId(topic);
      if (!deviceId) {
        logger.warn('Could not extract device ID from topic:', topic);
        return;
      }

      // Route message based on topic pattern
      if (topic.includes('/data')) {
        await this.handleSensorData(deviceId, payload);
      } else if (topic.includes('/status')) {
        await this.handleDeviceStatus(deviceId, payload);
      } else if (topic.includes('/heartbeat')) {
        await this.handleHeartbeat(deviceId, payload);
      } else if (topic.includes('/alerts')) {
        await this.handleDeviceAlert(deviceId, payload);
      } else if (topic.includes('/config/response')) {
        await this.handleConfigResponse(deviceId, payload);
      }

      // Forward to Kafka for further processing
      await this.forwardToKafka(topic, deviceId, payload);

    } catch (error) {
      logger.error('Error handling MQTT message:', error);
    }
  }

  /**
   * Handle sensor data messages
   */
  private async handleSensorData(deviceId: string, payload: any): Promise<void> {
    try {
      const sensorData = {
        deviceId,
        timestamp: payload.timestamp || new Date().toISOString(),
        data: payload.data || payload,
        location: payload.location,
        correlationId: payload.correlationId
      };

      // Ingest sensor data
      await this.dataProcessingService.ingestSensorData(sensorData);
      
      logger.debug('Sensor data processed', { deviceId, dataKeys: Object.keys(sensorData.data) });
    } catch (error) {
      logger.error('Failed to handle sensor data:', error);
    }
  }

  /**
   * Handle device status updates
   */
  private async handleDeviceStatus(deviceId: string, payload: any): Promise<void> {
    try {
      // Update device status in database
      // This would typically update the device's status, battery level, signal strength, etc.
      
      logger.info('Device status updated', { 
        deviceId, 
        status: payload.status,
        battery: payload.battery,
        signal: payload.signalStrength
      });
    } catch (error) {
      logger.error('Failed to handle device status:', error);
    }
  }

  /**
   * Handle device heartbeat
   */
  private async handleHeartbeat(deviceId: string, payload: any): Promise<void> {
    try {
      // Update last heartbeat timestamp
      const heartbeatData = {
        deviceId,
        timestamp: new Date(),
        status: 'online',
        uptime: payload.uptime,
        firmware: payload.firmware
      };

      logger.debug('Device heartbeat received', { deviceId, uptime: payload.uptime });
    } catch (error) {
      logger.error('Failed to handle heartbeat:', error);
    }
  }

  /**
   * Handle device alerts
   */
  private async handleDeviceAlert(deviceId: string, payload: any): Promise<void> {
    try {
      const alert = {
        deviceId,
        alertType: payload.type || 'unknown',
        severity: payload.severity || 'medium',
        title: payload.title || 'Device Alert',
        message: payload.message,
        data: payload.data || {},
        status: 'active',
        timestamps: {
          created: new Date()
        },
        actions: []
      };

      // Store alert in database
      // Trigger notifications based on severity
      
      logger.warn('Device alert received', { 
        deviceId, 
        type: alert.alertType, 
        severity: alert.severity 
      });
    } catch (error) {
      logger.error('Failed to handle device alert:', error);
    }
  }

  /**
   * Handle configuration response
   */
  private async handleConfigResponse(deviceId: string, payload: any): Promise<void> {
    try {
      logger.info('Configuration response received', { 
        deviceId, 
        success: payload.success,
        configId: payload.configId
      });
    } catch (error) {
      logger.error('Failed to handle config response:', error);
    }
  }

  /**
   * Forward message to Kafka for further processing
   */
  private async forwardToKafka(topic: string, deviceId: string, payload: any): Promise<void> {
    try {
      if (!this.kafkaProducer) {
        logger.debug('Kafka producer not available, skipping message forwarding');
        return;
      }

      const kafkaMessage = {
        key: deviceId,
        value: JSON.stringify({
          topic,
          deviceId,
          payload,
          timestamp: new Date().toISOString()
        })
      };

      await this.kafkaProducer.send({
        topic: 'iot-data-stream',
        messages: [kafkaMessage]
      });

      logger.debug('Message forwarded to Kafka', { deviceId, topic });
    } catch (error) {
      logger.error('Failed to forward message to Kafka:', error);
    }
  }

  /**
   * Extract device ID from MQTT topic
   */
  private extractDeviceId(topic: string): string | null {
    // Handle different topic patterns:
    // devices/{deviceId}/data
    // gateways/{gatewayId}/devices/{deviceId}/data
    
    const deviceMatch = topic.match(/devices\\/([^/]+)/);
    if (deviceMatch) {
      return deviceMatch[1];
    }

    const gatewayDeviceMatch = topic.match(/gateways\\/[^/]+\\/devices\\/([^/]+)/);
    if (gatewayDeviceMatch) {
      return gatewayDeviceMatch[1];
    }

    return null;
  }

  /**
   * Publish message to MQTT topic
   */
  async publishMessage(topic: string, message: any, options: any = {}): Promise<void> {
    try {
      if (!this.isConnected) {
        throw new Error('MQTT client is not connected');
      }

      const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
      
      return new Promise((resolve, reject) => {
        this.mqttClient.publish(topic, messageStr, { qos: 1, ...options }, (error) => {
          if (error) {
            logger.error('Failed to publish MQTT message:', error);
            reject(error);
          } else {
            logger.debug('MQTT message published', { topic, messageLength: messageStr.length });
            resolve();
          }
        });
      });
    } catch (error) {
      logger.error('Failed to publish MQTT message:', error);
      throw error;
    }
  }

  /**
   * Send configuration to device
   */
  async sendDeviceConfig(deviceId: string, config: any): Promise<void> {
    try {
      const topic = `devices/${deviceId}/config`;
      const message = {
        configId: `cfg_${Date.now()}`,
        timestamp: new Date().toISOString(),
        config
      };

      await this.publishMessage(topic, message);
      
      logger.info('Configuration sent to device', { deviceId, configId: message.configId });
    } catch (error) {
      logger.error('Failed to send device config:', error);
      throw error;
    }
  }

  /**
   * Send command to device
   */
  async sendDeviceCommand(deviceId: string, command: string, parameters: any = {}): Promise<void> {
    try {
      const topic = `devices/${deviceId}/commands`;
      const message = {
        commandId: `cmd_${Date.now()}`,
        timestamp: new Date().toISOString(),
        command,
        parameters
      };

      await this.publishMessage(topic, message);
      
      logger.info('Command sent to device', { deviceId, command, commandId: message.commandId });
    } catch (error) {
      logger.error('Failed to send device command:', error);
      throw error;
    }
  }

  /**
   * Wait for MQTT connection
   */
  private waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('MQTT connection timeout'));
      }, 10000);

      if (this.isConnected) {
        clearTimeout(timeout);
        resolve();
        return;
      }

      this.mqttClient.once('connect', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.mqttClient.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * Get connection status
   */
  isConnectedStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Get subscribed topics
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  /**
   * Disconnect MQTT client
   */
  async disconnect(): Promise<void> {
    try {
      if (this.mqttClient) {
        this.mqttClient.end(true);
        this.isConnected = false;
        logger.info('MQTT client disconnected');
      }
    } catch (error) {
      logger.error('Failed to disconnect MQTT client:', error);
      throw error;
    }
  }
}

export default MqttHandler;"