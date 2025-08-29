import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationUtils } from '@daorsagro/utils';

/**
 * Validation middleware for API Gateway
 */
export class ValidationMiddleware {
  /**
   * Validate request body against schema
   */
  static validateBody = (schema: Joi.ObjectSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        const details = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request body validation failed',
            details,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']
          }
        });
        return;
      }

      req.body = value;
      next();
    };
  };

  /**
   * Validate query parameters against schema
   */
  static validateQuery = (schema: Joi.ObjectSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const { error, value } = schema.validate(req.query, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        const details = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Query parameters validation failed',
            details,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']
          }
        });
        return;
      }

      req.query = value;
      next();
    };
  };

  /**
   * Validate route parameters against schema
   */
  static validateParams = (schema: Joi.ObjectSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const { error, value } = schema.validate(req.params, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        const details = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Route parameters validation failed',
            details,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']
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
    if (req.body && typeof req.body === 'object') {
      req.body = ValidationMiddleware.sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = ValidationMiddleware.sanitizeObject(req.query);
    }

    next();
  };

  /**
   * Recursively sanitize object properties
   */
  private static sanitizeObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return typeof obj === 'string' ? ValidationUtils.sanitizeString(obj) : obj;
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
   * Validate pagination parameters
   */
  static validatePagination = (req: Request, res: Response, next: NextFunction): void => {
    const paginationSchema = Joi.object({
      page: Joi.number().integer().min(1).default(1),
      pageSize: Joi.number().integer().min(1).max(100).default(20),
      sortBy: Joi.string().optional(),
      sortOrder: Joi.string().valid('asc', 'desc').default('desc')
    });

    const { error, value } = paginationSchema.validate(req.query, {
      allowUnknown: true,
      stripUnknown: false
    });

    if (error) {
      res.status(400).json({
        error: {
          code: 'PAGINATION_VALIDATION_ERROR',
          message: 'Invalid pagination parameters',
          details: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          })),
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        }
      });
      return;
    }

    // Merge validated pagination with existing query
    req.query = { ...req.query, ...value };
    next();
  };

  /**
   * Validate UUID parameters
   */
  static validateUUID = (paramName: string) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const uuid = req.params[paramName];
      
      if (!uuid) {
        res.status(400).json({
          error: {
            code: 'MISSING_PARAMETER',
            message: `Parameter '${paramName}' is required`,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']
          }
        });
        return;
      }

      if (!ValidationUtils.isValidUUID(uuid)) {
        res.status(400).json({
          error: {
            code: 'INVALID_UUID',
            message: `Parameter '${paramName}' must be a valid UUID`,
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
    const { startDate, endDate } = req.query;

    if (startDate && !Date.parse(startDate as string)) {
      res.status(400).json({
        error: {
          code: 'INVALID_START_DATE',
          message: 'startDate must be a valid ISO date string',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        }
      });
      return;
    }

    if (endDate && !Date.parse(endDate as string)) {
      res.status(400).json({
        error: {
          code: 'INVALID_END_DATE',
          message: 'endDate must be a valid ISO date string',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        }
      });
      return;
    }

    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      if (start > end) {
        res.status(400).json({
          error: {
            code: 'INVALID_DATE_RANGE',
            message: 'startDate must be before endDate',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']
          }
        });
        return;
      }
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
      const {
        maxSize = 10 * 1024 * 1024, // 10MB default
        allowedTypes = [],
        required = false
      } = options;

      if (!req.file && required) {
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
              maxSize,
              actualSize: req.file.size,
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id']
            }
          });
          return;
        }

        // Check file type
        if (allowedTypes.length > 0) {
          const fileExtension = req.file.originalname.split('.').pop()?.toLowerCase();
          if (!fileExtension || !allowedTypes.includes(fileExtension)) {
            res.status(400).json({
              error: {
                code: 'INVALID_FILE_TYPE',
                message: 'File type is not allowed',
                allowedTypes,
                actualType: fileExtension,
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id']
              }
            });
            return;
          }
        }
      }

      next();
    };
  };
}