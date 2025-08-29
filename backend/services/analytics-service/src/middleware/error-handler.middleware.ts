import { Request, Response, NextFunction } from 'express';
import { Logger } from '@daorsagro/utils';

/**
 * Global error handler middleware for Analytics Service
 */
export class ErrorHandlerMiddleware {
  private static logger = new Logger('analytics-service-error-handler');

  /**
   * Handle application errors
   */
  public static handle(
    error: any,
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    const requestId = req.headers['x-request-id'] as string;
    const isDevelopment = process.env.NODE_ENV === 'development';

    // Log the error
    ErrorHandlerMiddleware.logger.error('Request error occurred', error, {
      requestId,
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    });

    // Default error response
    let statusCode = 500;
    let errorResponse = {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        timestamp: new Date().toISOString(),
        requestId,
        ...(isDevelopment && { details: error.message, stack: error.stack }),
      },
    };

    // Handle specific error types
    if (error.name === 'ValidationError') {
      statusCode = 400;
      errorResponse.error.code = 'VALIDATION_ERROR';
      errorResponse.error.message = error.message;
    } else if (error.name === 'UnauthorizedError' || error.message === 'jwt malformed') {
      statusCode = 401;
      errorResponse.error.code = 'UNAUTHORIZED';
      errorResponse.error.message = 'Authentication required';
    } else if (error.name === 'ForbiddenError') {
      statusCode = 403;
      errorResponse.error.code = 'FORBIDDEN';
      errorResponse.error.message = 'Access denied';
    } else if (error.name === 'NotFoundError') {
      statusCode = 404;
      errorResponse.error.code = 'NOT_FOUND';
      errorResponse.error.message = error.message || 'Resource not found';
    } else if (error.name === 'ConflictError') {
      statusCode = 409;
      errorResponse.error.code = 'CONFLICT';
      errorResponse.error.message = error.message;
    } else if (error.name === 'TooManyRequestsError') {
      statusCode = 429;
      errorResponse.error.code = 'TOO_MANY_REQUESTS';
      errorResponse.error.message = 'Rate limit exceeded';
    } else if (error.code) {
      // Handle custom application errors
      switch (error.code) {
        case 'ANALYTICS_DATA_ERROR':
          statusCode = 422;
          errorResponse.error.code = error.code;
          errorResponse.error.message = error.message;
          break;
        case 'CLICKHOUSE_CONNECTION_ERROR':
          statusCode = 503;
          errorResponse.error.code = 'SERVICE_UNAVAILABLE';
          errorResponse.error.message = 'Analytics database temporarily unavailable';
          break;
        case 'KAFKA_ERROR':
          statusCode = 503;
          errorResponse.error.code = 'SERVICE_UNAVAILABLE';
          errorResponse.error.message = 'Event processing temporarily unavailable';
          break;
        case 'INSUFFICIENT_DATA':
          statusCode = 422;
          errorResponse.error.code = error.code;
          errorResponse.error.message = 'Insufficient data for analytics calculation';
          break;
        default:
          if (error.code.startsWith('ANALYTICS_')) {
            statusCode = 422;
            errorResponse.error.code = error.code;
            errorResponse.error.message = error.message;
          }
      }
    }

    // Send error response
    res.status(statusCode).json(errorResponse);
  }

  /**
   * Async error wrapper
   */
  public static asyncHandler(fn: Function) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Not found handler
   */
  public static notFound(req: Request, res: Response, next: NextFunction): void {
    const error = new Error(`Route ${req.originalUrl} not found`);
    error.name = 'NotFoundError';
    next(error);
  }
}