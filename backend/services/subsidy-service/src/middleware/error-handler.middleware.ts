import { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/logger';

/**
 * Error handling middleware for microservices
 */
export class ErrorHandlerMiddleware {
  private static logger = new Logger('error-handler');

  /**
   * Handle errors and send standardized error responses
   */
  static handle = (error: any, req: Request, res: Response, next: NextFunction): void => {
    const requestId = req.headers['x-request-id'] as string;
    const timestamp = new Date().toISOString();

    // Log the error
    ErrorHandlerMiddleware.logger.error('Request error occurred', error, {
      requestId,
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

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
    } else if (error.name === 'ConflictError') {
      statusCode = 409;
      errorCode = 'CONFLICT';
      message = error.message;
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

    // Add validation errors if present
    if (error.details && Array.isArray(error.details)) {
      errorResponse.error.validationErrors = error.details.map((detail: any) => ({
        field: detail.path?.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));
    }

    res.status(statusCode).json(errorResponse);
  };

  /**
   * Async wrapper to catch async route handler errors
   */
  static asyncWrapper = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  };

  /**
   * Create standardized error
   */
  static createError = (statusCode: number, code: string, message: string, details?: any): Error => {
    const error = new Error(message) as any;
    error.statusCode = statusCode;
    error.code = code;
    if (details) {
      error.details = details;
    }
    return error;
  };

  /**
   * Handle unhandled promise rejections
   */
  static handleUnhandledRejection = (reason: any, promise: Promise<any>): void => {
    ErrorHandlerMiddleware.logger.error('Unhandled Promise Rejection', reason, {
      promise: promise.toString()
    });
    
    // Graceful shutdown
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  };

  /**
   * Handle uncaught exceptions
   */
  static handleUncaughtException = (error: Error): void => {
    ErrorHandlerMiddleware.logger.error('Uncaught Exception', error);
    
    // Graceful shutdown
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  };

  /**
   * Setup process error handlers
   */
  static setupProcessHandlers(): void {
    process.on('unhandledRejection', ErrorHandlerMiddleware.handleUnhandledRejection);
    process.on('uncaughtException', ErrorHandlerMiddleware.handleUncaughtException);

    // Graceful shutdown handlers
    process.on('SIGTERM', () => {
      ErrorHandlerMiddleware.logger.info('SIGTERM received, shutting down gracefully');
      process.exit(0);
    });

    process.on('SIGINT', () => {
      ErrorHandlerMiddleware.logger.info('SIGINT received, shutting down gracefully');
      process.exit(0);
    });
  }
}