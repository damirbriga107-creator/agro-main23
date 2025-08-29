import { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
  details?: any;
}

export class CustomError extends Error implements AppError {
  public statusCode: number;
  public isOperational: boolean;
  public code: string;
  public details?: any;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_SERVER_ERROR', details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends CustomError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class UnauthorizedError extends CustomError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends CustomError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends CustomError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends CustomError {
  constructor(message: string, details?: any) {
    super(message, 409, 'CONFLICT', details);
  }
}

export class TooManyRequestsError extends CustomError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'TOO_MANY_REQUESTS');
  }
}

/**
 * Enhanced Error Handler Middleware with detailed error responses
 */
export class ErrorHandlerMiddleware {
  private static logger = new Logger('error-handler');

  /**
   * Main error handling middleware
   */
  public static handle = (error: AppError, req: Request, res: Response, next: NextFunction): void => {
    // Log the error
    ErrorHandlerMiddleware.logError(error, req);

    // Don't process if response is already sent
    if (res.headersSent) {
      return next(error);
    }

    // Set default error values
    let statusCode = error.statusCode || 500;
    let message = error.message || 'Internal Server Error';
    let code = error.code || 'INTERNAL_SERVER_ERROR';
    let details = error.details;

    // Handle specific error types
    const errorResponse = ErrorHandlerMiddleware.handleSpecificErrors(error);
    if (errorResponse) {
      statusCode = errorResponse.statusCode;
      message = errorResponse.message;
      code = errorResponse.code;
      details = errorResponse.details;
    }

    // Create error response
    const errorResponseBody = ErrorHandlerMiddleware.createErrorResponse(
      statusCode,
      message,
      code,
      details,
      req
    );

    // Send error response
    res.status(statusCode).json(errorResponseBody);
  };

  /**
   * Handle specific error types (database, validation, etc.)
   */
  private static handleSpecificErrors(error: any): { statusCode: number; message: string; code: string; details?: any } | null {
    // Prisma errors
    if (error.code && error.code.startsWith('P')) {
      return ErrorHandlerMiddleware.handlePrismaError(error);
    }

    // Joi validation errors
    if (error.isJoi) {
      return ErrorHandlerMiddleware.handleJoiError(error);
    }

    // JWT errors
    if (error.name === 'JsonWebTokenError') {
      return { statusCode: 401, message: 'Invalid token', code: 'INVALID_TOKEN' };
    }

    if (error.name === 'TokenExpiredError') {
      return { statusCode: 401, message: 'Token expired', code: 'TOKEN_EXPIRED' };
    }

    // Multer errors (file upload)
    if (error.code === 'LIMIT_FILE_SIZE') {
      return { statusCode: 400, message: 'File too large', code: 'FILE_TOO_LARGE' };
    }

    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return { statusCode: 400, message: 'Unexpected file field', code: 'UNEXPECTED_FILE' };
    }

    // MongoDB errors
    if (error.name === 'MongoError' || error.name === 'MongooseError') {
      return ErrorHandlerMiddleware.handleMongoError(error);
    }

    // Redis errors
    if (error.code === 'ECONNREFUSED' && error.port === 6379) {
      return { statusCode: 503, message: 'Cache service unavailable', code: 'CACHE_UNAVAILABLE' };
    }

    return null;
  }

  /**
   * Handle Prisma database errors
   */
  private static handlePrismaError(error: any): { statusCode: number; message: string; code: string; details?: any } {
    switch (error.code) {
      case 'P2002':
        return {
          statusCode: 409,
          message: 'Unique constraint violation',
          code: 'DUPLICATE_ENTRY',
          details: { field: error.meta?.target }
        };
      case 'P2025':
        return {
          statusCode: 404,
          message: 'Record not found',
          code: 'RECORD_NOT_FOUND'
        };
      case 'P2003':
        return {
          statusCode: 400,
          message: 'Foreign key constraint violation',
          code: 'FOREIGN_KEY_CONSTRAINT'
        };
      case 'P2014':
        return {
          statusCode: 400,
          message: 'Invalid ID provided',
          code: 'INVALID_ID'
        };
      default:
        return {
          statusCode: 500,
          message: 'Database error',
          code: 'DATABASE_ERROR'
        };
    }
  }

  /**
   * Handle Joi validation errors
   */
  private static handleJoiError(error: any): { statusCode: number; message: string; code: string; details: any } {
    const details = error.details?.map((detail: any) => ({
      field: detail.path?.join('.'),
      message: detail.message,
      value: detail.context?.value
    }));

    return {
      statusCode: 400,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details
    };
  }

  /**
   * Handle MongoDB errors
   */
  private static handleMongoError(error: any): { statusCode: number; message: string; code: string; details?: any } {
    if (error.code === 11000) {
      return {
        statusCode: 409,
        message: 'Duplicate entry',
        code: 'DUPLICATE_ENTRY',
        details: { field: Object.keys(error.keyValue || {})[0] }
      };
    }

    return {
      statusCode: 500,
      message: 'Database error',
      code: 'DATABASE_ERROR'
    };
  }

  /**
   * Create standardized error response
   */
  private static createErrorResponse(
    statusCode: number,
    message: string,
    code: string,
    details: any,
    req: Request
  ): any {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    const errorResponse: any = {
      error: {
        code,
        message,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'],
        path: req.originalUrl,
        method: req.method
      }
    };

    // Add details if available
    if (details) {
      errorResponse.error.details = details;
    }

    // Add stack trace in development
    if (isDevelopment && statusCode >= 500) {
      errorResponse.error.stack = (req as any).error?.stack;
    }

    return errorResponse;
  }

  /**
   * Log error with appropriate level
   */
  private static logError(error: AppError, req: Request): void {
    const logContext = {
      requestId: req.headers['x-request-id'],
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: (req as any).user?.id,
      statusCode: error.statusCode
    };

    if (error.statusCode && error.statusCode < 500) {
      // Client errors (4xx) - log as warning
      this.logger.warn(`Client error: ${error.message}`, logContext);
    } else {
      // Server errors (5xx) - log as error with stack
      this.logger.error(`Server error: ${error.message}`, error, logContext);
    }
  }

  /**
   * Async error wrapper for route handlers
   */
  public static asyncHandler = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  };

  /**
   * 404 Not Found handler
   */
  public static notFound = (req: Request, res: Response): void => {
    const error = new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`);
    res.status(404).json({
      error: {
        code: error.code,
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'],
        path: req.originalUrl,
        method: req.method
      }
    });
  };

  /**
   * Unhandled rejection handler
   */
  public static handleUnhandledRejection = (reason: any, promise: Promise<any>): void => {
    ErrorHandlerMiddleware.logger.error('Unhandled Promise Rejection', reason, {
      promise: promise.toString()
    });
  };

  /**
   * Uncaught exception handler
   */
  public static handleUncaughtException = (error: Error): void => {
    ErrorHandlerMiddleware.logger.error('Uncaught Exception', error);
    // In production, you might want to restart the process
    process.exit(1);
  };
}