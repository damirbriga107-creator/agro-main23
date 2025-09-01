import { Pool, Client } from 'pg';
import { MongoClient, Db } from 'mongodb';
import { createClient, RedisClientType } from 'redis';
import { createClient as createClickHouseClient, ClickHouseClient } from '@clickhouse/client';
import { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import { DatabaseConnection, DatabaseConfig } from './types';

export class DatabaseConnectionManager {
  private connections: Map<string, DatabaseConnection> = new Map();
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  /**
   * Initialize all database connections
   */
  async initializeAll(): Promise<void> {
    await Promise.all([
      this.initializePostgreSQL(),
      this.initializeMongoDB(),
      this.initializeRedis(),
      this.initializeClickHouse(),
      this.initializeElasticsearch(),
    ]);
  }

  /**
   * Initialize PostgreSQL connection
   */
  async initializePostgreSQL(): Promise<Pool> {
    try {
      const pool = new Pool({
        host: this.config.postgresql.host,
        port: this.config.postgresql.port,
        database: this.config.postgresql.database,
        user: this.config.postgresql.username,
        password: this.config.postgresql.password,
        ssl: this.config.postgresql.ssl,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      // Test connection
      const client = await pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      this.connections.set('postgresql', {
        type: 'postgresql',
        connection: pool,
        isConnected: true,
      });

      console.log('✅ PostgreSQL connection established');
      return pool;
    } catch (error) {
      console.error('❌ PostgreSQL connection failed:', error);
      throw error;
    }
  }

  /**
   * Initialize MongoDB connection
   */
  async initializeMongoDB(): Promise<Db> {
    try {
      const client = new MongoClient(this.config.mongodb.url);
      await client.connect();
      
      const db = client.db(this.config.mongodb.database);
      
      // Test connection
      await db.admin().ping();

      this.connections.set('mongodb', {
        type: 'mongodb',
        connection: { client, db },
        isConnected: true,
      });

      console.log('✅ MongoDB connection established');
      return db;
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      throw error;
    }
  }

  /**
   * Initialize Redis connection
   */
  async initializeRedis(): Promise<RedisClientType> {
    try {
      const client = createClient({
        url: this.config.redis.url,
      });

      client.on('error', (err) => {
        console.error('Redis Client Error:', err);
      });

      await client.connect();

      // Test connection
      await client.ping();

      this.connections.set('redis', {
        type: 'redis',
        connection: client,
        isConnected: true,
      });

      console.log('✅ Redis connection established');
      return client;
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
      throw error;
    }
  }

  /**
   * Initialize ClickHouse connection
   */
  async initializeClickHouse(): Promise<ClickHouseClient> {
    try {
      const client = createClickHouseClient({
        url: this.config.clickhouse.url,
        database: this.config.clickhouse.database,
        username: this.config.clickhouse.username,
        password: this.config.clickhouse.password,
      });

      // Test connection
      await client.ping();

      this.connections.set('clickhouse', {
        type: 'clickhouse',
        connection: client,
        isConnected: true,
      });

      console.log('✅ ClickHouse connection established');
      return client;
    } catch (error) {
      console.error('❌ ClickHouse connection failed:', error);
      throw error;
    }
  }

  /**
   * Initialize Elasticsearch connection
   */
  async initializeElasticsearch(): Promise<ElasticsearchClient> {
    try {
      const client = new ElasticsearchClient({
        node: this.config.elasticsearch.url,
      });

      // Test connection
      await client.ping();

      this.connections.set('elasticsearch', {
        type: 'elasticsearch',
        connection: client,
        isConnected: true,
      });

      console.log('✅ Elasticsearch connection established');
      return client;
    } catch (error) {
      console.error('❌ Elasticsearch connection failed:', error);
      throw error;
    }
  }

  /**
   * Get connection by type
   */
  getConnection(type: string): DatabaseConnection | undefined {
    return this.connections.get(type);
  }

  /**
   * Get PostgreSQL pool
   */
  getPostgreSQL(): Pool {
    const connection = this.connections.get('postgresql');
    if (!connection || !connection.isConnected) {
      throw new Error('PostgreSQL connection not established');
    }
    return connection.connection;
  }

  /**
   * Get MongoDB database
   */
  getMongoDB(): Db {
    const connection = this.connections.get('mongodb');
    if (!connection || !connection.isConnected) {
      throw new Error('MongoDB connection not established');
    }
    return connection.connection.db;
  }

  /**
   * Get Redis client
   */
  getRedis(): RedisClientType {
    const connection = this.connections.get('redis');
    if (!connection || !connection.isConnected) {
      throw new Error('Redis connection not established');
    }
    return connection.connection;
  }

  /**
   * Get ClickHouse client
   */
  getClickHouse(): ClickHouseClient {
    const connection = this.connections.get('clickhouse');
    if (!connection || !connection.isConnected) {
      throw new Error('ClickHouse connection not established');
    }
    return connection.connection;
  }

  /**
   * Get Elasticsearch client
   */
  getElasticsearch(): ElasticsearchClient {
    const connection = this.connections.get('elasticsearch');
    if (!connection || !connection.isConnected) {
      throw new Error('Elasticsearch connection not established');
    }
    return connection.connection;
  }

  /**
   * Close all connections
   */
  async closeAll(): Promise<void> {
    const closePromises: Promise<void>[] = [];

    for (const [type, connection] of this.connections) {
      if (connection.isConnected) {
        switch (type) {
          case 'postgresql':
            closePromises.push(connection.connection.end());
            break;
          case 'mongodb':
            closePromises.push(connection.connection.client.close());
            break;
          case 'redis':
            closePromises.push(connection.connection.quit());
            break;
          case 'clickhouse':
            closePromises.push(connection.connection.close());
            break;
          case 'elasticsearch':
            closePromises.push(connection.connection.close());
            break;
        }
      }
    }

    await Promise.all(closePromises);
    this.connections.clear();
    console.log('✅ All database connections closed');
  }

  /**
   * Health check for all connections
   */
  async healthCheck(): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {};

    for (const [type, connection] of this.connections) {
      try {
        switch (type) {
          case 'postgresql':
            const client = await connection.connection.connect();
            await client.query('SELECT 1');
            client.release();
            health[type] = true;
            break;
          case 'mongodb':
            await connection.connection.db.admin().ping();
            health[type] = true;
            break;
          case 'redis':
            await connection.connection.ping();
            health[type] = true;
            break;
          case 'clickhouse':
            await connection.connection.ping();
            health[type] = true;
            break;
          case 'elasticsearch':
            await connection.connection.ping();
            health[type] = true;
            break;
        }
      } catch (error) {
        health[type] = false;
        console.error(`❌ Health check failed for ${type}:`, error.message);
      }
    }

    return health;
  }
}