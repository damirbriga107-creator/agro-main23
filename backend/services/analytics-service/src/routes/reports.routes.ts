import { Application, Request, Response } from 'express';
import { ValidationMiddleware, ValidationSchemas } from '../middleware/validation.middleware';
import { ErrorHandlerMiddleware } from '../middleware/error-handler.middleware';

/**
 * Reports routes for analytics service
 */
export function reportsRoutes(app: Application, dependencies: any): void {
  const { analyticsService, logger } = dependencies;

  /**
   * POST /api/v1/analytics/reports/generate
   * Generate analytics report
   */
  app.post(
    '/api/v1/analytics/reports/generate',
    ValidationMiddleware.validateBody(ValidationSchemas.analyticsReportRequest),
    ErrorHandlerMiddleware.asyncHandler(async (req: Request, res: Response) => {
      const { reportType, startDate, endDate, filters } = req.body;
      
      logger.info('Report generation requested', { 
        reportType, 
        startDate, 
        endDate,
        userId: (req as any).user?.userId 
      });

      const report = await analyticsService.generateReport(
        reportType,
        new Date(startDate),
        new Date(endDate),
        filters
      );

      res.json({
        success: true,
        data: report,
        requestId: req.headers['x-request-id'],
        timestamp: new Date().toISOString()
      });
    })
  );
}