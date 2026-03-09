/**
 * Database Initialization Script
 * Run this to create all necessary tables in your PostgreSQL database
 */

import dotenv from 'dotenv';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import bcrypt from 'bcrypt';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function initializeDatabase() {
  try {
    console.log('🔌 Connecting to database...');
    console.log(`   Host: ${process.env.DB_HOST}`);
    console.log(`   Database: ${process.env.DB_NAME}`);
    console.log(`   User: ${process.env.DB_USER}`);
    console.log('');

    // Test connection
    const client = await pool.connect();
    console.log('✅ Connected to database successfully');
    console.log('');

    // Read schema file
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    console.log('📄 Reading schema file:', schemaPath);
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at: ${schemaPath}`);
    }

    const schema = fs.readFileSync(schemaPath, 'utf8');
    console.log('✅ Schema file loaded');
    console.log('');

    // Execute schema
    console.log('🏗️  Creating tables...');
    await client.query(schema);
    console.log('✅ All tables created successfully');
    console.log('');

    // Verify tables
    console.log('🔍 Verifying tables...');
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    console.log('✅ Found', result.rows.length, 'tables:');
    result.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });
    console.log('');

    // Create dummy data
    console.log('👤 Creating dummy data...');
    console.log('');
    
    // Check if coach already exists
    const existingCoach = await client.query(
      'SELECT id FROM users WHERE email = $1',
      ['coach@example.com']
    );
    
    let coach;
    if (existingCoach.rows.length > 0) {
      console.log('ℹ️  Coach account already exists, skipping user creation');
      coach = await client.query(
        'SELECT id, email, name, role FROM users WHERE email = $1',
        ['coach@example.com']
      );
      coach = coach.rows[0];
    } else {
      // Create coach user
      const passwordHash = await bcrypt.hash('coach123', 10);
      const coachResult = await client.query(`
        INSERT INTO users (email, name, password_hash, role)
        VALUES ($1, $2, $3, $4)
        RETURNING id, email, name, role
      `, ['coach@example.com', 'Coach Mike Johnson', passwordHash, 'coach']);
      coach = coachResult.rows[0];
      console.log('✅ Created coach account:');
      console.log(`   Email: ${coach.email}`);
      console.log(`   Password: coach123`);
      console.log(`   Name: ${coach.name}`);
    }
    console.log('');

    // Create 4 students with login accounts
    const students = [
      { name: 'Sarah Williams', email: 'sarah@example.com', password: 'student123', age: 16, skillLevel: 'intermediate' },
      { name: 'Marcus Davis', email: 'marcus@example.com', password: 'student123', age: 15, skillLevel: 'beginner' },
      { name: 'Emily Chen', email: 'emily@example.com', password: 'student123', age: 17, skillLevel: 'advanced' },
      { name: 'Jordan Thompson', email: 'jordan@example.com', password: 'student123', age: 16, skillLevel: 'intermediate' }
    ];

    console.log('🏀 Creating students with login accounts:');
    const createdStudents = [];
    
    for (const student of students) {
      // Check if student user account already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [student.email]
      );
      
      let userId;
      if (existingUser.rows.length > 0) {
        userId = existingUser.rows[0].id;
        console.log(`   ℹ️  User account for ${student.name} already exists`);
      } else {
        // Create user account for student
        const passwordHash = await bcrypt.hash(student.password, 10);
        const userResult = await client.query(`
          INSERT INTO users (email, name, password_hash, role)
          VALUES ($1, $2, $3, $4)
          RETURNING id
        `, [student.email, student.name, passwordHash, 'student']);
        userId = userResult.rows[0].id;
        console.log(`   ✅ Created user account: ${student.email}`);
      }
      
      // Check if student profile already exists
      const existing = await client.query(
        'SELECT id, name, age, skill_level, user_id FROM students WHERE user_id = $1',
        [userId]
      );
      
      if (existing.rows.length > 0) {
        createdStudents.push(existing.rows[0]);
        console.log(`   ℹ️  Student profile for ${existing.rows[0].name} already exists`);
      } else {
        const studentResult = await client.query(`
          INSERT INTO students (user_id, name, age, skill_level, coach_id)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, name, age, skill_level, user_id
        `, [userId, student.name, student.age, student.skillLevel, coach.id]);
        
        createdStudents.push(studentResult.rows[0]);
        console.log(`   ✅ ${studentResult.rows[0].name} (${studentResult.rows[0].skill_level})`);
      }
    }
    console.log('');

    // Create sample shooting sessions for each student
    console.log('📊 Creating sample shooting sessions...');
    const sessionIds: { studentId: string; sessionId: string; studentName: string }[] = [];
    
    for (const student of createdStudents) {
      // Create 2-3 sessions per student
      const sessionCount = Math.floor(Math.random() * 2) + 2;
      
      for (let i = 0; i < sessionCount; i++) {
        const daysAgo = Math.floor(Math.random() * 14) + 1; // 1-14 days ago
        const timestamp = new Date();
        timestamp.setDate(timestamp.getDate() - daysAgo);
        
        const shotAttempts = Math.floor(Math.random() * 30) + 20; // 20-49 shots
        const duration = Math.floor(Math.random() * 30) + 30; // 30-59 minutes
        const formScore = (Math.random() * 30 + 70).toFixed(1); // 70-100 score
        
        const sessionResult = await client.query(`
          INSERT INTO shooting_sessions 
          (user_id, timestamp, duration, shot_attempts, form_score, practice_time, shot_count)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `, [student.id, timestamp, duration, shotAttempts, formScore, duration, shotAttempts]);
        
        sessionIds.push({
          studentId: student.id,
          sessionId: sessionResult.rows[0].id,
          studentName: student.name
        });
      }
      console.log(`   ✅ Created ${sessionCount} sessions for ${student.name}`);
    }
    console.log('');

    // Create some form issues for realism
    console.log('⚠️  Creating sample form issues...');
    const formIssues = [
      { issue: 'elbow_alignment', severity: 'medium', description: 'Elbow flaring out on release' },
      { issue: 'follow_through', severity: 'low', description: 'Inconsistent follow-through' },
      { issue: 'knee_bend', severity: 'high', description: 'Insufficient knee bend' },
      { issue: 'balance', severity: 'medium', description: 'Weight shifting during shot' }
    ];

    let issueCount = 0;
    for (const student of createdStudents) {
      // Get sessions for this student
      const studentSessions = sessionIds.filter(s => s.studentId === student.id);
      if (studentSessions.length === 0) continue;
      
      // Randomly assign 1-2 form issues to random sessions
      const studentIssueCount = Math.floor(Math.random() * 2) + 1;
      const selectedIssues = formIssues
        .sort(() => Math.random() - 0.5)
        .slice(0, studentIssueCount);
      
      for (const issue of selectedIssues) {
        // Pick a random session for this student
        const randomSession = studentSessions[Math.floor(Math.random() * studentSessions.length)];
        
        await client.query(`
          INSERT INTO form_issues (session_id, issue_type, severity, description)
          VALUES ($1, $2, $3, $4)
        `, [randomSession.sessionId, issue.issue, issue.severity, issue.description]);
        issueCount++;
      }
    }
    console.log(`   ✅ Created ${issueCount} form issues across all students`);
    console.log('');

    client.release();

    console.log('🎉 Database initialization complete!');
    console.log('');
    console.log('📝 Demo Account Credentials:');
    console.log('');
    console.log('👨‍🏫 Coach Account:');
    console.log('   Email: coach@example.com');
    console.log('   Password: coach123');
    console.log('');
    console.log('👨‍🎓 Student Accounts (password for all: student123):');
    console.log('   Email: sarah@example.com - Sarah Williams (Intermediate)');
    console.log('   Email: marcus@example.com - Marcus Davis (Beginner)');
    console.log('   Email: emily@example.com - Emily Chen (Advanced)');
    console.log('   Email: jordan@example.com - Jordan Thompson (Intermediate)');
    console.log('');
    console.log('You can now start the server with: npm run server');
    console.log('Then login at http://localhost:3001 with the credentials above');
    console.log('');

    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('');
    console.error('❌ Database initialization failed:');
    console.error('');
    console.error('Error:', error.message);
    console.error('');
    
    if (error.code) {
      console.error('Error Code:', error.code);
      console.error('');
    }

    console.error('Troubleshooting:');
    console.error('1. Verify database connection details in .env file');
    console.error('2. Check if PostgreSQL is running');
    console.error('3. Verify network access to RDS instance');
    console.error('4. Check security group rules (port 5432)');
    console.error('');

    await pool.end();
    process.exit(1);
  }
}

// Run initialization
initializeDatabase();
