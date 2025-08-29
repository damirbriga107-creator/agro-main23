import winston from 'winston';
import { EnvironmentUtils } from '@daorsagro/config';

/**
 * Logger configuration for microservices
 */
export class Logger {
  private logger: winston.Logger;
  private serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
    this.logger = winston.createLogger({
      level: EnvironmentUtils.get('LOG_LEVEL', 'info'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
        winston.format.json()
      ),
      defaultMeta: {
        service: serviceName,
        environment: EnvironmentUtils.get('NODE_ENV', 'development'),
        pid: process.pid
      },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
            winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
              const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
              return `${timestamp} [${service}] ${level}: ${message} ${metaString}`;
            })
          )
        })
      ]
    });

    // Add file transport for production
    if (EnvironmentUtils.get('NODE_ENV') === 'production') {
      this.logger.add(new winston.transports.File({
        filename: `logs/${serviceName}-error.log`,
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5
      }));

      this.logger.add(new winston.transports.File({
        filename: `logs/${serviceName}-combined.log`,
        maxsize: 5242880, // 5MB
        maxFiles: 5
      }));
    }
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
    const errorMeta = {
      ...meta,
      ...(error && {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
          ...(error.code && { code: error.code }),
          ...(error.statusCode && { statusCode: error.statusCode })
        }
      })
    };
    this.logger.error(message, errorMeta);
  }

  /**
   * Log HTTP request
   */
  logRequest(req: any, res: any, duration?: number): void {
    this.info('HTTP Request', {
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
  logDatabaseOperation(operation: string, table: string, duration?: number, meta?: any): void {
    this.debug('Database Operation', {
      operation,
      table,
      ...(duration && { duration: `${duration}ms` }),
      ...meta
    });
  }

  /**
   * Log service communication
   */
  logServiceCall(service: string, method: string, endpoint: string, duration?: number, statusCode?: number): void {
    this.info('Service Call', {
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
  logBusinessEvent(event: string, entityId?: string, entityType?: string, meta?: any): void {
    this.info('Business Event', {
      event,
      ...(entityId && { entityId }),
      ...(entityType && { entityType }),
      ...meta
    });
  }

  /**
   * Log security event
   */
  logSecurityEvent(event: string, userId?: string, ip?: string, meta?: any): void {
    this.warn('Security Event', {
      event,
      ...(userId && { userId }),
      ...(ip && { ip }),
      ...meta
    });
  }

  /**
   * Create child logger with additional context
   */
  child(meta: any): Logger {
    const childLogger = new Logger(this.serviceName);
    childLogger.logger = this.logger.child(meta);
    return childLogger;
  }

  /**
   * Get winston logger instance
   */
  getWinstonLogger(): winston.Logger {
    return this.logger;
  }
}