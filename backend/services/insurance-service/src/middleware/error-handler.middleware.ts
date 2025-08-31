import { Request, Response, NextFunction } from 'express';
import { logger } from '@daorsagro/utils';

export interface InsuranceError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export class ErrorHandlerMiddleware {
  static handle(err: InsuranceError, req: Request, res: Response, next: NextFunction): void {
    logger.error('Insurance service error:', {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      body: req.body,
      query: req.query,
      params: req.params,
      requestId: req.headers['x-request-id']
    });

    // Default error response
    let statusCode = 500;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected error occurred';
    let details = undefined;

    // Handle specific error types
    if (err.name === 'ValidationError') {
      statusCode = 400;
      errorCode = 'VALIDATION_ERROR';
      message = 'Invalid request data';
      details = err.details || err.message;
    } else if (err.name === 'CastError') {
      statusCode = 400;
      errorCode = 'INVALID_ID';
      message = 'Invalid resource ID';
    } else if (err.name === 'MongoError' || err.name === 'MongoServerError') {
      if (err.code === 11000) {
        statusCode = 409;
        errorCode = 'DUPLICATE_RESOURCE';
        message = 'Resource already exists';
      }
    } else if (err.statusCode) {
      statusCode = err.statusCode;
      errorCode = err.code || 'BUSINESS_ERROR';
      message = err.message;
      details = err.details;
    }

    // Don't expose internal errors in production
    if (process.env.NODE_ENV === 'production' && statusCode === 500) {
      message = 'Internal server error';
      details = undefined;
    }

    const errorResponse = {
      error: {
        code: errorCode,
        message,
        details,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      }
    };

    res.status(statusCode).json(errorResponse);
  }

  static notFound(req: Request, res: Response, next: NextFunction): void {
    const error: InsuranceError = new Error(`Route ${req.method} ${req.originalUrl} not found`);
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    next(error);
  }

  static asyncHandler(fn: Function) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }
}

// Custom error classes
export class PolicyNotFoundError extends Error {
  statusCode = 404;
  code = 'POLICY_NOT_FOUND';

  constructor(policyId: string) {
    super(`Policy with ID ${policyId} not found`);
    this.name = 'PolicyNotFoundError';
  }
}

export class ClaimNotFoundError extends Error {
  statusCode = 404;
  code = 'CLAIM_NOT_FOUND';

  constructor(claimId: string) {
    super(`Claim with ID ${claimId} not found`);
    this.name = 'ClaimNotFoundError';
  }
}

export class ProviderNotFoundError extends Error {
  statusCode = 404;
  code = 'PROVIDER_NOT_FOUND';

  constructor(providerId: string) {
    super(`Insurance provider with ID ${providerId} not found`);
    this.name = 'ProviderNotFoundError';
  }
}

export class InvalidPolicyStatusError extends Error {
  statusCode = 400;
  code = 'INVALID_POLICY_STATUS';

  constructor(currentStatus: string, requestedStatus: string) {
    super(`Cannot change policy status from ${currentStatus} to ${requestedStatus}`);
    this.name = 'InvalidPolicyStatusError';
  }
}

export class InsufficientCoverageError extends Error {
  statusCode = 400;
  code = 'INSUFFICIENT_COVERAGE';

  constructor(claimAmount: number, coverageLimit: number) {
    super(`Claim amount $${claimAmount} exceeds coverage limit of $${coverageLimit}`);
    this.name = 'InsufficientCoverageError';
  }
}

export class ExpiredPolicyError extends Error {
  statusCode = 400;
  code = 'EXPIRED_POLICY';

  constructor(policyNumber: string, expirationDate: Date) {
    super(`Policy ${policyNumber} expired on ${expirationDate.toDateString()}`);
    this.name = 'ExpiredPolicyError';
  }
}

export class DuplicateClaimError extends Error {
  statusCode = 409;
  code = 'DUPLICATE_CLAIM';

  constructor(incidentDate: Date, policyId: string) {
    super(`A claim for incident on ${incidentDate.toDateString()} already exists for this policy`);
    this.name = 'DuplicateClaimError';
  }
}

export class UnauthorizedAccessError extends Error {
  statusCode = 403;
  code = 'UNAUTHORIZED_ACCESS';

  constructor(resource: string) {
    super(`Unauthorized access to ${resource}`);
    this.name = 'UnauthorizedAccessError';
  }
}