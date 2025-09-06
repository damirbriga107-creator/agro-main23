import winston from 'winston';
/**
 * Shared logger utility for microservices
 */
export class LoggerUtils {
    /**
     * Create a logger instance for a service
     */
    static createLogger(serviceName) {
        const isDevelopment = process.env.NODE_ENV === 'development';
        const logLevel = process.env.LOG_LEVEL || 'info';
        const logger = winston.createLogger({
            level: logLevel,
            format: winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true }), winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }), winston.format.json()),
            defaultMeta: {
                service: serviceName,
                environment: process.env.NODE_ENV || 'development',
                pid: process.pid
            },
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(winston.format.colorize(), winston.format.simple(), winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
                        const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
                        return `${timestamp} [${service}] ${level}: ${message} ${metaString}`;
                    }))
                })
            ]
        });
        // Add file transport for production
        if (!isDevelopment) {
            logger.add(new winston.transports.File({
                filename: `logs/${serviceName}-error.log`,
                level: 'error',
                maxsize: 5242880, // 5MB
                maxFiles: 5
            }));
            logger.add(new winston.transports.File({
                filename: `logs/${serviceName}-combined.log`,
                maxsize: 5242880, // 5MB
                maxFiles: 5
            }));
        }
        return logger;
    }
    /**
     * Log HTTP request
     */
    static logRequest(logger, req, res, duration) {
        logger.info('HTTP Request', {
            method: req.method,
            url: req.url,
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            requestId: req.headers['x-request-id'],
            statusCode: res.statusCode,
            ...(duration && { duration: `${duration}ms` })
        });
    }
    /**
     * Log database operation
     */
    static logDatabaseOperation(logger, operation, table, duration, meta) {
        logger.debug('Database Operation', {
            operation,
            table,
            ...(duration && { duration: `${duration}ms` }),
            ...meta
        });
    }
    /**
     * Log service communication
     */
    static logServiceCall(logger, service, method, endpoint, duration, statusCode) {
        logger.info('Service Call', {
            targetService: service,
            method,
            endpoint,
            ...(duration && { duration: `${duration}ms` }),
            ...(statusCode && { statusCode })
        });
    }
    /**
     * Log business event
     */
    static logBusinessEvent(logger, event, entityId, entityType, meta) {
        logger.info('Business Event', {
            event,
            ...(entityId && { entityId }),
            ...(entityType && { entityType }),
            ...meta
        });
    }
    /**
     * Log security event
     */
    static logSecurityEvent(logger, event, userId, ip, meta) {
        logger.warn('Security Event', {
            event,
            ...(userId && { userId }),
            ...(ip && { ip }),
            ...meta
        });
    }
}
/**
 * Health check utilities
 */
export class HealthUtils {
    /**
     * Check database connection health
     */
    static async checkDatabase(dbClient, name = 'database') {
        try {
            if (dbClient.$queryRaw) {
                // Prisma client
                await dbClient.$queryRaw `SELECT 1`;
            }
            else if (dbClient.ping) {
                // Redis client
                await dbClient.ping();
            }
            else if (dbClient.collection) {
                // MongoDB client
                await dbClient.collection('test').findOne({});
            }
            else {
                // Generic database test
                await dbClient.query('SELECT 1');
            }
            return { name, status: 'healthy' };
        }
        catch (error) {
            return {
                name,
                status: 'unhealthy',
                details: { error: error.message }
            };
        }
    }
    /**
     * Check external service health
     */
    static async checkExternalService(url, name, timeout = 5000) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            const response = await fetch(url, {
                signal: controller.signal,
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            clearTimeout(timeoutId);
            return {
                name,
                status: response.ok ? 'healthy' : 'unhealthy',
                details: {
                    statusCode: response.status,
                    statusText: response.statusText
                }
            };
        }
        catch (error) {
            return {
                name,
                status: 'unhealthy',
                details: { error: error.message }
            };
        }
    }
    /**
     * Create comprehensive health check response
     */
    static createHealthResponse(serviceName, version, checks) {
        const overallStatus = checks.every(check => check.status === 'healthy') ? 'healthy' : 'unhealthy';
        return {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            service: serviceName,
            version,
            checks: checks.reduce((acc, check) => {
                acc[check.name] = {
                    status: check.status,
                    ...(check.details && { details: check.details })
                };
                return acc;
            }, {})
        };
    }
}
/**
 * Metrics utilities
 */
export class MetricsUtils {
    /**
     * Create request metrics tracker
     */
    static createRequestMetrics() {
        return {
            total: 0,
            successful: 0,
            failed: 0,
            totalResponseTime: 0,
            get averageResponseTime() {
                return this.total > 0 ? this.totalResponseTime / this.total : 0;
            }
        };
    }
    /**
     * Create service metrics tracker
     */
    static createServiceMetrics() {
        return new Map();
    }
    /**
     * Record request metrics
     */
    static recordRequest(metrics, method, path, statusCode, responseTime) {
        metrics.total++;
        metrics.totalResponseTime += responseTime;
        if (statusCode >= 200 && statusCode < 400) {
            metrics.successful++;
        }
        else {
            metrics.failed++;
        }
    }
    /**
     * Get system metrics
     */
    static getSystemMetrics() {
        const memoryUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        return {
            uptime: process.uptime(),
            memoryUsage: {
                rss: memoryUsage.rss,
                heapTotal: memoryUsage.heapTotal,
                heapUsed: memoryUsage.heapUsed,
                external: memoryUsage.external
            },
            cpuUsage: {
                user: cpuUsage.user,
                system: cpuUsage.system
            },
            timestamp: new Date().toISOString()
        };
    }
}
//# sourceMappingURL=service-utils.js.map