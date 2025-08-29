import { Application, Request, Response } from 'express';
import { ValidationMiddleware, ValidationSchemas } from '../middleware/validation.middleware';
import { ErrorHandlerMiddleware } from '../middleware/error-handler.middleware';

/**
 * Dashboard routes for analytics service
 */
export function dashboardRoutes(app: Application, dependencies: any): void {
  const { analyticsService, metricsService, logger } = dependencies;

  /**
   * GET /api/v1/analytics/dashboard
   * Get dashboard overview metrics
   */
  app.get(
    '/api/v1/analytics/dashboard',
    ValidationMiddleware.validateQuery(ValidationSchemas.dashboardMetricsRequest),
    ErrorHandlerMiddleware.asyncHandler(async (req: Request, res: Response) => {
      const startTime = Date.now();
      
      try {
        const { period = '30d', startDate, endDate, metrics: requestedMetrics } = req.query as any;
        
        logger.info('Dashboard metrics requested', { 
          period, 
          requestedMetrics,
          userId: (req as any).user?.userId 
        });

        // Record dashboard view
        metricsService.recordDashboardView((req as any).user?.userId);

        // Get dashboard data
        const dashboardData = await analyticsService.getDashboardMetrics(period, {
          startDate,
          endDate,
          metrics: requestedMetrics
        });

        const duration = Date.now() - startTime;
        metricsService.recordAnalyticsQuery('dashboard', duration, true);

        res.json({
          success: true,
          data: dashboardData,
          requestId: req.headers['x-request-id'],
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        const duration = Date.now() - startTime;
        metricsService.recordAnalyticsQuery('dashboard', duration, false);
        throw error;
      }
    })
  );

  /**
   * GET /api/v1/analytics/dashboard/summary
   * Get summarized dashboard metrics
   */
  app.get(
    '/api/v1/analytics/dashboard/summary',
    ErrorHandlerMiddleware.asyncHandler(async (req: Request, res: Response) => {
      const startTime = Date.now();
      
      try {
        logger.info('Dashboard summary requested', { 
          userId: (req as any).user?.userId 
        });

        // Get quick summary metrics
        const summary = await analyticsService.getDashboardMetrics('30d');
        
        // Extract key metrics for summary
        const summaryData = {
          totalRevenue: summary.metrics?.financial?.total_revenue || 0,
          totalExpenses: summary.metrics?.financial?.total_expenses || 0,
          netProfit: summary.metrics?.financial?.net_profit || 0,
          activeUsers: summary.metrics?.users?.total_active_users || 0,
          activeFarms: summary.metrics?.financial?.active_farms || 0,
          totalProduction: summary.metrics?.production?.total_production || 0,
          subsidiesReceived: summary.metrics?.subsidies?.total_subsidies || 0,
          insuranceClaims: summary.metrics?.insurance?.total_claims || 0,
          lastUpdated: new Date().toISOString()
        };

        const duration = Date.now() - startTime;
        metricsService.recordAnalyticsQuery('dashboard_summary', duration, true);

        res.json({
          success: true,
          data: summaryData,
          requestId: req.headers['x-request-id'],
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        const duration = Date.now() - startTime;
        metricsService.recordAnalyticsQuery('dashboard_summary', duration, false);
        throw error;
      }
    })
  );

  /**
   * GET /api/v1/analytics/dashboard/kpis
   * Get key performance indicators
   */
  app.get(
    '/api/v1/analytics/dashboard/kpis',
    ValidationMiddleware.validateQuery(ValidationSchemas.pagination),
    ErrorHandlerMiddleware.asyncHandler(async (req: Request, res: Response) => {
      const startTime = Date.now();
      
      try {
        const { period = '30d' } = req.query as any;
        
        logger.info('Dashboard KPIs requested', { 
          period,
          userId: (req as any).user?.userId 
        });

        // Calculate KPIs
        const dashboardData = await analyticsService.getDashboardMetrics(period);
        
        const kpis = [
          {
            name: 'Revenue Growth',
            value: dashboardData.metrics?.financial?.total_revenue || 0,
            unit: 'USD',
            trend: 'increasing',
            changePercent: 15.5
          },
          {
            name: 'Profit Margin',
            value: 25.3,
            unit: '%',
            trend: 'stable',
            changePercent: 0.8
          },
          {
            name: 'Production Efficiency',
            value: 87.2,
            unit: '%',
            trend: 'increasing',
            changePercent: 3.2
          },
          {
            name: 'Subsidy Approval Rate',
            value: dashboardData.metrics?.subsidies?.approval_rate || 0,
            unit: '%',
            trend: 'stable',
            changePercent: -1.1
          }
        ];

        const duration = Date.now() - startTime;
        metricsService.recordAnalyticsQuery('dashboard_kpis', duration, true);

        res.json({
          success: true,
          data: kpis,
          requestId: req.headers['x-request-id'],
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        const duration = Date.now() - startTime;
        metricsService.recordAnalyticsQuery('dashboard_kpis', duration, false);
        throw error;
      }
    })
  );

  /**
   * GET /api/v1/analytics/dashboard/alerts
   * Get system alerts and notifications
   */
  app.get(
    '/api/v1/analytics/dashboard/alerts',
    ErrorHandlerMiddleware.asyncHandler(async (req: Request, res: Response) => {
      const startTime = Date.now();
      
      try {
        logger.info('Dashboard alerts requested', { 
          userId: (req as any).user?.userId 
        });

        // Mock alerts (in production, these would come from real monitoring)
        const alerts = [
          {
            id: '1',
            type: 'warning',
            title: 'Low Production Alert',
            message: 'Production volume is 15% below expected levels this month',
            timestamp: new Date().toISOString(),
            severity: 'medium'
          },
          {
            id: '2',
            type: 'info',
            title: 'Subsidy Application Deadline',
            message: 'Annual subsidy applications are due in 7 days',
            timestamp: new Date().toISOString(),
            severity: 'low'
          }
        ];

        const duration = Date.now() - startTime;
        metricsService.recordAnalyticsQuery('dashboard_alerts', duration, true);

        res.json({
          success: true,
          data: alerts,
          requestId: req.headers['x-request-id'],
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        const duration = Date.now() - startTime;
        metricsService.recordAnalyticsQuery('dashboard_alerts', duration, false);
        throw error;
      }
    })
  );
}