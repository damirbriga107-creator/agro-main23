import { Request, Response } from 'express';
import { Logger } from '@daorsagro/utils';
import { IoTService } from '../services/iot.service';
import { DeviceManager } from '../services/device-manager.service';

const logger = new Logger('device-controller');

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    farmId?: string;
  };
}

export class DeviceController {
  /**
   * Get all devices for the authenticated user
   */
  static async getDevices(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const filters = req.query;
      
      logger.info('Fetching devices', {
        userId,
        filters,
        requestId: req.headers['x-request-id']
      });

      const iotService = new IoTService();
      const result = await iotService.getDevices({
        ...filters,
        userId
      });

      res.json({
        success: true,
        data: result.devices,
        pagination: result.pagination,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      });
    } catch (error) {
      logger.error('Failed to get devices:', error);
      throw error;
    }
  }

  /**
   * Get device summary/statistics
   */
  static async getDeviceSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      
      logger.info('Fetching device summary', {
        userId,
        requestId: req.headers['x-request-id']
      });

      const iotService = new IoTService();
      const summary = await iotService.getDeviceSummary(userId!);

      res.json({
        success: true,
        data: summary,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      });
    } catch (error) {
      logger.error('Failed to get device summary:', error);
      throw error;
    }
  }

  /**
   * Get a specific device by ID
   */
  static async getDeviceById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { deviceId } = req.params;
      const userId = req.user?.userId;
      
      logger.info('Fetching device by ID', {
        deviceId,
        userId,
        requestId: req.headers['x-request-id']
      });

      const deviceManager = new DeviceManager();
      const device = await deviceManager.getDeviceById(deviceId, userId!);

      if (!device) {
        res.status(404).json({
          success: false,
          error: {
            code: 'DEVICE_NOT_FOUND',
            message: 'Device not found'
          },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        });
        return;
      }

      res.json({
        success: true,
        data: device,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      });
    } catch (error) {
      logger.error('Failed to get device by ID:', error);
      throw error;
    }
  }

  /**
   * Create a new device
   */
  static async createDevice(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const deviceData = req.body;
      const userId = req.user?.userId;
      
      logger.info('Creating new device', {
        deviceData: { ...deviceData, userId },
        requestId: req.headers['x-request-id']
      });

      const deviceManager = new DeviceManager();
      const device = await deviceManager.createDevice({
        ...deviceData,
        userId
      });

      res.status(201).json({
        success: true,
        data: device,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      });
    } catch (error) {
      logger.error('Failed to create device:', error);
      throw error;
    }
  }

  /**
   * Update a device
   */
  static async updateDevice(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { deviceId } = req.params;
      const updateData = req.body;
      const userId = req.user?.userId;
      
      logger.info('Updating device', {
        deviceId,
        updateData,
        userId,
        requestId: req.headers['x-request-id']
      });

      const deviceManager = new DeviceManager();
      const device = await deviceManager.updateDevice(deviceId, updateData, userId!);

      if (!device) {
        res.status(404).json({
          success: false,
          error: {
            code: 'DEVICE_NOT_FOUND',
            message: 'Device not found'
          },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        });
        return;
      }

      res.json({
        success: true,
        data: device,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      });
    } catch (error) {
      logger.error('Failed to update device:', error);
      throw error;
    }
  }

  /**
   * Delete a device
   */
  static async deleteDevice(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { deviceId } = req.params;
      const userId = req.user?.userId;
      
      logger.info('Deleting device', {
        deviceId,
        userId,
        requestId: req.headers['x-request-id']
      });

      const deviceManager = new DeviceManager();
      const deleted = await deviceManager.deleteDevice(deviceId, userId!);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: {
            code: 'DEVICE_NOT_FOUND',
            message: 'Device not found'
          },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        });
        return;
      }

      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete device:', error);
      throw error;
    }
  }

  /**
   * Get device status
   */
  static async getDeviceStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { deviceId } = req.params;
      const userId = req.user?.userId;
      
      logger.info('Fetching device status', {
        deviceId,
        userId,
        requestId: req.headers['x-request-id']
      });

      const deviceManager = new DeviceManager();
      const status = await deviceManager.getDeviceStatus(deviceId, userId!);

      res.json({
        success: true,
        data: status,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      });
    } catch (error) {
      logger.error('Failed to get device status:', error);
      throw error;
    }
  }

  /**
   * Update device configuration
   */
  static async updateDeviceConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { deviceId } = req.params;
      const configData = req.body;
      const userId = req.user?.userId;
      
      logger.info('Updating device configuration', {
        deviceId,
        configData,
        userId,
        requestId: req.headers['x-request-id']
      });

      const deviceManager = new DeviceManager();
      const device = await deviceManager.updateDeviceConfiguration(deviceId, configData, userId!);

      res.json({
        success: true,
        data: device,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      });
    } catch (error) {
      logger.error('Failed to update device configuration:', error);
      throw error;
    }
  }

  /**
   * Get device logs
   */
  static async getDeviceLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { deviceId } = req.params;
      const { page, limit } = req.query as any;
      const userId = req.user?.userId;
      
      logger.info('Fetching device logs', {
        deviceId,
        page,
        limit,
        userId,
        requestId: req.headers['x-request-id']
      });

      const deviceManager = new DeviceManager();
      const result = await deviceManager.getDeviceLogs(deviceId, { page, limit }, userId!);

      res.json({
        success: true,
        data: result.logs,
        pagination: result.pagination,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      });
    } catch (error) {
      logger.error('Failed to get device logs:', error);
      throw error;
    }
  }
}

export default DeviceController;