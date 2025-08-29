import { Request, Response, NextFunction } from 'express';
import { TokenUtils, ErrorUtils } from '@daorsagro/utils';
import { TokenPayload, UserRole } from '@daorsagro/types';
import { EnvironmentUtils } from '@daorsagro/config';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Authentication middleware for API Gateway
 */
export class AuthMiddleware {
  /**
   * Authenticate JWT token
   */
  static authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        res.status(401).json({
          error: {
            code: 'MISSING_TOKEN',
            message: 'Authorization header is required',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']
          }
        });
        return;
      }

      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7) 
        : authHeader;

      if (!token) {
        res.status(401).json({
          error: {
            code: 'INVALID_TOKEN_FORMAT',
            message: 'Token must be provided in Bearer format',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']
          }
        });
        return;
      }

      // Verify token
      const jwtSecret = EnvironmentUtils.getRequired('JWT_SECRET');
      const payload = TokenUtils.verifyToken(token, jwtSecret);

      // Check if token is expired
      if (TokenUtils.isTokenExpired(token)) {
        res.status(401).json({
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Token has expired',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']
          }
        });
        return;
      }

      // Add user to request
      req.user = payload;
      next();

    } catch (error: any) {
      let errorCode = 'INVALID_TOKEN';
      let errorMessage = 'Invalid or malformed token';

      if (error.name === 'JsonWebTokenError') {
        errorCode = 'MALFORMED_TOKEN';
        errorMessage = 'Token is malformed';
      } else if (error.name === 'TokenExpiredError') {
        errorCode = 'TOKEN_EXPIRED';
        errorMessage = 'Token has expired';
      } else if (error.name === 'NotBeforeError') {
        errorCode = 'TOKEN_NOT_ACTIVE';
        errorMessage = 'Token is not active yet';
      }

      res.status(401).json({
        error: {
          code: errorCode,
          message: errorMessage,
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        }
      });
    }
  };

  /**
   * Authorization middleware - check user roles
   */
  static authorize = (requiredRoles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication is required',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']
          }
        });
        return;
      }

      if (!requiredRoles.includes(req.user.role)) {
        res.status(403).json({
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Insufficient permissions to access this resource',
            requiredRoles,
            userRole: req.user.role,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']
          }
        });
        return;
      }

      next();
    };
  };

  /**
   * Optional authentication - doesn't fail if no token provided
   */
  static optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        next();
        return;
      }

      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7) 
        : authHeader;

      if (!token) {
        next();
        return;
      }

      // Verify token
      const jwtSecret = EnvironmentUtils.getRequired('JWT_SECRET');
      const payload = TokenUtils.verifyToken(token, jwtSecret);

      // Check if token is expired
      if (!TokenUtils.isTokenExpired(token)) {
        req.user = payload;
      }

      next();

    } catch (error) {
      // Ignore errors and continue without authentication
      next();
    }
  };

  /**
   * Check if user owns the resource
   */
  static checkOwnership = (resourceUserIdField: string = 'userId') => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication is required',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']
          }
        });
        return;
      }

      // Admin can access any resource
      if (req.user.role === UserRole.ADMIN) {
        next();
        return;
      }

      // Get resource owner ID from params, body, or query
      const resourceOwnerId = req.params[resourceUserIdField] || 
                             req.body[resourceUserIdField] || 
                             req.query[resourceUserIdField];

      if (!resourceOwnerId) {
        res.status(400).json({
          error: {
            code: 'MISSING_RESOURCE_OWNER',
            message: `Resource owner ID is required in ${resourceUserIdField}`,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']
          }
        });
        return;
      }

      if (req.user.userId !== resourceOwnerId) {
        res.status(403).json({
          error: {
            code: 'ACCESS_DENIED',
            message: 'You can only access your own resources',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']
          }
        });
        return;
      }

      next();
    };
  };

  /**
   * Rate limiting based on user role
   */
  static roleBasedRateLimit = () => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        next();
        return;
      }

      // Different rate limits based on role
      const roleLimits = {
        [UserRole.ADMIN]: 10000,
        [UserRole.ADVISOR]: 5000,
        [UserRole.FARMER]: 1000,
        [UserRole.SUPPORT]: 2000
      };

      const userLimit = roleLimits[req.user.role] || 100;
      
      // Add user-specific rate limit header
      res.setHeader('X-Rate-Limit-User', userLimit);
      
      next();
    };
  };
}