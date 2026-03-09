/**
 * Migration script to add body_balance column to biomechanical_metrics table
 */

import DatabaseManager from './database/DatabaseManager';
import { db } from './database/pool';

async function migrateDatabase() {
  try {
    console.log('🔄 Starting database migration...');
    
    // Initialize database connection
    await db.initialize();
    console.log('   Database connection initialized');
    
    console.log('   Adding body_balance column to biomechanical_metrics table');
    
    await DatabaseManager.query(`
      ALTER TABLE biomechanical_metrics 
      ADD COLUMN IF NOT EXISTS body_balance DECIMAL(5,2) NOT NULL DEFAULT 50.0;
    `);
    
    console.log('✅ Migration complete!');
    console.log('   body_balance column added successfully');
    
    await db.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateDatabase();
