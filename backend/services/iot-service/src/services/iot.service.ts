import { MongoConnection, RedisConnection, KafkaConnection, Logger } from '@daorsagro/utils';
import { ObjectId } from 'mongodb';

export interface IoTDevice {
  _id?: ObjectId;
  deviceId: string;
  farmId: string;
  name: string;
  type: 'sensor' | 'actuator' | 'gateway';
  status: 'online' | 'offline' | 'maintenance';
  location: {
    lat: number;
    lng: number;
    elevation?: number;
  };
  specifications: {
    model: string;
    manufacturer: string;
    firmware: string;
    sensors: string[];
  };
  configuration: {
    reportingInterval: number; // seconds
    thresholds: Record<string, { min: number; max: number }>;
    [key: string]: any;
  };
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SensorReading {
  _id?: ObjectId;
  deviceId: string;
  farmId: string;
  sensorType: string;
  value: number;
  unit: string;
  timestamp: Date;
  location?: {
    lat: number;
    lng: number;
  };
  metadata: {
    quality: number; // 0-1 quality score
    calibrated: boolean;
    [key: string]: any;
  };
  processed: boolean;
  alerts?: string[];
}

/**
 * Core IoT service for device and data management
 */
export class IoTService {
  private logger: Logger;
  private mongo: MongoConnection;
  private redis: RedisConnection;
  private kafka: KafkaConnection;

  constructor() {
    this.logger = new Logger('iot-service-core');
    this.mongo = MongoConnection.getInstance();
    this.redis = RedisConnection.getInstance();
    this.kafka = KafkaConnection.getInstance();
  }

  /**
   * Register a new IoT device
   */
  async registerDevice(deviceData: Partial<IoTDevice>): Promise<IoTDevice> {
    try {
      const db = this.mongo.getDatabase();
      const deviceCollection = db.collection<IoTDevice>('iot_devices');

      // Check if device already exists
      const existingDevice = await deviceCollection.findOne({ deviceId: deviceData.deviceId });
      if (existingDevice) {
        throw new Error(`Device with ID ${deviceData.deviceId} already exists`);
      }

      const device: IoTDevice = {
        ...deviceData,
        status: deviceData.status || 'offline',
        lastSeen: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as IoTDevice;

      const result = await deviceCollection.insertOne(device);
      device._id = result.insertedId;

      // Cache device info in Redis
      await this.cacheDeviceInfo(device);

      // Publish device registration event
      await this.publishDeviceEvent('device_registered', device);

      this.logger.info('Device registered successfully', { deviceId: device.deviceId });
      return device;

    } catch (error) {
      this.logger.error('Failed to register device', error);
      throw error;
    }
  }

  /**
   * Update device status and last seen timestamp
   */
  async updateDeviceStatus(deviceId: string, status: 'online' | 'offline' | 'maintenance'): Promise<void> {
    try {
      const db = this.mongo.getDatabase();
      const deviceCollection = db.collection<IoTDevice>('iot_devices');

      const result = await deviceCollection.updateOne(
        { deviceId },
        { 
          $set: { 
            status, 
            lastSeen: new Date(),
            updatedAt: new Date()
          } 
        }
      );

      if (result.matchedCount === 0) {
        throw new Error(`Device ${deviceId} not found`);
      }

      // Update cache
      const device = await deviceCollection.findOne({ deviceId });
      if (device) {
        await this.cacheDeviceInfo(device);
        await this.publishDeviceEvent('device_status_changed', device);
      }

      this.logger.info('Device status updated', { deviceId, status });

    } catch (error) {
      this.logger.error('Failed to update device status', error);
      throw error;
    }
  }

  /**
   * Store sensor reading
   */
  async storeSensorReading(reading: Partial<SensorReading>): Promise<SensorReading> {
    try {
      const db = this.mongo.getDatabase();
      const readingsCollection = db.collection<SensorReading>('sensor_readings');

      const sensorReading: SensorReading = {
        ...reading,
        timestamp: reading.timestamp || new Date(),
        processed: false,
        metadata: {
          quality: 1.0,
          calibrated: true,
          ...reading.metadata
        }
      } as SensorReading;

      // Validate reading
      await this.validateSensorReading(sensorReading);

      const result = await readingsCollection.insertOne(sensorReading);
      sensorReading._id = result.insertedId;

      // Update device last seen
      await this.updateDeviceStatus(sensorReading.deviceId, 'online');

      // Process alerts
      sensorReading.alerts = await this.checkAlerts(sensorReading);

      // Publish to Kafka for real-time processing
      await this.publishSensorData(sensorReading);

      // Cache recent reading
      await this.cacheRecentReading(sensorReading);

      this.logger.debug('Sensor reading stored', { 
        deviceId: sensorReading.deviceId, 
        sensorType: sensorReading.sensorType,
        value: sensorReading.value
      });

      return sensorReading;

    } catch (error) {
      this.logger.error('Failed to store sensor reading', error);
      throw error;
    }
  }

  /**
   * Get device by ID
   */
  async getDevice(deviceId: string): Promise<IoTDevice | null> {
    try {
      // Try cache first
      const cached = await this.getCachedDeviceInfo(deviceId);
      if (cached) {
        return cached;
      }

      // Fallback to database
      const db = this.mongo.getDatabase();
      const deviceCollection = db.collection<IoTDevice>('iot_devices');
      const device = await deviceCollection.findOne({ deviceId });

      if (device) {
        await this.cacheDeviceInfo(device);
      }

      return device;

    } catch (error) {
      this.logger.error('Failed to get device', error);
      throw error;
    }
  }

  /**
   * Get devices by farm ID
   */
  async getDevicesByFarm(farmId: string): Promise<IoTDevice[]> {
    try {
      const db = this.mongo.getDatabase();
      const deviceCollection = db.collection<IoTDevice>('iot_devices');
      
      const devices = await deviceCollection.find({ farmId }).toArray();
      return devices;

    } catch (error) {
      this.logger.error('Failed to get devices by farm', error);
      throw error;
    }
  }

  /**
   * Get recent sensor readings
   */
  async getRecentReadings(deviceId: string, hours: number = 24): Promise<SensorReading[]> {
    try {
      const db = this.mongo.getDatabase();
      const readingsCollection = db.collection<SensorReading>('sensor_readings');
      
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      const readings = await readingsCollection
        .find({ 
          deviceId, 
          timestamp: { $gte: since } 
        })
        .sort({ timestamp: -1 })
        .limit(1000)
        .toArray();

      return readings;

    } catch (error) {
      this.logger.error('Failed to get recent readings', error);
      throw error;
    }
  }

  /**
   * Get aggregated sensor data
   */
  async getAggregatedData(
    farmId: string, 
    sensorType: string, 
    startDate: Date, 
    endDate: Date,
    interval: 'hour' | 'day' | 'week' = 'hour'
  ): Promise<any[]> {
    try {
      const db = this.mongo.getDatabase();
      const readingsCollection = db.collection<SensorReading>('sensor_readings');

      // Create aggregation pipeline based on interval
      let groupBy: any;
      switch (interval) {
        case 'hour':
          groupBy = {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' },
            hour: { $hour: '$timestamp' }
          };
          break;
        case 'day':
          groupBy = {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' }
          };
          break;
        case 'week':
          groupBy = {
            year: { $year: '$timestamp' },
            week: { $week: '$timestamp' }
          };
          break;
      }

      const pipeline = [
        {
          $match: {
            farmId,
            sensorType,
            timestamp: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: groupBy,
            avgValue: { $avg: '$value' },
            minValue: { $min: '$value' },
            maxValue: { $max: '$value' },
            count: { $sum: 1 },
            timestamp: { $first: '$timestamp' }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 }
        }
      ];

      const aggregatedData = await readingsCollection.aggregate(pipeline).toArray();
      return aggregatedData;

    } catch (error) {
      this.logger.error('Failed to get aggregated data', error);
      throw error;
    }
  }

  /**
   * Validate sensor reading
   */
  private async validateSensorReading(reading: SensorReading): Promise<void> {
    if (!reading.deviceId) {
      throw new Error('Device ID is required');
    }

    if (!reading.sensorType) {
      throw new Error('Sensor type is required');
    }

    if (typeof reading.value !== 'number') {
      throw new Error('Sensor value must be a number');
    }

    // Check if device exists
    const device = await this.getDevice(reading.deviceId);
    if (!device) {
      throw new Error(`Device ${reading.deviceId} not found`);
    }

    // Validate sensor type is supported by device
    if (!device.specifications.sensors.includes(reading.sensorType)) {
      throw new Error(`Sensor type ${reading.sensorType} not supported by device ${reading.deviceId}`);
    }
  }

  /**
   * Check for alerts based on thresholds
   */
  private async checkAlerts(reading: SensorReading): Promise<string[]> {
    const alerts: string[] = [];
    
    try {
      const device = await this.getDevice(reading.deviceId);
      if (!device) return alerts;

      const thresholds = device.configuration.thresholds[reading.sensorType];
      if (!thresholds) return alerts;

      if (reading.value < thresholds.min) {
        alerts.push(`${reading.sensorType} below minimum threshold (${reading.value} < ${thresholds.min})`);
      }

      if (reading.value > thresholds.max) {
        alerts.push(`${reading.sensorType} above maximum threshold (${reading.value} > ${thresholds.max})`);
      }

    } catch (error) {
      this.logger.error('Failed to check alerts', error);
    }

    return alerts;
  }

  /**
   * Cache device information in Redis
   */
  private async cacheDeviceInfo(device: IoTDevice): Promise<void> {
    try {
      const redis = this.redis.getClient();
      const key = `device:${device.deviceId}`;
      await redis.setex(key, 3600, JSON.stringify(device)); // Cache for 1 hour
    } catch (error) {
      this.logger.error('Failed to cache device info', error);
    }
  }

  /**
   * Get cached device information
   */
  private async getCachedDeviceInfo(deviceId: string): Promise<IoTDevice | null> {
    try {
      const redis = this.redis.getClient();
      const key = `device:${deviceId}`;
      const cached = await redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      this.logger.error('Failed to get cached device info', error);
      return null;
    }
  }

  /**
   * Cache recent reading
   */
  private async cacheRecentReading(reading: SensorReading): Promise<void> {
    try {
      const redis = this.redis.getClient();
      const key = `recent:${reading.deviceId}:${reading.sensorType}`;
      await redis.setex(key, 300, JSON.stringify(reading)); // Cache for 5 minutes
    } catch (error) {
      this.logger.error('Failed to cache recent reading', error);
    }
  }

  /**
   * Publish device event to Kafka
   */
  private async publishDeviceEvent(eventType: string, device: IoTDevice): Promise<void> {
    try {
      const producer = this.kafka.getProducer();
      await producer.send({
        topic: 'iot-events',
        messages: [{
          key: device.deviceId,
          value: JSON.stringify({
            eventType,
            deviceId: device.deviceId,
            farmId: device.farmId,
            timestamp: new Date().toISOString(),
            device
          })
        }]
      });
    } catch (error) {
      this.logger.error('Failed to publish device event', error);
    }
  }

  /**
   * Publish sensor data to Kafka
   */
  private async publishSensorData(reading: SensorReading): Promise<void> {
    try {
      const producer = this.kafka.getProducer();
      await producer.send({
        topic: 'sensor-data',
        messages: [{
          key: reading.deviceId,
          value: JSON.stringify({
            eventType: 'sensor_reading',
            ...reading,
            timestamp: reading.timestamp.toISOString()
          })
        }]
      });
    } catch (error) {
      this.logger.error('Failed to publish sensor data', error);
    }
  }
}