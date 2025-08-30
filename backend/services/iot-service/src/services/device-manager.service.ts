import { MongoClient, Db, Collection } from 'mongodb';
import { Logger } from '@daorsagro/utils';
import { IoTDevice, DeviceStatus, DeviceLog } from '../models/iot.model';

const logger = new Logger('device-manager');

export class DeviceManager {
  private db: Db;
  private devicesCollection: Collection<IoTDevice>;
  private logsCollection: Collection<DeviceLog>;

  constructor(mongoClient?: MongoClient) {
    if (mongoClient) {
      this.db = mongoClient.db('daorsagro');
      this.devicesCollection = this.db.collection('iot_devices');
      this.logsCollection = this.db.collection('device_logs');
    }
  }

  /**
   * Get device by ID with ownership verification
   */
  async getDeviceById(deviceId: string, userId: string): Promise<IoTDevice | null> {
    try {
      if (!this.devicesCollection) {
        // Mock implementation
        return this.getMockDevice(deviceId);
      }

      const device = await this.devicesCollection.findOne({
        deviceId,
        'owner.userId': userId
      });

      return device || null;
    } catch (error) {
      logger.error('Failed to get device by ID:', error);
      throw error;
    }
  }

  /**
   * Create a new device
   */
  async createDevice(deviceData: any): Promise<IoTDevice> {
    try {
      if (!this.devicesCollection) {
        // Mock implementation
        return this.getMockDevice(deviceData.name || 'New Device');
      }

      const device: IoTDevice = {
        deviceId: this.generateDeviceId(),
        name: deviceData.name,
        type: deviceData.type,
        status: 'offline',
        location: deviceData.location,
        owner: {
          userId: deviceData.userId,
          farmId: deviceData.farmId
        },
        specifications: deviceData.specifications || {
          model: 'Unknown',
          manufacturer: 'Unknown',
          firmware: '1.0.0',
          sensors: [],
          capabilities: []
        },
        configuration: deviceData.configuration || {
          reportingInterval: 300,
          thresholds: {},
          settings: {}
        },
        connectivity: {
          protocol: 'mqtt',
          connectionString: 'mqtt://broker:1883'
        },
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          version: '1.0.0',
          tags: deviceData.tags || []
        }
      };

      const result = await this.devicesCollection.insertOne(device);
      
      // Log device creation
      await this.logDeviceEvent(device.deviceId, 'info', 'device_created', 'Device created successfully', {
        userId: deviceData.userId
      });

      logger.info('Device created successfully', { deviceId: device.deviceId, userId: deviceData.userId });
      
      return device;
    } catch (error) {
      logger.error('Failed to create device:', error);
      throw error;
    }
  }

  /**
   * Update device
   */
  async updateDevice(deviceId: string, updateData: any, userId: string): Promise<IoTDevice | null> {
    try {
      if (!this.devicesCollection) {
        // Mock implementation
        return this.getMockDevice(deviceId);
      }

      const updateFields: any = {
        'metadata.updatedAt': new Date()
      };

      if (updateData.name) updateFields.name = updateData.name;
      if (updateData.location) updateFields.location = updateData.location;
      if (updateData.description) updateFields.description = updateData.description;
      if (updateData.status) updateFields.status = updateData.status;
      if (updateData.configuration) updateFields.configuration = updateData.configuration;

      const result = await this.devicesCollection.findOneAndUpdate(
        { deviceId, 'owner.userId': userId },
        { $set: updateFields },
        { returnDocument: 'after' }
      );

      if (result.value) {
        await this.logDeviceEvent(deviceId, 'info', 'device_updated', 'Device updated successfully', {
          userId,
          updatedFields: Object.keys(updateData)
        });

        logger.info('Device updated successfully', { deviceId, userId });
      }

      return result.value || null;
    } catch (error) {
      logger.error('Failed to update device:', error);
      throw error;
    }
  }

  /**
   * Delete device
   */
  async deleteDevice(deviceId: string, userId: string): Promise<boolean> {
    try {
      if (!this.devicesCollection) {
        // Mock implementation
        return true;
      }

      const result = await this.devicesCollection.deleteOne({
        deviceId,
        'owner.userId': userId
      });

      if (result.deletedCount > 0) {
        await this.logDeviceEvent(deviceId, 'info', 'device_deleted', 'Device deleted successfully', {
          userId
        });

        logger.info('Device deleted successfully', { deviceId, userId });
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Failed to delete device:', error);
      throw error;
    }
  }

  /**
   * Get device status
   */
  async getDeviceStatus(deviceId: string, userId: string): Promise<DeviceStatus> {
    try {
      if (!this.devicesCollection) {
        // Mock implementation
        return this.getMockDeviceStatus(deviceId);
      }

      const device = await this.devicesCollection.findOne({
        deviceId,
        'owner.userId': userId
      });

      if (!device) {
        throw new Error('Device not found');
      }

      // Calculate status metrics
      const now = new Date();
      const lastHeartbeat = device.connectivity.lastHeartbeat || now;
      const timeSinceHeartbeat = now.getTime() - lastHeartbeat.getTime();
      
      const status: DeviceStatus = {
        deviceId,
        status: device.status,
        lastHeartbeat,
        lastDataReceived: device.metadata.lastDataReceived,
        connectivity: {
          signalStrength: device.connectivity.signalStrength || 0,
          protocol: device.connectivity.protocol,
          latency: Math.floor(Math.random() * 100) + 10 // Mock latency
        },
        uptime: {
          current: Math.floor((now.getTime() - device.metadata.createdAt.getTime()) / 1000),
          total: Math.floor((now.getTime() - device.metadata.createdAt.getTime()) / 1000),
          lastRestart: device.metadata.createdAt
        },
        performance: {
          dataRate: this.calculateDataRate(deviceId),
          errorRate: Math.random() * 5, // Mock error rate
          averageLatency: Math.floor(Math.random() * 50) + 20 // Mock average latency
        }
      };

      // Add battery info if available
      if (device.type === 'sensor') {
        status.battery = {
          level: Math.floor(Math.random() * 100),
          voltage: 3.3 + Math.random() * 0.7,
          status: Math.random() > 0.2 ? 'good' : 'low'
        };
      }

      return status;
    } catch (error) {
      logger.error('Failed to get device status:', error);
      throw error;
    }
  }

  /**
   * Update device configuration
   */
  async updateDeviceConfiguration(deviceId: string, configData: any, userId: string): Promise<IoTDevice | null> {
    try {
      if (!this.devicesCollection) {
        // Mock implementation
        return this.getMockDevice(deviceId);
      }

      const result = await this.devicesCollection.findOneAndUpdate(
        { deviceId, 'owner.userId': userId },
        { 
          $set: { 
            configuration: configData,
            'metadata.updatedAt': new Date()
          }
        },
        { returnDocument: 'after' }
      );

      if (result.value) {
        await this.logDeviceEvent(deviceId, 'info', 'config_updated', 'Device configuration updated', {
          userId,
          configData
        });

        logger.info('Device configuration updated', { deviceId, userId });
      }

      return result.value || null;
    } catch (error) {
      logger.error('Failed to update device configuration:', error);
      throw error;
    }
  }

  /**
   * Get device logs
   */
  async getDeviceLogs(deviceId: string, pagination: any, userId: string): Promise<{ logs: DeviceLog[], pagination: any }> {
    try {
      if (!this.logsCollection) {
        // Mock implementation
        const mockLogs = this.getMockLogs(deviceId);
        const { page = 1, limit = 10 } = pagination;
        const total = mockLogs.length;
        const startIndex = (page - 1) * limit;
        const paginatedLogs = mockLogs.slice(startIndex, startIndex + limit);
        
        return {
          logs: paginatedLogs,
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

      const total = await this.logsCollection.countDocuments(query);
      
      const logs = await this.logsCollection
        .find(query)
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray();

      const paginationResult = {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      };

      return { logs, pagination: paginationResult };
    } catch (error) {
      logger.error('Failed to get device logs:', error);
      throw error;
    }
  }

  /**
   * Log device event
   */
  private async logDeviceEvent(deviceId: string, level: 'debug' | 'info' | 'warn' | 'error', event: string, message: string, data?: any): Promise<void> {
    try {
      if (!this.logsCollection) {
        logger.info(`Device ${deviceId}: ${message}`, data);
        return;
      }

      const logEntry: DeviceLog = {
        deviceId,
        timestamp: new Date(),
        level,
        event,
        message,
        data,
        source: 'system'
      };

      await this.logsCollection.insertOne(logEntry);
    } catch (error) {
      logger.error('Failed to log device event:', error);
    }
  }

  /**
   * Generate unique device ID
   */
  private generateDeviceId(): string {
    return `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate data rate for a device (mock implementation)
   */
  private calculateDataRate(deviceId: string): number {
    // Mock calculation - in real implementation, this would query actual data
    return Math.floor(Math.random() * 20) + 5; // 5-25 readings per hour
  }

  // Mock data methods
  private getMockDevice(deviceId: string): IoTDevice {
    return {
      deviceId,
      name: 'Mock Device',
      type: 'sensor',
      status: 'online',
      location: {
        latitude: 40.7128,
        longitude: -74.0060,
        address: 'Mock Location',
        farmId: 'farm-001'
      },
      owner: {
        userId: 'user-001',
        farmId: 'farm-001'
      },
      specifications: {
        model: 'Mock Model',
        manufacturer: 'Mock Manufacturer',
        firmware: '1.0.0',
        sensors: ['temperature', 'humidity'],
        capabilities: ['monitoring']
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
        version: '1.0.0',
        tags: []
      }
    };
  }

  private getMockDeviceStatus(deviceId: string): DeviceStatus {
    return {
      deviceId,
      status: 'online',
      lastHeartbeat: new Date(),
      lastDataReceived: new Date(),
      connectivity: {
        signalStrength: 85,
        protocol: 'mqtt',
        latency: 25
      },
      battery: {
        level: 85,
        voltage: 3.7,
        status: 'good'
      },
      uptime: {
        current: 86400,
        total: 86400,
        lastRestart: new Date(Date.now() - 86400000)
      },
      performance: {
        dataRate: 12,
        errorRate: 1.2,
        averageLatency: 30
      }
    };
  }

  private getMockLogs(deviceId: string): DeviceLog[] {
    return [
      {
        deviceId,
        timestamp: new Date(),
        level: 'info',
        event: 'heartbeat',
        message: 'Device heartbeat received',
        source: 'device'
      },
      {
        deviceId,
        timestamp: new Date(Date.now() - 300000),
        level: 'debug',
        event: 'data_sent',
        message: 'Sensor data transmitted',
        data: { temperature: 22.5, humidity: 65 },
        source: 'device'
      }
    ];
  }
}

export default DeviceManager;