/**
 * Database Configuration
 * PostgreSQL connection configuration for AWS RDS
 */

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
  max?: number; // Max connections in pool
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  keepAlive?: boolean;
  keepAliveInitialDelayMillis?: number;
}

export const getDatabaseConfig = (): DatabaseConfig => {
  const useSSL = process.env.DB_SSL === 'true';
  
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'coachai',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: useSSL ? { rejectUnauthorized: false } : false, // Accept self-signed certs for RDS
    max: 10, // Max connections in pool (reduced for RDS free tier)
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 30000, // Timeout for establishing connection (30 seconds)
    keepAlive: true, // Enable TCP keep-alive
    keepAliveInitialDelayMillis: 10000, // Start sending keep-alive packets after 10s
  };
};
