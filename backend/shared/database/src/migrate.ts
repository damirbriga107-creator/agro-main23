#!/usr/bin/env node

import { DatabaseConnectionManager } from './connections';
import { MigrationManager } from './migration-manager';
import { DatabaseConfig } from './types';
import chalk from 'chalk';

// Import migrations
import { migration as authSchema } from '../migrations/postgresql/001_initial_auth_schema';
import { migration as financialSchema } from '../migrations/postgresql/002_financial_schema';
import { migration as subsidyCollections } from '../migrations/mongodb/001_subsidy_collections';
import { migration as insuranceCollections } from '../migrations/mongodb/002_insurance_collections';
import { migration as analyticsTables } from '../migrations/clickhouse/001_analytics_tables';

async function runMigrations() {
  console.log(chalk.blue('🚀 DaorsAgro Database Migration Tool'));
  console.log(chalk.gray('=====================================\n'));

  const config: DatabaseConfig = {
    postgresql: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'daorsagro',
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres123',
      ssl: process.env.DB_SSL === 'true'
    },
    mongodb: {
      url: process.env.MONGODB_URL || 'mongodb://mongo:mongo123@localhost:27017/daorsagro?authSource=admin',
      database: 'daorsagro'
    },
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    },
    clickhouse: {
      url: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
      database: process.env.CLICKHOUSE_DATABASE || 'daorsagro',
      username: process.env.CLICKHOUSE_USERNAME || 'default',
      password: process.env.CLICKHOUSE_PASSWORD || ''
    },
    elasticsearch: {
      url: process.env.ELASTICSEARCH_URL || 'http://localhost:9200'
    }
  };

  const connectionManager = new DatabaseConnectionManager(config);
  const migrationManager = new MigrationManager(connectionManager);

  try {
    // Initialize connections
    console.log(chalk.blue('📡 Initializing database connections...'));
    await connectionManager.initializeAll();

    // Initialize migration tables
    console.log(chalk.blue('📋 Initializing migration tables...'));
    await migrationManager.initializeMigrationTables();

    // Register migrations
    migrationManager.registerMigrations('postgresql', [
      authSchema,
      financialSchema
    ]);

    migrationManager.registerMigrations('mongodb', [
      subsidyCollections,
      insuranceCollections
    ]);

    migrationManager.registerMigrations('clickhouse', [
      analyticsTables
    ]);

    // Check migration status
    const status = await migrationManager.getMigrationStatus();
    console.log(chalk.blue('\n📊 Migration Status:'));
    for (const [database, info] of Object.entries(status)) {
      console.log(chalk.yellow(`  ${database}:`));
      console.log(chalk.gray(`    Total: ${info.total}`));
      console.log(chalk.green(`    Executed: ${info.executed}`));
      console.log(chalk.red(`    Pending: ${info.pending.length}`));
      if (info.pending.length > 0) {
        info.pending.forEach(migration => {
          console.log(chalk.red(`      - ${migration}`));
        });
      }
    }

    // Run migrations
    await migrationManager.runMigrations();

    console.log(chalk.green('\n🎉 All migrations completed successfully!'));
    
  } catch (error) {
    console.error(chalk.red('\n❌ Migration failed:'));
    console.error(chalk.red(error.message));
    if (error.stack) {
      console.error(chalk.gray(error.stack));
    }
    process.exit(1);
  } finally {
    await connectionManager.closeAll();
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
const command = args[0];

if (command === 'rollback') {
  const database = args[1];
  const steps = parseInt(args[2]) || 1;
  
  if (!database) {
    console.error(chalk.red('❌ Database name is required for rollback'));
    console.log(chalk.yellow('Usage: npm run migrate rollback <database> [steps]'));
    process.exit(1);
  }
  
  // TODO: Implement rollback functionality
  console.log(chalk.yellow(`🔄 Rolling back ${steps} migration(s) for ${database}...`));
} else if (command === 'status') {
  // TODO: Implement status check
  console.log(chalk.blue('📊 Checking migration status...'));
} else {
  // Default: run migrations
  runMigrations();
}