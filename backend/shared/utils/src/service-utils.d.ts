import winston from 'winston';
/**
 * Shared logger utility for microservices
 */
export declare class LoggerUtils {
    /**
     * Create a logger instance for a service
     */
    static createLogger(serviceName: string): winston.Logger;
    /**
     * Log HTTP request
     */
    static logRequest(logger: winston.Logger, req: any, res: any, duration?: number): void;
    /**
     * Log database operation
     */
    static logDatabaseOperation(logger: winston.Logger, operation: string, table: string, duration?: number, meta?: any): void;
    /**
     * Log service communication
     */
    static logServiceCall(logger: winston.Logger, service: string, method: string, endpoint: string, duration?: number, statusCode?: number): void;
    /**
     * Log business event
     */
    static logBusinessEvent(logger: winston.Logger, event: string, entityId?: string, entityType?: string, meta?: any): void;
    /**
     * Log security event
     */
    static logSecurityEvent(logger: winston.Logger, event: string, userId?: string, ip?: string, meta?: any): void;
}
/**
 * Health check utilities
 */
export declare class HealthUtils {
    /**
     * Check database connection health
     */
    static checkDatabase(dbClient: any, name?: string): Promise<{
        name: string;
        status: 'healthy' | 'unhealthy';
        details?: any;
    }>;
    /**
     * Check external service health
     */
    static checkExternalService(url: string, name: string, timeout?: number): Promise<{
        name: string;
        status: 'healthy' | 'unhealthy';
        details?: any;
    }>;
    /**
     * Create comprehensive health check response
     */
    static createHealthResponse(serviceName: string, version: string, checks: Array<{
        name: string;
        status: 'healthy' | 'unhealthy';
        details?: any;
    }>): {
        status: 'healthy' | 'unhealthy';
        timestamp: string;
        service: string;
        version: string;
        checks: any;
    };
}
/**
 * Metrics utilities
 */
export declare class MetricsUtils {
    /**
     * Create request metrics tracker
     */
    static createRequestMetrics(): {
        total: number;
        successful: number;
        failed: number;
        totalResponseTime: number;
        readonly averageResponseTime: number;
    };
    /**
     * Create service metrics tracker
     */
    static createServiceMetrics(): Map<any, any>;
    /**
     * Record request metrics
     */
    static recordRequest(metrics: any, method: string, path: string, statusCode: number, responseTime: number): void;
    /**
     * Get system metrics
     */
    static getSystemMetrics(): {
        uptime: number;
        memoryUsage: {
            rss: number;
            heapTotal: number;
            heapUsed: number;
            external: number;
        };
        cpuUsage: {
            user: number;
            system: number;
        };
        timestamp: string;
    };
}
//# sourceMappingURL=service-utils.d.ts.map