import { Request, Response, NextFunction } from 'express';
import { TokenUtils } from '@daorsagro/utils';
import { TokenPayload, UserRole } from '@daorsagro/types';
import { EnvironmentUtils } from '@daorsagro/config';
import { Logger } from '../utils/logger';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Authentication middleware for microservices
 */
export class AuthMiddleware {
  private static logger = new Logger('auth-middleware');

  /**
   * Authenticate JWT token
   */
  static authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        AuthMiddleware.logger.warn('Authentication failed: Missing authorization header', {
          requestId: req.headers['x-request-id'],
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });

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
        AuthMiddleware.logger.warn('Authentication failed: Invalid token format', {
          requestId: req.headers['x-request-id'],
          ip: req.ip
        });

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
        AuthMiddleware.logger.warn('Authentication failed: Token expired', {
          requestId: req.headers['x-request-id'],
          userId: payload.userId,
          ip: req.ip
        });

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

      AuthMiddleware.logger.debug('Authentication successful', {
        requestId: req.headers['x-request-id'],
        userId: payload.userId,
        role: payload.role
      });

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

      AuthMiddleware.logger.warn('Authentication failed', error, {
        requestId: req.headers['x-request-id'],
        ip: req.ip,
        errorCode
      });

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
        AuthMiddleware.logger.warn('Authorization failed: User not authenticated', {
          requestId: req.headers['x-request-id'],
          ip: req.ip
        });

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
        AuthMiddleware.logger.warn('Authorization failed: Insufficient permissions', {
          requestId: req.headers['x-request-id'],
          userId: req.user.userId,
          userRole: req.user.role,
          requiredRoles,
          ip: req.ip
        });

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

      AuthMiddleware.logger.debug('Authorization successful', {
        requestId: req.headers['x-request-id'],
        userId: req.user.userId,
        role: req.user.role
      });

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
        AuthMiddleware.logger.warn('Ownership check failed: Resource owner ID not found', {
          requestId: req.headers['x-request-id'],
          userId: req.user.userId,
          resourceUserIdField
        });

        res.status(400).json({
          error: {
            code: 'MISSING_RESOURCE_OWNER',
            message: `Resource owner ID (${resourceUserIdField}) is required`,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']
          }
        });
        return;
      }

      if (req.user.userId !== resourceOwnerId) {
        AuthMiddleware.logger.warn('Ownership check failed: User does not own resource', {
          requestId: req.headers['x-request-id'],
          userId: req.user.userId,
          resourceOwnerId,
          ip: req.ip
        });

        res.status(403).json({
          error: {
            code: 'RESOURCE_ACCESS_DENIED',
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
   * Require specific user ID
   */
  static requireUserId = (userIdParam: string = 'userId') => {
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

      const requestedUserId = req.params[userIdParam];
      
      if (!requestedUserId) {
        res.status(400).json({
          error: {
            code: 'MISSING_USER_ID',
            message: `User ID parameter (${userIdParam}) is required`,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']
          }
        });
        return;
      }

      // Admin can access any user
      if (req.user.role === UserRole.ADMIN) {
        next();
        return;
      }

      // Users can only access their own data
      if (req.user.userId !== requestedUserId) {
        AuthMiddleware.logger.warn('User ID access denied', {
          requestId: req.headers['x-request-id'],
          userId: req.user.userId,
          requestedUserId,
          ip: req.ip
        });

        res.status(403).json({
          error: {
            code: 'USER_ACCESS_DENIED',
            message: 'You can only access your own user data',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']
          }
        });
        return;
      }

      next();
    };
  };
}