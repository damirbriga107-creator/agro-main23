import winston from 'winston';
/**
 * Custom logger configuration for the DaorsAgro platform
 */
export declare class Logger {
    private logger;
    private service;
    constructor(service?: string);
    private createLogger;
    /**
     * Log debug message
     */
    debug(message: string, meta?: any): void;
    /**
     * Log info message
     */
    info(message: string, meta?: any): void;
    /**
     * Log warning message
     */
    warn(message: string, meta?: any): void;
    /**
     * Log error message
     */
    error(message: string, error?: Error | any, meta?: any): void;
    /**
     * Log HTTP request
     */
    logRequest(req: any, res: any, responseTime?: number): void;
    /**
     * Log database query
     */
    logQuery(query: string, params?: any[], duration?: number): void;
    /**
     * Log external API call
     */
    logApiCall(service: string, method: string, url: string, statusCode?: number, duration?: number): void;
    /**
     * Log business event
     */
    logBusinessEvent(event: string, data?: any): void;
    /**
     * Log security event
     */
    logSecurityEvent(event: string, userId?: string, ip?: string, details?: any): void;
    /**
     * Log performance metric
     */
    logPerformance(metric: string, value: number, unit?: string): void;
    /**
     * Check if request body should be logged
     */
    private shouldLogBody;
    /**
     * Create child logger with additional context
     */
    child(context: Record<string, any>): Logger;
    /**
     * Get underlying Winston logger instance
     */
    getWinstonLogger(): winston.Logger;
}
/**
 * Create a logger instance
 */
export declare function createLogger(service: string): Logger;
/**
 * Default logger instance
 */
export declare const logger: Logger;
//# sourceMappingURL=logger.d.ts.map