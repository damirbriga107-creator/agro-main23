import { Application, Request, Response } from 'express';
import { ValidationMiddleware, ValidationSchemas } from '../middleware/validation.middleware';
import { ErrorHandlerMiddleware } from '../middleware/error-handler.middleware';

/**
 * Predictive analytics routes for analytics service
 */
export function predictiveRoutes(app: Application, dependencies: any): void {
  const { analyticsService, logger } = dependencies;

  /**
   * GET /api/v1/analytics/predictive/farm/:farmId
   * Get predictive analytics for a specific farm
   */
  app.get(
    '/api/v1/analytics/predictive/farm/:farmId',
    ValidationMiddleware.validateParams(ValidationSchemas.uuidParam),
    ErrorHandlerMiddleware.asyncHandler(async (req: Request, res: Response) => {
      const { farmId } = req.params;
      const { season = '2024' } = req.query as any;
      
      logger.info('Predictive analytics requested', { 
        farmId, 
        season,
        userId: (req as any).user?.userId 
      });

      const predictions = await analyticsService.getPredictiveAnalytics(farmId, season);

      res.json({
        success: true,
        data: predictions,
        requestId: req.headers['x-request-id'],
        timestamp: new Date().toISOString()
      });
    })
  );
}