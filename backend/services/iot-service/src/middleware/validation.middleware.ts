import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { Logger } from '@daorsagro/utils';

const logger = new Logger('validation-middleware');

export class ValidationMiddleware {
  /**
   * Request body validation
   */
  static validateBody = (schema: Joi.ObjectSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: true
      });

      if (error) {
        const validationErrors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        logger.warn('Request body validation failed', {
          errors: validationErrors,
          requestId: req.headers['x-request-id']
        });

        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request body validation failed',
            details: validationErrors
          },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        });
        return;
      }

      // Replace req.body with validated and sanitized data
      req.body = value;
      next();
    };
  };

  /**
   * Query parameters validation
   */
  static validateQuery = (schema: Joi.ObjectSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const { error, value } = schema.validate(req.query, {
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: true
      });

      if (error) {
        const validationErrors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        logger.warn('Query parameters validation failed', {
          errors: validationErrors,
          requestId: req.headers['x-request-id']
        });

        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Query parameters validation failed',
            details: validationErrors
          },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        });
        return;
      }

      // Replace req.query with validated data
      req.query = value;
      next();
    };
  };

  /**
   * URL parameters validation
   */
  static validateParams = (schema: Joi.ObjectSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const { error, value } = schema.validate(req.params, {
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: true
      });

      if (error) {
        const validationErrors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        logger.warn('URL parameters validation failed', {
          errors: validationErrors,
          requestId: req.headers['x-request-id']
        });

        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'URL parameters validation failed',
            details: validationErrors
          },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        });
        return;
      }

      // Replace req.params with validated data
      req.params = value;
      next();
    };
  };
}

// Common validation schemas
export const ValidationSchemas = {
  deviceId: Joi.object({
    deviceId: Joi.string().uuid().required()
  }),

  paginationQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().valid('createdAt', 'updatedAt', 'name', 'status').default('createdAt'),
    order: Joi.string().valid('asc', 'desc').default('desc')
  }),

  deviceFilters: Joi.object({
    status: Joi.string().valid('online', 'offline', 'maintenance', 'error'),
    type: Joi.string().valid('sensor', 'actuator', 'gateway', 'camera'),
    farmId: Joi.string().uuid(),
    location: Joi.string(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  }),

  sensorDataQuery: Joi.object({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')),
    sensorType: Joi.string().valid('temperature', 'humidity', 'soil_moisture', 'ph', 'light'),
    aggregation: Joi.string().valid('raw', 'hourly', 'daily', 'weekly').default('raw'),
    limit: Joi.number().integer().min(1).max(1000).default(100)
  }),

  deviceCreation: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    type: Joi.string().valid('sensor', 'actuator', 'gateway', 'camera').required(),
    location: Joi.string().min(1).max(200).required(),
    farmId: Joi.string().uuid().required(),
    description: Joi.string().max(500),
    specifications: Joi.object({
      model: Joi.string(),
      manufacturer: Joi.string(),
      firmware: Joi.string(),
      sensors: Joi.array().items(Joi.string())
    }),
    configuration: Joi.object({
      reportingInterval: Joi.number().integer().min(60).max(86400), // 1 minute to 24 hours
      thresholds: Joi.object()
    })
  }),

  deviceUpdate: Joi.object({
    name: Joi.string().min(1).max(100),
    location: Joi.string().min(1).max(200),
    description: Joi.string().max(500),
    status: Joi.string().valid('online', 'offline', 'maintenance'),
    configuration: Joi.object({
      reportingInterval: Joi.number().integer().min(60).max(86400),
      thresholds: Joi.object()
    })
  }),

  sensorDataIngestion: Joi.object({
    deviceId: Joi.string().uuid().required(),
    timestamp: Joi.date().iso().default(() => new Date()),
    data: Joi.object({
      temperature: Joi.number().min(-50).max(100),
      humidity: Joi.number().min(0).max(100),
      soil_moisture: Joi.number().min(0).max(100),
      ph: Joi.number().min(0).max(14),
      light: Joi.number().min(0),
      battery: Joi.number().min(0).max(100),
      signal_strength: Joi.number().min(-120).max(0)
    }).required(),
    location: Joi.object({
      latitude: Joi.number().min(-90).max(90),
      longitude: Joi.number().min(-180).max(180)
    })
  })
};

export default ValidationMiddleware;