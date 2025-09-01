export interface Migration {
  id: string;
  name: string;
  timestamp: number;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

export interface MigrationRecord {
  id: string;
  name: string;
  executed_at: Date;
  execution_time_ms: number;
}

export interface SeedData {
  name: string;
  priority: number;
  execute: () => Promise<void>;
}

export interface DatabaseConnection {
  type: 'postgresql' | 'mongodb' | 'redis' | 'clickhouse' | 'elasticsearch';
  connection: any;
  isConnected: boolean;
}

export interface SchemaValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface DatabaseConfig {
  postgresql: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl?: boolean;
  };
  mongodb: {
    url: string;
    database: string;
  };
  redis: {
    url: string;
  };
  clickhouse: {
    url: string;
    database: string;
    username?: string;
    password?: string;
  };
  elasticsearch: {
    url: string;
  };
}