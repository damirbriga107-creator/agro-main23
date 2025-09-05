import { Express } from 'express';
import { Logger } from '../utils/logger';
import { PrismaService } from '../services/prisma.service';
import { RedisService } from '../services/redis.service';
import { EmailService } from '../services/email.service';

// Import route modules
import { setupAuthRoutes } from './auth.routes';
import { setupUserRoutes } from './user.routes';
import { setupFarmRoutes } from './farm.routes';
import { setupCropRoutes } from './crop.routes';

export interface ServiceDependencies {
  prisma: PrismaService;
  redis: RedisService;
  emailService: EmailService;
  logger: Logger;
  config: any;
}

/**
 * Setup all routes for the authentication service
 */
export function setupRoutes(app: Application, dependencies: ServiceDependencies): void {
  const { logger } = dependencies;

  try {
    // Health check route (already defined in main app)
    logger.info('Setting up routes...');

    // API versioning
    const API_VERSION = '/api/v1';

    // Setup authentication routes
    setupAuthRoutes(app, dependencies, `${API_VERSION}/auth`);
    
    // Setup user management routes
    setupUserRoutes(app, dependencies, `${API_VERSION}/users`);

    // API documentation route
    app.get(`${API_VERSION}/docs`, (req, res) => {
      res.json({
        service: 'auth-service',
        version: dependencies.config.version,
        documentation: {
          authentication: {
            'POST /auth/register': 'Register a new user',
            'POST /auth/login': 'Login user',
            'POST /auth/logout': 'Logout user',
            'POST /auth/refresh': 'Refresh access token',
            'POST /auth/forgot-password': 'Request password reset',
            'POST /auth/reset-password': 'Reset password',
            'POST /auth/verify-email': 'Verify email address',
            'POST /auth/resend-verification': 'Resend verification email',
            'POST /auth/change-password': 'Change password (authenticated)',
            'POST /auth/2fa/enable': 'Enable two-factor authentication',
            'POST /auth/2fa/disable': 'Disable two-factor authentication',
            'POST /auth/2fa/verify': 'Verify 2FA code'
          },
          users: {
            'GET /users/profile': 'Get current user profile',
            'PUT /users/profile': 'Update user profile',
            'DELETE /users/profile': 'Delete user account',
            'GET /users/:id': 'Get user by ID (admin)',
            'GET /users': 'List users (admin)',
            'PUT /users/:id/status': 'Update user status (admin)',
            'GET /users/:id/activities': 'Get user activity logs (admin)'
          }
        },
        authentication: {
          bearer_token: 'Include "Authorization: Bearer <token>" header',
          token_expiry: '15 minutes for access tokens, 7 days for refresh tokens'
        },
        responses: {
          success: {
            format: '{ "success": true, "data": {...} }',
            status_codes: [200, 201]
          },
          error: {
            format: '{ "error": { "code": "ERROR_CODE", "message": "Error message", "timestamp": "ISO date", "requestId": "uuid" } }',
            status_codes: [400, 401, 403, 404, 409, 422, 429, 500]
          }
        },
        rate_limits: {
          general: '100 requests per 15 minutes',
          authentication: '5 requests per 15 minutes for login/register'
        }
      });
    });

    // Service information route
    app.get(`${API_VERSION}`, (req, res) => {
      res.json({
        service: 'auth-service',
        version: dependencies.config.version,
        environment: dependencies.config.environment,
        timestamp: new Date().toISOString(),
        endpoints: {
          docs: `${API_VERSION}/docs`,
          health: '/health',
          auth: `${API_VERSION}/auth`,
          users: `${API_VERSION}/users`
        }
      });
    });

    logger.info('Routes setup completed successfully');
  } catch (error) {
    logger.error('Failed to setup routes', error);
    throw error;
  }
}