// Use minimal Express-like types to avoid requiring @types/express in shared utils
export type Request = any;
export type Response = any;
export type NextFunction = (...args: any[]) => void;
import Joi from 'joi';

/**
 * Middleware utilities for microservices
 */
export class MiddlewareUtils {
  /**
   * Create async error wrapper
   */
  static asyncWrapper = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  };

  /**
   * Create request ID middleware
   */
  static requestId = () => {
    return (req: Request, res: Response, next: NextFunction): void => {
      req.headers['x-request-id'] = req.headers['x-request-id'] || 
        require('crypto').randomUUID();
      res.setHeader('X-Request-ID', req.headers['x-request-id']);
      next();
    };
  };

  /**
   * Create request metrics middleware
   */
  static requestMetrics = (metricsService?: any) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const startTime = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        if (metricsService && metricsService.recordRequest) {
          metricsService.recordRequest(req.method, req.path, res.statusCode, duration);
        }
      });
      next();
    };
  };

  /**
   * Create validation middleware
   */
  static validate = (schema: Joi.ObjectSchema, target: 'body' | 'query' | 'params' = 'body') => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const data = target === 'body' ? req.body : target === 'query' ? req.query : req.params;
      
      const { error, value } = schema.validate(data, {
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

        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: `${target.charAt(0).toUpperCase() + target.slice(1)} validation failed`,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'],
            validationErrors
          }
        });
        return;
      }

      // Update the request object with validated data
      if (target === 'body') req.body = value;
      else if (target === 'query') req.query = value;
      else req.params = value;

      next();
    };
  };

  /**
   * Create pagination middleware
   */
  static pagination = () => {
    const paginationSchema = Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10),
      sortBy: Joi.string().optional(),
      sortOrder: Joi.string().valid('asc', 'desc').default('asc')
    });

    return MiddlewareUtils.validate(paginationSchema, 'query');
  };

  /**
   * Create CORS middleware
   */
  static cors = (origins: string[] = ['http://localhost:5173']) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const origin = req.headers.origin;
      
      if (origins.includes('*') || (origin && origins.includes(origin))) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
      }
      
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Request-ID,X-API-Version');
      res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count,X-Rate-Limit-Remaining');
      
      if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
      }
      
      next();
    };
  };

  /**
   * Create security headers middleware
   */
  static security = () => {
    return (req: Request, res: Response, next: NextFunction): void => {
      // Basic security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      
      next();
    };
  };

  /**
   * Create error handling middleware
   */
  static errorHandler = (logger?: any) => {
    return (error: any, req: Request, res: Response, next: NextFunction): void => {
      const requestId = req.headers['x-request-id'] as string;
      const timestamp = new Date().toISOString();

      // Log the error
      if (logger) {
        logger.error('Request error occurred', error, {
          requestId,
          method: req.method,
          url: req.url,
          userAgent: req.get('User-Agent'),
          ip: req.ip
        });
      }

      // Determine error type and status code
      let statusCode = 500;
      let errorCode = 'INTERNAL_SERVER_ERROR';
      let message = 'An unexpected error occurred';

      if (error.statusCode) {
        statusCode = error.statusCode;
      } else if (error.name === 'ValidationError') {
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
        message = error.message;
      } else if (error.name === 'UnauthorizedError') {
        statusCode = 401;
        errorCode = 'UNAUTHORIZED';
        message = 'Authentication required';
      } else if (error.name === 'ForbiddenError') {
        statusCode = 403;
        errorCode = 'FORBIDDEN';
        message = 'Access denied';
      } else if (error.name === 'NotFoundError') {
        statusCode = 404;
        errorCode = 'NOT_FOUND';
        message = 'Resource not found';
      } else if (error.code) {
        errorCode = error.code;
        message = error.message;
      }

      // Create error response
      const errorResponse: any = {
        error: {
          code: errorCode,
          message,
          timestamp,
          requestId
        }
      };

      // Add error details in development
      if (process.env.NODE_ENV === 'development') {
        errorResponse.error.details = {
          stack: error.stack,
          name: error.name,
          ...(error.details && { details: error.details })
        };
      }

      res.status(statusCode).json(errorResponse);
    };
  };

  /**
   * Create 404 handler middleware
   */
  static notFound = () => {
    return (req: Request, res: Response): void => {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Route ${req.method} ${req.originalUrl} not found`,
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        }
      });
    };
  };
}