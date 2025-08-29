import { Logger } from '@daorsagro/utils';

/**
 * Metrics collection service for analytics
 */
export class MetricsService {
  private logger: Logger;
  private metrics: Map<string, any> = new Map();
  private counters: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();

  constructor() {
    this.logger = new Logger('analytics-metrics-service');
    this.initializeMetrics();
  }

  /**
   * Initialize default metrics
   */
  private initializeMetrics(): void {
    this.metrics.set('service_info', {
      name: 'analytics-service',
      version: '1.0.0',
      startTime: new Date().toISOString(),
      uptime: 0,
    });

    this.counters.set('requests_total', 0);
    this.counters.set('requests_success', 0);
    this.counters.set('requests_error', 0);
    this.counters.set('analytics_queries_total', 0);
    this.counters.set('reports_generated', 0);
    this.counters.set('dashboard_views', 0);

    this.histograms.set('request_duration_ms', []);
    this.histograms.set('query_duration_ms', []);
    this.histograms.set('report_generation_duration_ms', []);
  }

  /**
   * Record HTTP request metrics
   */
  recordRequest(method: string, path: string, statusCode: number, duration: number): void {
    try {
      // Increment total requests
      this.incrementCounter('requests_total');

      // Record success/error
      if (statusCode >= 200 && statusCode < 400) {
        this.incrementCounter('requests_success');
      } else {
        this.incrementCounter('requests_error');
      }

      // Record duration
      this.recordHistogram('request_duration_ms', duration);

      // Record specific endpoint metrics
      const endpoint = this.normalizeEndpoint(path);
      this.incrementCounter(`requests_${endpoint}_total`);
      this.recordHistogram(`request_${endpoint}_duration_ms`, duration);

    } catch (error) {
      this.logger.error('Failed to record request metrics', error);
    }
  }

  /**
   * Record analytics query metrics
   */
  recordAnalyticsQuery(queryType: string, duration: number, success: boolean): void {
    try {
      this.incrementCounter('analytics_queries_total');
      this.incrementCounter(`analytics_queries_${queryType}_total`);
      
      if (success) {
        this.incrementCounter(`analytics_queries_${queryType}_success`);
      } else {
        this.incrementCounter(`analytics_queries_${queryType}_error`);
      }

      this.recordHistogram('query_duration_ms', duration);
      this.recordHistogram(`query_${queryType}_duration_ms`, duration);

    } catch (error) {
      this.logger.error('Failed to record analytics query metrics', error);
    }
  }

  /**
   * Record report generation metrics
   */
  recordReportGeneration(reportType: string, duration: number, success: boolean): void {
    try {
      this.incrementCounter('reports_generated');
      this.incrementCounter(`reports_${reportType}_generated`);
      
      if (success) {
        this.incrementCounter(`reports_${reportType}_success`);
      } else {
        this.incrementCounter(`reports_${reportType}_error`);
      }

      this.recordHistogram('report_generation_duration_ms', duration);
      this.recordHistogram(`report_${reportType}_duration_ms`, duration);

    } catch (error) {
      this.logger.error('Failed to record report generation metrics', error);
    }
  }

  /**
   * Record dashboard view metrics
   */
  recordDashboardView(userId?: string): void {
    try {
      this.incrementCounter('dashboard_views');
      
      if (userId) {
        this.incrementCounter(`dashboard_views_user_${userId}`);
      }

    } catch (error) {
      this.logger.error('Failed to record dashboard view metrics', error);
    }
  }

  /**
   * Get all metrics
   */
  getMetrics(): any {
    const uptime = Math.floor(process.uptime());
    this.metrics.set('service_info', {
      ...this.metrics.get('service_info'),
      uptime,
    });

    return {
      service: this.metrics.get('service_info'),
      counters: Object.fromEntries(this.counters),
      histograms: this.getHistogramStats(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): any {
    const requestDurations = this.histograms.get('request_duration_ms') || [];
    const queryDurations = this.histograms.get('query_duration_ms') || [];
    
    return {
      requests: {
        total: this.counters.get('requests_total') || 0,
        success_rate: this.calculateSuccessRate('requests'),
        avg_duration_ms: this.calculateAverage(requestDurations),
        p95_duration_ms: this.calculatePercentile(requestDurations, 95),
      },
      analytics_queries: {
        total: this.counters.get('analytics_queries_total') || 0,
        avg_duration_ms: this.calculateAverage(queryDurations),
        p95_duration_ms: this.calculatePercentile(queryDurations, 95),
      },
      reports: {
        total: this.counters.get('reports_generated') || 0,
      },
      dashboard: {
        views: this.counters.get('dashboard_views') || 0,
      },
    };
  }

  /**
   * Reset metrics (for testing or periodic reset)
   */
  resetMetrics(): void {
    this.counters.clear();
    this.histograms.clear();
    this.initializeMetrics();
    this.logger.info('Metrics reset successfully');
  }

  /**
   * Increment a counter
   */
  private incrementCounter(name: string, value: number = 1): void {
    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + value);
  }

  /**
   * Record value in histogram
   */
  private recordHistogram(name: string, value: number): void {
    const values = this.histograms.get(name) || [];
    values.push(value);
    
    // Keep only last 1000 values to prevent memory bloat
    if (values.length > 1000) {
      values.splice(0, values.length - 1000);
    }
    
    this.histograms.set(name, values);
  }

  /**
   * Get histogram statistics
   */
  private getHistogramStats(): any {
    const stats: any = {};
    
    for (const [name, values] of this.histograms) {
      if (values.length > 0) {
        stats[name] = {
          count: values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          avg: this.calculateAverage(values),
          p50: this.calculatePercentile(values, 50),
          p95: this.calculatePercentile(values, 95),
          p99: this.calculatePercentile(values, 99),
        };
      }
    }
    
    return stats;
  }

  /**
   * Calculate average of array
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return Math.round((values.reduce((sum, val) => sum + val, 0) / values.length) * 100) / 100;
  }

  /**
   * Calculate percentile of array
   */
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Calculate success rate for a metric prefix
   */
  private calculateSuccessRate(prefix: string): number {
    const total = this.counters.get(`${prefix}_total`) || 0;
    const success = this.counters.get(`${prefix}_success`) || 0;
    
    if (total === 0) return 0;
    return Math.round((success / total) * 10000) / 100; // 2 decimal places
  }

  /**
   * Normalize endpoint path for metrics
   */
  private normalizeEndpoint(path: string): string {
    return path
      .replace(/\/api\/v1\/analytics\//, '')
      .replace(/\/[a-f0-9-]{36}/g, '/:id') // Replace UUIDs
      .replace(/\//g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '') || 'root';
  }
}