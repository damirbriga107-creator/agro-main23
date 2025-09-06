import { Request, Response, NextFunction } from 'express';
import { ErrorUtils } from '@daorsagro/utils';
import { EnvironmentUtils } from '@daorsagro/config';
import { Logger } from '../utils/logger.js';

const logger = new Logger('error-handler');

/**
 * Error handling middleware for API Gateway
 */
export class ErrorHandlerMiddleware {
  /**
   * Global error handler
   */
  static handle = (error: any, req: Request, res: Response, next: NextFunction): void => {
    const requestId = req.headers['x-request-id'] as string;
    const isDevelopment = EnvironmentUtils.isDevelopment();

    // Log the error
    logger.error('Request failed', {
      requestId,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code
      },
      request: {
        method: req.method,
        url: req.url,
        headers: ErrorHandlerMiddleware.sanitizeHeaders(req.headers),
        userAgent: req.get('User-Agent'),
        ip: req.ip
      }
    });

    // Handle different error types
    if (error.name === 'ValidationError') {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
          details: error.details,
          timestamp: new Date().toISOString(),
          requestId
        }
      });
      return;
    }

    if (error.name === 'UnauthorizedError' || error.code === 'UNAUTHORIZED') {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          requestId
        }
      });
      return;
    }

    if (error.name === 'ForbiddenError' || error.code === 'FORBIDDEN') {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
          timestamp: new Date().toISOString(),
          requestId
        }
      });
      return;
    }

    if (error.name === 'NotFoundError' || error.code === 'NOT_FOUND') {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: error.message || 'Resource not found',
          timestamp: new Date().toISOString(),
          requestId
        }
      });
      return;
    }

    if (error.name === 'ConflictError' || error.code === 'CONFLICT') {
      res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: error.message || 'Resource conflict',
          timestamp: new Date().toISOString(),
          requestId
        }
      });
      return;
    }

    if (error.name === 'PayloadTooLargeError') {
      res.status(413).json({
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: 'Request payload too large',
          timestamp: new Date().toISOString(),
          requestId
        }
      });
      return;
    }

    if (error.name === 'TooManyRequestsError' || error.code === 'RATE_LIMIT_EXCEEDED') {
      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests',
          retryAfter: error.retryAfter,
          timestamp: new Date().toISOString(),
          requestId
        }
      });
      return;
    }

    // Database errors
    if (error.name === 'SequelizeConnectionError' || error.code === 'ECONNREFUSED') {
      res.status(503).json({
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Database connection failed',
          timestamp: new Date().toISOString(),
          requestId
        }
      });
      return;
    }

    if (error.name === 'SequelizeValidationError') {
      res.status(400).json({
        error: {
          code: 'DATABASE_VALIDATION_ERROR',
          message: 'Database validation failed',
          details: error.errors?.map((err: any) => ({
            field: err.path,
            message: err.message
          })),
          timestamp: new Date().toISOString(),
          requestId
        }
      });
      return;
    }

    if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(409).json({
        error: {
          code: 'DUPLICATE_ENTRY',
          message: 'Resource already exists',
          fields: error.fields,
          timestamp: new Date().toISOString(),
          requestId
        }
      });
      return;
    }

    // Redis errors
    if (error.code === 'ECONNREFUSED' && error.port === 6379) {
      res.status(503).json({
        error: {
          code: 'CACHE_UNAVAILABLE',
          message: 'Cache service unavailable',
          timestamp: new Date().toISOString(),
          requestId
        }
      });
      return;
    }

    // JWT errors
    if (error.name === 'JsonWebTokenError') {
      res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid token',
          timestamp: new Date().toISOString(),
          requestId
        }
      });
      return;
    }

    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Token has expired',
          expiredAt: error.expiredAt,
          timestamp: new Date().toISOString(),
          requestId
        }
      });
      return;
    }

    // Multer errors (file upload)
    if (error.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'File size exceeds limit',
          limit: error.limit,
          timestamp: new Date().toISOString(),
          requestId
        }
      });
      return;
    }

    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      res.status(400).json({
        error: {
          code: 'UNEXPECTED_FILE',
          message: 'Unexpected file field',
          field: error.field,
          timestamp: new Date().toISOString(),
          requestId
        }
      });
      return;
    }

    // Timeout errors
    if (error.code === 'ETIMEDOUT' || error.name === 'TimeoutError') {
      res.status(504).json({
        error: {
          code: 'GATEWAY_TIMEOUT',
          message: 'Request timeout',
          timestamp: new Date().toISOString(),
          requestId
        }
      });
      return;
    }

    // Network errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNRESET') {
      res.status(502).json({
        error: {
          code: 'BAD_GATEWAY',
          message: 'Service temporarily unavailable',
          timestamp: new Date().toISOString(),
          requestId
        }
      });
      return;
    }

    // Custom application errors
    if (error.code && error.statusCode) {
      res.status(error.statusCode).json({
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          timestamp: new Date().toISOString(),
          requestId
        }
      });
      return;
    }

    // Default internal server error
    const statusCode = error.status || error.statusCode || 500;
    const sanitizedError = ErrorUtils.sanitizeError(error);

    res.status(statusCode).json({
      error: {
        code: sanitizedError.code || 'INTERNAL_SERVER_ERROR',
        message: isDevelopment ? error.message : 'An unexpected error occurred',
        ...(isDevelopment && error.stack && { stack: error.stack }),
        ...(isDevelopment && error.details && { details: error.details }),
        timestamp: new Date().toISOString(),
        requestId
      }
    });
  };

  /**
   * Sanitize headers for logging (remove sensitive information)
   */
  private static sanitizeHeaders(headers: any): any {
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    const sanitized = { ...headers };

    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Async error wrapper for route handlers
   */
  static asyncWrapper = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  };

  /**
   * Create custom error classes
   */
  static createError = (statusCode: number, code: string, message: string, details?: any) => {
    const error = new Error(message) as any;
    error.statusCode = statusCode;
    error.code = code;
    error.details = details;
    return error;
  };

  /**
   * Handle unhandled promise rejections
   */
  static handleUnhandledRejection = (reason: any, promise: Promise<any>): void => {
    logger.error('Unhandled promise rejection', {
      reason: reason?.message || reason,
      stack: reason?.stack,
      promise: promise.toString()
    });

    // In production, you might want to gracefully shutdown
    if (EnvironmentUtils.isProduction()) {
      process.exit(1);
    }
  };

  /**
   * Handle uncaught exceptions
   */
  static handleUncaughtException = (error: Error): void => {
    logger.error('Uncaught exception', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    // In production, gracefully shutdown
    if (EnvironmentUtils.isProduction()) {
      process.exit(1);
    }
  };
}