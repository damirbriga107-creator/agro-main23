import { PrismaClient, Prisma } from '@prisma/client';
import { Logger } from '../utils/logger';

/**
 * Enhanced Prisma Service with connection management and logging
 */
export class PrismaService {
  public client: PrismaClient;
  private logger: Logger;
  private isConnected: boolean = false;

  constructor() {
    this.logger = new Logger('prisma-service');
    this.client = new PrismaClient({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
      errorFormat: 'pretty',
    });

    this.setupEventListeners();
  }

  /**
   * Setup Prisma event listeners for logging
   */
  private setupEventListeners(): void {
    this.client.$on('query', (e) => {
      this.logger.debug('Database Query', {
        query: e.query,
        params: e.params,
        duration: `${e.duration}ms`,
        timestamp: e.timestamp
      });
    });

    this.client.$on('error', (e) => {
      this.logger.error('Database Error', e);
    });

    this.client.$on('info', (e) => {
      this.logger.info('Database Info', { message: e.message, timestamp: e.timestamp });
    });

    this.client.$on('warn', (e) => {
      this.logger.warn('Database Warning', { message: e.message, timestamp: e.timestamp });
    });
  }

  /**
   * Connect to database
   */
  public async connect(): Promise<void> {
    try {
      await this.client.$connect();
      this.isConnected = true;
      this.logger.info('Connected to database successfully');
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  /**
   * Disconnect from database
   */
  public async disconnect(): Promise<void> {
    try {
      await this.client.$disconnect();
      this.isConnected = false;
      this.logger.info('Disconnected from database');
    } catch (error) {
      this.logger.error('Error during database disconnection', error);
      throw error;
    }
  }

  /**
   * Check if database is connected
   */
  public isHealthy(): boolean {
    return this.isConnected;
  }

  /**
   * Execute raw query with error handling
   */
  public async executeRaw<T = any>(query: string, ...values: any[]): Promise<T> {
    try {
      const startTime = Date.now();
      const result = await this.client.$executeRawUnsafe(query, ...values);
      const duration = Date.now() - startTime;
      
      this.logger.logDbOperation('executeRaw', 'raw', duration);
      return result as T;
    } catch (error) {
      this.logger.error('Raw query execution failed', error, {
        query,
        values
      });
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Query raw with error handling
   */
  public async queryRaw<T = any>(query: string, ...values: any[]): Promise<T[]> {
    try {
      const startTime = Date.now();
      const result = await this.client.$queryRawUnsafe(query, ...values);
      const duration = Date.now() - startTime;
      
      this.logger.logDbOperation('queryRaw', 'raw', duration);
      return result as T[];
    } catch (error) {
      this.logger.error('Raw query failed', error, {
        query,
        values
      });
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Execute transaction with error handling
   */
  public async transaction<T>(
    fn: (prisma: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>,
    options?: {
      maxWait?: number;
      timeout?: number;
      isolationLevel?: any; // TransactionIsolationLevel type not available
    }
  ): Promise<T> {
    try {
      const startTime = Date.now();
      const result = await this.client.$transaction(fn, options);
      const duration = Date.now() - startTime;
      
      this.logger.logDbOperation('transaction', 'multiple', duration);
      return result;
    } catch (error) {
      this.logger.error('Transaction failed', error);
      throw this.handlePrismaError(error);
    }
  }

  /**
   * Health check for database connection
   */
  public async healthCheck(): Promise<{ status: string; latency?: number }> {
    try {
      const startTime = Date.now();
      await this.client.$queryRaw`SELECT 1`;
      const latency = Date.now() - startTime;
      
      return {
        status: 'healthy',
        latency
      };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return { status: 'unhealthy' };
    }
  }

  /**
   * Handle Prisma errors and convert to application errors
   */
  private handlePrismaError(error: any): Error {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          return new Error(`Unique constraint violation: ${error.meta?.target}`);
        case 'P2025':
          return new Error('Record not found');
        case 'P2003':
          return new Error('Foreign key constraint violation');
        case 'P2014':
          return new Error('Invalid ID provided');
        default:
          return new Error(`Database error: ${error.message}`);
      }
    }

    // Handle other Prisma errors by checking error types
    if (error?.message?.includes('initialization')) {
      return new Error('Failed to initialize database connection');
    }

    if (error?.message?.includes('validation')) {
      return new Error(`Validation error: ${error.message}`);
    }

    if (error?.message?.includes('engine') || error?.message?.includes('panic')) {
      return new Error('Database engine error');
    }

    return error;
  }

  /**
   * Get database metrics
   */
  public async getMetrics(): Promise<any> {
    try {
      const metrics = await this.client.$metrics.json();
      return metrics;
    } catch (error) {
      this.logger.error('Failed to get database metrics', error);
      return null;
    }
  }

  /**
   * Cleanup and close connection
   */
  public async cleanup(): Promise<void> {
    try {
      await this.disconnect();
      this.logger.info('Prisma service cleaned up successfully');
    } catch (error) {
      this.logger.error('Error during Prisma service cleanup', error);
    }
  }
}