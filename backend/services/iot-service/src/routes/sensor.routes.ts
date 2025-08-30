import { Router } from 'express';
import { SensorController } from '../controllers/sensor.controller';
import { ValidationMiddleware, ValidationSchemas } from '../middleware/validation.middleware';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { ErrorHandlerMiddleware } from '../middleware/error-handler.middleware';

const router = Router();

// Get all sensors for a specific device
router.get('/device/:deviceId',
  ValidationMiddleware.validateParams(ValidationSchemas.deviceId),
  AuthMiddleware.validateDeviceOwnership,
  ErrorHandlerMiddleware.asyncHandler(SensorController.getDeviceSensors)
);

// Get sensor data for a specific device
router.get('/device/:deviceId/data',
  ValidationMiddleware.validateParams(ValidationSchemas.deviceId),
  ValidationMiddleware.validateQuery(ValidationSchemas.sensorDataQuery),
  AuthMiddleware.validateDeviceOwnership,
  ErrorHandlerMiddleware.asyncHandler(SensorController.getSensorData)
);

// Get latest sensor readings for a device
router.get('/device/:deviceId/latest',
  ValidationMiddleware.validateParams(ValidationSchemas.deviceId),
  AuthMiddleware.validateDeviceOwnership,
  ErrorHandlerMiddleware.asyncHandler(SensorController.getLatestReadings)
);

// Get sensor data aggregations (hourly, daily, weekly)
router.get('/device/:deviceId/aggregated',
  ValidationMiddleware.validateParams(ValidationSchemas.deviceId),
  ValidationMiddleware.validateQuery(ValidationSchemas.sensorDataQuery),
  AuthMiddleware.validateDeviceOwnership,
  ErrorHandlerMiddleware.asyncHandler(SensorController.getAggregatedData)
);

// Get sensor statistics and trends
router.get('/device/:deviceId/stats',
  ValidationMiddleware.validateParams(ValidationSchemas.deviceId),
  AuthMiddleware.validateDeviceOwnership,
  ErrorHandlerMiddleware.asyncHandler(SensorController.getSensorStats)
);

// Set sensor thresholds and alerts
router.post('/device/:deviceId/thresholds',
  ValidationMiddleware.validateParams(ValidationSchemas.deviceId),
  AuthMiddleware.validateDeviceOwnership,
  ErrorHandlerMiddleware.asyncHandler(SensorController.setSensorThresholds)
);

// Get sensor alerts
router.get('/device/:deviceId/alerts',
  ValidationMiddleware.validateParams(ValidationSchemas.deviceId),
  ValidationMiddleware.validateQuery(ValidationSchemas.paginationQuery),
  AuthMiddleware.validateDeviceOwnership,
  ErrorHandlerMiddleware.asyncHandler(SensorController.getSensorAlerts)
);

export default router;