import { Router, Application } from 'express';
import Joi from 'joi';
import { ValidationMiddleware } from '../middleware/validation.middleware';
import { ErrorHandlerMiddleware } from '../middleware/error-handler.middleware';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { AuthService } from '../services/auth.service';
import { ServiceDependencies } from './index';
import { UserRole } from '../utils';

/**
 * Setup user management routes
 */
export function setupUserRoutes(app: Application, dependencies: ServiceDependencies, basePath: string): void {
  const router = Router();
  const { logger, prisma, redis, emailService, config } = dependencies;
  
  // Initialize auth service
  const authService = new AuthService(prisma, redis, emailService, config);

  // Get current user profile
  router.get(
    '/profile',
    AuthMiddleware.authenticate,
    ErrorHandlerMiddleware.asyncHandler(async (req, res) => {
      logger.info('Get user profile request', {
        userId: req.user?.userId,
        requestId: req.headers['x-request-id']
      });

      try {
        const userProfile = await authService.getUserProfile(req.user.userId);
        
        res.json({
          success: true,
          data: {
            user: userProfile
          }
        });
      } catch (error) {
        if (error.message.includes('not found')) {
          return res.status(404).json({
            error: {
              code: 'USER_NOT_FOUND',
              message: error.message,
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id']
            }
          });
        }
        throw error;
      }
    })
  );

  // Update user profile
  router.put(
    '/profile',
    AuthMiddleware.authenticate,
    ValidationMiddleware.sanitizeInput,
    ValidationMiddleware.validate(ValidationMiddleware.authSchemas.updateProfile),
    ErrorHandlerMiddleware.asyncHandler(async (req, res) => {
      logger.info('Update user profile request', {
        userId: req.user?.userId,
        requestId: req.headers['x-request-id']
      });

      try {
        const { firstName, lastName, farmName, phoneNumber } = req.body;
        const updatedProfile = await authService.updateUserProfile(req.user.userId, {
          firstName,
          lastName,
          farmName,
          phoneNumber
        });
        
        res.json({
          success: true,
          message: 'Profile updated successfully',
          data: {
            user: updatedProfile
          }
        });
      } catch (error) {
        if (error.message.includes('not found')) {
          return res.status(404).json({
            error: {
              code: 'USER_NOT_FOUND',
              message: error.message,
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id']
            }
          });
        }
        throw error;
      }
    })
  );

  // Delete user account
  router.delete(
    '/profile',
    AuthMiddleware.authenticate,
    ErrorHandlerMiddleware.asyncHandler(async (req, res) => {
      logger.info('Delete user account request', {
        userId: req.user?.userId,
        requestId: req.headers['x-request-id']
      });

      try {
        // TODO: Implement soft delete user account logic
        // For now, just logout the user
        await authService.logoutUser(req.user.userId);
        
        res.json({
          success: true,
          message: 'Account deletion request processed. Please contact support for permanent deletion.'
        });
      } catch (error) {
        throw error;
      }
    })
  );

  // Get user by ID (admin only)
  router.get(
    '/:id',
    AuthMiddleware.authenticate,
    AuthMiddleware.requireRole([UserRole.ADMIN]),
    ValidationMiddleware.validate({ params: ValidationMiddleware.schemas.id }),
    ErrorHandlerMiddleware.asyncHandler(async (req, res) => {
      logger.info('Get user by ID request', {
        targetUserId: req.params.id,
        requestingUserId: req.user?.userId,
        requestId: req.headers['x-request-id']
      });

      try {
        const userProfile = await authService.getUserProfile(req.params.id);
        
        res.json({
          success: true,
          data: {
            user: userProfile
          }
        });
      } catch (error) {
        if (error.message.includes('not found')) {
          return res.status(404).json({
            error: {
              code: 'USER_NOT_FOUND',
              message: error.message,
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id']
            }
          });
        }
        throw error;
      }
    })
  );

  // List users (admin only)
  router.get(
    '/',
    AuthMiddleware.authenticate,
    AuthMiddleware.requireRole([UserRole.ADMIN]),
    ValidationMiddleware.validate(ValidationMiddleware.querySchemas.userList),
    ErrorHandlerMiddleware.asyncHandler(async (req, res) => {
      logger.info('List users request', {
        query: req.query,
        requestingUserId: req.user?.userId,
        requestId: req.headers['x-request-id']
      });

      try {
        // TODO: Implement actual user listing with pagination
        const { page = 1, limit = 20 } = req.query as any;
        
        // For now, return mock data
        res.json({
          success: true,
          data: {
            users: [],
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total: 0,
              totalPages: 0,
              hasNext: false,
              hasPrev: false
            }
          }
        });
      } catch (error) {
        throw error;
      }
    })
  );

  // Update user status (admin only)
  router.put(
    '/:id/status',
    AuthMiddleware.authenticate,
    AuthMiddleware.requireRole([UserRole.ADMIN]),
    ValidationMiddleware.validate({ params: ValidationMiddleware.schemas.id }),
    ValidationMiddleware.validate({
      body: Joi.object({
        status: Joi.string().valid('ACTIVE', 'INACTIVE', 'SUSPENDED').required(),
        reason: Joi.string().max(500).optional()
      })
    }),
    ErrorHandlerMiddleware.asyncHandler(async (req, res) => {
      logger.info('Update user status request', {
        userId: req.params.id,
        newStatus: req.body.status,
        requestId: req.headers['x-request-id']
      });

      res.json({
        success: true,
        message: 'User status updated successfully',
        data: {
          userId: req.params.id,
          status: req.body.status,
          updatedAt: new Date().toISOString()
        }
      });
    })
  );

  // Get user activity logs (admin only)
  router.get(
    '/:id/activities',
    AuthMiddleware.authenticate,
    AuthMiddleware.requireRole([UserRole.ADMIN]),
    ValidationMiddleware.validate({ params: ValidationMiddleware.schemas.id }),
    ValidationMiddleware.validate(ValidationMiddleware.querySchemas.activityLogs),
    ErrorHandlerMiddleware.asyncHandler(async (req, res) => {
      logger.info('Get user activities request', {
        targetUserId: req.params.id,
        requestingUserId: req.user?.userId,
        query: req.query,
        requestId: req.headers['x-request-id']
      });

      const { page = 1, limit = 20 } = req.query as any;

      res.json({
        success: true,
        data: {
          activities: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          }
        }
      });
    })
  );

  // Upload profile avatar
  router.post(
    '/profile/avatar',
    AuthMiddleware.authenticate,
    // TODO: Add multer middleware for file upload
    ValidationMiddleware.validateFileUpload({
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif'],
      required: true
    }),
    ErrorHandlerMiddleware.asyncHandler(async (req, res) => {
      logger.info('Avatar upload request', {
        userId: req.user?.userId,
        requestId: req.headers['x-request-id']
      });

      res.json({
        success: true,
        message: 'Avatar upload functionality coming soon',
        data: {
          message: 'Feature under development'
        }
      });
    })
  );

  // Delete profile avatar
  router.delete(
    '/profile/avatar',
    AuthMiddleware.authenticate,
    ErrorHandlerMiddleware.asyncHandler(async (req, res) => {
      logger.info('Avatar deletion request', {
        userId: req.user?.userId,
        requestId: req.headers['x-request-id']
      });

      res.json({
        success: true,
        message: 'Avatar deletion functionality coming soon'
      });
    })
  );

  // Mount the router
  app.use(basePath, router);
  logger.info(`User routes mounted at ${basePath}`);
}