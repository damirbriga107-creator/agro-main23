import { Request, Response, NextFunction } from 'express';
import { logger } from '@daorsagro/utils';

interface ErrorWithStatus extends Error {
  status?: number;
  statusCode?: number;
}

export const errorHandlerMiddleware = (
  error: ErrorWithStatus,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log the error
  logger.error('Request error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Determine status code
  const statusCode = error.status || error.statusCode || 500;

  // Prepare error response
  const errorResponse: any = {
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  };

  // Handle specific error types
  switch (statusCode) {
    case 400:
      errorResponse.error = 'Bad Request';
      errorResponse.message = error.message || 'Invalid request data';
      break;
    case 401:
      errorResponse.error = 'Unauthorized';
      errorResponse.message = error.message || 'Authentication required';
      break;
    case 403:
      errorResponse.error = 'Forbidden';
      errorResponse.message = error.message || 'Insufficient permissions';
      break;
    case 404:
      errorResponse.error = 'Not Found';
      errorResponse.message = error.message || 'Resource not found';
      break;
    case 409:
      errorResponse.error = 'Conflict';
      errorResponse.message = error.message || 'Resource conflict';
      break;
    case 413:
      errorResponse.error = 'Payload Too Large';
      errorResponse.message = error.message || 'File size exceeds limit';
      break;
    case 415:
      errorResponse.error = 'Unsupported Media Type';
      errorResponse.message = error.message || 'File type not supported';
      break;
    case 422:
      errorResponse.error = 'Validation Error';
      errorResponse.message = error.message || 'Invalid input data';
      break;
    case 429:
      errorResponse.error = 'Too Many Requests';
      errorResponse.message = error.message || 'Rate limit exceeded';
      break;
    case 500:
      errorResponse.error = 'Internal Server Error';
      errorResponse.message = process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : error.message;
      break;
    case 503:
      errorResponse.error = 'Service Unavailable';
      errorResponse.message = error.message || 'Service temporarily unavailable';
      break;
    default:
      errorResponse.error = 'Server Error';
      errorResponse.message = error.message || 'An unexpected error occurred';
  }

  // Include error details in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = error.stack;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  });
};

export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};