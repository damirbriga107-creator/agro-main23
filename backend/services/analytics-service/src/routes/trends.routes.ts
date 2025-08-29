import { Application, Request, Response } from 'express';
import { ValidationMiddleware, ValidationSchemas } from '../middleware/validation.middleware';
import { ErrorHandlerMiddleware } from '../middleware/error-handler.middleware';

/**
 * Trends routes for analytics service
 */
export function trendsRoutes(app: Application, dependencies: any): void {
  const { analyticsService, logger } = dependencies;

  /**
   * GET /api/v1/analytics/trends/:metric
   * Get trend analysis for a specific metric
   */
  app.get(
    '/api/v1/analytics/trends/:metric',
    ValidationMiddleware.validateParams(ValidationSchemas.uuidParam),
    ValidationMiddleware.validateQuery(ValidationSchemas.dateRange),
    ErrorHandlerMiddleware.asyncHandler(async (req: Request, res: Response) => {
      const { metric } = req.params;
      const { startDate, endDate, groupBy = 'day' } = req.query as any;
      
      logger.info('Trend analysis requested', { 
        metric, 
        startDate, 
        endDate,
        userId: (req as any).user?.userId 
      });

      const trends = await analyticsService.getTrendAnalysis(
        metric,
        new Date(startDate),
        new Date(endDate),
        groupBy
      );

      res.json({
        success: true,
        data: trends,
        requestId: req.headers['x-request-id'],
        timestamp: new Date().toISOString()
      });
    })
  );
}