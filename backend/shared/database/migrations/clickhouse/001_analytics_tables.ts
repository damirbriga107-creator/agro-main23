import { createClient, ClickHouseClient } from '@clickhouse/client';
import { Migration } from '../../src/types';

export const migration: Migration = {
  id: '001_analytics_tables',
  name: 'Create analytics tables in ClickHouse',
  timestamp: 1703005000000,
  
  async up(): Promise<void> {
    const client = createClient({
      url: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
      database: process.env.CLICKHOUSE_DATABASE || 'daorsagro',
      username: process.env.CLICKHOUSE_USERNAME || 'default',
      password: process.env.CLICKHOUSE_PASSWORD || ''
    });

    try {
      // Create database if not exists
      await client.command({
        query: `CREATE DATABASE IF NOT EXISTS daorsagro`
      });

      // Financial events table
      await client.command({
        query: `
          CREATE TABLE IF NOT EXISTS financial_events (
            event_id String,
            farm_id String,
            user_id String,
            event_type LowCardinality(String),
            event_category LowCardinality(String),
            amount Decimal64(2),
            currency LowCardinality(String) DEFAULT 'USD',
            transaction_date Date,
            event_timestamp DateTime64(3) DEFAULT now64(),
            season_year UInt16,
            crop_id String,
            category_id String,
            payment_method LowCardinality(String),
            vendor_name String,
            description String,
            tags Array(String),
            metadata String, -- JSON string
            created_at DateTime64(3) DEFAULT now64()
          ) ENGINE = MergeTree()
          PARTITION BY toYYYYMM(transaction_date)
          ORDER BY (farm_id, transaction_date, event_timestamp)
          SETTINGS index_granularity = 8192
        `
      });

      // Farm performance metrics table
      await client.command({
        query: `
          CREATE TABLE IF NOT EXISTS farm_performance_metrics (
            farm_id String,
            metric_date Date,
            season_year UInt16,
            total_revenue Decimal64(2),
            total_expenses Decimal64(2),
            net_profit Decimal64(2),
            profit_margin Decimal32(4),
            transaction_count UInt32,
            avg_transaction_amount Decimal64(2),
            cash_flow Decimal64(2),
            budget_variance Decimal32(4),
            roi_percentage Decimal32(4),
            created_at DateTime64(3) DEFAULT now64(),
            updated_at DateTime64(3) DEFAULT now64()
          ) ENGINE = ReplacingMergeTree(updated_at)
          PARTITION BY toYYYYMM(metric_date)
          ORDER BY (farm_id, metric_date, season_year)
          SETTINGS index_granularity = 8192
        `
      });

      // Crop performance metrics table
      await client.command({
        query: `
          CREATE TABLE IF NOT EXISTS crop_performance_metrics (
            farm_id String,
            crop_id String,
            crop_name String,
            season_year UInt16,
            metric_date Date,
            acres Decimal32(2),
            total_revenue Decimal64(2),
            total_expenses Decimal64(2),
            net_profit Decimal64(2),
            profit_per_acre Decimal64(2),
            cost_per_acre Decimal64(2),
            revenue_per_acre Decimal64(2),
            yield_per_acre Decimal32(2),
            yield_unit String,
            profit_margin Decimal32(4),
            roi_percentage Decimal32(4),
            break_even_yield Decimal32(2),
            created_at DateTime64(3) DEFAULT now64(),
            updated_at DateTime64(3) DEFAULT now64()
          ) ENGINE = ReplacingMergeTree(updated_at)
          PARTITION BY toYYYYMM(metric_date)
          ORDER BY (farm_id, crop_id, season_year, metric_date)
          SETTINGS index_granularity = 8192
        `
      });

      // Budget performance table
      await client.command({
        query: `
          CREATE TABLE IF NOT EXISTS budget_performance (
            budget_id String,
            farm_id String,
            category_id String,
            category_name String,
            metric_date Date,
            season_year UInt16,
            allocated_amount Decimal64(2),
            spent_amount Decimal64(2),
            remaining_amount Decimal64(2),
            variance_amount Decimal64(2),
            variance_percentage Decimal32(4),
            utilization_percentage Decimal32(4),
            days_remaining UInt16,
            burn_rate Decimal64(2),
            projected_total Decimal64(2),
            created_at DateTime64(3) DEFAULT now64(),
            updated_at DateTime64(3) DEFAULT now64()
          ) ENGINE = ReplacingMergeTree(updated_at)
          PARTITION BY toYYYYMM(metric_date)
          ORDER BY (farm_id, budget_id, category_id, metric_date)
          SETTINGS index_granularity = 8192
        `
      });

      // Market price history table
      await client.command({
        query: `
          CREATE TABLE IF NOT EXISTS market_price_history (
            commodity String,
            market String,
            price_date Date,
            price Decimal64(4),
            unit String,
            currency LowCardinality(String) DEFAULT 'USD',
            volume Decimal64(2),
            high_price Decimal64(4),
            low_price Decimal64(4),
            open_price Decimal64(4),
            close_price Decimal64(4),
            change_amount Decimal64(4),
            change_percentage Decimal32(4),
            source LowCardinality(String),
            created_at DateTime64(3) DEFAULT now64()
          ) ENGINE = ReplacingMergeTree(created_at)
          PARTITION BY toYYYYMM(price_date)
          ORDER BY (commodity, market, price_date)
          SETTINGS index_granularity = 8192
        `
      });

      // User activity events table
      await client.command({
        query: `
          CREATE TABLE IF NOT EXISTS user_activity_events (
            event_id String,
            user_id String,
            farm_id String,
            event_type LowCardinality(String),
            event_action LowCardinality(String),
            entity_type LowCardinality(String),
            entity_id String,
            event_timestamp DateTime64(3) DEFAULT now64(),
            session_id String,
            ip_address IPv4,
            user_agent String,
            device_type LowCardinality(String),
            browser LowCardinality(String),
            os LowCardinality(String),
            country LowCardinality(String),
            region String,
            city String,
            metadata String, -- JSON string
            created_at DateTime64(3) DEFAULT now64()
          ) ENGINE = MergeTree()
          PARTITION BY toYYYYMM(toDate(event_timestamp))
          ORDER BY (user_id, event_timestamp)
          TTL event_timestamp + INTERVAL 2 YEAR
          SETTINGS index_granularity = 8192
        `
      });

      // Subsidy analytics table
      await client.command({
        query: `
          CREATE TABLE IF NOT EXISTS subsidy_analytics (
            application_id String,
            farm_id String,
            user_id String,
            program_id String,
            program_type LowCardinality(String),
            application_date Date,
            status LowCardinality(String),
            requested_amount Decimal64(2),
            approved_amount Decimal64(2),
            processing_days UInt16,
            approval_rate Decimal32(4),
            region String,
            crop_types Array(String),
            farm_size Decimal32(2),
            created_at DateTime64(3) DEFAULT now64(),
            updated_at DateTime64(3) DEFAULT now64()
          ) ENGINE = ReplacingMergeTree(updated_at)
          PARTITION BY toYYYYMM(application_date)
          ORDER BY (farm_id, program_id, application_date)
          SETTINGS index_granularity = 8192
        `
      });

      // Insurance analytics table
      await client.command({
        query: `
          CREATE TABLE IF NOT EXISTS insurance_analytics (
            quote_id String,
            claim_id String,
            farm_id String,
            user_id String,
            provider_id String,
            policy_id String,
            event_type LowCardinality(String), -- quote, claim, policy
            event_date Date,
            coverage_type LowCardinality(String),
            coverage_amount Decimal64(2),
            premium_amount Decimal64(2),
            claim_amount Decimal64(2),
            approved_amount Decimal64(2),
            processing_days UInt16,
            risk_score Decimal32(4),
            region String,
            weather_factor String,
            created_at DateTime64(3) DEFAULT now64(),
            updated_at DateTime64(3) DEFAULT now64()
          ) ENGINE = ReplacingMergeTree(updated_at)
          PARTITION BY toYYYYMM(event_date)
          ORDER BY (farm_id, provider_id, event_date)
          SETTINGS index_granularity = 8192
        `
      });

      // Weather data table
      await client.command({
        query: `
          CREATE TABLE IF NOT EXISTS weather_data (
            location_id String,
            farm_id String,
            weather_date Date,
            temperature_high Decimal32(2),
            temperature_low Decimal32(2),
            temperature_avg Decimal32(2),
            humidity Decimal32(2),
            precipitation Decimal32(2),
            wind_speed Decimal32(2),
            wind_direction UInt16,
            pressure Decimal32(2),
            uv_index Decimal32(2),
            visibility Decimal32(2),
            cloud_cover Decimal32(2),
            weather_condition LowCardinality(String),
            source LowCardinality(String),
            latitude Decimal64(8),
            longitude Decimal64(8),
            created_at DateTime64(3) DEFAULT now64()
          ) ENGINE = ReplacingMergeTree(created_at)
          PARTITION BY toYYYYMM(weather_date)
          ORDER BY (location_id, weather_date)
          TTL weather_date + INTERVAL 5 YEAR
          SETTINGS index_granularity = 8192
        `
      });

      // IoT sensor data table
      await client.command({
        query: `
          CREATE TABLE IF NOT EXISTS iot_sensor_data (
            device_id String,
            farm_id String,
            sensor_type LowCardinality(String),
            measurement_timestamp DateTime64(3),
            value Decimal64(4),
            unit LowCardinality(String),
            location_lat Decimal64(8),
            location_lng Decimal64(8),
            battery_level Decimal32(2),
            signal_strength Decimal32(2),
            data_quality LowCardinality(String),
            metadata String, -- JSON string
            created_at DateTime64(3) DEFAULT now64()
          ) ENGINE = MergeTree()
          PARTITION BY toYYYYMM(toDate(measurement_timestamp))
          ORDER BY (device_id, measurement_timestamp)
          TTL measurement_timestamp + INTERVAL 3 YEAR
          SETTINGS index_granularity = 8192
        `
      });

      // Aggregated daily metrics materialized view
      await client.command({
        query: `
          CREATE MATERIALIZED VIEW IF NOT EXISTS daily_farm_metrics_mv
          TO daily_farm_metrics
          AS SELECT
            farm_id,
            toDate(event_timestamp) as metric_date,
            season_year,
            sumIf(amount, event_type = 'income') as total_revenue,
            sumIf(amount, event_type = 'expense') as total_expenses,
            total_revenue - total_expenses as net_profit,
            if(total_revenue > 0, (net_profit / total_revenue) * 100, 0) as profit_margin,
            count() as transaction_count,
            avg(amount) as avg_transaction_amount,
            now64() as created_at
          FROM financial_events
          GROUP BY farm_id, metric_date, season_year
        `
      });

      // Create the target table for the materialized view
      await client.command({
        query: `
          CREATE TABLE IF NOT EXISTS daily_farm_metrics (
            farm_id String,
            metric_date Date,
            season_year UInt16,
            total_revenue Decimal64(2),
            total_expenses Decimal64(2),
            net_profit Decimal64(2),
            profit_margin Decimal32(4),
            transaction_count UInt32,
            avg_transaction_amount Decimal64(2),
            created_at DateTime64(3)
          ) ENGINE = SummingMergeTree()
          PARTITION BY toYYYYMM(metric_date)
          ORDER BY (farm_id, metric_date, season_year)
          SETTINGS index_granularity = 8192
        `
      });

      // Create indexes for better query performance
      await client.command({
        query: `
          ALTER TABLE financial_events 
          ADD INDEX idx_event_type event_type TYPE set(100) GRANULARITY 1
        `
      });

      await client.command({
        query: `
          ALTER TABLE financial_events 
          ADD INDEX idx_season_year season_year TYPE minmax GRANULARITY 1
        `
      });

      await client.command({
        query: `
          ALTER TABLE user_activity_events 
          ADD INDEX idx_event_action event_action TYPE set(50) GRANULARITY 1
        `
      });

      console.log('✅ ClickHouse analytics tables created successfully');
    } catch (error) {
      console.error('❌ Error creating ClickHouse analytics tables:', error);
      throw error;
    } finally {
      await client.close();
    }
  },

  async down(): Promise<void> {
    const client = createClient({
      url: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
      database: process.env.CLICKHOUSE_DATABASE || 'daorsagro',
      username: process.env.CLICKHOUSE_USERNAME || 'default',
      password: process.env.CLICKHOUSE_PASSWORD || ''
    });

    try {
      // Drop materialized view first
      await client.command({
        query: `DROP VIEW IF EXISTS daily_farm_metrics_mv`
      });

      // Drop tables
      const tables = [
        'daily_farm_metrics',
        'iot_sensor_data',
        'weather_data',
        'insurance_analytics',
        'subsidy_analytics',
        'user_activity_events',
        'market_price_history',
        'budget_performance',
        'crop_performance_metrics',
        'farm_performance_metrics',
        'financial_events'
      ];

      for (const table of tables) {
        await client.command({
          query: `DROP TABLE IF EXISTS ${table}`
        });
        console.log(`✅ Dropped table: ${table}`);
      }

      console.log('✅ ClickHouse analytics tables dropped successfully');
    } catch (error) {
      console.error('❌ Error dropping ClickHouse analytics tables:', error);
      throw error;
    } finally {
      await client.close();
    }
  }
};