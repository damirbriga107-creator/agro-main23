import { Router } from 'express';
import { DeviceController } from '../controllers/device.controller';
import { ValidationMiddleware, ValidationSchemas } from '../middleware/validation.middleware';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { ErrorHandlerMiddleware } from '../middleware/error-handler.middleware';

const router = Router();

// Get all devices for the authenticated user
router.get('/',
  ValidationMiddleware.validateQuery(ValidationSchemas.deviceFilters),
  ErrorHandlerMiddleware.asyncHandler(DeviceController.getDevices)
);

// Get device summary/statistics
router.get('/summary',
  ErrorHandlerMiddleware.asyncHandler(DeviceController.getDeviceSummary)
);

// Get a specific device by ID
router.get('/:deviceId',
  ValidationMiddleware.validateParams(ValidationSchemas.deviceId),
  AuthMiddleware.validateDeviceOwnership,
  ErrorHandlerMiddleware.asyncHandler(DeviceController.getDeviceById)
);

// Create a new device
router.post('/',
  ValidationMiddleware.validateBody(ValidationSchemas.deviceCreation),
  ErrorHandlerMiddleware.asyncHandler(DeviceController.createDevice)
);

// Update a device
router.put('/:deviceId',
  ValidationMiddleware.validateParams(ValidationSchemas.deviceId),
  ValidationMiddleware.validateBody(ValidationSchemas.deviceUpdate),
  AuthMiddleware.validateDeviceOwnership,
  ErrorHandlerMiddleware.asyncHandler(DeviceController.updateDevice)
);

// Delete a device
router.delete('/:deviceId',
  ValidationMiddleware.validateParams(ValidationSchemas.deviceId),
  AuthMiddleware.validateDeviceOwnership,
  ErrorHandlerMiddleware.asyncHandler(DeviceController.deleteDevice)
);

// Get device status
router.get('/:deviceId/status',
  ValidationMiddleware.validateParams(ValidationSchemas.deviceId),
  AuthMiddleware.validateDeviceOwnership,
  ErrorHandlerMiddleware.asyncHandler(DeviceController.getDeviceStatus)
);

// Update device configuration
router.patch('/:deviceId/config',
  ValidationMiddleware.validateParams(ValidationSchemas.deviceId),
  AuthMiddleware.validateDeviceOwnership,
  ErrorHandlerMiddleware.asyncHandler(DeviceController.updateDeviceConfig)
);

// Get device logs
router.get('/:deviceId/logs',
  ValidationMiddleware.validateParams(ValidationSchemas.deviceId),
  ValidationMiddleware.validateQuery(ValidationSchemas.paginationQuery),
  AuthMiddleware.validateDeviceOwnership,
  ErrorHandlerMiddleware.asyncHandler(DeviceController.getDeviceLogs)
);

export default router;