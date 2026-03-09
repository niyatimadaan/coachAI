/**
 * Database Manager
 * Handles SQLite database initialization and operations
 */

import SQLite, { SQLiteDatabase } from 'react-native-sqlite-storage';
import { CREATE_TABLES, CREATE_INDEXES, DATABASE_NAME, DATABASE_VERSION } from './schema';

// Enable promise-based API
SQLite.enablePromise(true);

class DatabaseManager {
  private db: SQLiteDatabase | null = null;

  /**
   * Initialize database connection and create tables
   */
  async initialize(): Promise<void> {
    try {
      this.db = await SQLite.openDatabase({
        name: DATABASE_NAME,
        location: 'default',
      });

      console.log('Database opened successfully');

      // Create all tables
      await this.createTables();
      
      // Create indexes for performance
      await this.createIndexes();

      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create all database tables
   */
  private async createTables(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const tableNames = Object.keys(CREATE_TABLES);
    
    for (const tableName of tableNames) {
      const sql = CREATE_TABLES[tableName as keyof typeof CREATE_TABLES];
      await this.db.executeSql(sql);
      console.log(`Table ${tableName} created successfully`);
    }
  }

  /**
   * Create database indexes
   */
  private async createIndexes(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const indexNames = Object.keys(CREATE_INDEXES);
    
    for (const indexName of indexNames) {
      const sql = CREATE_INDEXES[indexName as keyof typeof CREATE_INDEXES];
      await this.db.executeSql(sql);
      console.log(`Index ${indexName} created successfully`);
    }
  }

  /**
   * Execute a SQL query
   */
  async executeSql(sql: string, params: any[] = []): Promise<any> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const results = await this.db.executeSql(sql, params);
      // Handle both array and direct result formats
      return Array.isArray(results) ? results[0] : results;
    } catch (error) {
      console.error('SQL execution failed:', error);
      throw error;
    }
  }

  /**
   * Execute multiple SQL statements in a transaction
   */
  async transaction(sqlStatements: Array<{ sql: string; params?: any[] }>): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      await this.db.transaction(async (tx: any) => {
        for (const statement of sqlStatements) {
          await tx.executeSql(statement.sql, statement.params || []);
        }
      });
    } catch (error) {
      console.error('Transaction failed:', error);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
      console.log('Database closed successfully');
    }
  }

  /**
   * Get database instance
   */
  getDatabase(): SQLiteDatabase {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  /**
   * Clear all data from database (for testing/reset)
   */
  async clearAllData(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const tables = [
      'sync_queue',
      'recommended_drills',
      'form_issues',
      'biomechanical_metrics',
      'video_metadata',
      'progress_metrics',
      'user_progress',
      'shooting_sessions',
      'students',
      'device_capabilities'
    ];

    await this.db.transaction(async (tx: any) => {
      for (const table of tables) {
        await tx.executeSql(`DELETE FROM ${table}`);
      }
    });

    console.log('All data cleared successfully');
  }

  /**
   * Check database version and perform migrations if needed
   */
  async checkAndMigrate(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      // Get current version from a metadata table
      const [result] = await this.db.executeSql(
        'SELECT version FROM database_metadata WHERE id = 1'
      );
      
      const currentVersion = result.rows.item(0)?.version || 0;
      
      if (currentVersion < DATABASE_VERSION) {
        await this.performMigration(currentVersion, DATABASE_VERSION);
      }
    } catch (error) {
      // If metadata table doesn't exist, create it
      await this.db.executeSql(`
        CREATE TABLE IF NOT EXISTS database_metadata (
          id INTEGER PRIMARY KEY CHECK(id = 1),
          version INTEGER NOT NULL
        );
      `);
      
      await this.db.executeSql(
        'INSERT OR REPLACE INTO database_metadata (id, version) VALUES (1, ?)',
        [DATABASE_VERSION]
      );
    }
  }

  /**
   * Perform database migration
   */
  private async performMigration(fromVersion: number, toVersion: number): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    console.log(`Migrating database from version ${fromVersion} to ${toVersion}`);
    
    // Add migration logic here as schema evolves
    // For now, just update the version
    await this.db.executeSql(
      'UPDATE database_metadata SET version = ? WHERE id = 1',
      [toVersion]
    );
    
    console.log('Migration completed successfully');
  }
}

// Export singleton instance
export default new DatabaseManager();
