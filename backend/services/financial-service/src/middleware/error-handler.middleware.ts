import { Request, Response, NextFunction } from 'express';
import { Logger } from '@daorsagro/utils';

/**
 * Global error handler middleware for Financial Service
 */
export class ErrorHandlerMiddleware {
  private static logger = new Logger('financial-service-error-handler');

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
        case 'INSUFFICIENT_FUNDS':
          statusCode = 422;
          errorResponse.error.code = error.code;
          errorResponse.error.message = 'Insufficient funds for this transaction';
          break;
        case 'TRANSACTION_LIMIT_EXCEEDED':
          statusCode = 422;
          errorResponse.error.code = error.code;
          errorResponse.error.message = 'Transaction amount exceeds limit';
          break;
        case 'INVALID_ACCOUNT':
          statusCode = 404;
          errorResponse.error.code = error.code;
          errorResponse.error.message = 'Account not found or invalid';
          break;
        case 'BUDGET_EXCEEDED':
          statusCode = 422;
          errorResponse.error.code = error.code;
          errorResponse.error.message = 'Budget limit exceeded';
          break;
        case 'DUPLICATE_TRANSACTION':
          statusCode = 409;
          errorResponse.error.code = error.code;
          errorResponse.error.message = 'Duplicate transaction detected';
          break;
        case 'DATABASE_CONNECTION_ERROR':
          statusCode = 503;
          errorResponse.error.code = 'SERVICE_UNAVAILABLE';
          errorResponse.error.message = 'Database temporarily unavailable';
          break;
        default:
          if (error.code.startsWith('FINANCIAL_')) {
            statusCode = 422;
            errorResponse.error.code = error.code;
            errorResponse.error.message = error.message;
          }
      }
    } else if (error.statusCode) {
      // Handle errors with custom status codes
      statusCode = error.statusCode;
      errorResponse.error.message = error.message;
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

/**
 * Create custom financial service error
 */
export function createFinancialError(code: string, message: string, statusCode: number = 422): Error {
  const error = new Error(message);
  (error as any).code = code;
  (error as any).statusCode = statusCode;
  return error;
}

// Legacy exports for backward compatibility
export const errorHandler = ErrorHandlerMiddleware.handle;
export const createError = (message: string, statusCode: number = 500): Error => {
  const error = new Error(message);
  (error as any).statusCode = statusCode;
  (error as any).isOperational = true;
  return error;
};