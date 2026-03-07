/**
 * Progress Analytics Calculator
 * Calculates improvement trends, engagement metrics, and consistency ratings
 */

import DatabaseManager from './DatabaseManager';
import SessionOperations from './SessionOperations';
import { ProgressMetrics, Timeframe, ShootingSession } from '../types/models';

class ProgressAnalytics {
  /**
   * Calculate progress metrics for a specific timeframe
   */
  async calculateMetrics(userId: string, timeframe: Timeframe): Promise<ProgressMetrics> {
    const days = this.timeframeToDays(timeframe);
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    // Get sessions in the timeframe
    const sessions = await SessionOperations.getSessionsInRange(userId, startDate, endDate);

    if (sessions.length === 0) {
      return this.getEmptyMetrics(userId, timeframe);
    }

    // Calculate all metrics
    const averageScore = this.calculateAverageScore(sessions);
    const scoreImprovement = this.calculateScoreImprovement(sessions);
    const consistencyRating = this.calculateConsistencyRating(sessions, days);
    const sessionsPerWeek = this.calculateSessionsPerWeek(sessions, days);
    const totalPracticeTime = this.calculateTotalPracticeTime(sessions);
    const streakDays = await this.calculateStreakDays(userId);
    const issueTracking = this.trackIssues(sessions);

    const metrics: ProgressMetrics = {
      userId,
      timeframe,
      averageScore,
      scoreImprovement,
      consistencyRating,
      sessionsPerWeek,
      totalPracticeTime,
      streakDays,
      ...issueTracking
    };

    // Store calculated metrics
    await this.storeMetrics(metrics);

    return metrics;
  }

  /**
   * Calculate average score across sessions
   */
  private calculateAverageScore(sessions: ShootingSession[]): number {
    if (sessions.length === 0) return 0;

    const totalScore = sessions.reduce((sum, session) => {
      return sum + this.scoreToNumeric(session.formScore);
    }, 0);

    return totalScore / sessions.length;
  }

  /**
   * Calculate score improvement (difference between recent and older sessions)
   */
  private calculateScoreImprovement(sessions: ShootingSession[]): number {
    if (sessions.length < 2) return 0;

    // Sort by timestamp (oldest first)
    const sorted = [...sessions].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Compare first half vs second half
    const midpoint = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, midpoint);
    const secondHalf = sorted.slice(midpoint);

    const firstAvg = this.calculateAverageScore(firstHalf);
    const secondAvg = this.calculateAverageScore(secondHalf);

    return secondAvg - firstAvg;
  }

  /**
   * Calculate consistency rating (0-1 scale based on practice regularity)
   */
  private calculateConsistencyRating(sessions: ShootingSession[], days: number): number {
    if (sessions.length === 0) return 0;

    // Sort sessions by timestamp
    const sorted = [...sessions].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Calculate gaps between sessions
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const gapDays = (sorted[i].timestamp.getTime() - sorted[i - 1].timestamp.getTime()) / (1000 * 60 * 60 * 24);
      gaps.push(gapDays);
    }

    if (gaps.length === 0) return 0.5; // Single session, moderate rating

    // Calculate standard deviation of gaps
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const variance = gaps.reduce((sum, gap) => sum + Math.pow(gap - avgGap, 2), 0) / gaps.length;
    const stdDev = Math.sqrt(variance);

    // Lower standard deviation = higher consistency
    // Normalize to 0-1 scale (assuming max reasonable gap is 7 days)
    const consistencyScore = Math.max(0, 1 - (stdDev / 7));

    return consistencyScore;
  }

  /**
   * Calculate sessions per week
   */
  private calculateSessionsPerWeek(sessions: ShootingSession[], days: number): number {
    if (sessions.length === 0) return 0;

    const weeks = days / 7;
    return sessions.length / weeks;
  }

  /**
   * Calculate total practice time in minutes
   */
  private calculateTotalPracticeTime(sessions: ShootingSession[]): number {
    return sessions.reduce((sum, session) => sum + session.practiceTime, 0);
  }

  /**
   * Calculate current streak of consecutive days with practice
   */
  async calculateStreakDays(userId: string): Promise<number> {
    // Get all sessions ordered by date descending
    const sessions = await SessionOperations.getUserSessions(userId);

    if (sessions.length === 0) return 0;

    // Get unique practice dates
    const practiceDates = new Set<string>();
    sessions.forEach(session => {
      const dateStr = session.timestamp.toISOString().split('T')[0];
      practiceDates.add(dateStr);
    });

    const sortedDates = Array.from(practiceDates).sort().reverse();

    // Check if today or yesterday was practiced
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (sortedDates[0] !== today && sortedDates[0] !== yesterday) {
      return 0; // Streak broken
    }

    // Count consecutive days
    let streak = 1;
    let currentDate = new Date(sortedDates[0]);

    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = new Date(currentDate);
      prevDate.setDate(prevDate.getDate() - 1);
      const prevDateStr = prevDate.toISOString().split('T')[0];

      if (sortedDates[i] === prevDateStr) {
        streak++;
        currentDate = new Date(sortedDates[i]);
      } else {
        break; // Streak broken
      }
    }

    return streak;
  }

  /**
   * Track issue resolution, persistence, and new issues
   */
  private trackIssues(sessions: ShootingSession[]): {
    resolvedIssues: string[];
    persistentIssues: string[];
    newIssues: string[];
  } {
    if (sessions.length === 0) {
      return { resolvedIssues: [], persistentIssues: [], newIssues: [] };
    }

    // Sort by timestamp (oldest first)
    const sorted = [...sessions].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Split into older and recent sessions
    const midpoint = Math.floor(sorted.length / 2);
    const olderSessions = sorted.slice(0, Math.max(1, midpoint));
    const recentSessions = sorted.slice(midpoint);

    // Get issue types from each period
    const olderIssues = new Set<string>();
    olderSessions.forEach(session => {
      session.detectedIssues.forEach(issue => olderIssues.add(issue.type));
    });

    const recentIssues = new Set<string>();
    recentSessions.forEach(session => {
      session.detectedIssues.forEach(issue => recentIssues.add(issue.type));
    });

    // Resolved: in older but not in recent
    const resolvedIssues = Array.from(olderIssues).filter(issue => !recentIssues.has(issue));

    // Persistent: in both older and recent
    const persistentIssues = Array.from(olderIssues).filter(issue => recentIssues.has(issue));

    // New: in recent but not in older
    const newIssues = Array.from(recentIssues).filter(issue => !olderIssues.has(issue));

    return { resolvedIssues, persistentIssues, newIssues };
  }

  /**
   * Store calculated metrics in database
   */
  private async storeMetrics(metrics: ProgressMetrics): Promise<void> {
    // Delete old metrics for this user and timeframe
    await DatabaseManager.executeSql(
      'DELETE FROM progress_metrics WHERE user_id = ? AND timeframe = ?',
      [metrics.userId, metrics.timeframe]
    );

    // Insert new metrics
    await DatabaseManager.executeSql(
      `INSERT INTO progress_metrics (
        user_id, timeframe, average_score, score_improvement, consistency_rating,
        sessions_per_week, total_practice_time, streak_days, calculated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        metrics.userId,
        metrics.timeframe,
        metrics.averageScore,
        metrics.scoreImprovement,
        metrics.consistencyRating,
        metrics.sessionsPerWeek,
        metrics.totalPracticeTime,
        metrics.streakDays,
        Date.now()
      ]
    );
  }

  /**
   * Get stored metrics from database
   */
  async getStoredMetrics(userId: string, timeframe: Timeframe): Promise<ProgressMetrics | null> {
    const result = await DatabaseManager.executeSql(
      'SELECT * FROM progress_metrics WHERE user_id = ? AND timeframe = ? ORDER BY calculated_at DESC LIMIT 1',
      [userId, timeframe]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows.item(0);

    // Get issue tracking from recent sessions
    const days = this.timeframeToDays(timeframe);
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    const sessions = await SessionOperations.getSessionsInRange(userId, startDate, endDate);
    const issueTracking = this.trackIssues(sessions);

    return {
      userId: row.user_id,
      timeframe: row.timeframe,
      averageScore: row.average_score,
      scoreImprovement: row.score_improvement,
      consistencyRating: row.consistency_rating,
      sessionsPerWeek: row.sessions_per_week,
      totalPracticeTime: row.total_practice_time,
      streakDays: row.streak_days,
      ...issueTracking
    };
  }

  /**
   * Calculate metrics for all timeframes
   */
  async calculateAllTimeframes(userId: string): Promise<{
    sevenDay: ProgressMetrics;
    thirtyDay: ProgressMetrics;
    ninetyDay: ProgressMetrics;
  }> {
    const [sevenDay, thirtyDay, ninetyDay] = await Promise.all([
      this.calculateMetrics(userId, '7d'),
      this.calculateMetrics(userId, '30d'),
      this.calculateMetrics(userId, '90d')
    ]);

    return { sevenDay, thirtyDay, ninetyDay };
  }

  /**
   * Convert timeframe to number of days
   */
  private timeframeToDays(timeframe: Timeframe): number {
    const map: { [key in Timeframe]: number } = {
      '7d': 7,
      '30d': 30,
      '90d': 90
    };
    return map[timeframe];
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
   * Get empty metrics when no data is available
   */
  private getEmptyMetrics(userId: string, timeframe: Timeframe): ProgressMetrics {
    return {
      userId,
      timeframe,
      averageScore: 0,
      scoreImprovement: 0,
      consistencyRating: 0,
      sessionsPerWeek: 0,
      totalPracticeTime: 0,
      streakDays: 0,
      resolvedIssues: [],
      persistentIssues: [],
      newIssues: []
    };
  }
}

export default new ProgressAnalytics();
