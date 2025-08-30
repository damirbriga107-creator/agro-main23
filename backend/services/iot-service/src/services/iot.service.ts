import { MongoClient, Db, Collection } from 'mongodb';
import { Logger } from '@daorsagro/utils';
import { 
  IoTDevice, 
  SensorReading, 
  DeviceAlert, 
  SensorThreshold, 
  IoTSummary,
  DeviceStatus,
  StreamInfo 
} from '../models/iot.model';

const logger = new Logger('iot-service');

export class IoTService {
  private db: Db;
  private devicesCollection: Collection<IoTDevice>;
  private readingsCollection: Collection<SensorReading>;
  private alertsCollection: Collection<DeviceAlert>;
  private thresholdsCollection: Collection<SensorThreshold>;

  constructor(mongoClient?: MongoClient) {
    if (mongoClient) {
      this.db = mongoClient.db('daorsagro');
      this.devicesCollection = this.db.collection('iot_devices');
      this.readingsCollection = this.db.collection('sensor_readings');
      this.alertsCollection = this.db.collection('device_alerts');
      this.thresholdsCollection = this.db.collection('sensor_thresholds');
    } else {
      // Mock implementation for development
      logger.warn('No MongoDB client provided, using mock data');
    }
  }

  /**
   * Get devices for a user with filters
   */
  async getDevices(filters: any): Promise<{ devices: IoTDevice[], pagination: any }> {
    try {
      const { userId, page = 1, limit = 10, status, type, farmId } = filters;
      
      if (!this.devicesCollection) {
        // Mock implementation
        const mockDevices = this.getMockDevices();
        let filteredDevices = mockDevices.filter(d => d.owner.userId === userId || !userId);
        
        if (status) filteredDevices = filteredDevices.filter(d => d.status === status);
        if (type) filteredDevices = filteredDevices.filter(d => d.type === type);
        if (farmId) filteredDevices = filteredDevices.filter(d => d.location.farmId === farmId);
        
        const total = filteredDevices.length;
        const startIndex = (page - 1) * limit;
        const paginatedDevices = filteredDevices.slice(startIndex, startIndex + limit);
        
        return {
          devices: paginatedDevices,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        };
      }
      
      // Build query
      const query: any = { 'owner.userId': userId };
      
      if (status) query.status = status;
      if (type) query.type = type;
      if (farmId) query['location.farmId'] = farmId;

      // Get total count
      const total = await this.devicesCollection.countDocuments(query);
      
      // Get paginated devices
      const devices = await this.devicesCollection
        .find(query)
        .sort({ 'metadata.updatedAt': -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray();

      const pagination = {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      };

      logger.info('Devices retrieved', { userId, count: devices.length, total });
      
      return { devices, pagination };
    } catch (error) {
      logger.error('Failed to get devices:', error);
      throw error;
    }
  }

  /**
   * Get device summary statistics
   */
  async getDeviceSummary(userId: string): Promise<IoTSummary> {
    try {
      if (!this.devicesCollection) {
        // Mock implementation
        return this.getMockSummary();
      }
      
      const query = { 'owner.userId': userId };
      
      // Get device counts
      const totalDevices = await this.devicesCollection.countDocuments(query);
      const onlineDevices = await this.devicesCollection.countDocuments({ 
        ...query, 
        status: 'online' 
      });
      const offlineDevices = await this.devicesCollection.countDocuments({ 
        ...query, 
        status: 'offline' 
      });

      // Get devices by type
      const devicesByType = await this.devicesCollection.aggregate([
        { $match: query },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]).toArray();

      // Get devices by status
      const devicesByStatus = await this.devicesCollection.aggregate([
        { $match: query },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]).toArray();

      // Get readings from last 24 hours
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const userDevices = await this.devicesCollection.find(query, { projection: { deviceId: 1 } }).toArray();
      const deviceIds = userDevices.map(d => d.deviceId);
      
      const totalReadings24h = await this.readingsCollection.countDocuments({
        deviceId: { $in: deviceIds },
        timestamp: { $gte: yesterday }
      });

      // Get active alerts
      const activeAlerts = await this.alertsCollection.countDocuments({
        deviceId: { $in: deviceIds },
        status: 'active'
      });

      // Calculate average data quality
      const qualityResult = await this.readingsCollection.aggregate([
        { 
          $match: { 
            deviceId: { $in: deviceIds },
            timestamp: { $gte: yesterday }
          }
        },
        { 
          $group: { 
            _id: null, 
            avgQuality: { $avg: '$quality.score' } 
          } 
        }
      ]).toArray();

      const averageDataQuality = qualityResult.length > 0 ? qualityResult[0].avgQuality : 0;

      const summary: IoTSummary = {
        totalDevices,
        onlineDevices,
        offlineDevices,
        devicesByType: devicesByType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {} as Record<string, number>),
        devicesByStatus: devicesByStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {} as Record<string, number>),
        totalReadings24h,
        activeAlerts,
        averageDataQuality: Math.round(averageDataQuality),
        lastUpdate: new Date()
      };

      logger.info('Device summary generated', { userId, summary });
      
      return summary;
    } catch (error) {
      logger.error('Failed to get device summary:', error);
      throw error;
    }
  }

  /**
   * Get sensors for a specific device
   */
  async getDeviceSensors(deviceId: string, userId: string): Promise<string[]> {
    try {
      if (!this.devicesCollection) {
        // Mock implementation
        return ['temperature', 'humidity', 'soil_moisture', 'ph'];
      }
      
      const device = await this.devicesCollection.findOne({
        deviceId,
        'owner.userId': userId
      });

      if (!device) {
        throw new Error('Device not found');
      }

      return device.specifications.sensors || [];
    } catch (error) {
      logger.error('Failed to get device sensors:', error);
      throw error;
    }
  }

  /**
   * Set sensor thresholds for a device
   */
  async setSensorThresholds(deviceId: string, thresholds: any, userId: string): Promise<SensorThreshold> {
    try {
      if (!this.devicesCollection) {
        // Mock implementation
        return {
          deviceId,
          sensorType: thresholds.sensorType,
          thresholds: thresholds.thresholds,
          notifications: { email: true, sms: false, push: true },
          createdBy: userId,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
      
      // Verify device ownership
      const device = await this.devicesCollection.findOne({
        deviceId,
        'owner.userId': userId
      });

      if (!device) {
        throw new Error('Device not found');
      }

      const threshold: SensorThreshold = {
        deviceId,
        sensorType: thresholds.sensorType,
        thresholds: thresholds.thresholds,
        notifications: thresholds.notifications || {
          email: true,
          sms: false,
          push: true
        },
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await this.thresholdsCollection.replaceOne(
        { deviceId, sensorType: thresholds.sensorType },
        threshold,
        { upsert: true }
      );

      logger.info('Sensor thresholds set', { deviceId, sensorType: thresholds.sensorType });
      
      return threshold;
    } catch (error) {
      logger.error('Failed to set sensor thresholds:', error);
      throw error;
    }
  }

  /**
   * Get sensor alerts for a device
   */
  async getSensorAlerts(deviceId: string, pagination: any, userId: string): Promise<{ alerts: DeviceAlert[], pagination: any }> {
    try {
      if (!this.devicesCollection) {
        // Mock implementation
        const mockAlerts = this.getMockAlerts().filter(alert => alert.deviceId === deviceId);
        const { page = 1, limit = 10 } = pagination;
        const total = mockAlerts.length;
        const startIndex = (page - 1) * limit;
        const paginatedAlerts = mockAlerts.slice(startIndex, startIndex + limit);
        
        return {
          alerts: paginatedAlerts,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        };
      }
      
      // Verify device ownership
      const device = await this.devicesCollection.findOne({
        deviceId,
        'owner.userId': userId
      });

      if (!device) {
        throw new Error('Device not found');
      }

      const { page = 1, limit = 10 } = pagination;
      const query = { deviceId };

      const total = await this.alertsCollection.countDocuments(query);
      
      const alerts = await this.alertsCollection
        .find(query)
        .sort({ 'timestamps.created': -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray();

      const paginationResult = {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      };

      return { alerts, pagination: paginationResult };
    } catch (error) {
      logger.error('Failed to get sensor alerts:', error);
      throw error;
    }
  }

  /**
   * Get stream information for a user
   */
  async getStreamInfo(userId: string): Promise<StreamInfo> {
    try {
      if (!this.devicesCollection) {
        // Mock implementation
        return {
          userId,
          activeStreams: [
            {
              deviceId: 'device-001',
              deviceName: 'Soil Sensor #1',
              status: 'active',
              dataRate: 5,
              lastUpdate: new Date()
            }
          ],
          totalStreams: 3,
          totalDataRate: 15,
          websocketConnections: 2,
          mqttConnections: 3
        };
      }
      
      const userDevices = await this.devicesCollection.find(
        { 'owner.userId': userId },
        { projection: { deviceId: 1, name: 1, status: 1 } }
      ).toArray();

      const activeStreams = userDevices
        .filter(device => device.status === 'online')
        .map(device => ({
          deviceId: device.deviceId,
          deviceName: device.name,
          status: 'active' as const,
          dataRate: Math.floor(Math.random() * 10) + 1,
          lastUpdate: new Date()
        }));

      const streamInfo: StreamInfo = {
        userId,
        activeStreams,
        totalStreams: userDevices.length,
        totalDataRate: activeStreams.reduce((sum, stream) => sum + stream.dataRate, 0),
        websocketConnections: activeStreams.length,
        mqttConnections: activeStreams.length
      };

      return streamInfo;
    } catch (error) {
      logger.error('Failed to get stream info:', error);
      throw error;
    }
  }

  // Mock data methods for development
  private getMockDevices(): IoTDevice[] {
    return [
      {
        deviceId: 'device-001',
        name: 'Soil Sensor #1',
        type: 'sensor',
        status: 'online',
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          address: 'Field A, Green Valley Farm',
          farmId: 'farm-001'
        },
        owner: {
          userId: 'user-001',
          farmId: 'farm-001'
        },
        specifications: {
          model: 'SoilSens Pro',
          manufacturer: 'AgriTech',
          firmware: '1.2.3',
          sensors: ['temperature', 'humidity', 'soil_moisture', 'ph'],
          capabilities: ['monitoring', 'alerts']
        },
        configuration: {
          reportingInterval: 300,
          thresholds: {},
          settings: {}
        },
        connectivity: {
          protocol: 'mqtt',
          connectionString: 'mqtt://broker:1883',
          lastHeartbeat: new Date(),
          signalStrength: 85
        },
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          lastDataReceived: new Date(),
          version: '1.0.0',
          tags: ['field-a', 'soil']
        }
      }
    ];
  }

  private getMockSummary(): IoTSummary {
    return {
      totalDevices: 5,
      onlineDevices: 3,
      offlineDevices: 2,
      devicesByType: {
        sensor: 3,
        actuator: 1,
        gateway: 1
      },
      devicesByStatus: {
        online: 3,
        offline: 2
      },
      totalReadings24h: 1440,
      activeAlerts: 2,
      averageDataQuality: 94,
      lastUpdate: new Date()
    };
  }

  private getMockAlerts(): DeviceAlert[] {
    return [
      {
        deviceId: 'device-001',
        alertType: 'threshold',
        severity: 'medium',
        title: 'Low Soil Moisture',
        message: 'Soil moisture level is below threshold',
        data: {
          sensorType: 'soil_moisture',
          currentValue: 25,
          thresholdValue: 30
        },
        status: 'active',
        timestamps: {
          created: new Date(),
        },
        actions: []
      }
    ];
  }

  /**
   * Initialize collections with indexes
   */
  async initializeCollections(): Promise<void> {
    try {
      if (!this.devicesCollection) {
        logger.warn('Cannot initialize collections without database connection');
        return;
      }
      
      // Device collection indexes
      await this.devicesCollection.createIndex({ deviceId: 1 }, { unique: true });
      await this.devicesCollection.createIndex({ 'owner.userId': 1 });
      await this.devicesCollection.createIndex({ status: 1 });
      await this.devicesCollection.createIndex({ type: 1 });
      await this.devicesCollection.createIndex({ 'location.farmId': 1 });

      // Readings collection indexes
      await this.readingsCollection.createIndex({ deviceId: 1, timestamp: -1 });
      await this.readingsCollection.createIndex({ timestamp: 1 });
      
      // Alerts collection indexes
      await this.alertsCollection.createIndex({ deviceId: 1, status: 1 });
      await this.alertsCollection.createIndex({ 'timestamps.created': -1 });
      
      // Thresholds collection indexes
      await this.thresholdsCollection.createIndex({ deviceId: 1, sensorType: 1 }, { unique: true });

      logger.info('IoT collections initialized with indexes');
    } catch (error) {
      logger.error('Failed to initialize collections:', error);
      throw error;
    }
  }
}

export default IoTService;
