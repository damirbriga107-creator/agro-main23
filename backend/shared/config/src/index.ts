import Joi from 'joi';
import { config as dotenvConfig } from 'dotenv';
import { readFileSync, existsSync } from 'fs';

import { DatabaseConfig, RedisConfig, KafkaConfig, JWTConfig, ServiceConfig } from '@daorsagro/types';

// Load environment variables
dotenvConfig();

/**
 * Helper function to read secrets from files or environment variables
 */
function readSecret(key: string): string | undefined {
  const file = process.env[`${key}_FILE`];
  if (file && existsSync(file)) {
    try { 
      return readFileSync(file, 'utf8').trim(); 
    } catch { 
      /* noop */ 
    }
  }
  return process.env[key];
}

/**
 * Configuration validation schemas
 */
const databaseSchema = Joi.object({
  host: Joi.string().required(),
  port: Joi.number().port().default(5432),
  database: Joi.string().required(),
  username: Joi.string().required(),
  password: Joi.string().required(),
  ssl: Joi.boolean().default(false),
  pool: Joi.object({
    min: Joi.number().default(5),
    max: Joi.number().default(20),
    idle: Joi.number().default(10000),
    acquire: Joi.number().default(60000),
  }).default(),
});

const redisSchema = Joi.object({
  url: Joi.string().uri().required(),
  password: Joi.string().optional(),
  ttl: Joi.number().default(3600),
  maxRetries: Joi.number().default(3),
});

const kafkaSchema = Joi.object({
  brokers: Joi.array().items(Joi.string()).required(),
  groupId: Joi.string().required(),
  clientId: Joi.string().required(),
  topics: Joi.object().pattern(Joi.string(), Joi.string()).required(),
});

const jwtSchema = Joi.object({
  secret: Joi.string().min(32).required(),
  refreshSecret: Joi.string().min(32).required(),
  expiresIn: Joi.string().default('15m'),
  refreshExpiresIn: Joi.string().default('7d'),
  algorithm: Joi.string().default('HS256'),
});

const serviceConfigSchema = Joi.object({
  name: Joi.string().required(),
  version: Joi.string().default('1.0.0'),
  port: Joi.number().port().required(),
  environment: Joi.string().valid('development', 'staging', 'production').default('development'),
  database: databaseSchema.required(),
  redis: redisSchema.required(),
  kafka: kafkaSchema.optional(),
  jwt: jwtSchema.required(),
  logging: Joi.object({
    level: Joi.string().valid('debug', 'info', 'warn', 'error').default('info'),
    format: Joi.string().valid('json', 'simple').default('json'),
  }).default(),
});

/**
 * Configuration manager class
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private configs: Map<string, any> = new Map();

  private constructor() {}

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Get configuration value by key
   */
  public get<T = any>(key: string, defaultValue?: T): T {
    const value = this.configs.get(key) ?? process.env[key] ?? defaultValue;
    
    if (value === undefined) {
      throw new Error(`Configuration key '${key}' is not defined`);
    }
    
    return this.parseValue(value);
  }

  /**
   * Set configuration value
   */
  public set(key: string, value: any): void {
    this.configs.set(key, value);
  }

  /**
   * Check if configuration key exists
   */
  public has(key: string): boolean {
    return this.configs.has(key) || process.env[key] !== undefined;
  }

  /**
   * Get all configuration keys
   */
  public keys(): string[] {
    return [...this.configs.keys(), ...Object.keys(process.env)];
  }

  /**
   * Parse environment variable value
   */
  private parseValue(value: any): any {
    if (typeof value !== 'string') {
      return value;
    }

    // Parse boolean values
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // Parse numeric values
    if (/^\d+$/.test(value)) {
      return parseInt(value, 10);
    }

    if (/^\d*\.\d+$/.test(value)) {
      return parseFloat(value);
    }

    // Parse JSON values
    if ((value.startsWith('{') && value.endsWith('}')) || 
        (value.startsWith('[') && value.endsWith(']'))) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }

    // Parse comma-separated arrays
    if (value.includes(',')) {
      return value.split(',').map(item => item.trim());
    }

    return value;
  }
}

/**
 * Database configuration factory
 */
export class DatabaseConfigFactory {
  /**
   * Create database configuration from environment variables
   */
  static create(envPrefix: string = ''): DatabaseConfig {
    const prefix = envPrefix ? `${envPrefix}_` : '';
    
    const config = {
      host: process.env[`${prefix}DB_HOST`] || 'localhost',
      port: parseInt(process.env[`${prefix}DB_PORT`] || '5432', 10),
      database: process.env[`${prefix}DB_NAME`] || 'daorsagro',
      username: process.env[`${prefix}DB_USERNAME`] || 'postgres',
      password: process.env[`${prefix}DB_PASSWORD`] || '',
      ssl: process.env[`${prefix}DB_SSL`] === 'true',
      pool: {
        min: parseInt(process.env[`${prefix}DB_POOL_MIN`] || '5', 10),
        max: parseInt(process.env[`${prefix}DB_POOL_MAX`] || '20', 10),
        idle: parseInt(process.env[`${prefix}DB_POOL_IDLE`] || '10000', 10),
        acquire: parseInt(process.env[`${prefix}DB_POOL_ACQUIRE`] || '60000', 10),
      },
    };

    const { error, value } = databaseSchema.validate(config);
    if (error) {
      throw new Error(`Database configuration validation failed: ${error.message}`);
    }

    return value;
  }

  /**
   * Create database configuration from URL
   */
  static createFromUrl(url: string): DatabaseConfig {
    try {
      const parsed = new URL(url);
      
      return {
        host: parsed.hostname,
        port: parseInt(parsed.port || '5432', 10),
        database: parsed.pathname.slice(1), // Remove leading slash
        username: parsed.username,
        password: parsed.password,
        ssl: parsed.searchParams.get('ssl') === 'true',
        pool: {
          min: 5,
          max: 20,
          idle: 10000,
          acquire: 60000,
        },
      };
    } catch (error) {
      throw new Error(`Invalid database URL: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Redis configuration factory
 */
export class RedisConfigFactory {
  /**
   * Create Redis configuration from environment variables
   */
  static create(): RedisConfig {
    const password = readSecret('REDIS_PASSWORD'); // supports REDIS_PASSWORD_FILE
    
    const config = {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      password,
      ttl: parseInt(process.env.REDIS_TTL || '3600', 10),
      maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
    };

    const { error, value } = redisSchema.validate(config);
    if (error) {
      throw new Error(`Redis configuration validation failed: ${error.message}`);
    }

    return value;
  }
}

/**
 * Kafka configuration factory
 */
export class KafkaConfigFactory {
  /**
   * Create Kafka configuration from environment variables
   */
  static create(): KafkaConfig {
    const brokers = process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'];
    
    const config = {
      brokers,
      groupId: process.env.KAFKA_GROUP_ID || 'daorsagro-group',
      clientId: process.env.KAFKA_CLIENT_ID || 'daorsagro-client',
      topics: {
        userEvents: process.env.KAFKA_TOPIC_USER_EVENTS || 'user-events',
        financialEvents: process.env.KAFKA_TOPIC_FINANCIAL_EVENTS || 'financial-events',
        subsidyEvents: process.env.KAFKA_TOPIC_SUBSIDY_EVENTS || 'subsidy-events',
        insuranceEvents: process.env.KAFKA_TOPIC_INSURANCE_EVENTS || 'insurance-events',
        notificationEvents: process.env.KAFKA_TOPIC_NOTIFICATION_EVENTS || 'notification-events',
      },
    };

    const { error, value } = kafkaSchema.validate(config);
    if (error) {
      throw new Error(`Kafka configuration validation failed: ${error.message}`);
    }

    return value;
  }
}

/**
 * JWT configuration factory
 */
export class JWTConfigFactory {
  /**
   * Create JWT configuration from environment variables
   */
  static create(): JWTConfig {
    const secret = readSecret('JWT_SECRET');
    const refreshSecret = readSecret('JWT_REFRESH_SECRET');
    
    const config = {
      secret,
      refreshSecret,
      expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
      algorithm: process.env.JWT_ALGORITHM || 'HS256',
    };

    const { error, value } = jwtSchema.validate(config);
    if (error) {
      throw new Error(`JWT configuration validation failed: ${error.message}`);
    }

    return value;
  }
}

/**
 * Service configuration factory
 */
export class ServiceConfigFactory {
  /**
   * Create service configuration
   */
  static create(serviceName: string, port: number): ServiceConfig {
    const config = {
      name: serviceName,
      version: process.env.npm_package_version || '1.0.0',
      port,
      environment: process.env.NODE_ENV || 'development',
      database: this.createDatabaseConfig(),
      redis: RedisConfigFactory.create(),
      kafka: this.shouldIncludeKafka() ? KafkaConfigFactory.create() : undefined,
      jwt: JWTConfigFactory.create(),
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.LOG_FORMAT || 'json',
      },
    };

    const { error, value } = serviceConfigSchema.validate(config);
    if (error) {
      throw new Error(`Service configuration validation failed: ${error.message}`);
    }

    return value;
  }

  /**
   * Create database configuration based on service
   */
  private static createDatabaseConfig(): DatabaseConfig {
    if (process.env.DATABASE_URL) {
      return DatabaseConfigFactory.createFromUrl(process.env.DATABASE_URL);
    }
    return DatabaseConfigFactory.create();
  }

  /**
   * Check if Kafka should be included based on service requirements
   */
  private static shouldIncludeKafka(): boolean {
    const kafkaServices = ['financial-service', 'subsidy-service', 'insurance-service', 'notification-service'];
    const serviceName = process.env.SERVICE_NAME || '';
    return kafkaServices.includes(serviceName);
  }
}

/**
 * Environment helper functions
 */
export class EnvironmentUtils {
  /**
   * Check if running in development environment
   */
  static isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }

  /**
   * Check if running in production environment
   */
  static isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  /**
   * Check if running in test environment
   */
  static isTest(): boolean {
    return process.env.NODE_ENV === 'test';
  }

  /**
   * Get required environment variable
   */
  static getRequired(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Required environment variable '${key}' is not set`);
    }
    return value;
  }

  /**
   * Get environment variable with default value
   */
  static get(key: string, defaultValue: string): string {
    return process.env[key] || defaultValue;
  }

  /**
   * Get boolean environment variable
   */
  static getBoolean(key: string, defaultValue: boolean = false): boolean {
    const value = process.env[key];
    if (!value) return defaultValue;
    return value.toLowerCase() === 'true';
  }

  /**
   * Get number environment variable
   */
  static getNumber(key: string, defaultValue: number): number {
    const value = process.env[key];
    if (!value) return defaultValue;
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      throw new Error(`Environment variable '${key}' must be a valid number`);
    }
    return parsed;
  }

  /**
   * Get array environment variable (JSON or comma-separated)
   */
  static getArray(key: string, defaultValue: string[] = []): string[] {
    const value = process.env[key];
    if (!value) return defaultValue;
    
    // Try JSON parsing first
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch { 
      /* fallback to CSV */ 
    }
    
    // Fallback to comma-separated values
    return value.split(',').map(s => s.trim()).filter(Boolean);
  }

  /**
   * Validate required environment variables
   */
  static validateRequired(keys: string[]): void {
    const missing: string[] = [];
    
    for (const key of keys) {
      if (!process.env[key]) {
        missing.push(key);
      }
    }
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }
}

/**
 * Configuration constants
 */
export const CONFIG_KEYS = {
  // Service
  SERVICE_NAME: 'SERVICE_NAME',
  SERVICE_VERSION: 'SERVICE_VERSION',
  PORT: 'PORT',
  NODE_ENV: 'NODE_ENV',
  
  // Database
  DATABASE_URL: 'DATABASE_URL',
  DB_HOST: 'DB_HOST',
  DB_PORT: 'DB_PORT',
  DB_NAME: 'DB_NAME',
  DB_USERNAME: 'DB_USERNAME',
  DB_PASSWORD: 'DB_PASSWORD',
  
  // Redis
  REDIS_URL: 'REDIS_URL',
  REDIS_PASSWORD: 'REDIS_PASSWORD',
  REDIS_TTL: 'REDIS_TTL',
  
  // JWT
  JWT_SECRET: 'JWT_SECRET',
  JWT_REFRESH_SECRET: 'JWT_REFRESH_SECRET',
  JWT_ACCESS_EXPIRY: 'JWT_ACCESS_EXPIRY',
  JWT_REFRESH_EXPIRY: 'JWT_REFRESH_EXPIRY',
  
  // Kafka
  KAFKA_BROKERS: 'KAFKA_BROKERS',
  KAFKA_GROUP_ID: 'KAFKA_GROUP_ID',
  KAFKA_CLIENT_ID: 'KAFKA_CLIENT_ID',
  
  // External APIs
  WEATHER_API_KEY: 'WEATHER_API_KEY',
  USDA_API_KEY: 'USDA_API_KEY',
  
  // File Storage
  AWS_ACCESS_KEY_ID: 'AWS_ACCESS_KEY_ID',
  AWS_SECRET_ACCESS_KEY: 'AWS_SECRET_ACCESS_KEY',
  AWS_REGION: 'AWS_REGION',
  AWS_S3_BUCKET: 'AWS_S3_BUCKET',
  
  // Email
  SMTP_HOST: 'SMTP_HOST',
  SMTP_PORT: 'SMTP_PORT',
  SMTP_USER: 'SMTP_USER',
  SMTP_PASS: 'SMTP_PASS',
  
  // Monitoring
  SENTRY_DSN: 'SENTRY_DSN',
  LOG_LEVEL: 'LOG_LEVEL',
  LOG_FORMAT: 'LOG_FORMAT',
} as const;

/**
 * Default service configuration presets
 */
export const SERVICE_PRESETS = {
  'auth-service': {
    port: 3001,
    requiredEnvVars: ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DATABASE_URL'],
    features: ['jwt', 'database', 'redis'],
  },
  'financial-service': {
    port: 3002,
    requiredEnvVars: ['DATABASE_URL', 'KAFKA_BROKERS'],
    features: ['database', 'redis', 'kafka', 'elasticsearch'],
  },
  'subsidy-service': {
    port: 3003,
    requiredEnvVars: ['MONGODB_URL', 'KAFKA_BROKERS'],
    features: ['mongodb', 'redis', 'kafka'],
  },
  'insurance-service': {
    port: 3004,
    requiredEnvVars: ['MONGODB_URL', 'KAFKA_BROKERS'],
    features: ['mongodb', 'redis', 'kafka'],
  },
  'api-gateway': {
    port: 3000,
    requiredEnvVars: ['JWT_SECRET', 'REDIS_URL'],
    features: ['redis', 'jwt'],
  },
} as const;

// Export singleton instance
export const configManager = ConfigManager.getInstance();