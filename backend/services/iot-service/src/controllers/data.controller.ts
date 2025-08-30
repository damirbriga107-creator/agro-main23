import { Request, Response } from 'express';
import { Logger } from '@daorsagro/utils';
import { DataProcessingService } from '../services/data-processing.service';
import { IoTService } from '../services/iot.service';

const logger = new Logger('data-controller');

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    farmId?: string;
  };
}

export class DataController {
  /**
   * Data ingestion endpoint (for IoT devices to send data)
   */
  static async ingestSensorData(req: Request, res: Response): Promise<void> {
    try {
      const sensorData = req.body;
      
      logger.info('Ingesting sensor data', {
        deviceId: sensorData.deviceId,
        timestamp: sensorData.timestamp,
        requestId: req.headers['x-request-id']
      });

      const dataProcessingService = new DataProcessingService();
      const result = await dataProcessingService.ingestSensorData(sensorData);

      res.status(201).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      });
    } catch (error) {
      logger.error('Failed to ingest sensor data:', error);
      throw error;
    }
  }

  /**
   * Bulk data ingestion endpoint
   */
  static async bulkIngestSensorData(req: Request, res: Response): Promise<void> {
    try {
      const sensorDataArray = req.body;
      
      logger.info('Bulk ingesting sensor data', {
        recordCount: sensorDataArray.length,
        requestId: req.headers['x-request-id']
      });

      const dataProcessingService = new DataProcessingService();
      const result = await dataProcessingService.bulkIngestSensorData(sensorDataArray);

      res.status(201).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      });
    } catch (error) {
      logger.error('Failed to bulk ingest sensor data:', error);
      throw error;
    }
  }

  /**
   * Get processed data for a user's devices
   */
  static async getProcessedData(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const query = req.query as any;
      const userId = req.user?.userId;
      
      logger.info('Fetching processed data', {
        query,
        userId,
        requestId: req.headers['x-request-id']
      });

      const dataProcessingService = new DataProcessingService();
      const processedData = await dataProcessingService.getProcessedData(query, userId!);

      res.json({
        success: true,
        data: processedData,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      });
    } catch (error) {
      logger.error('Failed to get processed data:', error);
      throw error;
    }
  }

  /**
   * Get real-time data stream info
   */
  static async getStreamInfo(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      
      logger.info('Fetching stream info', {
        userId,
        requestId: req.headers['x-request-id']
      });

      const iotService = new IoTService();
      const streamInfo = await iotService.getStreamInfo(userId!);

      res.json({
        success: true,
        data: streamInfo,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      });
    } catch (error) {
      logger.error('Failed to get stream info:', error);
      throw error;
    }
  }

  /**
   * Export data in various formats
   */
  static async exportData(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const query = req.query as any;
      const userId = req.user?.userId;
      
      logger.info('Exporting data', {
        query,
        userId,
        requestId: req.headers['x-request-id']
      });

      const dataProcessingService = new DataProcessingService();
      const exportResult = await dataProcessingService.exportData(query, userId!);

      // Set appropriate headers for file download
      res.setHeader('Content-Type', exportResult.contentType);
      res.setHeader('Content-Disposition', `attachment; filename=\"${exportResult.filename}\"`);
      
      res.send(exportResult.data);
    } catch (error) {
      logger.error('Failed to export data:', error);
      throw error;
    }
  }

  /**
   * Get data quality metrics
   */
  static async getDataQuality(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const query = req.query as any;
      const userId = req.user?.userId;
      
      logger.info('Fetching data quality metrics', {
        query,
        userId,
        requestId: req.headers['x-request-id']
      });

      const dataProcessingService = new DataProcessingService();
      const qualityMetrics = await dataProcessingService.getDataQualityMetrics(query, userId!);

      res.json({
        success: true,
        data: qualityMetrics,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      });
    } catch (error) {
      logger.error('Failed to get data quality metrics:', error);
      throw error;
    }
  }

  /**
   * Get data trends for analytics
   */
  static async getDataTrends(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const query = req.query as any;
      const userId = req.user?.userId;
      
      logger.info('Fetching data trends', {
        query,
        userId,
        requestId: req.headers['x-request-id']
      });

      const dataProcessingService = new DataProcessingService();
      const trends = await dataProcessingService.getDataTrends(query, userId!);

      res.json({
        success: true,
        data: trends,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      });
    } catch (error) {
      logger.error('Failed to get data trends:', error);
      throw error;
    }
  }

  /**
   * Get data correlations for analytics
   */
  static async getDataCorrelations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const query = req.query as any;
      const userId = req.user?.userId;
      
      logger.info('Fetching data correlations', {
        query,
        userId,
        requestId: req.headers['x-request-id']
      });

      const dataProcessingService = new DataProcessingService();
      const correlations = await dataProcessingService.getDataCorrelations(query, userId!);

      res.json({
        success: true,
        data: correlations,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      });
    } catch (error) {
      logger.error('Failed to get data correlations:', error);
      throw error;
    }
  }
}

export default DataController;