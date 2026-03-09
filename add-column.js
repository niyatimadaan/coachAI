const { Pool } = require('pg');
require('dotenv').config({ path: './src/backend/.env' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function addColumn() {
  try {
    console.log('🔄 Adding body_balance column...');
    
    await pool.query(`
      ALTER TABLE biomechanical_metrics 
      ADD COLUMN IF NOT EXISTS body_balance DECIMAL(5,2) NOT NULL DEFAULT 50.0;
    `);
    
    console.log('✅ Column added successfully!');
    
    // Verify
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'biomechanical_metrics';
    `);
    
    console.log('\n📋 Current columns:');
    result.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

addColumn();
