import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { Logger } from '../utils/logger';

/**
 * Validation middleware for request validation using Joi
 */
export class ValidationMiddleware {
  private static logger = new Logger('validation');

  /**
   * Validate request body
   */
  static validateBody = (schema: Joi.ObjectSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
        allowUnknown: false
      });

      if (error) {
        const validationErrors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        ValidationMiddleware.logger.warn('Request body validation failed', {
          requestId: req.headers['x-request-id'],
          validationErrors
        });

        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request body validation failed',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'],
            validationErrors
          }
        });
        return;
      }

      req.body = value;
      next();
    };
  };

  /**
   * Validate query parameters
   */
  static validateQuery = (schema: Joi.ObjectSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const { error, value } = schema.validate(req.query, {
        abortEarly: false,
        stripUnknown: true,
        allowUnknown: false
      });

      if (error) {
        const validationErrors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        ValidationMiddleware.logger.warn('Query parameters validation failed', {
          requestId: req.headers['x-request-id'],
          validationErrors
        });

        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Query parameters validation failed',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'],
            validationErrors
          }
        });
        return;
      }

      req.query = value;
      next();
    };
  };

  /**
   * Validate route parameters
   */
  static validateParams = (schema: Joi.ObjectSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const { error, value } = schema.validate(req.params, {
        abortEarly: false,
        stripUnknown: true,
        allowUnknown: false
      });

      if (error) {
        const validationErrors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        ValidationMiddleware.logger.warn('Route parameters validation failed', {
          requestId: req.headers['x-request-id'],
          validationErrors
        });

        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Route parameters validation failed',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'],
            validationErrors
          }
        });
        return;
      }

      req.params = value;
      next();
    };
  };

  /**
   * Sanitize request data
   */
  static sanitize = (req: Request, res: Response, next: NextFunction): void => {
    // Sanitize body
    if (req.body) {
      req.body = ValidationMiddleware.sanitizeObject(req.body);
    }

    // Sanitize query
    if (req.query) {
      req.query = ValidationMiddleware.sanitizeObject(req.query);
    }

    // Sanitize params
    if (req.params) {
      req.params = ValidationMiddleware.sanitizeObject(req.params);
    }

    next();
  };

  /**
   * Validate pagination parameters
   */
  static validatePagination = (req: Request, res: Response, next: NextFunction): void => {
    const paginationSchema = Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10),
      sortBy: Joi.string().optional(),
      sortOrder: Joi.string().valid('asc', 'desc').default('asc')
    });

    const { error, value } = paginationSchema.validate(req.query);

    if (error) {
      res.status(400).json({
        error: {
          code: 'PAGINATION_VALIDATION_ERROR',
          message: 'Invalid pagination parameters',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'],
          details: error.details
        }
      });
      return;
    }

    req.query = { ...req.query, ...value };
    next();
  };

  /**
   * Validate UUID parameter
   */
  static validateUUID = (paramName: string) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const uuidSchema = Joi.string().uuid({ version: 'uuidv4' }).required();
      const { error } = uuidSchema.validate(req.params[paramName]);

      if (error) {
        res.status(400).json({
          error: {
            code: 'INVALID_UUID',
            message: `Invalid ${paramName} format. Must be a valid UUID`,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']
          }
        });
        return;
      }

      next();
    };
  };

  /**
   * Validate date range parameters
   */
  static validateDateRange = (req: Request, res: Response, next: NextFunction): void => {
    const dateRangeSchema = Joi.object({
      startDate: Joi.date().iso().optional(),
      endDate: Joi.date().iso().min(Joi.ref('startDate')).optional()
    });

    const { error } = dateRangeSchema.validate({
      startDate: req.query.startDate,
      endDate: req.query.endDate
    });

    if (error) {
      res.status(400).json({
        error: {
          code: 'DATE_RANGE_VALIDATION_ERROR',
          message: 'Invalid date range parameters',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'],
          details: error.details
        }
      });
      return;
    }

    next();
  };

  /**
   * Validate file upload
   */
  static validateFileUpload = (options: {
    maxSize?: number;
    allowedTypes?: string[];
    required?: boolean;
  } = {}) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const { maxSize = 10 * 1024 * 1024, allowedTypes = [], required = false } = options;

      if (required && !req.file) {
        res.status(400).json({
          error: {
            code: 'FILE_REQUIRED',
            message: 'File upload is required',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']
          }
        });
        return;
      }

      if (req.file) {
        // Check file size
        if (req.file.size > maxSize) {
          res.status(400).json({
            error: {
              code: 'FILE_TOO_LARGE',
              message: `File size exceeds maximum allowed size of ${maxSize} bytes`,
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id']
            }
          });
          return;
        }

        // Check file type
        if (allowedTypes.length > 0 && !allowedTypes.includes(req.file.mimetype)) {
          res.status(400).json({
            error: {
              code: 'INVALID_FILE_TYPE',
              message: `File type ${req.file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id']
            }
          });
          return;
        }
      }

      next();
    };
  };

  /**
   * Sanitize object recursively
   */
  private static sanitizeObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return ValidationMiddleware.sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => ValidationMiddleware.sanitizeObject(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = ValidationMiddleware.sanitizeObject(value);
    }

    return sanitized;
  }

  /**
   * Sanitize string to prevent XSS
   */
  private static sanitizeString(str: any): any {
    if (typeof str !== 'string') {
      return str;
    }

    // Basic XSS prevention
    return str
      .replace(/[<>]/g, '')
      .trim();
  }
}