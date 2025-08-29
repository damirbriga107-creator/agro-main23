import { Request, Response, NextFunction } from 'express';
import { TokenUtils, Logger } from '@daorsagro/utils';
import { TokenPayload, UserRole } from '@daorsagro/types';

/**
 * Enhanced request interface with user information
 */
export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

/**
 * Authentication middleware for Analytics Service
 */
export class AuthMiddleware {
  private static logger = new Logger('analytics-service-auth');

  /**
   * Verify JWT token and extract user information
   */
  public static authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: {
            code: 'MISSING_TOKEN',
            message: 'Authorization token is required',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'],
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
            requestId: req.headers['x-request-id'],
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
          requestId: req.headers['x-request-id'],
          ip: req.ip,
        });

        return res.status(401).json({
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired token',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'],
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
          requestId: req.headers['x-request-id'],
        },
      });
    }
  }

  /**
   * Check if user has required role
   */
  public static requireRole(roles: UserRole | UserRole[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'],
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
          requestId: req.headers['x-request-id'],
        });

        return res.status(403).json({
          error: {
            code: 'INSUFFICIENT_ROLE',
            message: 'Access denied: insufficient permissions',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'],
          },
        });
      }

      next();
    };
  }

  /**
   * Check if user can access analytics data
   * Analytics access is allowed for ADMIN, MANAGER, and ANALYST roles
   */
  public static requireAnalyticsAccess(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const allowedRoles: UserRole[] = [UserRole.ADMIN, UserRole.MANAGER, UserRole.ANALYST];
    return AuthMiddleware.requireRole(allowedRoles)(req, res, next);
  }

  /**
   * Check if user can access financial analytics
   * Financial analytics requires higher permissions
   */
  public static requireFinancialAnalyticsAccess(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const allowedRoles: UserRole[] = [UserRole.ADMIN, UserRole.MANAGER];
    return AuthMiddleware.requireRole(allowedRoles)(req, res, next);
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