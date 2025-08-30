import { Request, Response } from 'express';
import { Logger } from '@daorsagro/utils';
import { DataProcessingService } from '../services/data-processing.service';
import { IoTService } from '../services/iot.service';

const logger = new Logger('sensor-controller');

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    farmId?: string;
  };
}

export class SensorController {
  /**
   * Get all sensors for a specific device
   */
  static async getDeviceSensors(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { deviceId } = req.params;
      const userId = req.user?.userId;
      
      logger.info('Fetching device sensors', {
        deviceId,
        userId,
        requestId: req.headers['x-request-id']
      });

      const iotService = new IoTService();
      const sensors = await iotService.getDeviceSensors(deviceId, userId!);

      res.json({
        success: true,
        data: sensors,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      });
    } catch (error) {
      logger.error('Failed to get device sensors:', error);
      throw error;
    }
  }

  /**
   * Get sensor data for a specific device
   */
  static async getSensorData(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { deviceId } = req.params;
      const query = req.query as any;
      const userId = req.user?.userId;
      
      logger.info('Fetching sensor data', {
        deviceId,
        query,
        userId,
        requestId: req.headers['x-request-id']
      });

      const dataProcessingService = new DataProcessingService();
      const sensorData = await dataProcessingService.getSensorData(deviceId, query, userId!);

      res.json({
        success: true,
        data: sensorData,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      });
    } catch (error) {
      logger.error('Failed to get sensor data:', error);
      throw error;
    }
  }

  /**
   * Get latest sensor readings for a device
   */
  static async getLatestReadings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { deviceId } = req.params;
      const userId = req.user?.userId;
      
      logger.info('Fetching latest sensor readings', {
        deviceId,
        userId,
        requestId: req.headers['x-request-id']
      });

      const dataProcessingService = new DataProcessingService();
      const latestReadings = await dataProcessingService.getLatestReadings(deviceId, userId!);

      res.json({
        success: true,
        data: latestReadings,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      });
    } catch (error) {
      logger.error('Failed to get latest sensor readings:', error);
      throw error;
    }
  }

  /**
   * Get sensor data aggregations (hourly, daily, weekly)
   */
  static async getAggregatedData(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { deviceId } = req.params;
      const query = req.query as any;
      const userId = req.user?.userId;
      
      logger.info('Fetching aggregated sensor data', {
        deviceId,
        query,
        userId,
        requestId: req.headers['x-request-id']
      });

      const dataProcessingService = new DataProcessingService();
      const aggregatedData = await dataProcessingService.getAggregatedData(deviceId, query, userId!);

      res.json({
        success: true,
        data: aggregatedData,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      });
    } catch (error) {
      logger.error('Failed to get aggregated sensor data:', error);
      throw error;
    }
  }

  /**
   * Get sensor statistics and trends
   */
  static async getSensorStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { deviceId } = req.params;
      const userId = req.user?.userId;
      
      logger.info('Fetching sensor statistics', {
        deviceId,
        userId,
        requestId: req.headers['x-request-id']
      });

      const dataProcessingService = new DataProcessingService();
      const stats = await dataProcessingService.getSensorStatistics(deviceId, userId!);

      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      });
    } catch (error) {
      logger.error('Failed to get sensor statistics:', error);
      throw error;
    }
  }

  /**
   * Set sensor thresholds and alerts
   */
  static async setSensorThresholds(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { deviceId } = req.params;
      const thresholds = req.body;
      const userId = req.user?.userId;
      
      logger.info('Setting sensor thresholds', {
        deviceId,
        thresholds,
        userId,
        requestId: req.headers['x-request-id']
      });

      const iotService = new IoTService();
      const result = await iotService.setSensorThresholds(deviceId, thresholds, userId!);

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      });
    } catch (error) {
      logger.error('Failed to set sensor thresholds:', error);
      throw error;
    }
  }

  /**
   * Get sensor alerts
   */
  static async getSensorAlerts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { deviceId } = req.params;
      const { page, limit } = req.query as any;
      const userId = req.user?.userId;
      
      logger.info('Fetching sensor alerts', {
        deviceId,
        page,
        limit,
        userId,
        requestId: req.headers['x-request-id']
      });

      const iotService = new IoTService();
      const result = await iotService.getSensorAlerts(deviceId, { page, limit }, userId!);

      res.json({
        success: true,
        data: result.alerts,
        pagination: result.pagination,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      });
    } catch (error) {
      logger.error('Failed to get sensor alerts:', error);
      throw error;
    }
  }
}

export default SensorController;