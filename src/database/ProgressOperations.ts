/**
 * Progress Operations
 * Handles user progress tracking and updates
 */

import DatabaseManager from './DatabaseManager';
import { UserProgress } from '../types/models';

class ProgressOperations {
  /**
   * Initialize or update user progress after a session
   */
  async updateUserProgress(userId: string, formScore: string, issues: string[]): Promise<void> {
    // Get current progress
    const currentProgress = await this.getUserProgress(userId);
    
    if (!currentProgress) {
      // Create new progress record
      await DatabaseManager.executeSql(
        `INSERT INTO user_progress (
          user_id, sessions_completed, average_score, improvement_trend, last_active_date
        ) VALUES (?, ?, ?, ?, ?)`,
        [userId, 1, this.scoreToNumeric(formScore), 0, Date.now()]
      );
    } else {
      // Update existing progress
      const newSessionCount = currentProgress.sessionsCompleted + 1;
      const newAverageScore = this.calculateNewAverage(
        currentProgress.averageScore,
        this.scoreToNumeric(formScore),
        currentProgress.sessionsCompleted
      );
      
      await DatabaseManager.executeSql(
        `UPDATE user_progress 
         SET sessions_completed = ?, average_score = ?, last_active_date = ?
         WHERE user_id = ?`,
        [newSessionCount, newAverageScore, Date.now(), userId]
      );
    }
  }

  /**
   * Get user progress
   */
  async getUserProgress(userId: string): Promise<UserProgress | null> {
    const result = await DatabaseManager.executeSql(
      'SELECT * FROM user_progress WHERE user_id = ?',
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows.item(0);
    
    // Get common issues from recent sessions
    const commonIssues = await this.getCommonIssues(userId);

    return {
      userId: row.user_id,
      sessionsCompleted: row.sessions_completed,
      averageScore: row.average_score,
      improvementTrend: row.improvement_trend,
      lastActiveDate: new Date(row.last_active_date),
      commonIssues
    };
  }

  /**
   * Calculate improvement trend over time
   */
  async calculateImprovementTrend(userId: string, days: number = 30): Promise<number> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const result = await DatabaseManager.executeSql(
      `SELECT form_score, timestamp FROM shooting_sessions
       WHERE user_id = ? AND timestamp >= ? AND timestamp <= ?
       ORDER BY timestamp ASC`,
      [userId, startDate.getTime(), endDate.getTime()]
    );

    if (result.rows.length < 2) {
      return 0; // Not enough data for trend
    }

    // Calculate linear regression slope
    const scores: number[] = [];
    const timestamps: number[] = [];
    
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      scores.push(this.scoreToNumeric(row.form_score));
      timestamps.push(row.timestamp);
    }

    const trend = this.calculateLinearTrend(timestamps, scores);
    
    // Update the stored trend
    await DatabaseManager.executeSql(
      'UPDATE user_progress SET improvement_trend = ? WHERE user_id = ?',
      [trend, userId]
    );

    return trend;
  }

  /**
   * Get common issues for a user from recent sessions
   */
  private async getCommonIssues(userId: string, limit: number = 10): Promise<string[]> {
    const result = await DatabaseManager.executeSql(
      `SELECT fi.issue_type, COUNT(*) as count
       FROM form_issues fi
       JOIN shooting_sessions ss ON fi.session_id = ss.id
       WHERE ss.user_id = ?
       AND ss.id IN (
         SELECT id FROM shooting_sessions 
         WHERE user_id = ? 
         ORDER BY timestamp DESC 
         LIMIT ?
       )
       GROUP BY fi.issue_type
       ORDER BY count DESC`,
      [userId, userId, limit]
    );

    const issues: string[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      issues.push(result.rows.item(i).issue_type);
    }

    return issues;
  }

  /**
   * Convert letter grade to numeric score
   */
  private scoreToNumeric(score: string): number {
    const scoreMap: { [key: string]: number } = {
      'A': 4.0,
      'B': 3.0,
      'C': 2.0,
      'D': 1.0,
      'F': 0.0
    };
    return scoreMap[score] || 0;
  }

  /**
   * Calculate new average score
   */
  private calculateNewAverage(currentAvg: number, newScore: number, sessionCount: number): number {
    return (currentAvg * sessionCount + newScore) / (sessionCount + 1);
  }

  /**
   * Calculate linear trend using least squares method
   */
  private calculateLinearTrend(x: number[], y: number[]): number {
    const n = x.length;
    
    // Normalize timestamps to avoid large numbers
    const minX = Math.min(...x);
    const normalizedX = x.map(val => (val - minX) / (1000 * 60 * 60 * 24)); // Convert to days
    
    const sumX = normalizedX.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = normalizedX.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = normalizedX.reduce((sum, xi) => sum + xi * xi, 0);
    
    // Calculate slope (trend)
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    return slope;
  }

  /**
   * Delete user progress
   */
  async deleteUserProgress(userId: string): Promise<void> {
    await DatabaseManager.executeSql(
      'DELETE FROM user_progress WHERE user_id = ?',
      [userId]
    );
  }
}

export default new ProgressOperations();
