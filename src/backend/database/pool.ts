/**
 * PostgreSQL Connection Pool
 * Manages database connections using pg library
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { getDatabaseConfig } from './config';

class DatabasePool {
  private pool: Pool | null = null;
  private isInitialized = false;

  /**
   * Initialize the connection pool
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('Database pool already initialized');
      return;
    }

    const config = getDatabaseConfig();
    
    // Close existing pool if any
    if (this.pool) {
      await this.pool.end();
    }
    
    this.pool = new Pool(config);

    // Test connection with retries
    let retries = 3;
    let lastError: Error | null = null;
    
    while (retries > 0) {
      try {
        const client = await this.pool.connect();
        console.log('✅ Database connected successfully');
        client.release();
        this.isInitialized = true;
        
        // Handle pool errors
        this.pool.on('error', (err) => {
          console.error('Unexpected database pool error:', err);
          this.isInitialized = false;
        });
        
        return;
      } catch (error: any) {
        lastError = error;
        retries--;
        if (retries > 0) {
          console.log(`⚠️  Connection failed, retrying... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
        }
      }
    }
    
    console.error('❌ Database connection failed:', lastError?.message);
    throw new Error(`Failed to connect to database: ${lastError?.message}`);
  }

  /**
   * Execute a query
   */
  async query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    if (!this.pool) {
      throw new Error('Database pool not initialized. Call initialize() first.');
    }

    try {
      const start = Date.now();
      const result = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;
      
      // Only log slow queries to reduce noise
      if (duration > 1000) {
        console.log(`⚠️  Slow query executed in ${duration}ms:`, text.substring(0, 50));
      }
      return result;
    } catch (error: any) {
      // Check if it's a connection error
      if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
        console.error('⚠️  Connection error, attempting to reconnect...');
        this.isInitialized = false;
        
        // Try to reinitialize
        try {
          await this.initialize();
          // Retry the query once after reconnection
          const result = await this.pool!.query<T>(text, params);
          return result;
        } catch (retryError) {
          console.error('Query error after reconnection attempt:', error.message);
          throw error;
        }
      }
      
      console.error('Query error:', error.message);
      if (error.code) {
        console.error('Error code:', error.code);
      }
      throw error;
    }
  }

  /**
   * Get a client from the pool for transactions
   */
  async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }
    return this.pool.connect();
  }

  /**
   * Close the pool
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.isInitialized = false;
      console.log('Database pool closed');
    }
  }

  /**
   * Check if pool is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}

// Singleton instance
export const db = new DatabasePool();
