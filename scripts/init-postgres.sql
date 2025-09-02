-- init-postgres.sql
-- PostgreSQL initialization script for DaorsAgro platform
-- This script sets up the necessary databases, users, and initial schema

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create additional databases for different services
CREATE DATABASE agro_auth;
CREATE DATABASE agro_financial;
CREATE DATABASE agro_analytics;
CREATE DATABASE agro_documents;

-- Create service-specific users
CREATE USER auth_service WITH PASSWORD 'auth_service_password';
CREATE USER financial_service WITH PASSWORD 'financial_service_password';
CREATE USER analytics_service WITH PASSWORD 'analytics_service_password';
CREATE USER document_service WITH PASSWORD 'document_service_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE agro_auth TO auth_service;
GRANT ALL PRIVILEGES ON DATABASE agro_financial TO financial_service;
GRANT ALL PRIVILEGES ON DATABASE agro_analytics TO analytics_service;
GRANT ALL PRIVILEGES ON DATABASE agro_documents TO document_service;

-- Connect to main database and create initial schema
\c agro_production;

-- Users and Authentication Schema
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS financial;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS documents;
CREATE SCHEMA IF NOT EXISTS notifications;
CREATE SCHEMA IF NOT EXISTS audit;

-- Set search path for the current session
SET search_path TO public, auth, financial, analytics, documents;

-- User management tables
CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone_number VARCHAR(20),
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    role VARCHAR(50) DEFAULT 'farmer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    profile_data JSONB DEFAULT '{}',
    
    CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT users_role_check CHECK (role IN ('farmer', 'advisor', 'admin', 'financial_officer', 'insurance_agent'))
);

-- User profiles and additional information
CREATE TABLE IF NOT EXISTS auth.user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    farm_name VARCHAR(200),
    farm_size_hectares DECIMAL(10,2),
    crop_types TEXT[],
    location_coordinates POINT,
    address JSONB,
    farming_experience_years INTEGER,
    preferred_language VARCHAR(10) DEFAULT 'en',
    notification_preferences JSONB DEFAULT '{"email": true, "sms": false, "push": true}',
    kyc_status VARCHAR(50) DEFAULT 'pending',
    kyc_documents JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT user_profiles_farming_experience_check CHECK (farming_experience_years >= 0)
);

-- Financial data tables
CREATE TABLE IF NOT EXISTS financial.accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_type VARCHAR(50) NOT NULL,
    account_number VARCHAR(100) UNIQUE,
    bank_name VARCHAR(200),
    branch_code VARCHAR(50),
    balance DECIMAL(15,2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT accounts_account_type_check CHECK (account_type IN ('savings', 'checking', 'loan', 'credit')),
    CONSTRAINT accounts_balance_check CHECK (balance >= -999999.99)
);

-- Financial transactions
CREATE TABLE IF NOT EXISTS financial.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES financial.accounts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    description TEXT,
    reference_number VARCHAR(100) UNIQUE,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    
    CONSTRAINT transactions_type_check CHECK (transaction_type IN ('deposit', 'withdrawal', 'transfer', 'payment', 'loan', 'grant', 'subsidy')),
    CONSTRAINT transactions_status_check CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    CONSTRAINT transactions_amount_check CHECK (amount != 0)
);

-- Analytics and reporting tables
CREATE TABLE IF NOT EXISTS analytics.user_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type VARCHAR(100) NOT NULL,
    activity_data JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT activities_type_check CHECK (activity_type != '')
);

-- Document storage metadata
CREATE TABLE IF NOT EXISTS documents.document_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    original_filename VARCHAR(500),
    stored_filename VARCHAR(500) UNIQUE,
    file_size INTEGER,
    mime_type VARCHAR(100),
    file_hash VARCHAR(64),
    storage_location VARCHAR(500),
    is_verified BOOLEAN DEFAULT FALSE,
    verification_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT documents_type_check CHECK (document_type IN ('id_card', 'passport', 'farm_certificate', 'bank_statement', 'tax_document', 'insurance_policy')),
    CONSTRAINT documents_file_size_check CHECK (file_size > 0)
);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID,
    action VARCHAR(50) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    user_id UUID REFERENCES auth.users(id),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT audit_action_check CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'SELECT'))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON auth.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON auth.users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON auth.users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON auth.users(is_active);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON auth.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_kyc_status ON auth.user_profiles(kyc_status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_location ON auth.user_profiles USING GIST(location_coordinates);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON financial.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON financial.accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_accounts_active ON financial.accounts(is_active);

CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON financial.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON financial.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON financial.transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON financial.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON financial.transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON financial.transactions(reference_number);

CREATE INDEX IF NOT EXISTS idx_activities_user_id ON analytics.user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_type ON analytics.user_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON analytics.user_activities(created_at);

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents.document_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents.document_metadata(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_verified ON documents.document_metadata(is_verified);

CREATE INDEX IF NOT EXISTS idx_audit_table_record ON audit.audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit.audit_logs(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON auth.users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON auth.user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON financial.accounts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON financial.transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents.document_metadata 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit.audit_logs (table_name, record_id, action, new_values)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit.audit_logs (table_name, record_id, action, old_values, new_values)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit.audit_logs (table_name, record_id, action, old_values)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Apply audit triggers to important tables
CREATE TRIGGER audit_users AFTER INSERT OR UPDATE OR DELETE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_transactions AFTER INSERT OR UPDATE OR DELETE ON financial.transactions
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_accounts AFTER INSERT OR UPDATE OR DELETE ON financial.accounts
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Create some sample data for development/testing
INSERT INTO auth.users (email, password_hash, first_name, last_name, role) VALUES
    ('admin@daorsagro.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewvD5mWzuAnVQWzO', 'Admin', 'User', 'admin'),
    ('farmer@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewvD5mWzuAnVQWzO', 'John', 'Farmer', 'farmer'),
    ('advisor@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewvD5mWzuAnVQWzO', 'Jane', 'Advisor', 'advisor')
ON CONFLICT (email) DO NOTHING;

-- Grant permissions to service users
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA auth TO auth_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA financial TO financial_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA analytics TO analytics_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA documents TO document_service;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA auth TO auth_service;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA financial TO financial_service;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA analytics TO analytics_service;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA documents TO document_service;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO auth_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA financial GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO financial_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA analytics GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO analytics_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA documents GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO document_service;

ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT USAGE, SELECT ON SEQUENCES TO auth_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA financial GRANT USAGE, SELECT ON SEQUENCES TO financial_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA analytics GRANT USAGE, SELECT ON SEQUENCES TO analytics_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA documents GRANT USAGE, SELECT ON SEQUENCES TO document_service;

-- Create a view for user dashboard data
CREATE OR REPLACE VIEW auth.user_dashboard_view AS
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.role,
    u.is_verified,
    u.is_active,
    u.last_login_at,
    up.farm_name,
    up.farm_size_hectares,
    up.crop_types,
    up.kyc_status,
    COALESCE(acc_summary.total_balance, 0) as total_balance,
    COALESCE(acc_summary.account_count, 0) as account_count,
    COALESCE(txn_summary.recent_transactions, 0) as recent_transactions_count
FROM auth.users u
LEFT JOIN auth.user_profiles up ON u.id = up.user_id
LEFT JOIN (
    SELECT 
        user_id, 
        SUM(balance) as total_balance,
        COUNT(*) as account_count
    FROM financial.accounts 
    WHERE is_active = true
    GROUP BY user_id
) acc_summary ON u.id = acc_summary.user_id
LEFT JOIN (
    SELECT 
        user_id,
        COUNT(*) as recent_transactions
    FROM financial.transactions 
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY user_id
) txn_summary ON u.id = txn_summary.user_id;

-- Grant view permissions
GRANT SELECT ON auth.user_dashboard_view TO auth_service, financial_service;

COMMIT;