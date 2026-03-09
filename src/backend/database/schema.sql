-- PostgreSQL Database Schema for CoachAI
-- Run this script to create all tables

-- Users/Coaches table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) CHECK(role IN ('coach', 'admin', 'student')) DEFAULT 'coach',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Students table
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  age INTEGER NOT NULL CHECK(age > 0),
  skill_level VARCHAR(20) CHECK(skill_level IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'beginner',
  coach_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reminder_frequency INTEGER DEFAULT 3,
  difficulty_level VARCHAR(20) DEFAULT 'beginner'
);

-- Shooting sessions table
CREATE TABLE IF NOT EXISTS shooting_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  duration INTEGER NOT NULL CHECK(duration >= 0),
  shot_attempts INTEGER NOT NULL CHECK(shot_attempts >= 0),
  video_path TEXT,
  form_score DECIMAL(5,2) CHECK(form_score >= 0 AND form_score <= 100),
  practice_time INTEGER NOT NULL CHECK(practice_time >= 0),
  shot_count INTEGER NOT NULL CHECK(shot_count >= 0),
  sync_status VARCHAR(20) CHECK(sync_status IN ('local', 'synced', 'pending')) DEFAULT 'local',
  last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Form issues table
CREATE TABLE IF NOT EXISTS form_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES shooting_sessions(id) ON DELETE CASCADE,
  issue_type VARCHAR(50) CHECK(issue_type IN ('elbow_flare', 'wrist_angle', 'stance', 'follow_through', 'elbow_alignment', 'knee_bend', 'ball_position', 'shooting_arc', 'balance')),
  severity VARCHAR(20) CHECK(severity IN ('low', 'medium', 'high')),
  description TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recommended drills table
CREATE TABLE IF NOT EXISTS recommended_drills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_issue_id UUID NOT NULL REFERENCES form_issues(id) ON DELETE CASCADE,
  drill_name VARCHAR(255) NOT NULL
);

-- Biomechanical metrics table
CREATE TABLE IF NOT EXISTS biomechanical_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE REFERENCES shooting_sessions(id) ON DELETE CASCADE,
  elbow_alignment DECIMAL(5,2) NOT NULL,
  wrist_angle DECIMAL(5,2) NOT NULL,
  shoulder_square DECIMAL(5,2) NOT NULL,
  follow_through DECIMAL(5,2) NOT NULL,
  body_balance DECIMAL(5,2) NOT NULL DEFAULT 50.0
);

-- Video metadata table
CREATE TABLE IF NOT EXISTS video_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE REFERENCES shooting_sessions(id) ON DELETE CASCADE,
  resolution VARCHAR(50) NOT NULL,
  frame_rate INTEGER NOT NULL,
  lighting VARCHAR(20) CHECK(lighting IN ('good', 'fair', 'poor'))
);

-- User progress table
CREATE TABLE IF NOT EXISTS user_progress (
  user_id UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  sessions_completed INTEGER DEFAULT 0,
  average_score DECIMAL(5,2) DEFAULT 0.0,
  improvement_trend DECIMAL(5,2) DEFAULT 0.0,
  last_active_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Progress metrics table
CREATE TABLE IF NOT EXISTS progress_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  timeframe VARCHAR(10) CHECK(timeframe IN ('7d', '30d', '90d')),
  average_score DECIMAL(5,2) NOT NULL,
  score_improvement DECIMAL(5,2) NOT NULL,
  consistency_rating DECIMAL(5,2) NOT NULL,
  sessions_per_week DECIMAL(5,2) NOT NULL,
  total_practice_time INTEGER NOT NULL,
  streak_days INTEGER NOT NULL,
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Auth sessions table (for managing user sessions)
CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(255) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_timestamp ON shooting_sessions(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_sync_status ON shooting_sessions(sync_status);
CREATE INDEX IF NOT EXISTS idx_form_issues_session ON form_issues(session_id);
CREATE INDEX IF NOT EXISTS idx_progress_metrics_user_timeframe ON progress_metrics(user_id, timeframe);
CREATE INDEX IF NOT EXISTS idx_students_coach ON students(coach_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_token ON auth_sessions(token);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires ON auth_sessions(expires_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
