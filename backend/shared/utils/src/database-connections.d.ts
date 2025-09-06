import { PrismaClient } from '@prisma/client';
import { MongoClient, Db } from 'mongodb';
import { ClickHouseClient } from '@clickhouse/client';
import Redis from 'ioredis';
import { Producer, Consumer } from 'kafkajs';
import { Client as ElasticsearchClient } from '@elastic/elasticsearch';
/**
 * Database connection manager for PostgreSQL using Prisma
 */
export declare class PostgresConnection {
    private static instance;
    private client;
    private logger;
    private isConnected;
    private constructor();
    static getInstance(): PostgresConnection;
    private setupEventListeners;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    healthCheck(): Promise<boolean>;
    getClient(): PrismaClient;
    isHealthy(): boolean;
}
/**
 * MongoDB connection manager
 */
export declare class MongoConnection {
    private static instance;
    private client;
    private db;
    private logger;
    private isConnected;
    private connectionUrl;
    private databaseName;
    private constructor();
    static getInstance(): MongoConnection;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    healthCheck(): Promise<boolean>;
    getDatabase(): Db;
    getClient(): MongoClient;
    isHealthy(): boolean;
}
/**
 * ClickHouse connection manager for analytics
 */
export declare class ClickHouseConnection {
    private static instance;
    private client;
    private logger;
    private isConnected;
    private constructor();
    static getInstance(): ClickHouseConnection;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    healthCheck(): Promise<boolean>;
    getClient(): ClickHouseClient;
    isHealthy(): boolean;
}
/**
 * Redis connection manager
 */
export declare class RedisConnection {
    private static instance;
    private client;
    private logger;
    private isConnected;
    private constructor();
    static getInstance(): RedisConnection;
    private setupEventListeners;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    healthCheck(): Promise<boolean>;
    getClient(): Redis;
    isHealthy(): boolean;
}
/**
 * Elasticsearch connection manager
 */
export declare class ElasticsearchConnection {
    private static instance;
    private client;
    private logger;
    private isConnected;
    private constructor();
    static getInstance(): ElasticsearchConnection;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    healthCheck(): Promise<boolean>;
    getClient(): ElasticsearchClient;
    isHealthy(): boolean;
}
/**
 * Kafka connection manager
 */
export declare class KafkaConnection {
    private static instance;
    private kafka;
    private producer;
    private consumers;
    private logger;
    private isConnected;
    private constructor();
    static getInstance(): KafkaConnection;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    healthCheck(): Promise<boolean>;
    getProducer(): Producer;
    createConsumer(groupId: string): Promise<Consumer>;
    isHealthy(): boolean;
}
/**
 * Database manager that handles all database connections
 */
export declare class DatabaseManager {
    private static instance;
    private logger;
    private connections;
    private constructor();
    static getInstance(): DatabaseManager;
    initializeConnections(): Promise<void>;
    closeAllConnections(): Promise<void>;
    healthCheck(): Promise<{
        [key: string]: boolean;
    }>;
    getConnection<T>(name: string): T;
}
/**
 * Service health check utility
 */
export declare class HealthCheckService {
    private logger;
    private databaseManager;
    constructor();
    getOverallHealth(): Promise<{
        status: 'healthy' | 'degraded' | 'unhealthy';
        checks: {
            [key: string]: {
                status: boolean;
                message?: string;
            };
        };
        timestamp: string;
        uptime: number;
    }>;
}
//# sourceMappingURL=database-connections.d.ts.map