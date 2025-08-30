import { Router, Express } from 'express';
import { ValidationMiddleware } from '../middleware/validation.middleware';
import { ErrorHandlerMiddleware } from '../middleware/error-handler.middleware';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { AuthService } from '../services/auth.service';
import { ServiceDependencies } from './index';

/**
 * Setup authentication routes
 */
export function setupAuthRoutes(app: Express, dependencies: ServiceDependencies, basePath: string): void {
  const router = Router();
  const { logger, prisma, redis, emailService, config } = dependencies;
  
  // Initialize auth service
  const authService = new AuthService(prisma, redis, emailService, config);

  // Register user
  router.post(
    '/register',
    ValidationMiddleware.sanitizeInput,
    ValidationMiddleware.validate(ValidationMiddleware.authSchemas.register),
    ErrorHandlerMiddleware.asyncHandler(async (req, res) => {
      logger.info('User registration attempt', {
        email: req.body.email,
        requestId: req.headers['x-request-id']
      });

      try {
        const result = await authService.registerUser({
          email: req.body.email,
          password: req.body.password,
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          role: req.body.role,
          farmName: req.body.farmName,
          phoneNumber: req.body.phoneNumber
        });

        res.status(201).json({
          success: true,
          message: 'User registered successfully. Please check your email for verification.',
          data: {
            userId: result.user.id,
            email: result.user.email,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            emailVerificationRequired: result.emailVerificationRequired
          }
        });
      } catch (error) {
        if (error.message.includes('already exists')) {
          return res.status(409).json({
            error: {
              code: 'USER_ALREADY_EXISTS',
              message: error.message,
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id']
            }
          });
        }
        
        if (error.message.includes('Password validation') || error.message.includes('Invalid email')) {
          return res.status(400).json({
            error: {
              code: 'VALIDATION_ERROR',
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

  // Login user
  router.post(
    '/login',
    ValidationMiddleware.sanitizeInput,
    ValidationMiddleware.validate(ValidationMiddleware.authSchemas.login),
    ErrorHandlerMiddleware.asyncHandler(async (req, res) => {
      logger.info('User login attempt', {
        email: req.body.email,
        requestId: req.headers['x-request-id']
      });

      try {
        const result = await authService.loginUser({
          email: req.body.email,
          password: req.body.password
        });

        res.json({
          success: true,
          message: 'Login successful',
          data: {
            user: {
              id: result.user.id,
              email: result.user.email,
              firstName: result.user.firstName,
              lastName: result.user.lastName,
              role: result.user.role,
              isEmailVerified: result.user.isEmailVerified,
              farmName: result.user.farmName
            },
            tokens: {
              accessToken: result.tokens.accessToken,
              refreshToken: result.tokens.refreshToken,
              expiresIn: result.tokens.expiresIn
            }
          }
        });
      } catch (error) {
        if (error.message.includes('Invalid email or password') || error.message.includes('not active')) {
          return res.status(401).json({
            error: {
              code: 'AUTHENTICATION_FAILED',
              message: 'Invalid email or password',
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id']
            }
          });
        }
        
        throw error;
      }
    })
  );

  // Logout user
  router.post(
    '/logout',
    AuthMiddleware.authenticate,
    ErrorHandlerMiddleware.asyncHandler(async (req, res) => {
      logger.info('User logout', {
        userId: req.user?.userId,
        requestId: req.headers['x-request-id']
      });

      try {
        await authService.logoutUser(req.user.userId);
        
        res.json({
          success: true,
          message: 'Logout successful'
        });
      } catch (error) {
        throw error;
      }
    })
  );

  // Refresh access token
  router.post(
    '/refresh',
    ErrorHandlerMiddleware.asyncHandler(async (req, res) => {
      logger.info('Token refresh attempt', {
        requestId: req.headers['x-request-id']
      });

      try {
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
          return res.status(400).json({
            error: {
              code: 'MISSING_REFRESH_TOKEN',
              message: 'Refresh token is required',
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id']
            }
          });
        }

        const result = await authService.refreshToken(refreshToken);

        res.json({
          success: true,
          message: 'Token refreshed successfully',
          data: {
            accessToken: result.accessToken,
            expiresIn: result.expiresIn
          }
        });
      } catch (error) {
        return res.status(401).json({
          error: {
            code: 'INVALID_REFRESH_TOKEN',
            message: 'Invalid or expired refresh token',
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']
          }
        });
      }
    })
  );

  // Forgot password
  router.post(
    '/forgot-password',
    ValidationMiddleware.sanitizeInput,
    ValidationMiddleware.validate(ValidationMiddleware.authSchemas.forgotPassword),
    ErrorHandlerMiddleware.asyncHandler(async (req, res) => {
      logger.info('Password reset requested', {
        email: req.body.email,
        requestId: req.headers['x-request-id']
      });

      try {
        await authService.requestPasswordReset(req.body.email);
        
        res.json({
          success: true,
          message: 'If an account with this email exists, you will receive password reset instructions.'
        });
      } catch (error) {
        throw error;
      }
    })
  );

  // Reset password
  router.post(
    '/reset-password',
    ValidationMiddleware.sanitizeInput,
    ValidationMiddleware.validate(ValidationMiddleware.authSchemas.resetPassword),
    ErrorHandlerMiddleware.asyncHandler(async (req, res) => {
      logger.info('Password reset attempt', {
        requestId: req.headers['x-request-id']
      });

      try {
        const { token, password } = req.body;
        await authService.resetPassword(token, password);
        
        res.json({
          success: true,
          message: 'Password reset successfully'
        });
      } catch (error) {
        if (error.message.includes('Invalid or expired')) {
          return res.status(400).json({
            error: {
              code: 'INVALID_RESET_TOKEN',
              message: error.message,
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id']
            }
          });
        }
        
        if (error.message.includes('Password validation')) {
          return res.status(400).json({
            error: {
              code: 'VALIDATION_ERROR',
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

  // Verify email
  router.post(
    '/verify-email',
    ValidationMiddleware.sanitizeInput,
    ValidationMiddleware.validate(ValidationMiddleware.authSchemas.verifyEmail),
    ErrorHandlerMiddleware.asyncHandler(async (req, res) => {
      logger.info('Email verification attempt', {
        requestId: req.headers['x-request-id']
      });

      try {
        const { token } = req.body;
        await authService.verifyEmail(token);
        
        res.json({
          success: true,
          message: 'Email verified successfully'
        });
      } catch (error) {
        return res.status(400).json({
          error: {
            code: 'INVALID_VERIFICATION_TOKEN',
            message: error.message,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']
          }
        });
      }
    })
  );

  // Resend verification email
  router.post(
    '/resend-verification',
    ValidationMiddleware.sanitizeInput,
    ValidationMiddleware.validate(ValidationMiddleware.authSchemas.forgotPassword), // Reuse email schema
    ErrorHandlerMiddleware.asyncHandler(async (req, res) => {
      logger.info('Verification email resend requested', {
        email: req.body.email,
        requestId: req.headers['x-request-id']
      });

      // TODO: Implement resend verification logic
      res.json({
        success: true,
        message: 'If your email is not verified, you will receive a new verification email.'
      });
    })
  );

  // Change password (authenticated users)
  router.post(
    '/change-password',
    AuthMiddleware.authenticate,
    ValidationMiddleware.sanitizeInput,
    ValidationMiddleware.validate(ValidationMiddleware.authSchemas.changePassword),
    ErrorHandlerMiddleware.asyncHandler(async (req, res) => {
      logger.info('Password change attempt', {
        userId: req.user?.userId,
        requestId: req.headers['x-request-id']
      });

      try {
        const { currentPassword, newPassword } = req.body;
        await authService.changePassword(req.user.userId, currentPassword, newPassword);
        
        res.json({
          success: true,
          message: 'Password changed successfully'
        });
      } catch (error) {
        if (error.message.includes('Current password is incorrect')) {
          return res.status(400).json({
            error: {
              code: 'INVALID_CURRENT_PASSWORD',
              message: error.message,
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id']
            }
          });
        }
        
        if (error.message.includes('Password validation')) {
          return res.status(400).json({
            error: {
              code: 'VALIDATION_ERROR',
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

  // Mount the router
  app.use(basePath, router);
}
    // TODO: Add authentication middleware
    ErrorHandlerMiddleware.asyncHandler(async (req, res) => {
      // TODO: Implement 2FA enable logic
      logger.info('2FA enable attempt', {
        requestId: req.headers['x-request-id']
      });

      res.json({
        success: true,
        message: '2FA enabled successfully',
        data: {
          qrCode: 'data:image/png;base64,...', // TODO: Generate actual QR code
          backupCodes: ['123456', '789012'] // TODO: Generate actual backup codes
        }
      });
    })
  );

  // Disable 2FA
  router.post(
    '/2fa/disable',
    // TODO: Add authentication middleware
    ValidationMiddleware.sanitizeInput,
    ValidationMiddleware.validate(ValidationMiddleware.authSchemas.verify2FA),
    ErrorHandlerMiddleware.asyncHandler(async (req, res) => {
      // TODO: Implement 2FA disable logic
      logger.info('2FA disable attempt', {
        requestId: req.headers['x-request-id']
      });

      res.json({
        success: true,
        message: '2FA disabled successfully'
      });
    })
  );

  // Verify 2FA code
  router.post(
    '/2fa/verify',
    ValidationMiddleware.sanitizeInput,
    ValidationMiddleware.validate(ValidationMiddleware.authSchemas.verify2FA),
    ErrorHandlerMiddleware.asyncHandler(async (req, res) => {
      // TODO: Implement 2FA verification logic
      logger.info('2FA verification attempt', {
        requestId: req.headers['x-request-id']
      });

      res.json({
        success: true,
        message: '2FA code verified successfully',
        data: {
          accessToken: 'temp-access-token', // TODO: Generate actual JWT
          expiresIn: 900
        }
      });
    })
  );

  // Mount the router
  app.use(basePath, router);
  logger.info(`Authentication routes mounted at ${basePath}`);
}