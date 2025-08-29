import winston from 'winston';
import { EnvironmentUtils } from '@daorsagro/config';

/**
 * Logger utility for structured logging
 */
export class Logger {
  private logger: winston.Logger;
  private serviceName: string;

  constructor(serviceName: string = 'api-gateway') {
    this.serviceName = serviceName;
    this.logger = this.createLogger();
  }

  /**
   * Create Winston logger instance
   */
  private createLogger(): winston.Logger {
    const logLevel = EnvironmentUtils.get('LOG_LEVEL', 'info');
    const logFormat = EnvironmentUtils.get('LOG_FORMAT', 'json');
    const isDevelopment = EnvironmentUtils.isDevelopment();

    // Define log format
    const formats = [];

    // Add timestamp
    formats.push(winston.format.timestamp());

    // Add error stack trace
    formats.push(winston.format.errors({ stack: true }));

    // Add service name and environment
    formats.push(winston.format.label({ 
      label: this.serviceName 
    }));

    // Development format (human readable)
    if (isDevelopment && logFormat === 'simple') {
      formats.push(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, label, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? 
            `\n${JSON.stringify(meta, null, 2)}` : '';
          return `${timestamp} [${label}] ${level}: ${message}${metaStr}`;
        })
      );
    } else {
      // Production format (JSON)
      formats.push(
        winston.format.json(),
        winston.format.metadata({ 
          key: 'metadata',
          fillExcept: ['timestamp', 'level', 'message', 'label']
        })
      );
    }

    // Create transports
    const transports: winston.transport[] = [
      new winston.transports.Console({
        level: logLevel,
        handleExceptions: true,
        handleRejections: true
      })
    ];

    // Add file transport in production
    if (!isDevelopment) {
      transports.push(
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          maxsize: 5242880, // 5MB
          maxFiles: 5
        })
      );
    }

    return winston.createLogger({
      level: logLevel,
      format: winston.format.combine(...formats),
      transports,
      defaultMeta: {
        service: this.serviceName,
        environment: EnvironmentUtils.get('NODE_ENV', 'development'),
        version: EnvironmentUtils.get('npm_package_version', '1.0.0')
      },
      exitOnError: false
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
          ...(error as any).code && { code: (error as any).code }
        },
        ...meta
      });
    } else if (typeof error === 'object') {
      this.logger.error(message, { error, ...meta });
    } else {
      this.logger.error(message, { ...meta });
    }
  }

  /**
   * Log HTTP request
   */
  logRequest(req: any, res: any, responseTime: number): void {
    const logData = {
      request: {
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        requestId: req.headers['x-request-id']
      },
      response: {
        statusCode: res.statusCode,
        contentLength: res.get('Content-Length'),
        responseTime: `${responseTime}ms`
      }
    };

    if (res.statusCode >= 400) {
      this.warn('HTTP request completed with error', logData);
    } else {
      this.info('HTTP request completed', logData);
    }
  }

  /**
   * Log authentication events
   */
  logAuth(event: string, userId?: string, details?: any): void {
    this.info(`Authentication event: ${event}`, {
      event,
      userId,
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  /**
   * Log business events
   */
  logBusiness(event: string, data: any): void {
    this.info(`Business event: ${event}`, {
      event,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log performance metrics
   */
  logPerformance(operation: string, duration: number, metadata?: any): void {
    this.info(`Performance: ${operation}`, {
      operation,
      duration: `${duration}ms`,
      ...metadata
    });
  }

  /**
   * Log security events
   */
  logSecurity(event: string, details: any): void {
    this.warn(`Security event: ${event}`, {
      event,
      details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Create child logger with additional context
   */
  child(context: any): Logger {
    const childLogger = new Logger(this.serviceName);
    childLogger.logger = this.logger.child(context);
    return childLogger;
  }

  /**
   * Get Winston logger instance (for advanced usage)
   */
  getWinstonLogger(): winston.Logger {
    return this.logger;
  }

  /**
   * Create logger middleware for Express
   */
  static createMiddleware(logger: Logger) {
    return (req: any, res: any, next: any) => {
      const startTime = Date.now();
      
      res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        logger.logRequest(req, res, responseTime);
      });
      
      next();
    };
  }

  /**
   * Create structured log entry
   */
  static createLogEntry(
    level: string,
    message: string,
    metadata?: any
  ): any {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...metadata
    };
  }

  /**
   * Sanitize sensitive data from logs
   */
  static sanitize(data: any, sensitiveFields: string[] = ['password', 'token', 'authorization']): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => Logger.sanitize(item, sensitiveFields));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (sensitiveFields.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        sanitized[key] = Logger.sanitize(value, sensitiveFields);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}