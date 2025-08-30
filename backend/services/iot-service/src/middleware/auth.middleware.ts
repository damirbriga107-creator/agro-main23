import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Logger } from '@daorsagro/utils';
import { EnvironmentUtils } from '@daorsagro/config';

const logger = new Logger('auth-middleware');

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    farmId?: string;
  };
}

export class AuthMiddleware {
  /**
   * JWT authentication middleware
   */
  static authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          error: {
            code: 'MISSING_TOKEN',
            message: 'Authorization token is required'
          },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        });
        return;
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      const jwtSecret = EnvironmentUtils.get('JWT_SECRET', 'your-default-jwt-secret');
      
      const decoded = jwt.verify(token, jwtSecret) as any;
      
      // Attach user info to request
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        farmId: decoded.farmId
      };

      logger.debug('User authenticated successfully', {
        userId: req.user.userId,
        requestId: req.headers['x-request-id']
      });

      next();
    } catch (error) {
      logger.warn('Authentication failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId: req.headers['x-request-id']
      });

      if (error instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          success: false,
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Authentication token has expired'
          },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        });
        return;
      }

      if (error instanceof jwt.JsonWebTokenError) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid authentication token'
          },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Authentication failed'
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      });
    }
  };

  /**
   * Role-based authorization middleware
   */
  static authorize = (allowedRoles: string[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication is required'
          },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        });
        return;
      }

      if (!allowedRoles.includes(req.user.role)) {
        logger.warn('Access denied - insufficient permissions', {
          userId: req.user.userId,
          userRole: req.user.role,
          requiredRoles: allowedRoles,
          requestId: req.headers['x-request-id']
        });

        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Insufficient permissions to access this resource',
            requiredRoles: allowedRoles,
            userRole: req.user.role
          },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        });
        return;
      }

      next();
    };
  };

  /**
   * Device ownership validation
   */
  static validateDeviceOwnership = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { deviceId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication is required'
          },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        });
        return;
      }

      // For admin users, skip ownership check
      if (req.user?.role === 'admin') {
        next();
        return;
      }

      // TODO: Implement actual device ownership validation
      // This would query the database to check if the user owns the device
      // For now, we'll allow all authenticated users
      
      next();
    } catch (error) {
      logger.error('Device ownership validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        deviceId: req.params.deviceId,
        userId: req.user?.userId,
        requestId: req.headers['x-request-id']
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'OWNERSHIP_VALIDATION_ERROR',
          message: 'Failed to validate device ownership'
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      });
    }
  };
}

export default AuthMiddleware;