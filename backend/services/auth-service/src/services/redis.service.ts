import { createClient, RedisClientType } from 'redis';
import { Logger } from '../utils/logger';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  maxRetriesPerRequest?: number;
  retryDelayOnFailover?: number;
  connectTimeout?: number;
  lazyConnect?: boolean;
}

/**
 * Enhanced Redis Service with connection management and caching utilities
 */
export class RedisService {
  private client: RedisClientType;
  private logger: Logger;
  private config: RedisConfig;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  constructor(config?: Partial<RedisConfig>) {
    this.logger = new Logger('redis-service');
    this.config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'daorsagro:auth:',
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      connectTimeout: 10000,
      lazyConnect: true,
      ...config
    };

    this.client = this.createClient();
    this.setupEventListeners();
  }

  /**
   * Create Redis client
   */
  private createClient(): RedisClientType {
    const url = `redis://${this.config.password ? `:${this.config.password}@` : ''}${this.config.host}:${this.config.port}/${this.config.db}`;
    
    return createClient({
      url,
      socket: {
        connectTimeout: this.config.connectTimeout,
        reconnectStrategy: (retries) => {
          if (retries >= this.maxReconnectAttempts) {
            this.logger.error('Max Redis reconnection attempts reached');
            return false;
          }
          return Math.min(retries * 50, 500);
        }
      }
    });
  }

  /**
   * Setup Redis event listeners
   */
  private setupEventListeners(): void {
    this.client.on('connect', () => {
      this.logger.info('Redis connection established');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.client.on('ready', () => {
      this.logger.info('Redis client ready for commands');
    });

    this.client.on('error', (error) => {
      this.logger.error('Redis connection error', error);
      this.isConnected = false;
    });

    this.client.on('end', () => {
      this.logger.info('Redis connection closed');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      this.reconnectAttempts++;
      this.logger.info(`Redis reconnecting (attempt ${this.reconnectAttempts})`);
    });
  }

  /**
   * Connect to Redis
   */
  public async connect(): Promise<void> {
    try {
      if (!this.isConnected) {
        await this.client.connect();
        this.logger.info('Connected to Redis successfully');
      }
    } catch (error) {
      this.logger.error('Failed to connect to Redis', error);
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  public async disconnect(): Promise<void> {
    try {
      if (this.isConnected) {
        await this.client.disconnect();
        this.logger.info('Disconnected from Redis');
      }
    } catch (error) {
      this.logger.error('Error during Redis disconnection', error);
      throw error;
    }
  }

  /**
   * Check if Redis is connected
   */
  public isHealthy(): boolean {
    return this.isConnected;
  }

  /**
   * Ping Redis server
   */
  public async ping(): Promise<string> {
    try {
      return await this.client.ping();
    } catch (error) {
      this.logger.error('Redis ping failed', error);
      throw error;
    }
  }

  /**
   * Set key-value pair with optional expiration
   */
  public async set(key: string, value: any, expirationInSeconds?: number): Promise<void> {
    try {
      const fullKey = this.getFullKey(key);
      const serializedValue = this.serialize(value);
      
      if (expirationInSeconds) {
        await this.client.setEx(fullKey, expirationInSeconds, serializedValue);
      } else {
        await this.client.set(fullKey, serializedValue);
      }
      
      this.logger.debug('Redis SET operation', { key: fullKey, ttl: expirationInSeconds });
    } catch (error) {
      this.logger.error('Redis SET operation failed', error, { key });
      throw error;
    }
  }

  /**
   * Get value by key
   */
  public async get<T = any>(key: string): Promise<T | null> {
    try {
      const fullKey = this.getFullKey(key);
      const value = await this.client.get(fullKey);
      
      if (value === null) {
        return null;
      }
      
      this.logger.debug('Redis GET operation', { key: fullKey });
      return this.deserialize<T>(value);
    } catch (error) {
      this.logger.error('Redis GET operation failed', error, { key });
      throw error;
    }
  }

  /**
   * Delete key
   */
  public async del(key: string): Promise<number> {
    try {
      const fullKey = this.getFullKey(key);
      const result = await this.client.del(fullKey);
      
      this.logger.debug('Redis DEL operation', { key: fullKey, deleted: result });
      return result;
    } catch (error) {
      this.logger.error('Redis DEL operation failed', error, { key });
      throw error;
    }
  }

  /**
   * Check if key exists
   */
  public async exists(key: string): Promise<boolean> {
    try {
      const fullKey = this.getFullKey(key);
      const result = await this.client.exists(fullKey);
      return result === 1;
    } catch (error) {
      this.logger.error('Redis EXISTS operation failed', error, { key });
      throw error;
    }
  }

  /**
   * Set expiration for key
   */
  public async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const fullKey = this.getFullKey(key);
      const result = await this.client.expire(fullKey, seconds);
      return result;
    } catch (error) {
      this.logger.error('Redis EXPIRE operation failed', error, { key, seconds });
      throw error;
    }
  }

  /**
   * Get remaining TTL for key
   */
  public async ttl(key: string): Promise<number> {
    try {
      const fullKey = this.getFullKey(key);
      return await this.client.ttl(fullKey);
    } catch (error) {
      this.logger.error('Redis TTL operation failed', error, { key });
      throw error;
    }
  }

  /**
   * Set multiple key-value pairs
   */
  public async mset(keyValuePairs: Record<string, any>): Promise<void> {
    try {
      const pairs: string[] = [];
      
      Object.entries(keyValuePairs).forEach(([key, value]) => {
        pairs.push(this.getFullKey(key), this.serialize(value));
      });
      
      await this.client.mSet(pairs);
      this.logger.debug('Redis MSET operation', { count: Object.keys(keyValuePairs).length });
    } catch (error) {
      this.logger.error('Redis MSET operation failed', error);
      throw error;
    }
  }

  /**
   * Get multiple values by keys
   */
  public async mget<T = any>(keys: string[]): Promise<(T | null)[]> {
    try {
      const fullKeys = keys.map(key => this.getFullKey(key));
      const values = await this.client.mGet(fullKeys);
      
      return values.map(value => value ? this.deserialize<T>(value) : null);
    } catch (error) {
      this.logger.error('Redis MGET operation failed', error, { keys });
      throw error;
    }
  }

  /**
   * Cache utility: get or set
   */
  public async cache<T>(
    key: string,
    fetcher: () => Promise<T>,
    expirationInSeconds: number = 300
  ): Promise<T> {
    try {
      // Try to get from cache first
      const cached = await this.get<T>(key);
      if (cached !== null) {
        this.logger.debug('Cache hit', { key });
        return cached;
      }

      // Cache miss, fetch data
      this.logger.debug('Cache miss', { key });
      const data = await fetcher();
      
      // Store in cache
      await this.set(key, data, expirationInSeconds);
      
      return data;
    } catch (error) {
      this.logger.error('Cache operation failed', error, { key });
      throw error;
    }
  }

  /**
   * Health check for Redis connection
   */
  public async healthCheck(): Promise<{ status: string; latency?: number }> {
    try {
      const startTime = Date.now();
      await this.ping();
      const latency = Date.now() - startTime;
      
      return {
        status: 'healthy',
        latency
      };
    } catch (error) {
      this.logger.error('Redis health check failed', error);
      return { status: 'unhealthy' };
    }
  }

  /**
   * Get Redis info
   */
  public async getInfo(): Promise<string> {
    try {
      return await this.client.info();
    } catch (error) {
      this.logger.error('Failed to get Redis info', error);
      throw error;
    }
  }

  /**
   * Flush all keys with prefix
   */
  public async flushPrefix(): Promise<void> {
    try {
      const keys = await this.client.keys(`${this.config.keyPrefix}*`);
      if (keys.length > 0) {
        await this.client.del(keys);
        this.logger.info('Flushed keys with prefix', { prefix: this.config.keyPrefix, count: keys.length });
      }
    } catch (error) {
      this.logger.error('Failed to flush keys with prefix', error);
      throw error;
    }
  }

  /**
   * Get full key with prefix
   */
  private getFullKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  /**
   * Serialize value for storage
   */
  private serialize(value: any): string {
    if (typeof value === 'string') {
      return value;
    }
    return JSON.stringify(value);
  }

  /**
   * Deserialize value from storage
   */
  private deserialize<T>(value: string): T {
    try {
      return JSON.parse(value);
    } catch {
      // If parsing fails, return as string
      return value as unknown as T;
    }
  }

  /**
   * Cleanup and close connection
   */
  public async cleanup(): Promise<void> {
    try {
      await this.disconnect();
      this.logger.info('Redis service cleaned up successfully');
    } catch (error) {
      this.logger.error('Error during Redis service cleanup', error);
    }
  }
}