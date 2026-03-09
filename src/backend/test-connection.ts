/**
 * Database Connection Test
 * Quick diagnostic to test AWS RDS connection
 */

import dotenv from 'dotenv';
import { Pool } from 'pg';
import * as path from 'path';
import * as dns from 'dns';
import { promisify } from 'util';

const lookupAsync = promisify(dns.lookup);

dotenv.config({ path: path.join(__dirname, '.env') });

async function testConnection() {
  console.log('🔍 Database Connection Diagnostics');
  console.log('='.repeat(50));
  console.log('');

  // 1. Check environment variables
  console.log('1️⃣  Environment Variables:');
  console.log(`   DB_HOST: ${process.env.DB_HOST || 'NOT SET'}`);
  console.log(`   DB_PORT: ${process.env.DB_PORT || 'NOT SET'}`);
  console.log(`   DB_NAME: ${process.env.DB_NAME || 'NOT SET'}`);
  console.log(`   DB_USER: ${process.env.DB_USER || 'NOT SET'}`);
  console.log(`   DB_PASSWORD: ${process.env.DB_PASSWORD ? '***SET***' : 'NOT SET'}`);
  console.log(`   DB_SSL: ${process.env.DB_SSL || 'NOT SET'}`);
  console.log('');

  // 2. DNS Lookup
  console.log('2️⃣  DNS Lookup:');
  const hostname = process.env.DB_HOST;
  if (hostname) {
    try {
      const result = await lookupAsync(hostname);
      console.log(`   ✅ Resolved ${hostname} to ${result.address}`);
    } catch (error: any) {
      console.log(`   ❌ DNS lookup failed: ${error.message}`);
      console.log('   💡 Check your internet connection and try again');
      process.exit(1);
    }
  }
  console.log('');

  // 3. TCP Connection
  console.log('3️⃣  Testing PostgreSQL Connection:');
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 15000,
  });

  try {
    const client = await pool.connect();
    console.log('   ✅ Successfully connected to database');
    
    // 4. Test a simple query
    console.log('');
    console.log('4️⃣  Testing Query:');
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log(`   ✅ Database is responding`);
    console.log(`   Time: ${result.rows[0].current_time}`);
    console.log(`   Version: ${result.rows[0].pg_version.substring(0, 50)}...`);
    
    client.release();
    await pool.end();
    
    console.log('');
    console.log('🎉 All checks passed! Your database connection is working.');
    console.log('');
    
    process.exit(0);
  } catch (error: any) {
    console.log(`   ❌ Connection failed: ${error.message}`);
    console.log('');
    console.log('❌ Connection Test Failed');
    console.log('');
    console.log('Possible issues:');
    console.log('1. AWS RDS security group is not allowing your IP address');
    console.log('2. Database credentials are incorrect');
    console.log('3. Network/firewall is blocking the connection');
    console.log('4. RDS instance might be stopped or deleted');
    console.log('');
    console.log('🔧 Troubleshooting Steps:');
    console.log('1. Go to AWS Console → RDS → Databases → coachai');
    console.log('2. Check if status is "Available"');
    console.log('3. Click on VPC security group');
    console.log('4. Go to Inbound rules');
    console.log('5. Ensure port 5432 allows your IP:');
    console.log('   - Type: PostgreSQL');
    console.log('   - Port: 5432');
    console.log('   - Source: Your IP (or 0.0.0.0/0 for testing)');
    console.log('');
    
    await pool.end();
    process.exit(1);
  }
}

testConnection();
