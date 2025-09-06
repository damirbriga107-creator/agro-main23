import { MongoClient, Db } from 'mongodb';
import { ClickHouseClient, createClient } from '@clickhouse/client';
import Redis from 'ioredis';
import { Kafka, Producer, Consumer } from 'kafkajs';
import { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import { PrismaClient } from '@prisma/client';

import { ConfigManager } from '@daorsagro/config';
import { Logger } from './logger';

/**
 * Database connection manager for PostgreSQL using Prisma
 */
export class PostgresConnection {
  private static instance: PostgresConnection;
  private client: PrismaClient;
  private logger: Logger;
  private isConnected: boolean = false;

  private constructor() {
    this.logger = new Logger('PostgresConnection');
    this.client = new PrismaClient({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'event' },
        { level: 'info', emit: 'event' },
        { level: 'warn', emit: 'event' },
      ],
      errorFormat: 'pretty',
    });

    // Setup event listeners
    this.setupEventListeners();
  }

  public static getInstance(): PostgresConnection {
    if (!PostgresConnection.instance) {
      PostgresConnection.instance = new PostgresConnection();
    }
    return PostgresConnection.instance;
  }

  private setupEventListeners(): void {
    this.client.$on('query', (e: any) => {
      this.logger.debug('Query executed', {
        query: e.query,
        params: e.params,
        duration: e.duration,
        target: e.target,
      });
    });

    this.client.$on('error', (e: any) => {
      this.logger.error('Prisma error', e);
    });

    this.client.$on('info', (e: any) => {
      this.logger.info('Prisma info', e);
    });

    this.client.$on('warn', (e: any) => {
      this.logger.warn('Prisma warning', e);
    });
  }

  public async connect(): Promise<void> {
    try {
      await this.client.$connect();
      this.isConnected = true;
      this.logger.info('Connected to PostgreSQL database');
    } catch (error) {
      this.logger.error('Failed to connect to PostgreSQL database', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.client.$disconnect();
      this.isConnected = false;
      this.logger.info('Disconnected from PostgreSQL database');
    } catch (error) {
      this.logger.error('Error disconnecting from PostgreSQL database', error);
      throw error;
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await this.client.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('PostgreSQL health check failed', error);
      return false;
    }
  }

  public getClient(): PrismaClient {
    if (!this.isConnected) {
      throw new Error('Database is not connected. Call connect() first.');
    }
    return this.client;
  }

  public isHealthy(): boolean {
    return this.isConnected;
  }
}

/**
 * MongoDB connection manager
 */
export class MongoConnection {
  private static instance: MongoConnection;
  private client: MongoClient;
  private db!: Db;
  private logger: Logger;
  private isConnected: boolean = false;
  private connectionUrl: string;
  private databaseName: string;

  private constructor() {
    this.logger = new Logger('MongoConnection');
    const configManager = ConfigManager.getInstance();
    this.connectionUrl = configManager.get('MONGODB_URL');
    this.databaseName = configManager.get('MONGODB_DATABASE', 'daorsagro');
    
    this.client = new MongoClient(this.connectionUrl, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
    });
  }

  public static getInstance(): MongoConnection {
    if (!MongoConnection.instance) {
      MongoConnection.instance = new MongoConnection();
    }
    return MongoConnection.instance;
  }

  public async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.db = this.client.db(this.databaseName);
      this.isConnected = true;
      this.logger.info('Connected to MongoDB database');
    } catch (error) {
      this.logger.error('Failed to connect to MongoDB database', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.client.close();
      this.isConnected = false;
      this.logger.info('Disconnected from MongoDB database');
    } catch (error) {
      this.logger.error('Error disconnecting from MongoDB database', error);
      throw error;
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await this.db.admin().ping();
      return true;
    } catch (error) {
      this.logger.error('MongoDB health check failed', error);
      return false;
    }
  }

  public getDatabase(): Db {
    if (!this.isConnected || !this.db) {
      throw new Error('MongoDB is not connected. Call connect() first.');
    }
    return this.db;
  }

  public getClient(): MongoClient {
    if (!this.isConnected) {
      throw new Error('MongoDB is not connected. Call connect() first.');
    }
    return this.client;
  }

  public isHealthy(): boolean {
    return this.isConnected;
  }
}

/**
 * ClickHouse connection manager for analytics
 */
export class ClickHouseConnection {
  private static instance: ClickHouseConnection;
  private client: ClickHouseClient;
  private logger: Logger;
  private isConnected: boolean = false;

  private constructor() {
    this.logger = new Logger('ClickHouseConnection');
    const configManager = ConfigManager.getInstance();
    
    this.client = createClient({
      host: configManager.get('CLICKHOUSE_URL'),
      username: configManager.get('CLICKHOUSE_USERNAME', 'default'),
      password: configManager.get('CLICKHOUSE_PASSWORD', ''),
      database: configManager.get('CLICKHOUSE_DATABASE', 'default'),
      clickhouse_settings: {
        async_insert: 1,
        wait_for_async_insert: 0,
      },
      compression: {
        response: true,
        request: true,
      },
    } as any);
  }

  public static getInstance(): ClickHouseConnection {
    if (!ClickHouseConnection.instance) {
      ClickHouseConnection.instance = new ClickHouseConnection();
    }
    return ClickHouseConnection.instance;
  }

  public async connect(): Promise<void> {
    try {
      await this.client.ping();
      this.isConnected = true;
      this.logger.info('Connected to ClickHouse database');
    } catch (error) {
      this.logger.error('Failed to connect to ClickHouse database', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.client.close();
      this.isConnected = false;
      this.logger.info('Disconnected from ClickHouse database');
    } catch (error) {
      this.logger.error('Error disconnecting from ClickHouse database', error);
      throw error;
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch (error) {
      this.logger.error('ClickHouse health check failed', error);
      return false;
    }
  }

  public getClient(): ClickHouseClient {
    if (!this.isConnected) {
      throw new Error('ClickHouse is not connected. Call connect() first.');
    }
    return this.client;
  }

  public isHealthy(): boolean {
    return this.isConnected;
  }
}

/**
 * Redis connection manager
 */
export class RedisConnection {
  private static instance: RedisConnection;
  private client: Redis;
  private logger: Logger;
  private isConnected: boolean = false;

  private constructor() {
    this.logger = new Logger('RedisConnection');
    const configManager = ConfigManager.getInstance();
    
    this.client = new Redis({
      host: configManager.get('REDIS_HOST', 'localhost'),
      port: Number(configManager.get('REDIS_PORT', 6379)),
      password: configManager.get('REDIS_PASSWORD', undefined as any),
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      family: 4,
    } as any);

    this.setupEventListeners();
  }

  public static getInstance(): RedisConnection {
    if (!RedisConnection.instance) {
      RedisConnection.instance = new RedisConnection();
    }
    return RedisConnection.instance;
  }

  private setupEventListeners(): void {
    this.client.on('connect', () => {
      this.isConnected = true;
      this.logger.info('Connected to Redis');
    });

    this.client.on('error', (error) => {
      this.logger.error('Redis connection error', error);
      this.isConnected = false;
    });

    this.client.on('close', () => {
      this.isConnected = false;
      this.logger.info('Redis connection closed');
    });

    this.client.on('reconnecting', () => {
      this.logger.info('Reconnecting to Redis');
    });
  }

  public async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.logger.info('Connected to Redis');
    } catch (error) {
      this.logger.error('Failed to connect to Redis', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.client.quit();
      this.isConnected = false;
      this.logger.info('Disconnected from Redis');
    } catch (error) {
      this.logger.error('Error disconnecting from Redis', error);
      throw error;
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error('Redis health check failed', error);
      return false;
    }
  }

  public getClient(): Redis {
    if (!this.isConnected) {
      throw new Error('Redis is not connected. Call connect() first.');
    }
    return this.client;
  }

  public isHealthy(): boolean {
    return this.isConnected;
  }
}

/**
 * Elasticsearch connection manager
 */
export class ElasticsearchConnection {
  private static instance: ElasticsearchConnection;
  private client: ElasticsearchClient;
  private logger: Logger;
  private isConnected: boolean = false;

  private constructor() {
    this.logger = new Logger('ElasticsearchConnection');
    const configManager = ConfigManager.getInstance();
    
    this.client = new ElasticsearchClient({
      node: configManager.get('ELASTICSEARCH_URL'),
      maxRetries: 3,
      requestTimeout: 30000,
    });
  }

  public static getInstance(): ElasticsearchConnection {
    if (!ElasticsearchConnection.instance) {
      ElasticsearchConnection.instance = new ElasticsearchConnection();
    }
    return ElasticsearchConnection.instance;
  }

  public async connect(): Promise<void> {
    try {
      await this.client.ping();
      this.isConnected = true;
      this.logger.info('Connected to Elasticsearch');
    } catch (error) {
      this.logger.error('Failed to connect to Elasticsearch', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.client.close();
      this.isConnected = false;
      this.logger.info('Disconnected from Elasticsearch');
    } catch (error) {
      this.logger.error('Error disconnecting from Elasticsearch', error);
      throw error;
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.cluster.health();
      return response.status !== 'red';
    } catch (error) {
      this.logger.error('Elasticsearch health check failed', error);
      return false;
    }
  }

  public getClient(): ElasticsearchClient {
    if (!this.isConnected) {
      throw new Error('Elasticsearch is not connected. Call connect() first.');
    }
    return this.client;
  }

  public isHealthy(): boolean {
    return this.isConnected;
  }
}

/**
 * Kafka connection manager
 */
export class KafkaConnection {
  private static instance: KafkaConnection;
  private kafka: Kafka;
  private producer: Producer;
  private consumers: Map<string, Consumer> = new Map();
  private logger: Logger;
  private isConnected: boolean = false;

  private constructor() {
    this.logger = new Logger('KafkaConnection');
    const configManager = ConfigManager.getInstance();
    
    this.kafka = new Kafka({
      clientId: configManager.get('KAFKA_CLIENT_ID', 'daorsagro'),
      brokers: configManager.get('KAFKA_BROKERS', ['localhost:9092']),
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    });

    this.producer = this.kafka.producer({
      maxInFlightRequests: 1,
      idempotent: true,
      transactionTimeout: 30000,
    });
  }

  public static getInstance(): KafkaConnection {
    if (!KafkaConnection.instance) {
      KafkaConnection.instance = new KafkaConnection();
    }
    return KafkaConnection.instance;
  }

  public async connect(): Promise<void> {
    try {
      await this.producer.connect();
      this.isConnected = true;
      this.logger.info('Connected to Kafka');
    } catch (error) {
      this.logger.error('Failed to connect to Kafka', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.producer.disconnect();
      
      // Disconnect all consumers
      for (const [groupId, consumer] of this.consumers) {
        await consumer.disconnect();
        this.logger.info(`Disconnected Kafka consumer for group: ${groupId}`);
      }
      
      this.consumers.clear();
      this.isConnected = false;
      this.logger.info('Disconnected from Kafka');
    } catch (error) {
      this.logger.error('Error disconnecting from Kafka', error);
      throw error;
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const admin = this.kafka.admin();
      await admin.connect();
      await admin.listTopics();
      await admin.disconnect();
      return true;
    } catch (error) {
      this.logger.error('Kafka health check failed', error);
      return false;
    }
  }

  public getProducer(): Producer {
    if (!this.isConnected) {
      throw new Error('Kafka is not connected. Call connect() first.');
    }
    return this.producer;
  }

  public async createConsumer(groupId: string): Promise<Consumer> {
    if (!this.isConnected) {
      throw new Error('Kafka is not connected. Call connect() first.');
    }

    if (this.consumers.has(groupId)) {
      return this.consumers.get(groupId)!;
    }

    const consumer = this.kafka.consumer({ groupId });
    await consumer.connect();
    this.consumers.set(groupId, consumer);
    this.logger.info(`Created Kafka consumer for group: ${groupId}`);
    
    return consumer;
  }

  public isHealthy(): boolean {
    return this.isConnected;
  }
}

/**
 * Database manager that handles all database connections
 */
export class DatabaseManager {
  private static instance: DatabaseManager;
  private logger: Logger;
  private connections: Map<string, any> = new Map();

  private constructor() {
    this.logger = new Logger('DatabaseManager');
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public async initializeConnections(): Promise<void> {
    const connectionPromises: Promise<void>[] = [];

    // Initialize PostgreSQL
    try {
      const postgres = PostgresConnection.getInstance();
      connectionPromises.push(postgres.connect());
      this.connections.set('postgres', postgres);
    } catch (error) {
      this.logger.warn('PostgreSQL initialization skipped', error);
    }

    // Initialize MongoDB
    try {
      const mongo = MongoConnection.getInstance();
      connectionPromises.push(mongo.connect());
      this.connections.set('mongodb', mongo);
    } catch (error) {
      this.logger.warn('MongoDB initialization skipped', error);
    }

    // Initialize ClickHouse
    try {
      const clickhouse = ClickHouseConnection.getInstance();
      connectionPromises.push(clickhouse.connect());
      this.connections.set('clickhouse', clickhouse);
    } catch (error) {
      this.logger.warn('ClickHouse initialization skipped', error);
    }

    // Initialize Redis
    try {
      const redis = RedisConnection.getInstance();
      connectionPromises.push(redis.connect());
      this.connections.set('redis', redis);
    } catch (error) {
      this.logger.warn('Redis initialization skipped', error);
    }

    // Initialize Elasticsearch
    try {
      const elasticsearch = ElasticsearchConnection.getInstance();
      connectionPromises.push(elasticsearch.connect());
      this.connections.set('elasticsearch', elasticsearch);
    } catch (error) {
      this.logger.warn('Elasticsearch initialization skipped', error);
    }

    // Initialize Kafka
    try {
      const kafka = KafkaConnection.getInstance();
      connectionPromises.push(kafka.connect());
      this.connections.set('kafka', kafka);
    } catch (error) {
      this.logger.warn('Kafka initialization skipped', error);
    }

    // Wait for all connections to complete
    await Promise.allSettled(connectionPromises);
    
    this.logger.info('Database connections initialization completed');
  }

  public async closeAllConnections(): Promise<void> {
    const disconnectionPromises: Promise<void>[] = [];

    for (const [name, connection] of this.connections) {
      try {
        disconnectionPromises.push(connection.disconnect());
      } catch (error) {
        this.logger.error(`Error disconnecting ${name}`, error);
      }
    }

    await Promise.allSettled(disconnectionPromises);
    this.connections.clear();
    this.logger.info('All database connections closed');
  }

  public async healthCheck(): Promise<{ [key: string]: boolean }> {
    const healthChecks: { [key: string]: boolean } = {};

    for (const [name, connection] of this.connections) {
      try {
        healthChecks[name] = await connection.healthCheck();
      } catch (error) {
        this.logger.error(`Health check failed for ${name}`, error);
        healthChecks[name] = false;
      }
    }

    return healthChecks;
  }

  public getConnection<T>(name: string): T {
    const connection = this.connections.get(name);
    if (!connection) {
      throw new Error(`Connection ${name} not found. Make sure it's initialized.`);
    }
    return connection;
  }
}

/**
 * Service health check utility
 */
export class HealthCheckService {
  private logger: Logger;
  private databaseManager: DatabaseManager;

  constructor() {
    this.logger = new Logger('HealthCheckService');
    this.databaseManager = DatabaseManager.getInstance();
  }

  public async getOverallHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: { [key: string]: { status: boolean; message?: string } };
    timestamp: string;
    uptime: number;
  }> {
    const checks: { [key: string]: { status: boolean; message?: string } } = {};
    let healthyCount = 0;
    let totalChecks = 0;

    // Database health checks
    try {
      const dbHealth = await this.databaseManager.healthCheck();
      Object.entries(dbHealth).forEach(([name, status]) => {
        checks[name] = { status };
        if (status) healthyCount++;
        totalChecks++;
      });
    } catch (error) {
      this.logger.error('Database health check failed', error);
      checks['database'] = { status: false, message: 'Database check failed' };
      totalChecks++;
    }

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyCount === totalChecks) {
      overallStatus = 'healthy';
    } else if (healthyCount > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'unhealthy';
    }

    return {
      status: overallStatus,
      checks,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}