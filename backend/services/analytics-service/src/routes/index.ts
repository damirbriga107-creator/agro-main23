import { Application } from 'express';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { dashboardRoutes } from './dashboard.routes';
import { reportsRoutes } from './reports.routes';
import { trendsRoutes } from './trends.routes';
import { predictiveRoutes } from './predictive.routes';

/**
 * Setup all routes for Analytics Service
 */
export function setupRoutes(app: Application, dependencies: any): void {
  const { analyticsService, metricsService, logger, config } = dependencies;

  // Apply authentication middleware to all analytics routes
  app.use('/api/v1/analytics', AuthMiddleware.authenticate);
  app.use('/api/v1/analytics', AuthMiddleware.requireAnalyticsAccess);

  // Setup route groups
  dashboardRoutes(app, { analyticsService, metricsService, logger });
  reportsRoutes(app, { analyticsService, logger });
  trendsRoutes(app, { analyticsService, logger });
  predictiveRoutes(app, { analyticsService, logger });
}