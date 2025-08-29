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
 * Authentication middleware for Financial Service
 */
export class AuthMiddleware {
  private static logger = new Logger('financial-service-auth');

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
   * Check if user can access financial data
   * Financial access requires ADMIN, MANAGER, or FARMER roles
   */
  public static requireFinancialAccess(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const allowedRoles: UserRole[] = [UserRole.ADMIN, UserRole.MANAGER, UserRole.FARMER];
    return AuthMiddleware.requireRole(allowedRoles)(req, res, next);
  }

  /**
   * Check if user can manage financial data (create, update, delete)
   * Financial management requires ADMIN, MANAGER roles or ownership
   */
  public static requireFinancialManagement(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
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
    
    // ADMIN and MANAGER can manage all financial data
    if (role === UserRole.ADMIN || role === UserRole.MANAGER) {
      return next();
    }

    // FARMER can only manage their own financial data
    if (role === UserRole.FARMER) {
      // For resource-specific endpoints, check ownership in the route handler
      // This middleware just ensures the user is a farmer
      return next();
    }

    return res.status(403).json({
      error: {
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Access denied: insufficient permissions for financial management',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'],
      },
    });
  }

  /**
   * Legacy middleware function for backward compatibility
   */
  public static authMiddleware = AuthMiddleware.authenticate;
}

// Export for backward compatibility
export const authMiddleware = AuthMiddleware.authenticate;