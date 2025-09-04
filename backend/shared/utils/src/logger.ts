import winston from 'winston';
import { ConfigManager } from '@daorsagro/config';

/**
 * Custom logger configuration for the DaorsAgro platform
 */
export class Logger {
  private logger: winston.Logger;
  private service: string;

  constructor(service: string = 'app') {
    this.service = service;
    this.logger = this.createLogger();
  }

  private createLogger(): winston.Logger {
    const configManager = ConfigManager.getInstance();
    const logLevel = configManager.get('LOG_LEVEL', 'info') as string;
    const logFormat = configManager.get('LOG_FORMAT', 'json') as string;
    const nodeEnv = (configManager.get('NODE_ENV', 'development') as string) || 'development';

    // Custom format for console output
    const consoleFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.colorize({ all: true }),
      winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
        let log = `${timestamp} [${service}] ${level}: ${message}`;
        
        // Add metadata if present
        const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
        if (metaString) {
          log += `\n${metaString}`;
        }
        
        return log;
      })
    );

    // JSON format for production
    const jsonFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    );

    // Choose format based on environment and configuration
    const format = logFormat === 'json' || nodeEnv === 'production' ? jsonFormat : consoleFormat;

    // Configure transports
    const transports: winston.transport[] = [
      new winston.transports.Console({
        level: logLevel,
        format
      })
    ];

    // Add file transport for production
    if (nodeEnv === 'production') {
      transports.push(
        new winston.transports.File({
          filename: `logs/${this.service}-error.log`,
          level: 'error',
          format: jsonFormat,
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        new winston.transports.File({
          filename: `logs/${this.service}-combined.log`,
          format: jsonFormat,
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        })
      );
    }

    return winston.createLogger({
      level: logLevel,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] })
      ),
      defaultMeta: { 
        service: this.service,
        environment: nodeEnv,
        version: configManager.get('APP_VERSION', '1.0.0')
      },
      transports,
      exitOnError: false,
    });
  }

  /**
   * Log debug message
   */
  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  /**
   * Log info message
   */
  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  /**
   * Log warning message
   */
  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | any, meta?: any): void {
    if (error instanceof Error) {
      this.logger.error(message, {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        ...meta,
      });
    } else if (error) {
      this.logger.error(message, { error, ...meta });
    } else {
      this.logger.error(message, meta);
    }
  }

  /**
   * Log HTTP request
   */
  logRequest(req: any, res: any, responseTime?: number): void {
    const { method, url, headers, ip, body } = req;
    const { statusCode } = res;

    this.info('HTTP Request', {
      type: 'http_request',
      method,
      url,
      statusCode,
      responseTime,
      ip,
      userAgent: headers['user-agent'],
      contentLength: headers['content-length'],
      requestId: headers['x-request-id'],
      ...(this.shouldLogBody(req) && { body }),
    });
  }

  /**
   * Log database query
   */
  logQuery(query: string, params?: any[], duration?: number): void {
    this.debug('Database Query', {
      type: 'database_query',
      query,
      params,
      duration,
    });
  }

  /**
   * Log external API call
   */
  logApiCall(service: string, method: string, url: string, statusCode?: number, duration?: number): void {
    this.info('External API Call', {
      type: 'external_api',
      service,
      method,
      url,
      statusCode,
      duration,
    });
  }

  /**
   * Log business event
   */
  logBusinessEvent(event: string, data?: any): void {
    this.info('Business Event', {
      type: 'business_event',
      event,
      data,
    });
  }

  /**
   * Log security event
   */
  logSecurityEvent(event: string, userId?: string, ip?: string, details?: any): void {
    this.warn('Security Event', {
      type: 'security_event',
      event,
      userId,
      ip,
      details,
    });
  }

  /**
   * Log performance metric
   */
  logPerformance(metric: string, value: number, unit: string = 'ms'): void {
    this.info('Performance Metric', {
      type: 'performance',
      metric,
      value,
      unit,
    });
  }

  /**
   * Check if request body should be logged
   */
  private shouldLogBody(req: any): boolean {
    const sensitiveRoutes = ['/auth/login', '/auth/register', '/auth/password'];
    return !sensitiveRoutes.some(route => req.url.includes(route));
  }

  /**
   * Create child logger with additional context
   */
  child(context: Record<string, any>): Logger {
    const childLogger = new Logger(this.service);
    childLogger.logger = this.logger.child(context);
    return childLogger;
  }

  /**
   * Get underlying Winston logger instance
   */
  getWinstonLogger(): winston.Logger {
    return this.logger;
  }
}

/**
 * Create a logger instance
 */
export function createLogger(service: string): Logger {
  return new Logger(service);
}

/**
 * Default logger instance
 */
export const logger = new Logger('default');