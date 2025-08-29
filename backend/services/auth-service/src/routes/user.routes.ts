import { Router, Request, Response, NextFunction } from 'express';
import { PrismaService } from '../services/prisma.service';
import { ValidationMiddleware, ValidationSchemas } from '../middleware/validation.middleware';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { PasswordUtils, ErrorUtils } from '@daorsagro/utils';

interface AuthenticatedRequest extends Request {
  user?: any;
}

export function createUserRoutes(prisma: PrismaService): Router {
  const router = Router();

  /**
   * GET /users/me
   * Get current user profile
   */
  router.get(
    '/me',
    AuthMiddleware.authenticate,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const user = await prisma.client.user.findUnique({
          where: { id: req.user!.userId },
          include: {
            profile: {
              include: {
                preferences: {
                  include: {
                    notifications: true
                  }
                }
              }
            },
            sessions: {
              where: { isActive: true },
              select: {
                id: true,
                deviceInfo: true,
                ipAddress: true,
                createdAt: true,
                expiresAt: true
              }
            },
            twoFactorAuth: {
              select: {
                isEnabled: true
              }
            }
          }
        });

        if (!user) {
          throw ErrorUtils.createError('USER_NOT_FOUND', 'User not found');
        }

        // Remove sensitive data
        const { passwordHash, ...userWithoutPassword } = user;

        res.json({
          data: { user: userWithoutPassword },
          meta: {
            requestId: req.headers['x-request-id'],
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * PUT /users/me
   * Update current user profile
   */
  router.put(
    '/me',
    AuthMiddleware.authenticate,
    ValidationMiddleware.validateBody(ValidationSchemas.updateProfile),
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const { firstName, lastName, phone, bio, location } = req.body;
        
        const user = await prisma.client.user.update({
          where: { id: req.user!.userId },
          data: {
            ...(firstName && { firstName }),
            ...(lastName && { lastName }),
            ...(phone !== undefined && { phone }),
            profile: {
              update: {
                ...(bio !== undefined && { bio }),
                ...(location !== undefined && { location })
              }
            }
          },
          include: {
            profile: {
              include: {
                preferences: {
                  include: {
                    notifications: true
                  }
                }
              }
            }
          }
        });

        // Remove sensitive data
        const { passwordHash, ...userWithoutPassword } = user;

        res.json({
          data: { user: userWithoutPassword },
          meta: {
            requestId: req.headers['x-request-id'],
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * PUT /users/me/preferences
   * Update user preferences
   */
  router.put(
    '/me/preferences',
    AuthMiddleware.authenticate,
    ValidationMiddleware.validateBody(ValidationSchemas.updatePreferences),
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const { currency, language, timezone, notifications } = req.body;
        
        const user = await prisma.client.user.findUnique({
          where: { id: req.user!.userId },
          include: { profile: true }
        });

        if (!user || !user.profile) {
          throw ErrorUtils.createError('USER_NOT_FOUND', 'User profile not found');
        }

        const updatedPreferences = await prisma.client.userPreferences.update({
          where: { userProfileId: user.profile.id },
          data: {
            ...(currency && { currency }),
            ...(language && { language }),
            ...(timezone && { timezone }),
            ...(notifications && {
              notifications: {
                update: notifications
              }
            })
          },
          include: {
            notifications: true
          }
        });

        res.json({
          data: { preferences: updatedPreferences },
          meta: {
            requestId: req.headers['x-request-id'],
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * PUT /users/me/password
   * Change password
   */
  router.put(
    '/me/password',
    AuthMiddleware.authenticate,
    ValidationMiddleware.validateBody(ValidationSchemas.changePassword),
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const { currentPassword, newPassword } = req.body;
        
        const user = await prisma.client.user.findUnique({
          where: { id: req.user!.userId }
        });

        if (!user) {
          throw ErrorUtils.createError('USER_NOT_FOUND', 'User not found');
        }

        // Verify current password
        const isCurrentPasswordValid = await PasswordUtils.compare(currentPassword, user.passwordHash);
        if (!isCurrentPasswordValid) {
          throw ErrorUtils.createError('INVALID_CREDENTIALS', 'Current password is incorrect');
        }

        // Hash new password
        const newPasswordHash = await PasswordUtils.hash(newPassword);

        // Update password and invalidate all sessions except current
        await prisma.client.$transaction([
          prisma.client.user.update({
            where: { id: user.id },
            data: { passwordHash: newPasswordHash }
          }),
          prisma.client.userSession.updateMany({
            where: { 
              userId: user.id,
              refreshToken: { not: req.body.currentRefreshToken } // Keep current session
            },
            data: { isActive: false }
          })
        ]);

        res.json({
          data: { message: 'Password changed successfully' },
          meta: {
            requestId: req.headers['x-request-id'],
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /users/me/sessions
   * Get user sessions
   */
  router.get(
    '/me/sessions',
    AuthMiddleware.authenticate,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const sessions = await prisma.client.userSession.findMany({
          where: { 
            userId: req.user!.userId,
            isActive: true
          },
          select: {
            id: true,
            deviceInfo: true,
            ipAddress: true,
            userAgent: true,
            createdAt: true,
            expiresAt: true
          },
          orderBy: { createdAt: 'desc' }
        });

        res.json({
          data: { sessions },
          meta: {
            requestId: req.headers['x-request-id'],
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * DELETE /users/me/sessions/:sessionId
   * Revoke specific session
   */
  router.delete(
    '/me/sessions/:sessionId',
    AuthMiddleware.authenticate,
    ValidationMiddleware.validateParams(ValidationSchemas.sessionIdParam),
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        await prisma.client.userSession.updateMany({
          where: { 
            id: req.params.sessionId,
            userId: req.user!.userId
          },
          data: { isActive: false }
        });

        res.json({
          data: { message: 'Session revoked successfully' },
          meta: {
            requestId: req.headers['x-request-id'],
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * DELETE /users/me/sessions
   * Revoke all sessions except current
   */
  router.delete(
    '/me/sessions',
    AuthMiddleware.authenticate,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const currentRefreshToken = req.body.currentRefreshToken;
        
        await prisma.client.userSession.updateMany({
          where: { 
            userId: req.user!.userId,
            ...(currentRefreshToken && { refreshToken: { not: currentRefreshToken } })
          },
          data: { isActive: false }
        });

        res.json({
          data: { message: 'All sessions revoked successfully' },
          meta: {
            requestId: req.headers['x-request-id'],
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}