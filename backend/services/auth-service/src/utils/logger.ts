import { createLogger, format, transports } from 'winston';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

export interface LogContext {
  requestId?: string;
  userId?: string;
  service?: string;
  action?: string;
  [key: string]: any;
}

/**
 * Enhanced Logger Service with structured logging
 */
export class Logger {
  private logger: any;
  private serviceName: string;

  constructor(serviceName: string = 'auth-service') {
    this.serviceName = serviceName;
    this.logger = this.createLogger();
  }

  private createLogger() {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    const logFormat = format.combine(
      format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss.SSS'
      }),
      format.errors({ stack: true }),
      format.json(),
      format.printf(({ timestamp, level, message, stack, ...meta }) => {
        const logEntry = {
          timestamp,
          level: level.toUpperCase(),
          service: this.serviceName,
          message,
          ...meta
        };

        if (stack) {
          logEntry.stack = stack;
        }

        return JSON.stringify(logEntry);
      })
    );

    const devFormat = format.combine(
      format.colorize(),
      format.timestamp({
        format: 'HH:mm:ss'
      }),
      format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
        return `${timestamp} [${this.serviceName}] ${level}: ${message} ${metaStr}`;
      })
    );

    return createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: isDevelopment ? devFormat : logFormat,
      defaultMeta: {
        service: this.serviceName,
        environment: process.env.NODE_ENV || 'development'
      },
      transports: [
        new transports.Console({
          level: isDevelopment ? 'debug' : 'info'
        }),
        new transports.File({
          filename: 'logs/error.log',
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 10
        }),
        new transports.File({
          filename: 'logs/combined.log',
          maxsize: 5242880, // 5MB
          maxFiles: 10
        })
      ],
      exitOnError: false
    });
  }

  private formatMessage(message: string, context?: LogContext): any {
    return {
      message,
      ...context
    };
  }

  /**
   * Log error messages
   */
  public error(message: string, error?: Error | any, context?: LogContext): void {
    const logData = this.formatMessage(message, context);
    
    if (error) {
      if (error instanceof Error) {
        logData.error = {
          name: error.name,
          message: error.message,
          stack: error.stack
        };
      } else {
        logData.error = error;
      }
    }

    this.logger.error(logData);
  }

  /**
   * Log warning messages
   */
  public warn(message: string, context?: LogContext): void {
    this.logger.warn(this.formatMessage(message, context));
  }

  /**
   * Log info messages
   */
  public info(message: string, context?: LogContext): void {
    this.logger.info(this.formatMessage(message, context));
  }

  /**
   * Log debug messages
   */
  public debug(message: string, context?: LogContext): void {
    this.logger.debug(this.formatMessage(message, context));
  }

  /**
   * Log with custom level
   */
  public log(level: LogLevel, message: string, context?: LogContext): void {
    this.logger.log(level, this.formatMessage(message, context));
  }

  /**
   * Log HTTP request
   */
  public logRequest(req: any, context?: LogContext): void {
    this.info('HTTP Request', {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      requestId: req.headers['x-request-id'],
      ...context
    });
  }

  /**
   * Log HTTP response
   */
  public logResponse(req: any, res: any, responseTime?: number, context?: LogContext): void {
    this.info('HTTP Response', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: responseTime ? `${responseTime}ms` : undefined,
      requestId: req.headers['x-request-id'],
      ...context
    });
  }

  /**
   * Log database operation
   */
  public logDbOperation(operation: string, table: string, duration?: number, context?: LogContext): void {
    this.debug('Database Operation', {
      operation,
      table,
      duration: duration ? `${duration}ms` : undefined,
      ...context
    });
  }

  /**
   * Log authentication event
   */
  public logAuth(event: string, userId?: string, context?: LogContext): void {
    this.info('Authentication Event', {
      event,
      userId,
      ...context
    });
  }

  /**
   * Create child logger with additional context
   */
  public child(context: LogContext): Logger {
    const childLogger = new Logger(this.serviceName);
    childLogger.logger = this.logger.child(context);
    return childLogger;
  }
}