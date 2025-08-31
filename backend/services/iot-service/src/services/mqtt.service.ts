import mqtt from 'mqtt';
import { logger } from '@daorsagro/utils';
import { IoTService } from './iot.service';
import { SensorDataType, DeviceStatus } from '../models/iot.model';

interface MqttConfig {
  brokerUrl: string;
  username?: string;
  password?: string;
  clientId: string;
  topics: string[];
  qos: 0 | 1 | 2;
  keepalive: number;
  reconnectPeriod: number;
}

interface MqttMessage {
  topic: string;
  payload: Buffer | string;
  timestamp: Date;
}

interface SensorPayload {
  deviceId: string;
  timestamp?: string;
  data: {
    [key: string]: {
      value: number | string | boolean;
      unit: string;
      quality?: 'good' | 'fair' | 'poor' | 'error';
    };
  };
  metadata?: {
    batteryLevel?: number;
    signalStrength?: number;
    location?: {
      latitude: number;
      longitude: number;
      altitude?: number;
    };
  };
}

export class MqttHandler {
  private client: mqtt.MqttClient | null = null;
  private iotService: IoTService;
  private config: MqttConfig;
  private isConnected: boolean = false;
  private messageQueue: MqttMessage[] = [];
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;

  constructor(iotService: IoTService) {
    this.iotService = iotService;
    this.config = {
      brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD,
      clientId: process.env.MQTT_CLIENT_ID || `daorsagro_iot_${Date.now()}`,
      topics: [
        'daorsagro/+/sensors/+', // daorsagro/{farmId}/sensors/{deviceId}
        'daorsagro/+/devices/+/status', // Device status updates
        'daorsagro/+/devices/+/heartbeat', // Device heartbeats
        'daorsagro/+/alerts/+' // Alert messages
      ],
      qos: 1,
      keepalive: 60,
      reconnectPeriod: 5000
    };
  }

  /**
   * Initialize MQTT connection
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing MQTT connection', {
        brokerUrl: this.config.brokerUrl,
        clientId: this.config.clientId
      });

      const options: mqtt.IClientOptions = {
        clientId: this.config.clientId,
        username: this.config.username,
        password: this.config.password,
        keepalive: this.config.keepalive,
        reconnectPeriod: this.config.reconnectPeriod,
        connectTimeout: 30000,
        clean: true,
        will: {
          topic: `daorsagro/system/iot-service/status`,
          payload: JSON.stringify({
            status: 'offline',
            timestamp: new Date().toISOString(),
            clientId: this.config.clientId
          }),
          qos: 1,
          retain: true
        }
      };

      this.client = mqtt.connect(this.config.brokerUrl, options);

      this.setupEventHandlers();
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('MQTT connection timeout'));
        }, 30000);

        this.client!.once('connect', () => {
          clearTimeout(timeout);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve();
        });

        this.client!.once('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    } catch (error) {
      logger.error('Failed to initialize MQTT connection:', error);
      throw error;
    }
  }

  /**
   * Setup MQTT event handlers
   */
  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on('connect', () => {
      logger.info('Connected to MQTT broker', {
        brokerUrl: this.config.brokerUrl,
        clientId: this.config.clientId
      });

      this.isConnected = true;
      this.reconnectAttempts = 0;

      // Subscribe to topics
      this.subscribeToTopics();

      // Publish service online status
      this.publishServiceStatus('online');

      // Process queued messages
      this.processMessageQueue();
    });

    this.client.on('disconnect', () => {
      logger.warn('Disconnected from MQTT broker');
      this.isConnected = false;
    });

    this.client.on('reconnect', () => {
      this.reconnectAttempts++;
      logger.info(`Attempting to reconnect to MQTT broker (attempt ${this.reconnectAttempts})`);

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        logger.error('Max reconnection attempts reached, stopping reconnection');
        this.client?.end();
      }
    });

    this.client.on('error', (error) => {
      logger.error('MQTT client error:', error);
      this.isConnected = false;
    });

    this.client.on('message', (topic, message) => {
      this.handleMessage(topic, message);
    });

    this.client.on('close', () => {
      logger.warn('MQTT connection closed');
      this.isConnected = false;
    });

    this.client.on('offline', () => {
      logger.warn('MQTT client is offline');
      this.isConnected = false;
    });
  }

  /**
   * Subscribe to MQTT topics
   */
  private subscribeToTopics(): void {
    if (!this.client || !this.isConnected) return;

    this.config.topics.forEach(topic => {
      this.client!.subscribe(topic, { qos: this.config.qos }, (error) => {
        if (error) {
          logger.error('Failed to subscribe to topic:', { topic, error });
        } else {
          logger.info('Successfully subscribed to topic:', { topic });
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
      const timestamp = new Date();

      logger.debug('Received MQTT message', {
        topic,
        messageLength: messageStr.length,
        timestamp
      });

      // Parse topic to extract information
      const topicParts = topic.split('/');
      
      if (topicParts[0] !== 'daorsagro') {
        logger.warn('Invalid topic format, ignoring message', { topic });
        return;
      }

      const farmId = topicParts[1];
      const messageType = topicParts[2]; // sensors, devices, alerts
      const deviceId = topicParts[3];

      // Parse message payload
      let payload: any;
      try {
        payload = JSON.parse(messageStr);
      } catch (parseError) {
        logger.error('Failed to parse MQTT message payload:', { topic, error: parseError });
        return;
      }

      // Route message based on type
      switch (messageType) {
        case 'sensors':
          await this.handleSensorData(deviceId, farmId, payload, timestamp);
          break;
        case 'devices':
          if (topicParts[4] === 'status') {
            await this.handleDeviceStatus(deviceId, farmId, payload, timestamp);
          } else if (topicParts[4] === 'heartbeat') {
            await this.handleDeviceHeartbeat(deviceId, farmId, payload, timestamp);
          }
          break;
        case 'alerts':
          await this.handleDeviceAlert(deviceId, farmId, payload, timestamp);
          break;
        default:
          logger.warn('Unknown message type, ignoring', { topic, messageType });
      }
    } catch (error) {
      logger.error('Error handling MQTT message:', { topic, error });
    }
  }

  /**
   * Handle sensor data messages
   */
  private async handleSensorData(
    deviceId: string, 
    farmId: string, 
    payload: SensorPayload, 
    timestamp: Date
  ): Promise<void> {
    try {
      // Convert payload to IoT service format
      const readings = Object.entries(payload.data).map(([dataType, reading]) => ({
        dataType: this.mapDataType(dataType),
        value: reading.value,
        unit: reading.unit,
        quality: reading.quality || 'good'
      }));

      // Convert location if provided
      let location;
      if (payload.metadata?.location) {
        location = {
          type: 'Point' as const,
          coordinates: [
            payload.metadata.location.longitude,
            payload.metadata.location.latitude
          ],
          altitude: payload.metadata.location.altitude
        };
      }

      // Ingest data through IoT service
      await this.iotService.ingestSensorData({
        deviceId,
        timestamp: payload.timestamp ? new Date(payload.timestamp) : timestamp,
        readings,
        metadata: {
          batteryLevel: payload.metadata?.batteryLevel,
          signalStrength: payload.metadata?.signalStrength,
          location
        }
      });

      logger.info('Successfully processed sensor data', {
        deviceId,
        farmId,
        readingsCount: readings.length
      });
    } catch (error) {
      logger.error('Error handling sensor data:', { deviceId, farmId, error });
    }
  }

  /**
   * Handle device status messages
   */
  private async handleDeviceStatus(
    deviceId: string,
    farmId: string,
    payload: any,
    timestamp: Date
  ): Promise<void> {
    try {
      const status = this.mapDeviceStatus(payload.status);
      
      // Find device to get userId
      const device = await this.iotService.getDeviceById(deviceId, payload.userId || '');
      if (!device) {
        logger.warn('Device not found for status update', { deviceId, farmId });
        return;
      }

      await this.iotService.updateDeviceStatus(deviceId, status, device.userId, {
        batteryLevel: payload.batteryLevel,
        signalStrength: payload.signalStrength,
        location: payload.location
      });

      logger.info('Device status updated from MQTT', {
        deviceId,
        status,
        batteryLevel: payload.batteryLevel
      });
    } catch (error) {
      logger.error('Error handling device status:', { deviceId, farmId, error });
    }
  }

  /**
   * Handle device heartbeat messages
   */
  private async handleDeviceHeartbeat(
    deviceId: string,
    farmId: string,
    payload: any,
    timestamp: Date
  ): Promise<void> {
    try {
      // Find device
      const device = await this.iotService.getDeviceById(deviceId, payload.userId || '');
      if (!device) {
        logger.warn('Device not found for heartbeat', { deviceId, farmId });
        return;
      }

      // Update device as online
      await this.iotService.updateDeviceStatus(
        deviceId, 
        DeviceStatus.ONLINE, 
        device.userId,
        {
          batteryLevel: payload.batteryLevel,
          signalStrength: payload.signalStrength
        }
      );

      logger.debug('Device heartbeat processed', { deviceId, timestamp });
    } catch (error) {
      logger.error('Error handling device heartbeat:', { deviceId, farmId, error });
    }
  }

  /**
   * Handle device alert messages
   */
  private async handleDeviceAlert(
    deviceId: string,
    farmId: string,
    payload: any,
    timestamp: Date
  ): Promise<void> {
    try {
      // Find device to get userId
      const device = await this.iotService.getDeviceById(deviceId, payload.userId || '');
      if (!device) {
        logger.warn('Device not found for alert', { deviceId, farmId });
        return;
      }

      // Create alert through IoT service
      await this.iotService.createAlert({
        deviceId,
        userId: device.userId,
        farmId: device.farmId,
        type: payload.alertType,
        severity: payload.severity,
        title: payload.title,
        message: payload.message,
        triggerConditions: payload.triggerConditions
      });

      logger.info('Device alert created from MQTT', {
        deviceId,
        alertType: payload.alertType,
        severity: payload.severity
      });
    } catch (error) {
      logger.error('Error handling device alert:', { deviceId, farmId, error });
    }
  }

  /**
   * Publish message to MQTT broker
   */
  async publishMessage(topic: string, payload: any, options?: {
    qos?: 0 | 1 | 2;
    retain?: boolean;
  }): Promise<void> {
    try {
      if (!this.client || !this.isConnected) {
        // Queue message for later if not connected
        this.messageQueue.push({
          topic,
          payload: JSON.stringify(payload),
          timestamp: new Date()
        });
        logger.debug('Queued MQTT message (not connected)', { topic });
        return;
      }

      const messageStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
      
      return new Promise((resolve, reject) => {
        this.client!.publish(topic, messageStr, {
          qos: options?.qos || this.config.qos,
          retain: options?.retain || false
        }, (error) => {
          if (error) {
            logger.error('Failed to publish MQTT message:', { topic, error });
            reject(error);
          } else {
            logger.debug('Successfully published MQTT message', { topic });
            resolve();
          }
        });
      });
    } catch (error) {
      logger.error('Error publishing MQTT message:', { topic, error });
      throw error;
    }
  }

  /**
   * Publish service status
   */
  private async publishServiceStatus(status: 'online' | 'offline'): Promise<void> {
    try {
      const topic = 'daorsagro/system/iot-service/status';
      const payload = {
        status,
        timestamp: new Date().toISOString(),
        clientId: this.config.clientId,
        version: process.env.npm_package_version || '1.0.0'
      };

      await this.publishMessage(topic, payload, { retain: true });
    } catch (error) {
      logger.error('Failed to publish service status:', error);
    }
  }

  /**
   * Process queued messages
   */
  private async processMessageQueue(): Promise<void> {
    if (this.messageQueue.length === 0) return;

    logger.info('Processing queued MQTT messages', { count: this.messageQueue.length });

    const messages = [...this.messageQueue];
    this.messageQueue = [];

    for (const message of messages) {
      try {
        await this.publishMessage(message.topic, message.payload);
      } catch (error) {
        logger.error('Failed to process queued message:', { topic: message.topic, error });
        // Re-queue the message
        this.messageQueue.push(message);
      }
    }
  }

  /**
   * Disconnect from MQTT broker
   */
  async disconnect(): Promise<void> {
    try {
      if (this.client && this.isConnected) {
        // Publish offline status
        await this.publishServiceStatus('offline');
        
        return new Promise((resolve) => {
          this.client!.end(false, {}, () => {
            logger.info('Disconnected from MQTT broker');
            this.isConnected = false;
            resolve();
          });
        });
      }
    } catch (error) {
      logger.error('Error disconnecting from MQTT broker:', error);
    }
  }

  /**
   * Get connection status
   */
  getStatus(): {
    connected: boolean;
    reconnectAttempts: number;
    queuedMessages: number;
    brokerUrl: string;
  } {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
      brokerUrl: this.config.brokerUrl
    };
  }

  // Helper methods
  private mapDataType(dataType: string): SensorDataType {
    const typeMap: Record<string, SensorDataType> = {
      'temperature': SensorDataType.TEMPERATURE,
      'humidity': SensorDataType.HUMIDITY,
      'soil_moisture': SensorDataType.SOIL_MOISTURE,
      'soilMoisture': SensorDataType.SOIL_MOISTURE,
      'soil_ph': SensorDataType.SOIL_PH,
      'soilPh': SensorDataType.SOIL_PH,
      'ph': SensorDataType.SOIL_PH,
      'light': SensorDataType.LIGHT_INTENSITY,
      'light_intensity': SensorDataType.LIGHT_INTENSITY,
      'water_level': SensorDataType.WATER_LEVEL,
      'waterLevel': SensorDataType.WATER_LEVEL,
      'battery': SensorDataType.BATTERY_LEVEL,
      'battery_level': SensorDataType.BATTERY_LEVEL,
      'batteryLevel': SensorDataType.BATTERY_LEVEL
    };

    return typeMap[dataType] || SensorDataType.TEMPERATURE;
  }

  private mapDeviceStatus(status: string): DeviceStatus {
    const statusMap: Record<string, DeviceStatus> = {
      'online': DeviceStatus.ONLINE,
      'offline': DeviceStatus.OFFLINE,
      'maintenance': DeviceStatus.MAINTENANCE,
      'error': DeviceStatus.ERROR,
      'sleeping': DeviceStatus.SLEEPING,
      'low_battery': DeviceStatus.LOW_BATTERY,
      'lowBattery': DeviceStatus.LOW_BATTERY
    };

    return statusMap[status] || DeviceStatus.OFFLINE;
  }
}