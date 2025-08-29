import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { Logger } from '@daorsagro/utils';

/**
 * Validation middleware for Analytics Service
 */
export class ValidationMiddleware {
  private static logger = new Logger('analytics-service-validation');

  /**
   * Validate request body against schema
   */
  public static validateBody(schema: Joi.ObjectSchema) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      });

      if (error) {
        const validationErrors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
        }));

        ValidationMiddleware.logger.warn('Request body validation failed', {
          errors: validationErrors,
          requestId: req.headers['x-request-id'],
        });

        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: validationErrors,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'],
          },
        });
      }

      req.body = value;
      next();
    };
  }

  /**
   * Validate query parameters against schema
   */
  public static validateQuery(schema: Joi.ObjectSchema) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const { error, value } = schema.validate(req.query, {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      });

      if (error) {
        const validationErrors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
        }));

        ValidationMiddleware.logger.warn('Query parameters validation failed', {
          errors: validationErrors,
          requestId: req.headers['x-request-id'],
        });

        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Query parameters validation failed',
            details: validationErrors,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'],
          },
        });
      }

      req.query = value;
      next();
    };
  }

  /**
   * Validate route parameters against schema
   */
  public static validateParams(schema: Joi.ObjectSchema) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const { error, value } = schema.validate(req.params, {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      });

      if (error) {
        const validationErrors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
        }));

        ValidationMiddleware.logger.warn('Route parameters validation failed', {
          errors: validationErrors,
          requestId: req.headers['x-request-id'],
        });

        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Route parameters validation failed',
            details: validationErrors,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'],
          },
        });
      }

      req.params = value;
      next();
    };
  }
}

/**
 * Common validation schemas for analytics service
 */
export const ValidationSchemas = {
  // Date range validation
  dateRange: Joi.object({
    startDate: Joi.date().iso().required().messages({
      'date.base': 'Start date must be a valid date',
      'date.format': 'Start date must be in ISO format',
      'any.required': 'Start date is required',
    }),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).required().messages({
      'date.base': 'End date must be a valid date',
      'date.format': 'End date must be in ISO format',
      'date.min': 'End date must be after start date',
      'any.required': 'End date is required',
    }),
  }),

  // Pagination validation
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1).messages({
      'number.base': 'Page must be a number',
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1',
    }),
    limit: Joi.number().integer().min(1).max(100).default(20).messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100',
    }),
    sortBy: Joi.string().optional().messages({
      'string.base': 'Sort by must be a string',
    }),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc').messages({
      'any.only': 'Sort order must be either "asc" or "desc"',
    }),
  }),

  // UUID parameter validation
  uuidParam: Joi.object({
    id: Joi.string().uuid().required().messages({
      'string.base': 'ID must be a string',
      'string.uuid': 'ID must be a valid UUID',
      'any.required': 'ID is required',
    }),
  }),

  // Analytics report request validation
  analyticsReportRequest: Joi.object({
    reportType: Joi.string().valid(
      'financial', 'production', 'subsidies', 'insurance', 'overview'
    ).required().messages({
      'any.only': 'Report type must be one of: financial, production, subsidies, insurance, overview',
      'any.required': 'Report type is required',
    }),
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
    filters: Joi.object({
      farmId: Joi.string().uuid().optional(),
      userId: Joi.string().uuid().optional(),
      category: Joi.string().optional(),
      region: Joi.string().optional(),
    }).optional(),
    groupBy: Joi.string().valid('day', 'week', 'month', 'quarter', 'year').default('month'),
    includeComparisons: Joi.boolean().default(false),
  }),

  // Dashboard metrics request validation
  dashboardMetricsRequest: Joi.object({
    period: Joi.string().valid('7d', '30d', '90d', '1y', 'custom').default('30d'),
    startDate: Joi.when('period', {
      is: 'custom',
      then: Joi.date().iso().required(),
      otherwise: Joi.date().iso().optional(),
    }),
    endDate: Joi.when('period', {
      is: 'custom',
      then: Joi.date().iso().min(Joi.ref('startDate')).required(),
      otherwise: Joi.date().iso().optional(),
    }),
    metrics: Joi.array().items(
      Joi.string().valid(
        'revenue', 'expenses', 'profit', 'subsidies', 'insurance_claims',
        'production_volume', 'active_users', 'new_registrations'
      )
    ).min(1).required(),
  }),

  // Export request validation
  exportRequest: Joi.object({
    format: Joi.string().valid('csv', 'xlsx', 'pdf').default('csv'),
    reportType: Joi.string().required(),
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
    filters: Joi.object().optional(),
    includeCharts: Joi.boolean().default(false),
  }),
};