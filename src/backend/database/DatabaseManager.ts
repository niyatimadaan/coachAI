/**
 * PostgreSQL Database Manager
 * Replaces MockDatabaseManager with real PostgreSQL implementation
 */

import { db } from './pool';
import bcrypt from 'bcrypt';

interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role: 'coach' | 'admin' | 'student';
  created_at: Date;
}

interface Student {
  id: string;
  name: string;
  age: number;
  skill_level: string;
  coach_id: string;
  created_at: Date;
}

interface Session {
  id: string;
  user_id: string;
  timestamp: Date;
  duration: number;
  shot_attempts: number;
  video_path: string | null;
  form_score: string;
  practice_time: number;
  shot_count: number;
}

class DatabaseManager {
  /**
   * Initialize database connection
   */
  async initialize(): Promise<void> {
    await db.initialize();
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await db.close();
  }

  /**
   * Execute a raw query (for custom queries)
   */
  async query(text: string, params?: any[]): Promise<any> {
    return await db.query(text, params);
  }

  // ===== USER MANAGEMENT =====

  /**
   * Create a new user
   */
  async createUser(email: string, password: string, name: string, role: 'coach' | 'admin' | 'student' = 'coach'): Promise<User> {
    const passwordHash = await bcrypt.hash(password, 10);
    
    const result = await db.query<User>(
      `INSERT INTO users (email, name, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, role, created_at`,
      [email, name, passwordHash, role]
    );

    return result.rows[0];
  }

  /**
   * Find user by email
   */
  async findUserByEmail(email: string): Promise<User | null> {
    const result = await db.query<User>(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    return result.rows[0] || null;
  }

  /**
   * Find user by ID
   */
  async findUserById(id: string): Promise<User | null> {
    const result = await db.query<User>(
      'SELECT id, email, name, role, created_at FROM users WHERE id = $1',
      [id]
    );

    return result.rows[0] || null;
  }

  /**
   * Verify user password
   */
  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await this.findUserByEmail(email);
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.password_hash);
    return isValid ? user : null;
  }

  // ===== SESSION MANAGEMENT =====

  /**
   * Create auth session
   */
  async createSession(token: string, userId: string, expiresAt: Date): Promise<void> {
    await db.query(
      'INSERT INTO auth_sessions (token, user_id, expires_at) VALUES ($1, $2, $3)',
      [token, userId, expiresAt]
    );
  }

  /**
   * Find session by token
   */
  async findSession(token: string): Promise<{ user_id: string; expires_at: Date } | null> {
    const result = await db.query<{ user_id: string; expires_at: Date }>(
      'SELECT user_id, expires_at FROM auth_sessions WHERE token = $1 AND expires_at > NOW()',
      [token]
    );

    return result.rows[0] || null;
  }

  /**
   * Delete session
   */
  async deleteSession(token: string): Promise<void> {
    await db.query('DELETE FROM auth_sessions WHERE token = $1', [token]);
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    await db.query('DELETE FROM auth_sessions WHERE expires_at < NOW()');
  }

  // ===== STUDENT MANAGEMENT =====

  /**
   * Create a new student
   */
  async createStudent(name: string, age: number, skillLevel: string, coachId: string): Promise<Student> {
    const result = await db.query<Student>(
      `INSERT INTO students (name, age, skill_level, coach_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, age, skillLevel, coachId]
    );

    return result.rows[0];
  }

  /**
   * Get students by coach ID
   */
  async getStudentsByCoachId(coachId: string): Promise<Student[]> {
    const result = await db.query<Student>(
      'SELECT * FROM students WHERE coach_id = $1 ORDER BY created_at DESC',
      [coachId]
    );

    return result.rows;
  }

  /**
   * Get student by ID
   */
  async getStudentById(id: string): Promise<Student | null> {
    const result = await db.query<Student>(
      'SELECT * FROM students WHERE id = $1',
      [id]
    );

    return result.rows[0] || null;
  }

  /**
   * Update student
   */
  async updateStudent(id: string, updates: Partial<Student>): Promise<Student> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id') {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    values.push(id);

    const result = await db.query<Student>(
      `UPDATE students SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return result.rows[0];
  }

  /**
   * Delete student
   */
  async deleteStudent(id: string): Promise<void> {
    await db.query('DELETE FROM students WHERE id = $1', [id]);
  }

  // ===== SHOOTING SESSION MANAGEMENT =====

  /**
   * Create shooting session
   */
  async createShootingSession(session: Omit<Session, 'id'>): Promise<Session> {
    const result = await db.query<Session>(
      `INSERT INTO shooting_sessions 
       (user_id, timestamp, duration, shot_attempts, video_path, form_score, practice_time, shot_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        session.user_id,
        session.timestamp,
        session.duration,
        session.shot_attempts,
        session.video_path,
        session.form_score,
        session.practice_time,
        session.shot_count
      ]
    );

    return result.rows[0];
  }

  /**
   * Get sessions by user ID
   */
  async getSessionsByUserId(userId: string, limit: number = 50): Promise<Session[]> {
    const result = await db.query<Session>(
      'SELECT * FROM shooting_sessions WHERE user_id = $1 ORDER BY timestamp DESC LIMIT $2',
      [userId, limit]
    );

    return result.rows;
  }

  /**
   * Get session by ID
   */
  async getSessionById(id: string): Promise<Session | null> {
    const result = await db.query<Session>(
      'SELECT * FROM shooting_sessions WHERE id = $1',
      [id]
    );

    return result.rows[0] || null;
  }

  /**
   * Get sessions by coach (all their students)
   */
  async getSessionsByCoachId(coachId: string, limit: number = 100): Promise<Session[]> {
    const result = await db.query<Session>(
      `SELECT ss.* FROM shooting_sessions ss
       JOIN students s ON ss.user_id = s.id
       WHERE s.coach_id = $1
       ORDER BY ss.timestamp DESC
       LIMIT $2`,
      [coachId, limit]
    );

    return result.rows;
  }

  // ===== ANALYTICS =====

  /**
   * Get student progress summary
   */
  async getStudentProgressSummary(coachId: string) {
    const result = await db.query(
      `SELECT 
        s.id as student_id,
        s.name as student_name,
        COUNT(ss.id) as sessions_completed,
        COALESCE(AVG(ss.form_score), 0) as average_score,
        MAX(ss.timestamp) as last_active_date
      FROM students s
      LEFT JOIN shooting_sessions ss ON s.id = ss.user_id
      WHERE s.coach_id = $1
      GROUP BY s.id, s.name
      ORDER BY s.name`,
      [coachId]
    );

    return result.rows;
  }

  /**
   * Get common form issues
   */
  async getCommonFormIssues(coachId: string, days: number = 30) {
    const result = await db.query(
      `SELECT 
        fi.issue_type,
        COUNT(*) as occurrence_count,
        COUNT(DISTINCT ss.user_id) as affected_students
      FROM form_issues fi
      JOIN shooting_sessions ss ON fi.session_id = ss.id
      JOIN students s ON ss.user_id = s.id
      WHERE s.coach_id = $1 
        AND ss.timestamp > NOW() - INTERVAL '${days} days'
      GROUP BY fi.issue_type
      ORDER BY occurrence_count DESC`,
      [coachId]
    );

    return result.rows;
  }
}

export default new DatabaseManager();
