import { Pool } from 'pg';
import { Migration } from '../../src/types';

export const migration: Migration = {
  id: '002_financial_schema',
  name: 'Create financial management schema',
  timestamp: 1703002000000,
  
  async up(): Promise<void> {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || process.env.FINANCIAL_DATABASE_URL
    });

    try {
      await pool.query('BEGIN');

      // Enable UUID extension
      await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

      // Create enum types
      await pool.query(`
        CREATE TYPE transaction_type AS ENUM ('INCOME', 'EXPENSE');
      `);

      await pool.query(`
        CREATE TYPE payment_method AS ENUM ('CASH', 'CHECK', 'BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'DIGITAL_PAYMENT', 'OTHER');
      `);

      await pool.query(`
        CREATE TYPE budget_status AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');
      `);

      await pool.query(`
        CREATE TYPE report_type AS ENUM ('PROFIT_LOSS', 'CASH_FLOW', 'BUDGET_ANALYSIS', 'CROP_PROFITABILITY', 'TAX_SUMMARY');
      `);

      await pool.query(`
        CREATE TYPE period_type AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');
      `);

      await pool.query(`
        CREATE TYPE recurrency_frequency AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');
      `);

      await pool.query(`
        CREATE TYPE goal_type AS ENUM ('REVENUE', 'PROFIT', 'SAVINGS', 'EXPENSE_REDUCTION', 'INVESTMENT');
      `);

      // Transaction categories table
      await pool.query(`
        CREATE TABLE categories (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          type transaction_type NOT NULL,
          parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
          is_active BOOLEAN DEFAULT true,
          color VARCHAR(7), -- Hex color code
          icon VARCHAR(50),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      await pool.query(`
        CREATE INDEX idx_categories_name ON categories(name);
        CREATE INDEX idx_categories_type ON categories(type);
        CREATE INDEX idx_categories_parent_id ON categories(parent_id);
        CREATE INDEX idx_categories_is_active ON categories(is_active);
      `);

      // Transactions table
      await pool.query(`
        CREATE TABLE transactions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          farm_id UUID NOT NULL,
          category_id UUID NOT NULL REFERENCES categories(id),
          crop_id UUID,
          user_id UUID NOT NULL,
          amount DECIMAL(12, 2) NOT NULL,
          transaction_type transaction_type NOT NULL,
          description TEXT NOT NULL,
          transaction_date DATE NOT NULL,
          season_year INTEGER NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          
          -- Payment details
          payment_method payment_method,
          vendor_name VARCHAR(255),
          reference_number VARCHAR(100),
          receipt_url TEXT,
          invoice_number VARCHAR(100),
          
          -- Metadata
          tags TEXT[], -- Array of tags
          notes TEXT,
          
          -- Tax information
          is_tax_deductible BOOLEAN DEFAULT false,
          tax_category VARCHAR(100),
          
          -- Location tracking
          location_lat DECIMAL(10, 8),
          location_lng DECIMAL(11, 8),
          
          -- Recurring transaction reference
          recurring_transaction_id UUID,
          
          CONSTRAINT chk_amount_positive CHECK (amount > 0)
        );
      `);

      await pool.query(`
        CREATE INDEX idx_transactions_farm_id ON transactions(farm_id);
        CREATE INDEX idx_transactions_category_id ON transactions(category_id);
        CREATE INDEX idx_transactions_crop_id ON transactions(crop_id);
        CREATE INDEX idx_transactions_user_id ON transactions(user_id);
        CREATE INDEX idx_transactions_date ON transactions(transaction_date);
        CREATE INDEX idx_transactions_type ON transactions(transaction_type);
        CREATE INDEX idx_transactions_season_year ON transactions(season_year);
        CREATE INDEX idx_transactions_amount ON transactions(amount);
        CREATE INDEX idx_transactions_vendor ON transactions(vendor_name);
        CREATE INDEX idx_transactions_tags ON transactions USING GIN(tags);
        CREATE INDEX idx_transactions_farm_date ON transactions(farm_id, transaction_date);
        CREATE INDEX idx_transactions_recurring ON transactions(recurring_transaction_id);
      `);

      // Budgets table
      await pool.query(`
        CREATE TABLE budgets (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          farm_id UUID NOT NULL,
          user_id UUID NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          season_year INTEGER NOT NULL,
          total_budget DECIMAL(12, 2) NOT NULL,
          status budget_status DEFAULT 'DRAFT',
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          
          -- Budget metadata
          currency VARCHAR(3) DEFAULT 'USD',
          notes TEXT,
          
          CONSTRAINT chk_budget_dates CHECK (end_date > start_date),
          CONSTRAINT chk_total_budget_positive CHECK (total_budget > 0)
        );
      `);

      await pool.query(`
        CREATE INDEX idx_budgets_farm_id ON budgets(farm_id);
        CREATE INDEX idx_budgets_user_id ON budgets(user_id);
        CREATE INDEX idx_budgets_status ON budgets(status);
        CREATE INDEX idx_budgets_season_year ON budgets(season_year);
        CREATE INDEX idx_budgets_dates ON budgets(start_date, end_date);
      `);

      // Budget categories table
      await pool.query(`
        CREATE TABLE budget_categories (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
          category_id UUID NOT NULL REFERENCES categories(id),
          allocated_amount DECIMAL(12, 2) NOT NULL,
          spent_amount DECIMAL(12, 2) DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          
          -- Additional fields
          notes TEXT,
          priority INTEGER DEFAULT 1, -- 1 = high, 2 = medium, 3 = low
          
          UNIQUE(budget_id, category_id),
          CONSTRAINT chk_allocated_amount_positive CHECK (allocated_amount >= 0),
          CONSTRAINT chk_spent_amount_positive CHECK (spent_amount >= 0)
        );
      `);

      await pool.query(`
        CREATE INDEX idx_budget_categories_budget_id ON budget_categories(budget_id);
        CREATE INDEX idx_budget_categories_category_id ON budget_categories(category_id);
        CREATE INDEX idx_budget_categories_priority ON budget_categories(priority);
      `);

      // Financial reports table
      await pool.query(`
        CREATE TABLE financial_reports (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          farm_id UUID NOT NULL,
          report_type report_type NOT NULL,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          data JSONB NOT NULL,
          generated_by UUID NOT NULL,
          generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          
          -- Report metadata
          title VARCHAR(255),
          description TEXT,
          parameters JSONB,
          file_url TEXT, -- URL to generated PDF/Excel file
          
          CONSTRAINT chk_report_dates CHECK (end_date >= start_date)
        );
      `);

      await pool.query(`
        CREATE INDEX idx_financial_reports_farm_id ON financial_reports(farm_id);
        CREATE INDEX idx_financial_reports_type ON financial_reports(report_type);
        CREATE INDEX idx_financial_reports_generated_by ON financial_reports(generated_by);
        CREATE INDEX idx_financial_reports_generated_at ON financial_reports(generated_at);
        CREATE INDEX idx_financial_reports_dates ON financial_reports(start_date, end_date);
      `);

      // Financial summaries table
      await pool.query(`
        CREATE TABLE financial_summaries (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          farm_id UUID NOT NULL,
          period VARCHAR(20) NOT NULL, -- YYYY-MM, YYYY-Q1, etc.
          period_type period_type NOT NULL,
          total_income DECIMAL(12, 2) NOT NULL DEFAULT 0,
          total_expenses DECIMAL(12, 2) NOT NULL DEFAULT 0,
          net_profit DECIMAL(12, 2) NOT NULL DEFAULT 0,
          profit_margin DECIMAL(5, 2) NOT NULL DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          
          -- Additional metrics
          transaction_count INTEGER DEFAULT 0,
          avg_transaction_amount DECIMAL(12, 2) DEFAULT 0,
          largest_expense DECIMAL(12, 2) DEFAULT 0,
          largest_income DECIMAL(12, 2) DEFAULT 0,
          
          UNIQUE(farm_id, period, period_type)
        );
      `);

      await pool.query(`
        CREATE INDEX idx_financial_summaries_farm_id ON financial_summaries(farm_id);
        CREATE INDEX idx_financial_summaries_period_type ON financial_summaries(period_type);
        CREATE INDEX idx_financial_summaries_period ON financial_summaries(period);
        CREATE INDEX idx_financial_summaries_profit ON financial_summaries(net_profit);
      `);

      // Cash flow entries table
      await pool.query(`
        CREATE TABLE cash_flow_entries (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          farm_id UUID NOT NULL,
          date DATE NOT NULL,
          transaction_type transaction_type NOT NULL,
          amount DECIMAL(12, 2) NOT NULL,
          running_balance DECIMAL(12, 2) NOT NULL,
          description TEXT,
          category_id UUID REFERENCES categories(id),
          transaction_id UUID, -- Reference to the actual transaction
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          
          CONSTRAINT chk_cash_flow_amount_positive CHECK (amount > 0)
        );
      `);

      await pool.query(`
        CREATE INDEX idx_cash_flow_entries_farm_id ON cash_flow_entries(farm_id);
        CREATE INDEX idx_cash_flow_entries_date ON cash_flow_entries(date);
        CREATE INDEX idx_cash_flow_entries_farm_date ON cash_flow_entries(farm_id, date);
        CREATE INDEX idx_cash_flow_entries_transaction_id ON cash_flow_entries(transaction_id);
      `);

      // Recurring transactions table
      await pool.query(`
        CREATE TABLE recurring_transactions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          farm_id UUID NOT NULL,
          category_id UUID NOT NULL REFERENCES categories(id),
          name VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          amount DECIMAL(12, 2) NOT NULL,
          transaction_type transaction_type NOT NULL,
          frequency recurrency_frequency NOT NULL,
          day_of_month INTEGER, -- For monthly/yearly (1-31)
          day_of_week INTEGER, -- For weekly (0=Sunday, 6=Saturday)
          start_date DATE NOT NULL,
          end_date DATE,
          is_active BOOLEAN DEFAULT true,
          last_executed DATE,
          next_execution DATE NOT NULL,
          user_id UUID NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          
          -- Additional fields
          payment_method payment_method,
          vendor_name VARCHAR(255),
          tags TEXT[],
          auto_execute BOOLEAN DEFAULT false,
          
          CONSTRAINT chk_recurring_amount_positive CHECK (amount > 0),
          CONSTRAINT chk_recurring_dates CHECK (end_date IS NULL OR end_date > start_date),
          CONSTRAINT chk_day_of_month CHECK (day_of_month IS NULL OR (day_of_month >= 1 AND day_of_month <= 31)),
          CONSTRAINT chk_day_of_week CHECK (day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6))
        );
      `);

      await pool.query(`
        CREATE INDEX idx_recurring_transactions_farm_id ON recurring_transactions(farm_id);
        CREATE INDEX idx_recurring_transactions_category_id ON recurring_transactions(category_id);
        CREATE INDEX idx_recurring_transactions_is_active ON recurring_transactions(is_active);
        CREATE INDEX idx_recurring_transactions_next_execution ON recurring_transactions(next_execution);
        CREATE INDEX idx_recurring_transactions_frequency ON recurring_transactions(frequency);
      `);

      -- Market prices table
      await pool.query(`
        CREATE TABLE market_prices (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          commodity VARCHAR(100) NOT NULL,
          market VARCHAR(100) NOT NULL,
          price DECIMAL(10, 4) NOT NULL,
          unit VARCHAR(20) NOT NULL,
          currency VARCHAR(3) DEFAULT 'USD',
          date DATE NOT NULL,
          source VARCHAR(100) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          
          -- Additional market data
          volume DECIMAL(15, 2),
          high_price DECIMAL(10, 4),
          low_price DECIMAL(10, 4),
          change_amount DECIMAL(10, 4),
          change_percent DECIMAL(5, 2),
          
          UNIQUE(commodity, market, date),
          CONSTRAINT chk_price_positive CHECK (price > 0)
        );
      `);

      await pool.query(`
        CREATE INDEX idx_market_prices_commodity ON market_prices(commodity);
        CREATE INDEX idx_market_prices_market ON market_prices(market);
        CREATE INDEX idx_market_prices_date ON market_prices(date);
        CREATE INDEX idx_market_prices_commodity_date ON market_prices(commodity, date);
        CREATE INDEX idx_market_prices_source ON market_prices(source);
      `);

      -- Financial goals table
      await pool.query(`
        CREATE TABLE financial_goals (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          farm_id UUID NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          goal_type goal_type NOT NULL,
          target_amount DECIMAL(12, 2) NOT NULL,
          current_amount DECIMAL(12, 2) DEFAULT 0,
          target_date DATE NOT NULL,
          is_active BOOLEAN DEFAULT true,
          user_id UUID NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          
          -- Goal tracking
          category_id UUID REFERENCES categories(id), -- Optional: link to specific category
          progress_percentage DECIMAL(5, 2) DEFAULT 0,
          last_updated_at TIMESTAMP WITH TIME ZONE,
          achieved_at TIMESTAMP WITH TIME ZONE,
          
          CONSTRAINT chk_target_amount_positive CHECK (target_amount > 0),
          CONSTRAINT chk_current_amount_positive CHECK (current_amount >= 0),
          CONSTRAINT chk_progress_percentage CHECK (progress_percentage >= 0 AND progress_percentage <= 100)
        );
      `);

      await pool.query(`
        CREATE INDEX idx_financial_goals_farm_id ON financial_goals(farm_id);
        CREATE INDEX idx_financial_goals_user_id ON financial_goals(user_id);
        CREATE INDEX idx_financial_goals_is_active ON financial_goals(is_active);
        CREATE INDEX idx_financial_goals_goal_type ON financial_goals(goal_type);
        CREATE INDEX idx_financial_goals_target_date ON financial_goals(target_date);
        CREATE INDEX idx_financial_goals_category_id ON financial_goals(category_id);
      `);

      -- Crop profitability table
      await pool.query(`
        CREATE TABLE crop_profitability (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          farm_id UUID NOT NULL,
          crop_id UUID NOT NULL,
          season_year INTEGER NOT NULL,
          total_revenue DECIMAL(12, 2) NOT NULL DEFAULT 0,
          total_expenses DECIMAL(12, 2) NOT NULL DEFAULT 0,
          net_profit DECIMAL(12, 2) NOT NULL DEFAULT 0,
          profit_per_acre DECIMAL(12, 2) NOT NULL DEFAULT 0,
          yield_per_acre DECIMAL(10, 2),
          profit_margin DECIMAL(5, 2) NOT NULL DEFAULT 0,
          calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          
          -- Additional metrics
          cost_per_acre DECIMAL(12, 2) DEFAULT 0,
          revenue_per_acre DECIMAL(12, 2) DEFAULT 0,
          break_even_yield DECIMAL(10, 2),
          roi_percentage DECIMAL(5, 2) DEFAULT 0,
          
          UNIQUE(farm_id, crop_id, season_year)
        );
      `);

      await pool.query(`
        CREATE INDEX idx_crop_profitability_farm_id ON crop_profitability(farm_id);
        CREATE INDEX idx_crop_profitability_crop_id ON crop_profitability(crop_id);
        CREATE INDEX idx_crop_profitability_season_year ON crop_profitability(season_year);
        CREATE INDEX idx_crop_profitability_profit ON crop_profitability(net_profit);
        CREATE INDEX idx_crop_profitability_roi ON crop_profitability(roi_percentage);
      `);

      -- Add updated_at triggers
      const tablesWithUpdatedAt = [
        'categories', 'transactions', 'budgets', 'budget_categories',
        'financial_summaries', 'recurring_transactions', 'financial_goals'
      ];
      
      for (const table of tablesWithUpdatedAt) {
        await pool.query(`
          CREATE TRIGGER update_${table}_updated_at 
          BEFORE UPDATE ON ${table} 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        `);
      }

      await pool.query('COMMIT');
      console.log('✅ Financial schema created successfully');
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    } finally {
      await pool.end();
    }
  },

  async down(): Promise<void> {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || process.env.FINANCIAL_DATABASE_URL
    });

    try {
      await pool.query('BEGIN');

      // Drop tables in reverse order
      const tables = [
        'crop_profitability',
        'financial_goals',
        'market_prices',
        'recurring_transactions',
        'cash_flow_entries',
        'financial_summaries',
        'financial_reports',
        'budget_categories',
        'budgets',
        'transactions',
        'categories'
      ];

      for (const table of tables) {
        await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
      }

      // Drop enum types
      const enums = [
        'transaction_type', 'payment_method', 'budget_status', 'report_type',
        'period_type', 'recurrency_frequency', 'goal_type'
      ];
      
      for (const enumType of enums) {
        await pool.query(`DROP TYPE IF EXISTS ${enumType} CASCADE`);
      }

      await pool.query('COMMIT');
      console.log('✅ Financial schema dropped successfully');
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    } finally {
      await pool.end();
    }
  }
};