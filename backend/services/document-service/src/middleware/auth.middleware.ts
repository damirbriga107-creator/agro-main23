import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '@daorsagro/utils';
import { User } from '@daorsagro/types';

interface AuthenticatedRequest extends Request {
  user?: User;
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide a valid authentication token'
      });
      return;
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      logger.error('JWT_SECRET not configured');
      res.status(500).json({
        error: 'Authentication configuration error',
        message: 'Server authentication not properly configured'
      });
      return;
    }

    try {
      const decoded = jwt.verify(token, jwtSecret) as any;
      
      // Validate token structure
      if (!decoded.userId || !decoded.role) {
        res.status(401).json({
          error: 'Invalid token',
          message: 'Token does not contain required user information'
        });
        return;
      }

      // Attach user information to request
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        farmId: decoded.farmId
      };

      logger.debug('User authenticated', {
        userId: req.user.id,
        role: req.user.role,
        endpoint: req.path
      });

      next();
    } catch (jwtError) {
      logger.warn('Invalid JWT token', {
        error: jwtError instanceof Error ? jwtError.message : 'Unknown error',
        endpoint: req.path
      });
      
      res.status(401).json({
        error: 'Invalid token',
        message: 'Please log in again'
      });
      return;
    }
  } catch (error) {
    logger.error('Authentication middleware error', error);
    res.status(500).json({
      error: 'Authentication error',
      message: 'Internal server error during authentication'
    });
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'User not authenticated'
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Insufficient permissions', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        endpoint: req.path
      });
      
      res.status(403).json({
        error: 'Insufficient permissions',
        message: `Required roles: ${allowedRoles.join(', ')}`
      });
      return;
    }

    next();
  };
};