import { Request, Response, NextFunction } from 'express';
import { TokenUtils, TokenPayload, UserRole } from '../utils';
import { Logger } from '../utils/logger';

/**
 * Enhanced request interface with user information
 */
export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

/**
 * Authentication middleware for Auth Service
 * This service primarily handles auth operations, but some endpoints require authentication
 */
export class AuthMiddleware {
  private static logger = new Logger('auth-service-middleware');

  /**
   * Verify JWT token and extract user information
   */
  public static authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void | Response {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: {
            code: 'MISSING_TOKEN',
            message: 'Authorization token is required',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] as string,
          },
        });
      }

      const token = authHeader.substring(7);
      const jwtSecret = process.env.JWT_SECRET;

      if (!jwtSecret) {
        AuthMiddleware.logger.error('JWT_SECRET not configured');
        return res.status(500).json({
          error: {
            code: 'SERVER_CONFIGURATION_ERROR',
            message: 'Authentication configuration error',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] as string,
          },
        });
      }

      try {
        const decoded = TokenUtils.verifyToken(token, jwtSecret);
        req.user = decoded;
        next();
      } catch (tokenError) {
        AuthMiddleware.logger.warn('Token verification failed', {
          error: tokenError.message,
          requestId: req.headers['x-request-id'] as string,
          ip: req.ip,
        });

        return res.status(401).json({
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired token',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] as string,
          },
        });
      }
    } catch (error) {
      AuthMiddleware.logger.error('Authentication middleware error', error);
      return res.status(500).json({
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Authentication processing error',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string,
        },
      });
    }
  }

  /**
   * Check if user has required role
   */
  public static requireRole(roles: UserRole | UserRole[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void | Response => {
      if (!req.user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] as string,
          },
        });
      }

      const requiredRoles = Array.isArray(roles) ? roles : [roles];
      const userRole = req.user.role;

      if (!requiredRoles.includes(userRole)) {
        AuthMiddleware.logger.warn('Access denied - insufficient role', {
          userId: req.user.userId,
          userRole: userRole,
          requiredRoles: requiredRoles,
          requestId: req.headers['x-request-id'] as string,
        });

        return res.status(403).json({
          error: {
            code: 'INSUFFICIENT_ROLE',
            message: 'Access denied: insufficient permissions',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] as string,
          },
        });
      }

      next();
    };
  }

  /**
   * Require admin role for sensitive operations
   */
  public static requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    AuthMiddleware.requireRole(UserRole.ADMIN)(req, res, next);
  }

  /**
   * Require admin or manager role for user management operations
   */
  public static requireUserManagement(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const allowedRoles: UserRole[] = [UserRole.ADMIN, UserRole.MANAGER];
    AuthMiddleware.requireRole(allowedRoles)(req, res, next);
  }

  /**
   * Check if user can access their own profile or if they're an admin/manager
   */
  public static requireSelfOrElevated(req: AuthenticatedRequest, res: Response, next: NextFunction): void | Response {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
        },
      });
    }

    const { role, userId } = req.user;
    const targetUserId = req.params.userId || req.params.id;

    // ADMIN and MANAGER can access any user's data
    if (role === UserRole.ADMIN || role === UserRole.MANAGER) {
      return next();
    }

    // Users can only access their own data
    if (userId === targetUserId) {
      return next();
    }

    res.status(403).json({
      error: {
        code: 'ACCESS_DENIED',
        message: 'Access denied: can only access own profile',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'],
      },
    });
  }

  /**
   * Optional authentication - doesn't fail if no token provided
   */
  public static optionalAuthenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      return next();
    }

    try {
      const decoded = TokenUtils.verifyToken(token, jwtSecret);
      req.user = decoded;
    } catch (error) {
      // Ignore token errors for optional authentication
      AuthMiddleware.logger.debug('Optional authentication failed', error);
    }

    next();
  }
}