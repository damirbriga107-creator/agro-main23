import { Request, Response, NextFunction } from 'express';
import { Logger } from '@daorsagro/utils';

const logger = new Logger('error-handler-middleware');

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    stack?: string;
  };
  timestamp: string;
  requestId?: string;
}

export class ErrorHandlerMiddleware {
  /**
   * Global error handler middleware
   */
  static handle = (
    error: any,
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    const requestId = req.headers['x-request-id'] as string;
    
    // Log the error
    logger.error('Unhandled error occurred', {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      requestId,
      url: req.url,
      method: req.method,
      userAgent: req.headers['user-agent']
    });

    // Default error response
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred'
      },
      timestamp: new Date().toISOString(),
      requestId
    };

    // Handle different error types
    if (error.name === 'ValidationError') {
      errorResponse.error.code = 'VALIDATION_ERROR';
      errorResponse.error.message = 'Request validation failed';
      errorResponse.error.details = error.details || error.message;
      res.status(400).json(errorResponse);
      return;
    }

    if (error.name === 'MongoError' || error.name === 'MongoServerError') {
      errorResponse.error.code = 'DATABASE_ERROR';
      errorResponse.error.message = 'Database operation failed';
      
      // Handle specific MongoDB errors
      if (error.code === 11000) {
        errorResponse.error.code = 'DUPLICATE_ENTRY';
        errorResponse.error.message = 'Resource already exists';
      }
      
      res.status(500).json(errorResponse);
      return;
    }

    if (error.name === 'CastError') {
      errorResponse.error.code = 'INVALID_ID';
      errorResponse.error.message = 'Invalid resource ID format';
      res.status(400).json(errorResponse);
      return;
    }

    if (error.status === 404) {
      errorResponse.error.code = 'NOT_FOUND';
      errorResponse.error.message = 'Resource not found';
      res.status(404).json(errorResponse);
      return;
    }

    if (error.status === 403) {
      errorResponse.error.code = 'FORBIDDEN';
      errorResponse.error.message = 'Access denied';
      res.status(403).json(errorResponse);
      return;
    }

    // Handle MQTT connection errors
    if (error.message?.includes('MQTT') || error.code === 'MQTT_ERROR') {
      errorResponse.error.code = 'MQTT_CONNECTION_ERROR';
      errorResponse.error.message = 'MQTT connection failed';
      res.status(503).json(errorResponse);
      return;
    }

    // Handle WebSocket errors
    if (error.message?.includes('WebSocket') || error.code === 'WS_ERROR') {
      errorResponse.error.code = 'WEBSOCKET_ERROR';
      errorResponse.error.message = 'WebSocket connection failed';
      res.status(503).json(errorResponse);
      return;
    }

    // Handle rate limiting errors
    if (error.status === 429) {
      errorResponse.error.code = 'RATE_LIMIT_EXCEEDED';
      errorResponse.error.message = 'Too many requests, please try again later';
      res.status(429).json(errorResponse);
      return;
    }

    // Include stack trace in development
    if (process.env.NODE_ENV === 'development') {
      errorResponse.error.stack = error.stack;
      errorResponse.error.details = {
        name: error.name,
        message: error.message
      };
    }

    // Default to 500 Internal Server Error
    const statusCode = error.status || error.statusCode || 500;
    res.status(statusCode).json(errorResponse);
  };

  /**
   * Handle 404 errors (route not found)
   */
  static notFound = (req: Request, res: Response, next: NextFunction): void => {
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: `Route ${req.method} ${req.path} not found`
      },
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string
    };

    logger.warn('Route not found', {
      method: req.method,
      path: req.path,
      requestId: req.headers['x-request-id']
    });

    res.status(404).json(errorResponse);
  };

  /**
   * Async error wrapper for route handlers
   */
  static asyncHandler = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  };
}

export default ErrorHandlerMiddleware;