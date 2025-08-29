import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createError } from './error-handler.middleware';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    farmIds?: string[];
  };
}

export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw createError('Access token is required', 401);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw createError('Invalid token format', 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      farmIds: decoded.farmIds || [],
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(createError('Invalid or expired token', 401));
    } else {
      next(error);
    }
  }
};