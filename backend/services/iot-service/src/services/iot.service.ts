import { logger } from '@daorsagro/utils';
import { 
  Device, 
  SensorData, 
  Alert, 
  AutomationRule,
  DataAggregation,
  IDeviceDocument,
  ISensorDataDocument,
  IAlertDocument,
  IAutomationRuleDocument,
  DeviceType,
  DeviceStatus,
  SensorDataType,
  AlertType,
  AlertSeverity,
  DeviceSummary,
  SensorDataSummary,
  ILocation
} from '../models/iot.model';

interface DeviceFilters {
  userId?: string;
  farmId?: string;
  type?: DeviceType;
  status?: DeviceStatus;
  zone?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface SensorDataFilters {
  deviceId?: string;
  userId?: string;
  farmId?: string;
  dataType?: SensorDataType;
  startTime?: Date;
  endTime?: Date;
  limit?: number;
  offset?: number;
  aggregation?: 'hour' | 'day' | 'week' | 'month';
}

interface DeviceRegistration {
  deviceId: string;
  name: string;
  type: DeviceType;
  model: string;
  manufacturer: string;
  firmwareVersion: string;
  userId: string;
  farmId: string;
  location: ILocation;
  zone?: string;
  configuration?: any;
  connectivity: {
    protocol: string;
    networkId?: string;
    endpoint?: string;
  };
}

export class IoTService {
  /**
   * Register a new IoT device
   */
  async registerDevice(deviceData: DeviceRegistration): Promise<IDeviceDocument> {
    try {
      // Check if device already exists
      const existingDevice = await Device.findOne({ deviceId: deviceData.deviceId });
      if (existingDevice) {
        throw new Error(`Device with ID ${deviceData.deviceId} already exists`);
      }

      const device = new Device({
        ...deviceData,
        status: DeviceStatus.OFFLINE,
        lastSeen: new Date(),
        configuration: {
          reportingInterval: 300, // 5 minutes default
          thresholds: {},
          calibration: {},
          settings: {},
          ...deviceData.configuration
        },
        maintenance: {
          installDate: new Date(),
          maintenanceNotes: []
        },
        alerts: [],
        metadata: {}
      });

      await device.save();

      logger.info('IoT device registered successfully', {
        deviceId: device.deviceId,
        type: device.type,
        userId: device.userId,
        farmId: device.farmId
      });

      return device;
    } catch (error) {
      logger.error('Error registering IoT device:', error);
      throw error;
    }
  }

  /**
   * Get devices with filtering
   */
  async getDevices(filters: DeviceFilters): Promise<{
    devices: DeviceSummary[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const { 
        limit = 20, 
        offset = 0, 
        sortBy = 'lastSeen', 
        sortOrder = 'desc', 
        ...queryFilters 
      } = filters;
      
      // Build query
      const query: any = {};
      if (queryFilters.userId) query.userId = queryFilters.userId;
      if (queryFilters.farmId) query.farmId = queryFilters.farmId;
      if (queryFilters.type) query.type = queryFilters.type;
      if (queryFilters.status) query.status = queryFilters.status;
      if (queryFilters.zone) query.zone = queryFilters.zone;

      // Execute query
      const [devices, total] = await Promise.all([
        Device.find(query)
          .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
          .skip(offset)
          .limit(limit)
          .lean(),
        Device.countDocuments(query)
      ]);

      // Transform to summary format
      const deviceSummaries: DeviceSummary[] = devices.map(device => {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        return {
          deviceId: device.deviceId,
          name: device.name,
          type: device.type,
          status: device.status,
          lastSeen: device.lastSeen,
          batteryLevel: device.batteryLevel,
          location: device.location,
          activeAlerts: device.alerts.filter(alert => !alert.resolved).length,
          isOnline: device.status === DeviceStatus.ONLINE && device.lastSeen > fiveMinutesAgo
        };
      });

      return {
        devices: deviceSummaries,
        total,
        page: Math.floor(offset / limit) + 1,
        limit
      };
    } catch (error) {
      logger.error('Error fetching devices:', error);
      throw error;
    }
  }

  /**
   * Get device by ID
   */
  async getDeviceById(deviceId: string, userId: string): Promise<IDeviceDocument | null> {
    try {
      const device = await Device.findOne({ 
        deviceId, 
        userId 
      });

      return device;
    } catch (error) {
      logger.error('Error fetching device:', error);
      throw error;
    }
  }

  /**
   * Update device status
   */
  async updateDeviceStatus(
    deviceId: string, 
    status: DeviceStatus, 
    userId: string,
    additionalData?: {
      batteryLevel?: number;
      signalStrength?: number;
      location?: ILocation;
    }
  ): Promise<IDeviceDocument | null> {
    try {
      const updateData: any = {
        status,
        lastSeen: new Date()
      };

      if (additionalData) {
        if (additionalData.batteryLevel !== undefined) {
          updateData.batteryLevel = additionalData.batteryLevel;
        }
        if (additionalData.signalStrength !== undefined) {
          updateData.signalStrength = additionalData.signalStrength;
        }
        if (additionalData.location) {
          updateData.location = additionalData.location;
        }
      }

      const device = await Device.findOneAndUpdate(
        { deviceId, userId },
        updateData,
        { new: true }
      );

      if (device) {
        logger.info('Device status updated', {
          deviceId: device.deviceId,
          status,
          batteryLevel: additionalData?.batteryLevel
        });

        // Check for low battery alert
        if (additionalData?.batteryLevel && additionalData.batteryLevel < 20) {
          await this.createAlert({
            deviceId,
            userId,
            farmId: device.farmId,
            type: AlertType.LOW_BATTERY,
            severity: additionalData.batteryLevel < 10 ? AlertSeverity.CRITICAL : AlertSeverity.HIGH,
            title: 'Low Battery Warning',
            message: `Device ${device.name} battery level is ${additionalData.batteryLevel}%`,
            triggerConditions: {
              dataType: SensorDataType.BATTERY_LEVEL,
              threshold: 20,
              operator: '<'
            }
          });
        }
      }

      return device;
    } catch (error) {
      logger.error('Error updating device status:', error);
      throw error;
    }
  }

  /**
   * Ingest sensor data
   */
  async ingestSensorData(data: {
    deviceId: string;
    timestamp?: Date;
    readings: Array<{
      dataType: SensorDataType;
      value: number | string | boolean;
      unit: string;
      quality?: 'good' | 'fair' | 'poor' | 'error';
    }>;
    metadata?: {
      batteryLevel?: number;
      signalStrength?: number;
      location?: ILocation;
    };
  }): Promise<ISensorDataDocument[]> {
    try {
      // Verify device exists
      const device = await Device.findOne({ deviceId: data.deviceId });
      if (!device) {
        throw new Error(`Device ${data.deviceId} not found`);
      }

      const timestamp = data.timestamp || new Date();
      const sensorDataEntries: ISensorDataDocument[] = [];

      // Create sensor data entries
      for (const reading of data.readings) {
        const sensorData = new SensorData({
          deviceId: data.deviceId,
          userId: device.userId,
          farmId: device.farmId,
          timestamp,
          dataType: reading.dataType,
          value: reading.value,
          unit: reading.unit,
          quality: reading.quality || 'good',
          location: data.metadata?.location || device.location,
          metadata: {
            batteryLevel: data.metadata?.batteryLevel,
            signalStrength: data.metadata?.signalStrength,
            calibrated: false,
            rawValue: reading.value
          },
          processed: false
        });

        await sensorData.save();
        sensorDataEntries.push(sensorData);
      }

      // Update device status to online
      await this.updateDeviceStatus(
        data.deviceId,
        DeviceStatus.ONLINE,
        device.userId,
        data.metadata
      );

      // Process alerts and automation rules
      await this.processDataForAlerts(data.deviceId, data.readings);
      await this.processAutomationRules(data.deviceId, data.readings);

      logger.info('Sensor data ingested successfully', {
        deviceId: data.deviceId,
        readingsCount: data.readings.length,
        timestamp
      });

      return sensorDataEntries;
    } catch (error) {
      logger.error('Error ingesting sensor data:', error);
      throw error;
    }
  }

  /**
   * Get sensor data with filtering and aggregation
   */
  async getSensorData(filters: SensorDataFilters): Promise<{
    data: SensorDataSummary[] | any[];
    total: number;
    aggregated: boolean;
  }> {
    try {
      const {
        limit = 100,
        offset = 0,
        aggregation,
        ...queryFilters
      } = filters;

      // Build query
      const query: any = {};
      if (queryFilters.deviceId) query.deviceId = queryFilters.deviceId;
      if (queryFilters.userId) query.userId = queryFilters.userId;
      if (queryFilters.farmId) query.farmId = queryFilters.farmId;
      if (queryFilters.dataType) query.dataType = queryFilters.dataType;

      // Time range filter
      if (queryFilters.startTime || queryFilters.endTime) {
        query.timestamp = {};
        if (queryFilters.startTime) query.timestamp.$gte = queryFilters.startTime;
        if (queryFilters.endTime) query.timestamp.$lte = queryFilters.endTime;
      }

      if (aggregation) {
        // Return aggregated data
        const aggregatedData = await this.getAggregatedData(query, aggregation);
        return {
          data: aggregatedData,
          total: aggregatedData.length,
          aggregated: true
        };
      } else {
        // Return raw sensor data
        const [sensorData, total] = await Promise.all([
          SensorData.find(query)
            .sort({ timestamp: -1 })
            .skip(offset)
            .limit(limit)
            .lean(),
          SensorData.countDocuments(query)
        ]);

        const dataSummaries: SensorDataSummary[] = sensorData.map(data => ({
          timestamp: data.timestamp,
          dataType: data.dataType,
          value: data.value as number | string,
          unit: data.unit,
          quality: data.quality
        }));

        return {
          data: dataSummaries,
          total,
          aggregated: false
        };
      }
    } catch (error) {
      logger.error('Error fetching sensor data:', error);
      throw error;
    }
  }

  /**
   * Create alert
   */
  async createAlert(alertData: {
    deviceId: string;
    userId: string;
    farmId: string;
    type: AlertType;
    severity: AlertSeverity;
    title: string;
    message: string;
    triggerConditions: {
      dataType: SensorDataType;
      threshold: number;
      operator: string;
      duration?: number;
    };
  }): Promise<IAlertDocument> {
    try {
      // Check if similar alert already exists and is not resolved
      const existingAlert = await Alert.findOne({
        deviceId: alertData.deviceId,
        type: alertData.type,
        resolved: false
      });

      if (existingAlert) {
        logger.debug('Similar alert already exists', {
          alertId: existingAlert.alertId,
          deviceId: alertData.deviceId,
          type: alertData.type
        });
        return existingAlert;
      }

      const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      
      const alert = new Alert({
        ...alertData,
        alertId,
        actions: []
      });

      await alert.save();

      // Add alert to device
      await Device.findOneAndUpdate(
        { deviceId: alertData.deviceId },
        {
          $push: {
            alerts: {
              id: alertId,
              type: alertData.type,
              severity: alertData.severity,
              message: alertData.message,
              timestamp: new Date(),
              resolved: false
            }
          }
        }
      );

      logger.info('Alert created successfully', {
        alertId,
        deviceId: alertData.deviceId,
        type: alertData.type,
        severity: alertData.severity
      });

      return alert;
    } catch (error) {
      logger.error('Error creating alert:', error);
      throw error;
    }
  }

  /**
   * Resolve alert
   */
  async resolveAlert(alertId: string, userId: string, resolvedBy?: string): Promise<IAlertDocument | null> {
    try {
      const alert = await Alert.findOneAndUpdate(
        { alertId, userId },
        {
          resolved: true,
          resolvedAt: new Date(),
          resolvedBy: resolvedBy || userId
        },
        { new: true }
      );

      if (alert) {
        // Update device alerts
        await Device.findOneAndUpdate(
          { deviceId: alert.deviceId, 'alerts.id': alertId },
          {
            $set: {
              'alerts.$.resolved': true,
              'alerts.$.resolvedAt': new Date()
            }
          }
        );

        logger.info('Alert resolved', {
          alertId,
          deviceId: alert.deviceId,
          resolvedBy
        });
      }

      return alert;
    } catch (error) {
      logger.error('Error resolving alert:', error);
      throw error;
    }
  }

  /**
   * Create automation rule
   */
  async createAutomationRule(ruleData: {
    name: string;
    description?: string;
    userId: string;
    farmId: string;
    deviceIds: string[];
    conditions: Array<{
      dataType: SensorDataType;
      operator: string;
      value: number;
      duration?: number;
    }>;
    actions: Array<{
      type: string;
      deviceId?: string;
      parameters: any;
      delay?: number;
    }>;
    schedule?: any;
  }): Promise<IAutomationRuleDocument> {
    try {
      const ruleId = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      
      const rule = new AutomationRule({
        ...ruleData,
        ruleId,
        isActive: true,
        executionCount: 0
      });

      await rule.save();

      logger.info('Automation rule created', {
        ruleId,
        name: ruleData.name,
        deviceIds: ruleData.deviceIds,
        userId: ruleData.userId
      });

      return rule;
    } catch (error) {
      logger.error('Error creating automation rule:', error);
      throw error;
    }
  }

  /**
   * Get IoT analytics dashboard data
   */
  async getAnalytics(userId: string, farmId?: string, period: string = '7d'): Promise<{
    totalDevices: number;
    onlineDevices: number;
    activeAlerts: number;
    dataPoints: number;
    devicesByType: Record<string, number>;
    alertsByType: Record<string, number>;
    recentReadings: any[];
  }> {
    try {
      const query: any = { userId };
      if (farmId) query.farmId = farmId;

      // Calculate time range
      const now = new Date();
      const startTime = new Date();
      switch (period) {
        case '24h':
          startTime.setHours(now.getHours() - 24);
          break;
        case '7d':
          startTime.setDate(now.getDate() - 7);
          break;
        case '30d':
          startTime.setDate(now.getDate() - 30);
          break;
        default:
          startTime.setDate(now.getDate() - 7);
      }

      const [devices, alerts, recentDataPoints] = await Promise.all([
        Device.find(query),
        Alert.find({ ...query, resolved: false }),
        SensorData.countDocuments({
          ...query,
          timestamp: { $gte: startTime }
        })
      ]);

      // Count online devices (seen in last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const onlineDevices = devices.filter(device => 
        device.status === DeviceStatus.ONLINE && device.lastSeen > fiveMinutesAgo
      ).length;

      // Group devices by type
      const devicesByType: Record<string, number> = {};
      devices.forEach(device => {
        devicesByType[device.type] = (devicesByType[device.type] || 0) + 1;
      });

      // Group alerts by type
      const alertsByType: Record<string, number> = {};
      alerts.forEach(alert => {
        alertsByType[alert.type] = (alertsByType[alert.type] || 0) + 1;
      });

      // Get recent sensor readings for charts
      const recentReadings = await SensorData.find({
        ...query,
        timestamp: { $gte: startTime }
      })
        .sort({ timestamp: -1 })
        .limit(100)
        .lean();

      return {
        totalDevices: devices.length,
        onlineDevices,
        activeAlerts: alerts.length,
        dataPoints: recentDataPoints,
        devicesByType,
        alertsByType,
        recentReadings
      };
    } catch (error) {
      logger.error('Error fetching IoT analytics:', error);
      throw error;
    }
  }

  // Private helper methods
  private async processDataForAlerts(deviceId: string, readings: any[]): Promise<void> {
    try {
      const device = await Device.findOne({ deviceId });
      if (!device) return;

      for (const reading of readings) {
        // Check device-specific thresholds
        const threshold = device.configuration.thresholds[reading.dataType];
        if (!threshold) continue;

        const value = typeof reading.value === 'number' ? reading.value : parseFloat(reading.value);
        
        // Check if value exceeds thresholds
        if (threshold.min !== undefined && value < threshold.min) {
          await this.createAlert({
            deviceId,
            userId: device.userId,
            farmId: device.farmId,
            type: this.getAlertTypeForDataType(reading.dataType, 'low'),
            severity: AlertSeverity.MEDIUM,
            title: `Low ${reading.dataType}`,
            message: `${reading.dataType} is below minimum threshold: ${value}${reading.unit} < ${threshold.min}${threshold.unit}`,
            triggerConditions: {
              dataType: reading.dataType,
              threshold: threshold.min,
              operator: '<'
            }
          });
        }

        if (threshold.max !== undefined && value > threshold.max) {
          await this.createAlert({
            deviceId,
            userId: device.userId,
            farmId: device.farmId,
            type: this.getAlertTypeForDataType(reading.dataType, 'high'),
            severity: AlertSeverity.MEDIUM,
            title: `High ${reading.dataType}`,
            message: `${reading.dataType} exceeds maximum threshold: ${value}${reading.unit} > ${threshold.max}${threshold.unit}`,
            triggerConditions: {
              dataType: reading.dataType,
              threshold: threshold.max,
              operator: '>'
            }
          });
        }
      }
    } catch (error) {
      logger.error('Error processing data for alerts:', error);
    }
  }

  private async processAutomationRules(deviceId: string, readings: any[]): Promise<void> {
    try {
      // Get active automation rules for this device
      const rules = await AutomationRule.find({
        deviceIds: deviceId,
        isActive: true
      });

      for (const rule of rules) {
        // Check if rule conditions are met
        const conditionsMet = rule.conditions.every(condition => {
          const reading = readings.find(r => r.dataType === condition.dataType);
          if (!reading) return false;

          const value = typeof reading.value === 'number' ? reading.value : parseFloat(reading.value);
          
          switch (condition.operator) {
            case '>': return value > condition.value;
            case '<': return value < condition.value;
            case '>=': return value >= condition.value;
            case '<=': return value <= condition.value;
            case '=': return value === condition.value;
            case '!=': return value !== condition.value;
            default: return false;
          }
        });

        if (conditionsMet) {
          // Execute rule actions
          for (const action of rule.actions) {
            await this.executeAutomationAction(action, rule);
          }

          // Update rule execution count
          await AutomationRule.findByIdAndUpdate(rule._id, {
            $inc: { executionCount: 1 },
            lastExecuted: new Date()
          });
        }
      }
    } catch (error) {
      logger.error('Error processing automation rules:', error);
    }
  }

  private async executeAutomationAction(action: any, rule: IAutomationRuleDocument): Promise<void> {
    try {
      logger.info('Executing automation action', {
        ruleId: rule.ruleId,
        actionType: action.type,
        parameters: action.parameters
      });

      // Implementation would depend on action type
      // For example: irrigation control, notifications, etc.
      
    } catch (error) {
      logger.error('Error executing automation action:', error);
    }
  }

  private getAlertTypeForDataType(dataType: SensorDataType, threshold: 'high' | 'low'): AlertType {
    const alertMap: Record<string, AlertType> = {
      [`${SensorDataType.SOIL_MOISTURE}_low`]: AlertType.LOW_SOIL_MOISTURE,
      [`${SensorDataType.TEMPERATURE}_high`]: AlertType.HIGH_TEMPERATURE,
      [`${SensorDataType.BATTERY_LEVEL}_low`]: AlertType.LOW_BATTERY
    };

    return alertMap[`${dataType}_${threshold}`] || AlertType.DEVICE_OFFLINE;
  }

  private async getAggregatedData(query: any, period: string): Promise<any[]> {
    // Implementation for data aggregation
    // This would use MongoDB aggregation pipeline to group and calculate statistics
    const groupBy = period === 'hour' ? '$hour' : 
                    period === 'day' ? '$dayOfYear' : 
                    period === 'week' ? '$week' : '$month';

    return [];
  }
}