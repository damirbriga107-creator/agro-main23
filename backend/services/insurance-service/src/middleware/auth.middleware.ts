import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '@daorsagro/utils';
import { UnauthorizedAccessError } from './error-handler.middleware';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    farmId?: string;
  };
}

export class AuthMiddleware {
  static authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedAccessError('Missing or invalid authorization header');
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      if (!token) {
        throw new UnauthorizedAccessError('No token provided');
      }

      const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
      const decoded = jwt.verify(token, jwtSecret) as any;

      req.user = {
        id: decoded.id || decoded.userId,
        email: decoded.email,
        role: decoded.role,
        farmId: decoded.farmId
      };

      logger.debug('User authenticated successfully', {
        userId: req.user.id,
        role: req.user.role,
        requestId: req.headers['x-request-id']
      });

      next();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        next(new UnauthorizedAccessError('Invalid token'));
      } else if (error instanceof jwt.TokenExpiredError) {
        next(new UnauthorizedAccessError('Token expired'));
      } else {
        next(error);
      }
    }
  }

  static authorize(roles: string[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      try {
        if (!req.user) {
          throw new UnauthorizedAccessError('User not authenticated');
        }

        if (!roles.includes(req.user.role)) {
          throw new UnauthorizedAccessError(`Insufficient permissions. Required roles: ${roles.join(', ')}`);
        }

        logger.debug('User authorized successfully', {
          userId: req.user.id,
          role: req.user.role,
          requiredRoles: roles,
          requestId: req.headers['x-request-id']
        });

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  static requireOwnership(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    try {
      if (!req.user) {
        throw new UnauthorizedAccessError('User not authenticated');
      }

      // Check if the user is accessing their own resources
      const userId = req.params.userId || req.body.userId || req.query.userId;
      const farmId = req.params.farmId || req.body.farmId || req.query.farmId;

      if (userId && userId !== req.user.id) {
        // Admin can access any user's resources
        if (req.user.role !== 'admin') {
          throw new UnauthorizedAccessError('Cannot access other user\'s resources');
        }
      }

      if (farmId && req.user.farmId && farmId !== req.user.farmId) {
        // Admin and farm managers can access farm resources
        if (!['admin', 'farm_manager'].includes(req.user.role)) {
          throw new UnauthorizedAccessError('Cannot access other farm\'s resources');
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  }

  static optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    try {
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        if (token) {
          const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
          try {
            const decoded = jwt.verify(token, jwtSecret) as any;
            req.user = {
              id: decoded.id || decoded.userId,
              email: decoded.email,
              role: decoded.role,
              farmId: decoded.farmId
            };
          } catch (error) {
            // Invalid token, but continue without authentication
            logger.warn('Optional authentication failed', {
              error: error instanceof Error ? error.message : 'Unknown error',
              requestId: req.headers['x-request-id']
            });
          }
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  }

  static requireRole(role: string) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      try {
        if (!req.user) {
          throw new UnauthorizedAccessError('User not authenticated');
        }

        if (req.user.role !== role && req.user.role !== 'admin') {
          throw new UnauthorizedAccessError(`Required role: ${role}`);
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  static requireAnyRole(roles: string[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      try {
        if (!req.user) {
          throw new UnauthorizedAccessError('User not authenticated');
        }

        if (!roles.includes(req.user.role) && req.user.role !== 'admin') {
          throw new UnauthorizedAccessError(`Required roles: ${roles.join(', ')}`);
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  // API Key authentication for external services
  static authenticateApiKey(req: Request, res: Response, next: NextFunction): void {
    try {
      const apiKey = req.headers['x-api-key'] as string;
      
      if (!apiKey) {
        throw new UnauthorizedAccessError('API key required');
      }

      // In production, validate API key against database
      const validApiKeys = [
        process.env.INSURANCE_API_KEY,
        process.env.PROVIDER_API_KEY
      ].filter(Boolean);

      if (!validApiKeys.includes(apiKey)) {
        throw new UnauthorizedAccessError('Invalid API key');
      }

      logger.debug('API key authenticated successfully', {
        apiKeyPrefix: apiKey.substring(0, 8) + '...',
        requestId: req.headers['x-request-id']
      });

      next();
    } catch (error) {
      next(error);
    }
  }
}