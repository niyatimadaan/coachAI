/**
 * SQLite database schema definitions
 * Defines table structures for local data storage
 */

export const DATABASE_NAME = 'coachai.db';
export const DATABASE_VERSION = 1;

// SQL statements for creating tables
export const CREATE_TABLES = {
  students: `
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      age INTEGER NOT NULL,
      skill_level TEXT CHECK(skill_level IN ('beginner', 'intermediate', 'advanced')),
      coach_id TEXT,
      created_at INTEGER NOT NULL,
      reminder_frequency INTEGER DEFAULT 3,
      difficulty_level TEXT DEFAULT 'beginner'
    );
  `,
  
  shooting_sessions: `
    CREATE TABLE IF NOT EXISTS shooting_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      duration INTEGER NOT NULL,
      shot_attempts INTEGER NOT NULL,
      video_path TEXT NOT NULL,
      form_score TEXT CHECK(form_score IN ('A', 'B', 'C', 'D', 'F')),
      practice_time INTEGER NOT NULL,
      shot_count INTEGER NOT NULL,
      sync_status TEXT CHECK(sync_status IN ('local', 'synced', 'pending')) DEFAULT 'local',
      last_modified INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES students(id) ON DELETE CASCADE
    );
  `,
  
  form_issues: `
    CREATE TABLE IF NOT EXISTS form_issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      issue_type TEXT CHECK(issue_type IN ('elbow_flare', 'wrist_angle', 'stance', 'follow_through')),
      severity TEXT CHECK(severity IN ('minor', 'moderate', 'major')),
      description TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES shooting_sessions(id) ON DELETE CASCADE
    );
  `,
  
  recommended_drills: `
    CREATE TABLE IF NOT EXISTS recommended_drills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      form_issue_id INTEGER NOT NULL,
      drill_name TEXT NOT NULL,
      FOREIGN KEY (form_issue_id) REFERENCES form_issues(id) ON DELETE CASCADE
    );
  `,
  
  biomechanical_metrics: `
    CREATE TABLE IF NOT EXISTS biomechanical_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL UNIQUE,
      elbow_alignment REAL NOT NULL,
      wrist_angle REAL NOT NULL,
      shoulder_square REAL NOT NULL,
      follow_through REAL NOT NULL,
      FOREIGN KEY (session_id) REFERENCES shooting_sessions(id) ON DELETE CASCADE
    );
  `,
  
  video_metadata: `
    CREATE TABLE IF NOT EXISTS video_metadata (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL UNIQUE,
      resolution TEXT NOT NULL,
      frame_rate INTEGER NOT NULL,
      lighting TEXT CHECK(lighting IN ('good', 'fair', 'poor')),
      FOREIGN KEY (session_id) REFERENCES shooting_sessions(id) ON DELETE CASCADE
    );
  `,
  
  user_progress: `
    CREATE TABLE IF NOT EXISTS user_progress (
      user_id TEXT PRIMARY KEY,
      sessions_completed INTEGER DEFAULT 0,
      average_score REAL DEFAULT 0.0,
      improvement_trend REAL DEFAULT 0.0,
      last_active_date INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES students(id) ON DELETE CASCADE
    );
  `,
  
  progress_metrics: `
    CREATE TABLE IF NOT EXISTS progress_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      timeframe TEXT CHECK(timeframe IN ('7d', '30d', '90d')),
      average_score REAL NOT NULL,
      score_improvement REAL NOT NULL,
      consistency_rating REAL NOT NULL,
      sessions_per_week REAL NOT NULL,
      total_practice_time INTEGER NOT NULL,
      streak_days INTEGER NOT NULL,
      calculated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES students(id) ON DELETE CASCADE
    );
  `,
  
  device_capabilities: `
    CREATE TABLE IF NOT EXISTS device_capabilities (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      tier TEXT CHECK(tier IN ('low', 'mid', 'high')),
      available_ram INTEGER NOT NULL,
      cpu_cores INTEGER NOT NULL,
      has_gpu INTEGER NOT NULL,
      ml_framework_supported INTEGER NOT NULL,
      benchmark_score REAL NOT NULL,
      last_assessed INTEGER NOT NULL
    );
  `,
  
  sync_queue: `
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      operation TEXT CHECK(operation IN ('create', 'update', 'delete')),
      retry_count INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      last_attempt INTEGER,
      FOREIGN KEY (session_id) REFERENCES shooting_sessions(id) ON DELETE CASCADE
    );
  `
};

// Indexes for performance optimization
export const CREATE_INDEXES = {
  sessions_user_timestamp: `
    CREATE INDEX IF NOT EXISTS idx_sessions_user_timestamp 
    ON shooting_sessions(user_id, timestamp DESC);
  `,
  
  sessions_sync_status: `
    CREATE INDEX IF NOT EXISTS idx_sessions_sync_status 
    ON shooting_sessions(sync_status);
  `,
  
  form_issues_session: `
    CREATE INDEX IF NOT EXISTS idx_form_issues_session 
    ON form_issues(session_id);
  `,
  
  progress_metrics_user_timeframe: `
    CREATE INDEX IF NOT EXISTS idx_progress_metrics_user_timeframe 
    ON progress_metrics(user_id, timeframe);
  `,
  
  sync_queue_status: `
    CREATE INDEX IF NOT EXISTS idx_sync_queue_status 
    ON sync_queue(operation, retry_count);
  `
};
