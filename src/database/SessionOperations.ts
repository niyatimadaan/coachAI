/**
 * Session Operations
 * Handles CRUD operations for shooting sessions
 */

import DatabaseManager from './DatabaseManager';
import { ShootingSession, FormIssue, BiomechanicalMetrics, VideoMetadata } from '../types/models';

class SessionOperations {
  /**
   * Create a new shooting session
   */
  async createSession(session: ShootingSession): Promise<void> {
    const statements = [
      // Insert main session record
      {
        sql: `
          INSERT INTO shooting_sessions (
            id, user_id, timestamp, duration, shot_attempts, video_path,
            form_score, practice_time, shot_count, sync_status, last_modified
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        params: [
          session.id,
          session.userId,
          session.timestamp.getTime(),
          session.duration,
          session.shotAttempts,
          session.videoPath,
          session.formScore,
          session.practiceTime,
          session.shotCount,
          session.syncStatus,
          session.lastModified.getTime()
        ]
      },
      // Insert biomechanical metrics
      {
        sql: `
          INSERT INTO biomechanical_metrics (
            session_id, elbow_alignment, wrist_angle, shoulder_square, follow_through
          ) VALUES (?, ?, ?, ?, ?)
        `,
        params: [
          session.id,
          session.formAnalysis.biomechanicalMetrics.elbowAlignment,
          session.formAnalysis.biomechanicalMetrics.wristAngle,
          session.formAnalysis.biomechanicalMetrics.shoulderSquare,
          session.formAnalysis.biomechanicalMetrics.followThrough
        ]
      },
      // Insert video metadata
      {
        sql: `
          INSERT INTO video_metadata (
            session_id, resolution, frame_rate, lighting
          ) VALUES (?, ?, ?, ?)
        `,
        params: [
          session.id,
          session.videoMetadata.resolution,
          session.videoMetadata.frameRate,
          session.videoMetadata.lighting
        ]
      }
    ];

    // Add form issues
    for (const issue of session.detectedIssues) {
      statements.push({
        sql: `
          INSERT INTO form_issues (session_id, issue_type, severity, description)
          VALUES (?, ?, ?, ?)
        `,
        params: [session.id, issue.type, issue.severity, issue.description]
      });

      // Note: We'll need to get the issue ID to insert drills
      // For now, we'll handle drills separately after the transaction
    }

    await DatabaseManager.transaction(statements);

    // Insert recommended drills for each issue
    await this.insertRecommendedDrills(session.id, session.detectedIssues);
  }

  /**
   * Insert recommended drills for form issues
   */
  private async insertRecommendedDrills(sessionId: string, issues: FormIssue[]): Promise<void> {
    // Get form issue IDs
    const result = await DatabaseManager.executeSql(
      'SELECT id, issue_type FROM form_issues WHERE session_id = ?',
      [sessionId]
    );

    const issueMap = new Map<string, number>();
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      issueMap.set(row.issue_type, row.id);
    }

    // Insert drills
    const statements = [];
    for (const issue of issues) {
      const issueId = issueMap.get(issue.type);
      if (issueId) {
        for (const drill of issue.recommendedDrills) {
          statements.push({
            sql: 'INSERT INTO recommended_drills (form_issue_id, drill_name) VALUES (?, ?)',
            params: [issueId, drill]
          });
        }
      }
    }

    if (statements.length > 0) {
      await DatabaseManager.transaction(statements);
    }
  }

  /**
   * Get a session by ID
   */
  async getSession(sessionId: string): Promise<ShootingSession | null> {
    const result = await DatabaseManager.executeSql(
      'SELECT * FROM shooting_sessions WHERE id = ?',
      [sessionId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows.item(0);
    
    // Get related data
    const [issues, metrics, metadata] = await Promise.all([
      this.getFormIssues(sessionId),
      this.getBiomechanicalMetrics(sessionId),
      this.getVideoMetadata(sessionId)
    ]);

    return this.mapRowToSession(row, issues, metrics, metadata);
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string, limit?: number): Promise<ShootingSession[]> {
    const sql = limit
      ? 'SELECT * FROM shooting_sessions WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?'
      : 'SELECT * FROM shooting_sessions WHERE user_id = ? ORDER BY timestamp DESC';
    
    const params = limit ? [userId, limit] : [userId];
    const result = await DatabaseManager.executeSql(sql, params);

    const sessions: ShootingSession[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      const [issues, metrics, metadata] = await Promise.all([
        this.getFormIssues(row.id),
        this.getBiomechanicalMetrics(row.id),
        this.getVideoMetadata(row.id)
      ]);
      sessions.push(this.mapRowToSession(row, issues, metrics, metadata));
    }

    return sessions;
  }

  /**
   * Get sessions within a date range
   */
  async getSessionsInRange(userId: string, startDate: Date, endDate: Date): Promise<ShootingSession[]> {
    // Get all sessions for the user
    const allSessions = await this.getUserSessions(userId);
    
    // Filter by date range in JavaScript (more reliable than complex SQL WHERE clauses in mock)
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();
    
    return allSessions.filter(session => {
      const sessionTime = session.timestamp.getTime();
      return sessionTime >= startTime && sessionTime <= endTime;
    });
  }

  /**
   * Update session sync status
   */
  async updateSyncStatus(sessionId: string, status: 'local' | 'synced' | 'pending'): Promise<void> {
    await DatabaseManager.executeSql(
      'UPDATE shooting_sessions SET sync_status = ?, last_modified = ? WHERE id = ?',
      [status, Date.now(), sessionId]
    );
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    // Foreign key constraints will cascade delete related records
    await DatabaseManager.executeSql(
      'DELETE FROM shooting_sessions WHERE id = ?',
      [sessionId]
    );
  }

  /**
   * Delete oldest sessions to maintain storage limit
   */
  async deleteOldestSessions(userId: string, keepCount: number): Promise<void> {
    // Get all sessions for the user, ordered by timestamp descending
    const allSessions = await this.getUserSessions(userId);
    
    // If we have fewer sessions than keepCount, nothing to delete
    if (allSessions.length <= keepCount) {
      return;
    }
    
    // Get the sessions to delete (everything after keepCount)
    const sessionsToDelete = allSessions.slice(keepCount);
    
    // Delete each session
    for (const session of sessionsToDelete) {
      await this.deleteSession(session.id);
    }
  }

  /**
   * Get form issues for a session
   */
  private async getFormIssues(sessionId: string): Promise<FormIssue[]> {
    const result = await DatabaseManager.executeSql(
      'SELECT * FROM form_issues WHERE session_id = ?',
      [sessionId]
    );

    const issues: FormIssue[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      
      // Get recommended drills
      const drillsResult = await DatabaseManager.executeSql(
        'SELECT drill_name FROM recommended_drills WHERE form_issue_id = ?',
        [row.id]
      );
      
      const drills: string[] = [];
      for (let j = 0; j < drillsResult.rows.length; j++) {
        drills.push(drillsResult.rows.item(j).drill_name);
      }

      issues.push({
        type: row.issue_type,
        severity: row.severity,
        description: row.description,
        recommendedDrills: drills
      });
    }

    return issues;
  }

  /**
   * Get biomechanical metrics for a session
   */
  private async getBiomechanicalMetrics(sessionId: string): Promise<BiomechanicalMetrics> {
    const result = await DatabaseManager.executeSql(
      'SELECT * FROM biomechanical_metrics WHERE session_id = ?',
      [sessionId]
    );

    if (result.rows.length === 0) {
      throw new Error(`No biomechanical metrics found for session ${sessionId}`);
    }

    const row = result.rows.item(0);
    return {
      elbowAlignment: row.elbow_alignment,
      wristAngle: row.wrist_angle,
      shoulderSquare: row.shoulder_square,
      followThrough: row.follow_through
    };
  }

  /**
   * Get video metadata for a session
   */
  private async getVideoMetadata(sessionId: string): Promise<VideoMetadata> {
    const result = await DatabaseManager.executeSql(
      'SELECT * FROM video_metadata WHERE session_id = ?',
      [sessionId]
    );

    if (result.rows.length === 0) {
      throw new Error(`No video metadata found for session ${sessionId}`);
    }

    const row = result.rows.item(0);
    return {
      resolution: row.resolution,
      frameRate: row.frame_rate,
      lighting: row.lighting
    };
  }

  /**
   * Map database row to ShootingSession object
   */
  private mapRowToSession(
    row: any,
    issues: FormIssue[],
    metrics: BiomechanicalMetrics,
    metadata: VideoMetadata
  ): ShootingSession {
    return {
      id: row.id,
      userId: row.user_id,
      timestamp: new Date(row.timestamp),
      duration: row.duration,
      shotAttempts: row.shot_attempts,
      videoPath: row.video_path,
      formScore: row.form_score,
      detectedIssues: issues,
      practiceTime: row.practice_time,
      shotCount: row.shot_count,
      formAnalysis: {
        overallScore: row.form_score,
        detectedIssues: issues,
        biomechanicalMetrics: metrics
      },
      videoMetadata: metadata,
      syncStatus: row.sync_status,
      lastModified: new Date(row.last_modified)
    };
  }
}

export default new SessionOperations();
