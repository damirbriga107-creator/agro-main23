import { Pool } from 'pg';
import { Db } from 'mongodb';
import { ClickHouseClient } from '@clickhouse/client';
import { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import { Migration, MigrationRecord } from './types';
import { DatabaseConnectionManager } from './connections';
import chalk from 'chalk';

export class MigrationManager {
  private connectionManager: DatabaseConnectionManager;
  private migrations: Map<string, Migration[]> = new Map();

  constructor(connectionManager: DatabaseConnectionManager) {
    this.connectionManager = connectionManager;
  }

  /**
   * Register migrations for a specific database
   */
  registerMigrations(database: string, migrations: Migration[]): void {
    this.migrations.set(database, migrations.sort((a, b) => a.timestamp - b.timestamp));
  }

  /**
   * Initialize migration tables
   */
  async initializeMigrationTables(): Promise<void> {
    await this.initializePostgreSQLMigrationTable();
    await this.initializeMongoDBMigrationCollection();
    await this.initializeClickHouseMigrationTable();
  }

  /**
   * Initialize PostgreSQL migration table
   */
  private async initializePostgreSQLMigrationTable(): Promise<void> {
    const pool = this.connectionManager.getPostgreSQL();
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        execution_time_ms INTEGER NOT NULL
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_schema_migrations_executed_at 
      ON schema_migrations(executed_at)
    `);
  }

  /**
   * Initialize MongoDB migration collection
   */
  private async initializeMongoDBMigrationCollection(): Promise<void> {
    const db = this.connectionManager.getMongoDB();
    
    const collections = await db.listCollections({ name: 'schema_migrations' }).toArray();
    if (collections.length === 0) {
      await db.createCollection('schema_migrations');
      await db.collection('schema_migrations').createIndex({ id: 1 }, { unique: true });
      await db.collection('schema_migrations').createIndex({ executed_at: 1 });
    }
  }

  /**
   * Initialize ClickHouse migration table
   */
  private async initializeClickHouseMigrationTable(): Promise<void> {
    const client = this.connectionManager.getClickHouse();
    
    await client.command({
      query: `
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id String,
          name String,
          executed_at DateTime DEFAULT now(),
          execution_time_ms UInt32
        ) ENGINE = MergeTree()
        ORDER BY executed_at
      `
    });
  }

  /**
   * Run all pending migrations
   */
  async runMigrations(): Promise<void> {
    console.log(chalk.blue('🚀 Starting database migrations...'));

    for (const [database, migrations] of this.migrations) {
      console.log(chalk.yellow(`\n📦 Running migrations for ${database}...`));
      
      const executedMigrations = await this.getExecutedMigrations(database);
      const pendingMigrations = migrations.filter(
        migration => !executedMigrations.includes(migration.id)
      );

      if (pendingMigrations.length === 0) {
        console.log(chalk.green(`✅ No pending migrations for ${database}`));
        continue;
      }

      for (const migration of pendingMigrations) {
        await this.runMigration(database, migration);
      }
    }

    console.log(chalk.green('\n✅ All migrations completed successfully!'));
  }

  /**
   * Run a single migration
   */
  private async runMigration(database: string, migration: Migration): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log(chalk.blue(`  ⏳ Running migration: ${migration.name}`));
      
      await migration.up();
      
      const executionTime = Date.now() - startTime;
      await this.recordMigration(database, migration, executionTime);
      
      console.log(chalk.green(`  ✅ Completed: ${migration.name} (${executionTime}ms)`));
    } catch (error) {
      console.error(chalk.red(`  ❌ Failed: ${migration.name}`));
      console.error(chalk.red(`     Error: ${error.message}`));
      throw error;
    }
  }

  /**
   * Rollback migrations
   */
  async rollbackMigrations(database: string, steps: number = 1): Promise<void> {
    console.log(chalk.yellow(`🔄 Rolling back ${steps} migration(s) for ${database}...`));

    const executedMigrations = await this.getExecutedMigrationRecords(database);
    const migrationsToRollback = executedMigrations
      .sort((a, b) => b.executed_at.getTime() - a.executed_at.getTime())
      .slice(0, steps);

    const allMigrations = this.migrations.get(database) || [];

    for (const migrationRecord of migrationsToRollback) {
      const migration = allMigrations.find(m => m.id === migrationRecord.id);
      if (!migration) {
        console.warn(chalk.yellow(`⚠️  Migration ${migrationRecord.id} not found in code`));
        continue;
      }

      try {
        console.log(chalk.blue(`  ⏳ Rolling back: ${migration.name}`));
        
        await migration.down();
        await this.removeMigrationRecord(database, migration.id);
        
        console.log(chalk.green(`  ✅ Rolled back: ${migration.name}`));
      } catch (error) {
        console.error(chalk.red(`  ❌ Rollback failed: ${migration.name}`));
        console.error(chalk.red(`     Error: ${error.message}`));
        throw error;
      }
    }

    console.log(chalk.green('✅ Rollback completed successfully!'));
  }

  /**
   * Get executed migration IDs
   */
  private async getExecutedMigrations(database: string): Promise<string[]> {
    switch (database) {
      case 'postgresql':
        const pool = this.connectionManager.getPostgreSQL();
        const result = await pool.query('SELECT id FROM schema_migrations ORDER BY executed_at');
        return result.rows.map(row => row.id);

      case 'mongodb':
        const db = this.connectionManager.getMongoDB();
        const docs = await db.collection('schema_migrations')
          .find({}, { projection: { id: 1 } })
          .sort({ executed_at: 1 })
          .toArray();
        return docs.map(doc => doc.id);

      case 'clickhouse':
        const client = this.connectionManager.getClickHouse();
        const rows = await client.query({
          query: 'SELECT id FROM schema_migrations ORDER BY executed_at',
          format: 'JSONEachRow'
        });
        const data = await rows.json();
        return Array.isArray(data) ? data.map((row: any) => row.id) : [];

      default:
        return [];
    }
  }

  /**
   * Get executed migration records
   */
  private async getExecutedMigrationRecords(database: string): Promise<MigrationRecord[]> {
    switch (database) {
      case 'postgresql':
        const pool = this.connectionManager.getPostgreSQL();
        const result = await pool.query(
          'SELECT id, name, executed_at, execution_time_ms FROM schema_migrations ORDER BY executed_at'
        );
        return result.rows;

      case 'mongodb':
        const db = this.connectionManager.getMongoDB();
        const docs = await db.collection('schema_migrations')
          .find({})
          .sort({ executed_at: 1 })
          .toArray();
        return docs.map(doc => ({
          id: doc.id,
          name: doc.name,
          executed_at: doc.executed_at,
          execution_time_ms: doc.execution_time_ms
        }));

      case 'clickhouse':
        const client = this.connectionManager.getClickHouse();
        const rows = await client.query({
          query: 'SELECT id, name, executed_at, execution_time_ms FROM schema_migrations ORDER BY executed_at',
          format: 'JSONEachRow'
        });
        const data = await rows.json();
        return Array.isArray(data) ? data : [];

      default:
        return [];
    }
  }

  /**
   * Record migration execution
   */
  private async recordMigration(database: string, migration: Migration, executionTime: number): Promise<void> {
    const record = {
      id: migration.id,
      name: migration.name,
      executed_at: new Date(),
      execution_time_ms: executionTime
    };

    switch (database) {
      case 'postgresql':
        const pool = this.connectionManager.getPostgreSQL();
        await pool.query(
          'INSERT INTO schema_migrations (id, name, executed_at, execution_time_ms) VALUES ($1, $2, $3, $4)',
          [record.id, record.name, record.executed_at, record.execution_time_ms]
        );
        break;

      case 'mongodb':
        const db = this.connectionManager.getMongoDB();
        await db.collection('schema_migrations').insertOne(record);
        break;

      case 'clickhouse':
        const client = this.connectionManager.getClickHouse();
        await client.insert({
          table: 'schema_migrations',
          values: [record],
          format: 'JSONEachRow'
        });
        break;
    }
  }

  /**
   * Remove migration record
   */
  private async removeMigrationRecord(database: string, migrationId: string): Promise<void> {
    switch (database) {
      case 'postgresql':
        const pool = this.connectionManager.getPostgreSQL();
        await pool.query('DELETE FROM schema_migrations WHERE id = $1', [migrationId]);
        break;

      case 'mongodb':
        const db = this.connectionManager.getMongoDB();
        await db.collection('schema_migrations').deleteOne({ id: migrationId });
        break;

      case 'clickhouse':
        const client = this.connectionManager.getClickHouse();
        await client.command({
          query: `ALTER TABLE schema_migrations DELETE WHERE id = '${migrationId}'`
        });
        break;
    }
  }

  /**
   * Get migration status
   */
  async getMigrationStatus(): Promise<Record<string, { total: number; executed: number; pending: string[] }>> {
    const status: Record<string, { total: number; executed: number; pending: string[] }> = {};

    for (const [database, migrations] of this.migrations) {
      const executedMigrations = await this.getExecutedMigrations(database);
      const pendingMigrations = migrations
        .filter(migration => !executedMigrations.includes(migration.id))
        .map(migration => migration.name);

      status[database] = {
        total: migrations.length,
        executed: executedMigrations.length,
        pending: pendingMigrations
      };
    }

    return status;
  }
}