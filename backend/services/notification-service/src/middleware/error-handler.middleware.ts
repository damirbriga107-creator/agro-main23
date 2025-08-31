import { Request, Response, NextFunction } from 'express';
import { logger } from '@daorsagro/utils';

interface ErrorResponse {
  error: string;
  message: string;
  details?: any;
  timestamp: string;
  path: string;
  method: string;
}

export class NotificationError extends Error {
  public statusCode: number;
  public details?: any;

  constructor(message: string, statusCode: number = 500, details?: any) {
    super(message);
    this.name = 'NotificationError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error('Notification service error:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params
  });

  const errorResponse: ErrorResponse = {
    error: error.name || 'InternalServerError',
    message: error.message || 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  };

  let statusCode = 500;

  if (error instanceof NotificationError) {
    statusCode = error.statusCode;
    errorResponse.details = error.details;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    errorResponse.error = 'ValidationError';
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    errorResponse.error = 'UnauthorizedError';
  } else if (error.name === 'ForbiddenError') {
    statusCode = 403;
    errorResponse.error = 'ForbiddenError';
  } else if (error.message.includes('not found')) {
    statusCode = 404;
    errorResponse.error = 'NotFoundError';
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    errorResponse.message = 'Internal server error';
    delete errorResponse.details;
  }

  res.status(statusCode).json(errorResponse);
};