import { Pool } from 'pg';
import { Db } from 'mongodb';
import { ClickHouseClient } from '@clickhouse/client';
import { SchemaValidationResult } from './types';
import { DatabaseConnectionManager } from './connections';
import chalk from 'chalk';

export class SchemaValidator {
  private connectionManager: DatabaseConnectionManager;

  constructor(connectionManager: DatabaseConnectionManager) {
    this.connectionManager = connectionManager;
  }

  /**
   * Validate all database schemas
   */
  async validateAllSchemas(): Promise<Record<string, SchemaValidationResult>> {
    console.log(chalk.blue('🔍 Validating database schemas...'));

    const results: Record<string, SchemaValidationResult> = {};

    try {
      results.postgresql = await this.validatePostgreSQLSchema();
      results.mongodb = await this.validateMongoDBSchema();
      results.clickhouse = await this.validateClickHouseSchema();
    } catch (error) {
      console.error(chalk.red('❌ Schema validation failed:'), error.message);
    }

    return results;
  }

  /**
   * Validate PostgreSQL schema
   */
  private async validatePostgreSQLSchema(): Promise<SchemaValidationResult> {
    const pool = this.connectionManager.getPostgreSQL();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check required tables exist
      const requiredTables = [
        'users', 'farms', 'farm_members', 'crops', 'categories', 'transactions',
        'budgets', 'budget_categories', 'financial_reports', 'financial_summaries'
      ];

      const tableResult = await pool.query(`
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public'
      `);

      const existingTables = tableResult.rows.map(row => row.tablename);

      for (const table of requiredTables) {
        if (!existingTables.includes(table)) {
          errors.push(`Missing required table: ${table}`);
        }
      }

      // Check required indexes exist
      const indexResult = await pool.query(`
        SELECT indexname, tablename FROM pg_indexes 
        WHERE schemaname = 'public'
      `);

      const requiredIndexes = [
        { table: 'users', index: 'idx_users_email' },
        { table: 'transactions', index: 'idx_transactions_farm_date' },
        { table: 'farms', index: 'idx_farms_coordinates' }
      ];

      const existingIndexes = indexResult.rows.map(row => ({
        table: row.tablename,
        index: row.indexname
      }));

      for (const required of requiredIndexes) {
        const exists = existingIndexes.some(
          existing => existing.table === required.table && existing.index === required.index
        );
        if (!exists) {
          warnings.push(`Missing recommended index: ${required.index} on ${required.table}`);
        }
      }

      // Check foreign key constraints
      const fkResult = await pool.query(`
        SELECT 
          tc.table_name, 
          tc.constraint_name, 
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name 
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
      `);

      const requiredForeignKeys = [
        { table: 'farm_members', column: 'farm_id', references: 'farms' },
        { table: 'farm_members', column: 'user_id', references: 'users' },
        { table: 'transactions', column: 'category_id', references: 'categories' }
      ];

      for (const required of requiredForeignKeys) {
        const exists = fkResult.rows.some(row =>
          row.table_name === required.table &&
          row.column_name === required.column &&
          row.foreign_table_name === required.references
        );
        if (!exists) {
          errors.push(`Missing foreign key: ${required.table}.${required.column} -> ${required.references}`);
        }
      }

      // Check data types and constraints
      const columnResult = await pool.query(`
        SELECT 
          table_name, 
          column_name, 
          data_type, 
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position
      `);

      // Validate critical columns
      const criticalColumns = [
        { table: 'users', column: 'email', type: 'character varying', nullable: 'NO' },
        { table: 'transactions', column: 'amount', type: 'numeric', nullable: 'NO' },
        { table: 'farms', column: 'latitude', type: 'numeric', nullable: 'YES' }
      ];

      for (const critical of criticalColumns) {
        const column = columnResult.rows.find(row =>
          row.table_name === critical.table && row.column_name === critical.column
        );

        if (!column) {
          errors.push(`Missing critical column: ${critical.table}.${critical.column}`);
        } else {
          if (column.data_type !== critical.type) {
            warnings.push(`Column type mismatch: ${critical.table}.${critical.column} expected ${critical.type}, got ${column.data_type}`);
          }
          if (column.is_nullable !== critical.nullable) {
            warnings.push(`Column nullable mismatch: ${critical.table}.${critical.column} expected ${critical.nullable}, got ${column.is_nullable}`);
          }
        }
      }

    } catch (error) {
      errors.push(`PostgreSQL validation error: ${error.message}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate MongoDB schema
   */
  private async validateMongoDBSchema(): Promise<SchemaValidationResult> {
    const db = this.connectionManager.getMongoDB();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check required collections exist
      const requiredCollections = [
        'subsidy_programs', 'subsidy_applications', 'application_templates',
        'insurance_providers', 'insurance_policies', 'insurance_quotes', 'insurance_claims'
      ];

      const collections = await db.listCollections().toArray();
      const existingCollections = collections.map(col => col.name);

      for (const collection of requiredCollections) {
        if (!existingCollections.includes(collection)) {
          errors.push(`Missing required collection: ${collection}`);
        }
      }

      // Check indexes for each collection
      const collectionIndexes = [
        { collection: 'subsidy_programs', indexes: ['name_1', 'programType_1', 'isActive_1'] },
        { collection: 'subsidy_applications', indexes: ['farmId_1', 'userId_1', 'status_1'] },
        { collection: 'insurance_quotes', indexes: ['farmId_1', 'providerId_1', 'status_1'] }
      ];

      for (const collectionIndex of collectionIndexes) {
        if (existingCollections.includes(collectionIndex.collection)) {
          try {
            const indexes = await db.collection(collectionIndex.collection).listIndexes().toArray();
            const existingIndexNames = indexes.map(idx => idx.name);

            for (const requiredIndex of collectionIndex.indexes) {
              if (!existingIndexNames.includes(requiredIndex)) {
                warnings.push(`Missing recommended index: ${requiredIndex} on ${collectionIndex.collection}`);
              }
            }
          } catch (error) {
            warnings.push(`Could not check indexes for ${collectionIndex.collection}: ${error.message}`);
          }
        }
      }

      // Validate document structure for critical collections
      const criticalCollections = ['subsidy_programs', 'insurance_policies'];
      
      for (const collection of criticalCollections) {
        if (existingCollections.includes(collection)) {
          try {
            const sampleDoc = await db.collection(collection).findOne({});
            if (sampleDoc) {
              // Check for required fields based on collection
              if (collection === 'subsidy_programs') {
                const requiredFields = ['name', 'description', 'programType', 'isActive'];
                for (const field of requiredFields) {
                  if (!(field in sampleDoc)) {
                    warnings.push(`Sample document in ${collection} missing field: ${field}`);
                  }
                }
              }
            }
          } catch (error) {
            warnings.push(`Could not validate document structure for ${collection}: ${error.message}`);
          }
        }
      }

    } catch (error) {
      errors.push(`MongoDB validation error: ${error.message}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate ClickHouse schema
   */
  private async validateClickHouseSchema(): Promise<SchemaValidationResult> {
    const client = this.connectionManager.getClickHouse();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check required tables exist
      const requiredTables = [
        'financial_events', 'farm_performance_metrics', 'crop_performance_metrics',
        'user_activity_events', 'market_price_history'
      ];

      const result = await client.query({
        query: `
          SELECT name FROM system.tables 
          WHERE database = 'daorsagro'
        `,
        format: 'JSONEachRow'
      });

      const tables = await result.json();
      const existingTables = Array.isArray(tables) 
        ? tables.map((table: any) => table.name)
        : [tables.name].filter(Boolean);

      for (const table of requiredTables) {
        if (!existingTables.includes(table)) {
          errors.push(`Missing required table: ${table}`);
        }
      }

      // Check table engines
      const engineResult = await client.query({
        query: `
          SELECT name, engine FROM system.tables 
          WHERE database = 'daorsagro'
        `,
        format: 'JSONEachRow'
      });

      const tableEngines = await engineResult.json();
      const engines = Array.isArray(tableEngines) ? tableEngines : [tableEngines].filter(Boolean);

      const recommendedEngines = [
        { table: 'financial_events', engine: 'MergeTree' },
        { table: 'farm_performance_metrics', engine: 'ReplacingMergeTree' }
      ];

      for (const recommended of recommendedEngines) {
        const tableEngine = engines.find((e: any) => e.name === recommended.table);
        if (tableEngine && !tableEngine.engine.includes(recommended.engine)) {
          warnings.push(`Table ${recommended.table} using ${tableEngine.engine}, recommended: ${recommended.engine}`);
        }
      }

      // Check partitioning
      const partitionResult = await client.query({
        query: `
          SELECT 
            table,
            partition_key
          FROM system.tables 
          WHERE database = 'daorsagro' 
          AND partition_key != ''
        `,
        format: 'JSONEachRow'
      });

      const partitions = await partitionResult.json();
      const partitionedTables = Array.isArray(partitions) 
        ? partitions.map((p: any) => p.table)
        : [partitions.table].filter(Boolean);

      const shouldBePartitioned = ['financial_events', 'user_activity_events', 'market_price_history'];
      
      for (const table of shouldBePartitioned) {
        if (existingTables.includes(table) && !partitionedTables.includes(table)) {
          warnings.push(`Table ${table} should be partitioned for better performance`);
        }
      }

    } catch (error) {
      errors.push(`ClickHouse validation error: ${error.message}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Generate validation report
   */
  generateReport(results: Record<string, SchemaValidationResult>): void {
    console.log(chalk.blue('\n📋 Schema Validation Report'));
    console.log(chalk.gray('============================\n'));

    let totalErrors = 0;
    let totalWarnings = 0;

    for (const [database, result] of Object.entries(results)) {
      console.log(chalk.yellow(`${database.toUpperCase()}:`));
      
      if (result.isValid) {
        console.log(chalk.green('  ✅ Schema is valid'));
      } else {
        console.log(chalk.red('  ❌ Schema has issues'));
      }

      if (result.errors.length > 0) {
        console.log(chalk.red(`  Errors (${result.errors.length}):`));
        result.errors.forEach(error => {
          console.log(chalk.red(`    • ${error}`));
        });
        totalErrors += result.errors.length;
      }

      if (result.warnings.length > 0) {
        console.log(chalk.yellow(`  Warnings (${result.warnings.length}):`));
        result.warnings.forEach(warning => {
          console.log(chalk.yellow(`    • ${warning}`));
        });
        totalWarnings += result.warnings.length;
      }

      console.log('');
    }

    console.log(chalk.blue('Summary:'));
    console.log(chalk.red(`  Total Errors: ${totalErrors}`));
    console.log(chalk.yellow(`  Total Warnings: ${totalWarnings}`));

    if (totalErrors === 0) {
      console.log(chalk.green('\n🎉 All schemas are valid!'));
    } else {
      console.log(chalk.red('\n⚠️  Please fix the errors before proceeding.'));
    }
  }
}