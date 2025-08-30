import { Router } from 'express';
import { DataController } from '../controllers/data.controller';
import { ValidationMiddleware, ValidationSchemas } from '../middleware/validation.middleware';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { ErrorHandlerMiddleware } from '../middleware/error-handler.middleware';

const router = Router();

// Data ingestion endpoint (for IoT devices to send data)
router.post('/ingest',
  ValidationMiddleware.validateBody(ValidationSchemas.sensorDataIngestion),
  ErrorHandlerMiddleware.asyncHandler(DataController.ingestSensorData)
);

// Bulk data ingestion endpoint
router.post('/ingest/bulk',
  ErrorHandlerMiddleware.asyncHandler(DataController.bulkIngestSensorData)
);

// Get processed data for a user's devices
router.get('/processed',
  ValidationMiddleware.validateQuery(ValidationSchemas.sensorDataQuery),
  ErrorHandlerMiddleware.asyncHandler(DataController.getProcessedData)
);

// Get real-time data stream info
router.get('/stream/info',
  ErrorHandlerMiddleware.asyncHandler(DataController.getStreamInfo)
);

// Export data in various formats
router.get('/export',
  ValidationMiddleware.validateQuery(ValidationSchemas.sensorDataQuery),
  ErrorHandlerMiddleware.asyncHandler(DataController.exportData)
);

// Get data quality metrics
router.get('/quality',
  ValidationMiddleware.validateQuery(ValidationSchemas.deviceFilters),
  ErrorHandlerMiddleware.asyncHandler(DataController.getDataQuality)
);

// Data analytics endpoints
router.get('/analytics/trends',
  ValidationMiddleware.validateQuery(ValidationSchemas.sensorDataQuery),
  ErrorHandlerMiddleware.asyncHandler(DataController.getDataTrends)
);

router.get('/analytics/correlations',
  ValidationMiddleware.validateQuery(ValidationSchemas.sensorDataQuery),
  ErrorHandlerMiddleware.asyncHandler(DataController.getDataCorrelations)
);

export default router;