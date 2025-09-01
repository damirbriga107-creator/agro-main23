#!/usr/bin/env node

import { DatabaseConnectionManager } from './connections';
import { SeedManager } from './seed-manager';
import { DatabaseConfig } from './types';
import chalk from 'chalk';

// Import seeds
import { seed as defaultCategories } from '../seeds/postgresql/001_default_categories';
import { seed as sampleUsers } from '../seeds/postgresql/002_sample_users';

async function runSeeds() {
  console.log(chalk.blue('🌱 DaorsAgro Database Seeding Tool'));
  console.log(chalk.gray('===================================\n'));

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
  const seedManager = new SeedManager(connectionManager);

  try {
    // Initialize connections
    console.log(chalk.blue('📡 Initializing database connections...'));
    await connectionManager.initializeAll();

    // Register seeds
    seedManager.registerSeeds('postgresql', [
      defaultCategories,
      sampleUsers
    ]);

    // Run seeds
    await seedManager.runSeeds();

    console.log(chalk.green('\n🎉 All seeds completed successfully!'));
    
  } catch (error) {
    console.error(chalk.red('\n❌ Seeding failed:'));
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

if (command === 'clear') {
  console.log(chalk.yellow('🧹 Clearing all database data...'));
  
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
  const seedManager = new SeedManager(connectionManager);

  connectionManager.initializeAll()
    .then(() => seedManager.clearAllData())
    .then(() => {
      console.log(chalk.green('✅ All data cleared successfully!'));
      return connectionManager.closeAll();
    })
    .catch(error => {
      console.error(chalk.red('❌ Clear failed:'), error.message);
      process.exit(1);
    });
} else {
  // Default: run seeds
  runSeeds();
}