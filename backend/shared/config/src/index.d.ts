import { DatabaseConfig, RedisConfig, KafkaConfig, JWTConfig, ServiceConfig } from '@daorsagro/types';
/**
 * Configuration manager class
 */
export declare class ConfigManager {
    private static instance;
    private configs;
    private constructor();
    static getInstance(): ConfigManager;
    /**
     * Get configuration value by key
     */
    get<T = any>(key: string, defaultValue?: T): T;
    /**
     * Set configuration value
     */
    set(key: string, value: any): void;
    /**
     * Check if configuration key exists
     */
    has(key: string): boolean;
    /**
     * Get all configuration keys
     */
    keys(): string[];
    /**
     * Parse environment variable value
     */
    private parseValue;
}
/**
 * Database configuration factory
 */
export declare class DatabaseConfigFactory {
    /**
     * Create database configuration from environment variables
     */
    static create(envPrefix?: string): DatabaseConfig;
    /**
     * Create database configuration from URL
     */
    static createFromUrl(url: string): DatabaseConfig;
}
/**
 * Redis configuration factory
 */
export declare class RedisConfigFactory {
    /**
     * Create Redis configuration from environment variables
     */
    static create(): RedisConfig;
}
/**
 * Kafka configuration factory
 */
export declare class KafkaConfigFactory {
    /**
     * Create Kafka configuration from environment variables
     */
    static create(): KafkaConfig;
}
/**
 * JWT configuration factory
 */
export declare class JWTConfigFactory {
    /**
     * Create JWT configuration from environment variables
     */
    static create(): JWTConfig;
}
/**
 * Service configuration factory
 */
export declare class ServiceConfigFactory {
    /**
     * Create service configuration
     */
    static create(serviceName: string, port: number): ServiceConfig;
    /**
     * Create database configuration based on service
     */
    private static createDatabaseConfig;
    /**
     * Check if Kafka should be included based on service requirements
     */
    private static shouldIncludeKafka;
}
/**
 * Environment helper functions
 */
export declare class EnvironmentUtils {
    /**
     * Check if running in development environment
     */
    static isDevelopment(): boolean;
    /**
     * Check if running in production environment
     */
    static isProduction(): boolean;
    /**
     * Check if running in test environment
     */
    static isTest(): boolean;
    /**
     * Get required environment variable
     */
    static getRequired(key: string): string;
    /**
     * Get environment variable with default value
     */
    static get(key: string, defaultValue: string): string;
    /**
     * Get boolean environment variable
     */
    static getBoolean(key: string, defaultValue?: boolean): boolean;
    /**
     * Get number environment variable
     */
    static getNumber(key: string, defaultValue: number): number;
    /**
     * Get array environment variable (JSON or comma-separated)
     */
    static getArray(key: string, defaultValue?: string[]): string[];
    /**
     * Validate required environment variables
     */
    static validateRequired(keys: string[]): void;
}
/**
 * Configuration constants
 */
export declare const CONFIG_KEYS: {
    readonly SERVICE_NAME: "SERVICE_NAME";
    readonly SERVICE_VERSION: "SERVICE_VERSION";
    readonly PORT: "PORT";
    readonly NODE_ENV: "NODE_ENV";
    readonly DATABASE_URL: "DATABASE_URL";
    readonly DB_HOST: "DB_HOST";
    readonly DB_PORT: "DB_PORT";
    readonly DB_NAME: "DB_NAME";
    readonly DB_USERNAME: "DB_USERNAME";
    readonly DB_PASSWORD: "DB_PASSWORD";
    readonly REDIS_URL: "REDIS_URL";
    readonly REDIS_PASSWORD: "REDIS_PASSWORD";
    readonly REDIS_TTL: "REDIS_TTL";
    readonly JWT_SECRET: "JWT_SECRET";
    readonly JWT_REFRESH_SECRET: "JWT_REFRESH_SECRET";
    readonly JWT_ACCESS_EXPIRY: "JWT_ACCESS_EXPIRY";
    readonly JWT_REFRESH_EXPIRY: "JWT_REFRESH_EXPIRY";
    readonly KAFKA_BROKERS: "KAFKA_BROKERS";
    readonly KAFKA_GROUP_ID: "KAFKA_GROUP_ID";
    readonly KAFKA_CLIENT_ID: "KAFKA_CLIENT_ID";
    readonly WEATHER_API_KEY: "WEATHER_API_KEY";
    readonly USDA_API_KEY: "USDA_API_KEY";
    readonly AWS_ACCESS_KEY_ID: "AWS_ACCESS_KEY_ID";
    readonly AWS_SECRET_ACCESS_KEY: "AWS_SECRET_ACCESS_KEY";
    readonly AWS_REGION: "AWS_REGION";
    readonly AWS_S3_BUCKET: "AWS_S3_BUCKET";
    readonly SMTP_HOST: "SMTP_HOST";
    readonly SMTP_PORT: "SMTP_PORT";
    readonly SMTP_USER: "SMTP_USER";
    readonly SMTP_PASS: "SMTP_PASS";
    readonly SENTRY_DSN: "SENTRY_DSN";
    readonly LOG_LEVEL: "LOG_LEVEL";
    readonly LOG_FORMAT: "LOG_FORMAT";
};
/**
 * Default service configuration presets
 */
export declare const SERVICE_PRESETS: {
    readonly 'auth-service': {
        readonly port: 3001;
        readonly requiredEnvVars: readonly ["JWT_SECRET", "JWT_REFRESH_SECRET", "DATABASE_URL"];
        readonly features: readonly ["jwt", "database", "redis"];
    };
    readonly 'financial-service': {
        readonly port: 3002;
        readonly requiredEnvVars: readonly ["DATABASE_URL", "KAFKA_BROKERS"];
        readonly features: readonly ["database", "redis", "kafka", "elasticsearch"];
    };
    readonly 'subsidy-service': {
        readonly port: 3003;
        readonly requiredEnvVars: readonly ["MONGODB_URL", "KAFKA_BROKERS"];
        readonly features: readonly ["mongodb", "redis", "kafka"];
    };
    readonly 'insurance-service': {
        readonly port: 3004;
        readonly requiredEnvVars: readonly ["MONGODB_URL", "KAFKA_BROKERS"];
        readonly features: readonly ["mongodb", "redis", "kafka"];
    };
    readonly 'api-gateway': {
        readonly port: 3000;
        readonly requiredEnvVars: readonly ["JWT_SECRET", "REDIS_URL"];
        readonly features: readonly ["redis", "jwt"];
    };
};
export declare const configManager: ConfigManager;
//# sourceMappingURL=index.d.ts.map