import { Pool } from 'pg';
import { Db } from 'mongodb';
import { ClickHouseClient } from '@clickhouse/client';
import { SeedData } from './types';
import { DatabaseConnectionManager } from './connections';
import chalk from 'chalk';

export class SeedManager {
  private connectionManager: DatabaseConnectionManager;
  private seeds: Map<string, SeedData[]> = new Map();

  constructor(connectionManager: DatabaseConnectionManager) {
    this.connectionManager = connectionManager;
  }

  /**
   * Register seed data for a specific database
   */
  registerSeeds(database: string, seeds: SeedData[]): void {
    this.seeds.set(database, seeds.sort((a, b) => a.priority - b.priority));
  }

  /**
   * Run all seed data
   */
  async runSeeds(): Promise<void> {
    console.log(chalk.blue('🌱 Starting database seeding...'));

    for (const [database, seeds] of this.seeds) {
      console.log(chalk.yellow(`\n📦 Seeding ${database}...`));
      
      for (const seed of seeds) {
        await this.runSeed(database, seed);
      }
    }

    console.log(chalk.green('\n✅ All seeds completed successfully!'));
  }

  /**
   * Run a single seed
   */
  private async runSeed(database: string, seed: SeedData): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log(chalk.blue(`  ⏳ Running seed: ${seed.name}`));
      
      await seed.execute();
      
      const executionTime = Date.now() - startTime;
      console.log(chalk.green(`  ✅ Completed: ${seed.name} (${executionTime}ms)`));
    } catch (error) {
      console.error(chalk.red(`  ❌ Failed: ${seed.name}`));
      console.error(chalk.red(`     Error: ${error.message}`));
      throw error;
    }
  }

  /**
   * Clear all data (for testing purposes)
   */
  async clearAllData(): Promise<void> {
    console.log(chalk.yellow('🧹 Clearing all database data...'));

    // Clear PostgreSQL data
    try {
      const pool = this.connectionManager.getPostgreSQL();
      
      // Get all tables
      const result = await pool.query(`
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename != 'schema_migrations'
      `);
      
      // Disable foreign key checks temporarily
      await pool.query('SET session_replication_role = replica;');
      
      // Truncate all tables
      for (const row of result.rows) {
        await pool.query(`TRUNCATE TABLE ${row.tablename} RESTART IDENTITY CASCADE`);
      }
      
      // Re-enable foreign key checks
      await pool.query('SET session_replication_role = DEFAULT;');
      
      console.log(chalk.green('✅ PostgreSQL data cleared'));
    } catch (error) {
      console.error(chalk.red('❌ Error clearing PostgreSQL data:', error.message));
    }

    // Clear MongoDB data
    try {
      const db = this.connectionManager.getMongoDB();
      
      // Get all collections except schema_migrations
      const collections = await db.listCollections().toArray();
      
      for (const collection of collections) {
        if (collection.name !== 'schema_migrations') {
          await db.collection(collection.name).deleteMany({});
        }
      }
      
      console.log(chalk.green('✅ MongoDB data cleared'));
    } catch (error) {
      console.error(chalk.red('❌ Error clearing MongoDB data:', error.message));
    }

    // Clear ClickHouse data
    try {
      const client = this.connectionManager.getClickHouse();
      
      // Get all tables
      const result = await client.query({
        query: `
          SELECT name FROM system.tables 
          WHERE database = 'daorsagro' 
          AND name != 'schema_migrations'
        `,
        format: 'JSONEachRow'
      });
      
      const tables = await result.json();
      
      for (const table of Array.isArray(tables) ? tables : [tables]) {
        if (table && table.name) {
          await client.command({
            query: `TRUNCATE TABLE ${table.name}`
          });
        }
      }
      
      console.log(chalk.green('✅ ClickHouse data cleared'));
    } catch (error) {
      console.error(chalk.red('❌ Error clearing ClickHouse data:', error.message));
    }

    console.log(chalk.green('✅ All database data cleared'));
  }
}