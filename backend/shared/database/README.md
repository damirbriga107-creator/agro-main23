# DaorsAgro Database Management

This package provides comprehensive database management utilities for the DaorsAgro platform, including migrations, seeding, validation, and connection management across multiple database systems.

## 🗄️ Supported Databases

- **PostgreSQL** - Primary relational database for user data, farms, transactions, and financial records
- **MongoDB** - Document storage for subsidies, insurance, and flexible data structures
- **Redis** - Caching and session management
- **ClickHouse** - Analytics and time-series data for business intelligence
- **Elasticsearch** - Full-text search and document indexing

## 🚀 Quick Start

### Prerequisites

Ensure all database services are running:

```bash
# Start all services with Docker Compose
docker-compose up -d postgres mongodb redis clickhouse elasticsearch
```

### Initialize Complete Database

```bash
# Install dependencies
npm install

# Initialize all databases with migrations and seeds
npm run init-db
```

## 📋 Available Commands

### Database Initialization
```bash
npm run init-db              # Complete database setup (migrations + seeds)
npm run init-db --help       # Show help and environment variables
```

### Migrations
```bash
npm run migrate              # Run all pending migrations
npm run migrate:status       # Check migration status
npm run migrate:rollback     # Rollback last migration
```

### Seeding
```bash
npm run seed                 # Run all seeds
npm run seed:clear           # Clear all data (development only)
```

### Validation
```bash
npm run validate             # Validate all database schemas
```

### Development
```bash
npm run build                # Build TypeScript
npm run build:watch          # Build with watch mode
npm run dev                  # Development mode with auto-restart
npm run type-check           # TypeScript type checking
```

## 🏗️ Database Schema Overview

### PostgreSQL Schema

#### Core Tables
- **users** - User accounts and profiles
- **farms** - Farm information and locations
- **farm_members** - Farm membership and roles
- **crops** - Crop planning and tracking

#### Financial Tables
- **categories** - Transaction categories (hierarchical)
- **transactions** - Financial transactions
- **budgets** - Budget planning
- **budget_categories** - Budget allocations
- **financial_reports** - Generated reports
- **financial_summaries** - Aggregated metrics
- **recurring_transactions** - Recurring transaction templates
- **financial_goals** - Financial targets and goals
- **market_prices** - Market price data
- **crop_profitability** - Crop-specific profitability analysis

#### System Tables
- **audit_logs** - System audit trail
- **system_settings** - Application configuration
- **schema_migrations** - Migration tracking

### MongoDB Collections

#### Subsidy Management
- **subsidy_programs** - Available government programs
- **subsidy_applications** - Application submissions
- **application_templates** - Dynamic form templates
- **subsidy_notifications** - User notifications
- **program_eligibility_cache** - Eligibility calculations

#### Insurance Management
- **insurance_providers** - Insurance companies
- **insurance_policies** - Available policies
- **insurance_quotes** - Quote requests and responses
- **insurance_claims** - Claim submissions
- **insurance_policies_active** - Active policy tracking
- **insurance_agents** - Agent information

### ClickHouse Tables

#### Analytics Tables
- **financial_events** - All financial transactions (time-series)
- **farm_performance_metrics** - Farm-level KPIs
- **crop_performance_metrics** - Crop-specific analytics
- **budget_performance** - Budget tracking over time
- **user_activity_events** - User behavior analytics
- **market_price_history** - Historical market data
- **weather_data** - Weather information
- **iot_sensor_data** - IoT device measurements

#### Aggregated Views
- **daily_farm_metrics** - Daily aggregated farm metrics

## 🔧 Configuration

### Environment Variables

```bash
# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=daorsagro
DB_USERNAME=postgres
DB_PASSWORD=postgres123
DB_SSL=false

# MongoDB
MONGODB_URL=mongodb://mongo:mongo123@localhost:27017/daorsagro?authSource=admin

# Redis
REDIS_URL=redis://localhost:6379

# ClickHouse
CLICKHOUSE_URL=http://localhost:8123
CLICKHOUSE_DATABASE=daorsagro
CLICKHOUSE_USERNAME=default
CLICKHOUSE_PASSWORD=

# Elasticsearch
ELASTICSEARCH_URL=http://localhost:9200

# Environment
NODE_ENV=development
```

### Docker Environment

For Docker deployments, the system automatically uses service names:

```bash
DB_HOST=postgres
MONGODB_URL=mongodb://mongo:mongo123@mongodb:27017/daorsagro?authSource=admin
REDIS_URL=redis://redis:6379
CLICKHOUSE_URL=http://clickhouse:8123
ELASTICSEARCH_URL=http://elasticsearch:9200
```

## 📊 Migration System

### Creating New Migrations

Migrations are organized by database type:

```
migrations/
├── postgresql/
│   ├── 001_initial_auth_schema.ts
│   └── 002_financial_schema.ts
├── mongodb/
│   ├── 001_subsidy_collections.ts
│   └── 002_insurance_collections.ts
└── clickhouse/
    └── 001_analytics_tables.ts
```

### Migration Structure

```typescript
import { Migration } from '../../src/types';

export const migration: Migration = {
  id: '001_migration_name',
  name: 'Human readable name',
  timestamp: 1703001000000,
  
  async up(): Promise<void> {
    // Migration logic
  },

  async down(): Promise<void> {
    // Rollback logic
  }
};
```

## 🌱 Seeding System

### Seed Data Organization

```
seeds/
├── postgresql/
│   ├── 001_default_categories.ts
│   └── 002_sample_users.ts
└── mongodb/
    └── 001_sample_programs.ts
```

### Seed Structure

```typescript
import { SeedData } from '../../src/types';

export const seed: SeedData = {
  name: 'Seed Name',
  priority: 1, // Lower numbers run first
  
  async execute(): Promise<void> {
    // Seeding logic
  }
};
```

## 🔍 Schema Validation

The validation system checks:

### PostgreSQL
- Required tables exist
- Indexes are properly created
- Foreign key constraints
- Column types and constraints
- Data integrity

### MongoDB
- Required collections exist
- Indexes for performance
- Document structure validation
- Schema validation rules

### ClickHouse
- Required tables exist
- Proper table engines (MergeTree family)
- Partitioning strategy
- Index optimization

## 🏥 Health Monitoring

The system includes comprehensive health checks:

```typescript
const health = await connectionManager.healthCheck();
// Returns: { postgresql: true, mongodb: true, redis: true, ... }
```

## 🔒 Security Features

- **Connection Security**: SSL/TLS support for all databases
- **Access Control**: Role-based permissions
- **Audit Logging**: Complete audit trail in PostgreSQL
- **Data Validation**: Schema validation and constraints
- **Environment Isolation**: Separate configurations per environment

## 📈 Performance Optimization

### PostgreSQL
- Strategic indexing on frequently queried columns
- Partitioning for large tables (transactions by date)
- Connection pooling
- Query optimization

### MongoDB
- Compound indexes for complex queries
- TTL indexes for temporary data
- Aggregation pipeline optimization
- Sharding preparation

### ClickHouse
- Columnar storage optimization
- Partitioning by date for time-series data
- Materialized views for real-time aggregations
- Compression and encoding

## 🚨 Troubleshooting

### Common Issues

1. **Connection Failures**
   ```bash
   # Check if services are running
   docker-compose ps
   
   # Check logs
   docker-compose logs postgres
   ```

2. **Migration Failures**
   ```bash
   # Check migration status
   npm run migrate:status
   
   # Rollback if needed
   npm run migrate:rollback
   ```

3. **Permission Issues**
   ```bash
   # Ensure database users have proper permissions
   # Check connection strings and credentials
   ```

### Debug Mode

Enable detailed logging:

```bash
DEBUG=daorsagro:* npm run init-db
```

## 🤝 Contributing

### Adding New Migrations

1. Create migration file in appropriate directory
2. Follow naming convention: `XXX_description.ts`
3. Implement both `up()` and `down()` methods
4. Test thoroughly in development
5. Update this README if needed

### Adding New Seeds

1. Create seed file with appropriate priority
2. Ensure idempotency (can run multiple times)
3. Use `ON CONFLICT` or similar for upserts
4. Test with `npm run seed:clear && npm run seed`

## 📚 API Reference

### DatabaseConnectionManager

```typescript
const manager = new DatabaseConnectionManager(config);
await manager.initializeAll();
const pool = manager.getPostgreSQL();
const db = manager.getMongoDB();
```

### MigrationManager

```typescript
const migrationManager = new MigrationManager(connectionManager);
migrationManager.registerMigrations('postgresql', migrations);
await migrationManager.runMigrations();
```

### SeedManager

```typescript
const seedManager = new SeedManager(connectionManager);
seedManager.registerSeeds('postgresql', seeds);
await seedManager.runSeeds();
```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:

1. Check the troubleshooting section above
2. Review the logs for detailed error messages
3. Ensure all prerequisites are met
4. Contact the development team

---

**DaorsAgro Database Management** - Comprehensive database solution for agricultural financial management.