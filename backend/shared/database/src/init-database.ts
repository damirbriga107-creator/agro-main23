#!/usr/bin/env node

import { DatabaseConnectionManager } from './connections';
import { MigrationManager } from './migration-manager';
import { SeedManager } from './seed-manager';
import { SchemaValidator } from './schema-validator';
import { DatabaseConfig } from './types';
import chalk from 'chalk';

// Import migrations
import { migration as authSchema } from '../migrations/postgresql/001_initial_auth_schema';
import { migration as financialSchema } from '../migrations/postgresql/002_financial_schema';
import { migration as subsidyCollections } from '../migrations/mongodb/001_subsidy_collections';
import { migration as insuranceCollections } from '../migrations/mongodb/002_insurance_collections';
import { migration as analyticsTables } from '../migrations/clickhouse/001_analytics_tables';

// Import seeds
import { seed as defaultCategories } from '../seeds/postgresql/001_default_categories';
import { seed as sampleUsers } from '../seeds/postgresql/002_sample_users';

async function initializeDatabase() {
  console.log(chalk.blue('🚀 DaorsAgro Database Initialization'));
  console.log(chalk.gray('====================================\n'));

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
  const seedManager = new SeedManager(connectionManager);
  const schemaValidator = new SchemaValidator(connectionManager);

  try {
    // Step 1: Initialize connections
    console.log(chalk.blue('📡 Step 1: Initializing database connections...'));
    await connectionManager.initializeAll();

    // Step 2: Health check
    console.log(chalk.blue('🏥 Step 2: Performing health check...'));
    const health = await connectionManager.healthCheck();
    
    for (const [database, isHealthy] of Object.entries(health)) {
      if (isHealthy) {
        console.log(chalk.green(`  ✅ ${database} is healthy`));
      } else {
        console.log(chalk.red(`  ❌ ${database} is not healthy`));
        throw new Error(`Database ${database} is not healthy`);
      }
    }

    // Step 3: Initialize migration tables
    console.log(chalk.blue('📋 Step 3: Initializing migration tables...'));
    await migrationManager.initializeMigrationTables();

    // Step 4: Register and run migrations
    console.log(chalk.blue('🔄 Step 4: Running database migrations...'));
    
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

    await migrationManager.runMigrations();

    // Step 5: Validate schemas
    console.log(chalk.blue('🔍 Step 5: Validating database schemas...'));
    const validationResults = await schemaValidator.validateAllSchemas();
    schemaValidator.generateReport(validationResults);

    // Check if there are any critical errors
    const hasErrors = Object.values(validationResults).some(result => !result.isValid);
    if (hasErrors) {
      console.log(chalk.yellow('⚠️  Continuing with warnings, but please review the errors above.'));
    }

    // Step 6: Run seeds (only if not in production)
    if (process.env.NODE_ENV !== 'production') {
      console.log(chalk.blue('🌱 Step 6: Seeding database with initial data...'));
      
      seedManager.registerSeeds('postgresql', [
        defaultCategories,
        sampleUsers
      ]);

      await seedManager.runSeeds();
    } else {
      console.log(chalk.yellow('⏭️  Step 6: Skipping seeds (production environment)'));
    }

    // Step 7: Final health check
    console.log(chalk.blue('🏥 Step 7: Final health check...'));
    const finalHealth = await connectionManager.healthCheck();
    
    let allHealthy = true;
    for (const [database, isHealthy] of Object.entries(finalHealth)) {
      if (isHealthy) {
        console.log(chalk.green(`  ✅ ${database} is healthy`));
      } else {
        console.log(chalk.red(`  ❌ ${database} is not healthy`));
        allHealthy = false;
      }
    }

    if (allHealthy) {
      console.log(chalk.green('\n🎉 Database initialization completed successfully!'));
      console.log(chalk.blue('\n📊 Summary:'));
      console.log(chalk.gray('  • All database connections established'));
      console.log(chalk.gray('  • All migrations executed'));
      console.log(chalk.gray('  • Schema validation completed'));
      if (process.env.NODE_ENV !== 'production') {
        console.log(chalk.gray('  • Initial data seeded'));
      }
      console.log(chalk.gray('  • All systems healthy'));
      
      console.log(chalk.blue('\n🚀 Your DaorsAgro platform is ready to use!'));
    } else {
      throw new Error('Some databases are not healthy after initialization');
    }
    
  } catch (error) {
    console.error(chalk.red('\n❌ Database initialization failed:'));
    console.error(chalk.red(error.message));
    if (error.stack) {
      console.error(chalk.gray(error.stack));
    }
    
    console.log(chalk.yellow('\n🔧 Troubleshooting tips:'));
    console.log(chalk.gray('  • Check if all database services are running'));
    console.log(chalk.gray('  • Verify database connection strings'));
    console.log(chalk.gray('  • Ensure database users have proper permissions'));
    console.log(chalk.gray('  • Check firewall and network connectivity'));
    
    process.exit(1);
  } finally {
    await connectionManager.closeAll();
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
const command = args[0];

if (command === '--help' || command === '-h') {
  console.log(chalk.blue('DaorsAgro Database Initialization Tool'));
  console.log(chalk.gray('=====================================\n'));
  console.log('Usage:');
  console.log('  npm run init-db              Initialize complete database');
  console.log('  npm run init-db --help        Show this help message');
  console.log('\nEnvironment Variables:');
  console.log('  DB_HOST                       PostgreSQL host (default: localhost)');
  console.log('  DB_PORT                       PostgreSQL port (default: 5432)');
  console.log('  DB_NAME                       PostgreSQL database (default: daorsagro)');
  console.log('  DB_USERNAME                   PostgreSQL username (default: postgres)');
  console.log('  DB_PASSWORD                   PostgreSQL password (default: postgres123)');
  console.log('  MONGODB_URL                   MongoDB connection string');
  console.log('  REDIS_URL                     Redis connection string');
  console.log('  CLICKHOUSE_URL                ClickHouse connection string');
  console.log('  ELASTICSEARCH_URL             Elasticsearch connection string');
  console.log('  NODE_ENV                      Environment (development/production)');
} else {
  // Default: initialize database
  initializeDatabase();
}