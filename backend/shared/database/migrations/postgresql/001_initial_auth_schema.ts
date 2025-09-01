import { Pool } from 'pg';
import { Migration } from '../../src/types';

export const migration: Migration = {
  id: '001_initial_auth_schema',
  name: 'Create initial authentication schema',
  timestamp: 1703001000000,
  
  async up(): Promise<void> {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || process.env.AUTH_DATABASE_URL
    });

    try {
      await pool.query('BEGIN');

      // Enable UUID extension
      await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

      // Create enum types
      await pool.query(`
        CREATE TYPE user_role AS ENUM ('FARMER', 'ADVISOR', 'ADMIN', 'SUPPORT');
      `);

      await pool.query(`
        CREATE TYPE farm_type AS ENUM ('CROP', 'LIVESTOCK', 'MIXED', 'DAIRY', 'POULTRY', 'AQUACULTURE');
      `);

      await pool.query(`
        CREATE TYPE farm_member_role AS ENUM ('OWNER', 'MANAGER', 'MEMBER', 'VIEWER');
      `);

      await pool.query(`
        CREATE TYPE crop_status AS ENUM ('PLANNED', 'PLANTED', 'GROWING', 'HARVESTED', 'SOLD');
      `);

      // Users table
      await pool.query(`
        CREATE TABLE users (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          email VARCHAR(255) UNIQUE NOT NULL,
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          phone VARCHAR(20),
          password_hash VARCHAR(255) NOT NULL,
          role user_role DEFAULT 'FARMER',
          is_active BOOLEAN DEFAULT true,
          email_verified BOOLEAN DEFAULT false,
          email_verified_at TIMESTAMP WITH TIME ZONE,
          last_login_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          
          -- Profile fields
          avatar TEXT,
          bio TEXT,
          location VARCHAR(255),
          currency VARCHAR(3) DEFAULT 'USD',
          language VARCHAR(5) DEFAULT 'en',
          timezone VARCHAR(50) DEFAULT 'UTC',
          
          -- Notification preferences
          notify_email BOOLEAN DEFAULT true,
          notify_sms BOOLEAN DEFAULT false,
          notify_push BOOLEAN DEFAULT true,
          
          -- Notification categories
          notify_financial BOOLEAN DEFAULT true,
          notify_subsidies BOOLEAN DEFAULT true,
          notify_insurance BOOLEAN DEFAULT true,
          notify_weather BOOLEAN DEFAULT true,
          notify_system BOOLEAN DEFAULT true
        );
      `);

      // Create indexes for users
      await pool.query(`
        CREATE INDEX idx_users_email ON users(email);
        CREATE INDEX idx_users_role ON users(role);
        CREATE INDEX idx_users_is_active ON users(is_active);
        CREATE INDEX idx_users_created_at ON users(created_at);
      `);

      // Refresh tokens table
      await pool.query(`
        CREATE TABLE refresh_tokens (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          token VARCHAR(255) UNIQUE NOT NULL,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          revoked_at TIMESTAMP WITH TIME ZONE
        );
      `);

      await pool.query(`
        CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
        CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
        CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
      `);

      // Password reset tokens
      await pool.query(`
        CREATE TABLE password_resets (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          email VARCHAR(255) NOT NULL,
          token VARCHAR(255) UNIQUE NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          used_at TIMESTAMP WITH TIME ZONE
        );
      `);

      await pool.query(`
        CREATE INDEX idx_password_resets_email ON password_resets(email);
        CREATE INDEX idx_password_resets_token ON password_resets(token);
        CREATE INDEX idx_password_resets_expires_at ON password_resets(expires_at);
      `);

      // Email verification tokens
      await pool.query(`
        CREATE TABLE email_verifications (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token VARCHAR(255) UNIQUE NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          verified_at TIMESTAMP WITH TIME ZONE
        );
      `);

      await pool.query(`
        CREATE INDEX idx_email_verifications_user_id ON email_verifications(user_id);
        CREATE INDEX idx_email_verifications_token ON email_verifications(token);
        CREATE INDEX idx_email_verifications_expires_at ON email_verifications(expires_at);
      `);

      // Farms table
      await pool.query(`
        CREATE TABLE farms (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          total_acres DECIMAL(10, 2) NOT NULL,
          farm_type farm_type NOT NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          
          -- Location
          address VARCHAR(500) NOT NULL,
          city VARCHAR(100) NOT NULL,
          state VARCHAR(100) NOT NULL,
          country VARCHAR(100) NOT NULL,
          zip_code VARCHAR(20) NOT NULL,
          latitude DECIMAL(10, 8),
          longitude DECIMAL(11, 8),
          
          -- Certifications (stored as JSON array)
          certifications JSONB DEFAULT '[]'::jsonb
        );
      `);

      await pool.query(`
        CREATE INDEX idx_farms_name ON farms(name);
        CREATE INDEX idx_farms_farm_type ON farms(farm_type);
        CREATE INDEX idx_farms_is_active ON farms(is_active);
        CREATE INDEX idx_farms_location ON farms(city, state, country);
        CREATE INDEX idx_farms_coordinates ON farms(latitude, longitude);
        CREATE INDEX idx_farms_certifications ON farms USING GIN(certifications);
      `);

      // Farm members table
      await pool.query(`
        CREATE TABLE farm_members (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          role farm_member_role DEFAULT 'MEMBER',
          joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          left_at TIMESTAMP WITH TIME ZONE,
          
          UNIQUE(farm_id, user_id)
        );
      `);

      await pool.query(`
        CREATE INDEX idx_farm_members_farm_id ON farm_members(farm_id);
        CREATE INDEX idx_farm_members_user_id ON farm_members(user_id);
        CREATE INDEX idx_farm_members_role ON farm_members(role);
      `);

      // Crops table
      await pool.query(`
        CREATE TABLE crops (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          variety VARCHAR(255),
          acres DECIMAL(10, 2) NOT NULL,
          planting_date DATE,
          expected_harvest_date DATE,
          actual_harvest_date DATE,
          status crop_status DEFAULT 'PLANNED',
          season_year INTEGER NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          
          -- Yield data
          expected_yield DECIMAL(10, 2),
          actual_yield DECIMAL(10, 2),
          yield_unit VARCHAR(50)
        );
      `);

      await pool.query(`
        CREATE INDEX idx_crops_farm_id ON crops(farm_id);
        CREATE INDEX idx_crops_name ON crops(name);
        CREATE INDEX idx_crops_status ON crops(status);
        CREATE INDEX idx_crops_season_year ON crops(season_year);
        CREATE INDEX idx_crops_planting_date ON crops(planting_date);
      `);

      // Audit log table
      await pool.query(`
        CREATE TABLE audit_logs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES users(id),
          action VARCHAR(100) NOT NULL,
          entity_type VARCHAR(100) NOT NULL,
          entity_id VARCHAR(255) NOT NULL,
          old_values JSONB,
          new_values JSONB,
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      await pool.query(`
        CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
        CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
        CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
        CREATE INDEX idx_audit_logs_action ON audit_logs(action);
      `);

      // System settings table
      await pool.query(`
        CREATE TABLE system_settings (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          key VARCHAR(255) UNIQUE NOT NULL,
          value JSONB NOT NULL,
          category VARCHAR(100) NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      await pool.query(`
        CREATE INDEX idx_system_settings_key ON system_settings(key);
        CREATE INDEX idx_system_settings_category ON system_settings(category);
      `);

      // Create updated_at trigger function
      await pool.query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ language 'plpgsql';
      `);

      // Add updated_at triggers
      const tablesWithUpdatedAt = ['users', 'farms', 'crops', 'system_settings'];
      for (const table of tablesWithUpdatedAt) {
        await pool.query(`
          CREATE TRIGGER update_${table}_updated_at 
          BEFORE UPDATE ON ${table} 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        `);
      }

      await pool.query('COMMIT');
      console.log('✅ Initial auth schema created successfully');
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    } finally {
      await pool.end();
    }
  },

  async down(): Promise<void> {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || process.env.AUTH_DATABASE_URL
    });

    try {
      await pool.query('BEGIN');

      // Drop tables in reverse order
      const tables = [
        'audit_logs',
        'system_settings',
        'crops',
        'farm_members',
        'farms',
        'email_verifications',
        'password_resets',
        'refresh_tokens',
        'users'
      ];

      for (const table of tables) {
        await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
      }

      // Drop enum types
      const enums = ['user_role', 'farm_type', 'farm_member_role', 'crop_status'];
      for (const enumType of enums) {
        await pool.query(`DROP TYPE IF EXISTS ${enumType} CASCADE`);
      }

      // Drop function
      await pool.query('DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE');

      await pool.query('COMMIT');
      console.log('✅ Initial auth schema dropped successfully');
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    } finally {
      await pool.end();
    }
  }
};