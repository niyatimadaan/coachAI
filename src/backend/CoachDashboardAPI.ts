/**
 * Coach Dashboard Backend API
 * RESTful API for coach features including student progress aggregation,
 * common form issues analysis, and intervention alerts
 */

import express, { Request, Response, Router } from 'express';
import DatabaseManager from '../database/DatabaseManager';
import ProgressAnalytics from '../database/ProgressAnalytics';
import SessionOperations from '../database/SessionOperations';
import { FormIssueType, ProgressMetrics, ShootingSession } from '../types/models';

export interface StudentProgressSummary {
  studentId: string;
  studentName: string;
  sessionsCompleted: number;
  averageScore: number;
  improvementTrend: number;
  lastActiveDate: Date;
  engagementLevel: 'high' | 'medium' | 'low';
  needsIntervention: boolean;
}

export interface CommonFormIssue {
  issueType: FormIssueType;
  occurrenceCount: number;
  affectedStudents: number;
  averageSeverity: number;
}

export interface InterventionAlert {
  studentId: string;
  studentName: string;
  alertType: 'declining_performance' | 'low_engagement' | 'persistent_issues';
  severity: 'high' | 'medium' | 'low';
  details: string;
  recommendedAction: string;
}

class CoachDashboardAPI {
  private router: Router;

  constructor() {
    this.router = express.Router();
    this.setupRoutes();
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Get all students for a coach
    this.router.get('/students/:coachId', this.getCoachStudents.bind(this));

    // Get student progress summaries
    this.router.get('/progress/:coachId', this.getStudentProgressSummaries.bind(this));

    // Get common form issues across a group
    this.router.get('/issues/:coachId', this.getCommonFormIssues.bind(this));

    // Get intervention alerts
    this.router.get('/alerts/:coachId', this.getInterventionAlerts.bind(this));

    // Get detailed student analytics
    this.router.get('/student/:studentId/analytics', this.getStudentAnalytics.bind(this));
  }

  /**
   * Get all students for a coach
   */
  private async getCoachStudents(req: Request, res: Response): Promise<void> {
    try {
      const { coachId } = req.params;

      const result = await DatabaseManager.executeSql(
        'SELECT * FROM students WHERE coach_id = ? ORDER BY name',
        [coachId]
      );

      const students = [];
      for (let i = 0; i < result.rows.length; i++) {
        const row = result.rows.item(i);
        students.push({
          id: row.id,
          name: row.name,
          age: row.age,
          skillLevel: row.skill_level,
          coachId: row.coach_id,
          createdAt: new Date(row.created_at)
        });
      }

      res.json({ success: true, students });
    } catch (error) {
      console.error('Error fetching coach students:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch students' });
    }
  }

  /**
   * Get student progress summaries for all students under a coach
   */
  private async getStudentProgressSummaries(req: Request, res: Response): Promise<void> {
    try {
      const { coachId } = req.params;

      // Get all students for this coach
      const studentsResult = await DatabaseManager.executeSql(
        'SELECT id, name FROM students WHERE coach_id = ?',
        [coachId]
      );

      const summaries: StudentProgressSummary[] = [];

      for (let i = 0; i < studentsResult.rows.length; i++) {
        const student = studentsResult.rows.item(i);
        const summary = await this.calculateStudentSummary(student.id, student.name);
        summaries.push(summary);
      }

      // Sort by needs intervention first, then by engagement level
      summaries.sort((a, b) => {
        if (a.needsIntervention !== b.needsIntervention) {
          return a.needsIntervention ? -1 : 1;
        }
        const engagementOrder = { low: 0, medium: 1, high: 2 };
        return engagementOrder[a.engagementLevel] - engagementOrder[b.engagementLevel];
      });

      res.json({ success: true, summaries });
    } catch (error) {
      console.error('Error fetching student progress summaries:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch progress summaries' });
    }
  }

  /**
   * Calculate summary for a single student
   */
  private async calculateStudentSummary(
    studentId: string,
    studentName: string
  ): Promise<StudentProgressSummary> {
    // Get 30-day metrics
    const metrics = await ProgressAnalytics.calculateMetrics(studentId, '30d');

    // Get user progress
    const progressResult = await DatabaseManager.executeSql(
      'SELECT * FROM user_progress WHERE user_id = ?',
      [studentId]
    );

    const progress = progressResult.rows.length > 0 ? progressResult.rows.item(0) : null;

    // Determine engagement level
    const engagementLevel = this.calculateEngagementLevel(metrics.sessionsPerWeek);

    // Determine if intervention is needed
    const needsIntervention = this.needsIntervention(metrics);

    return {
      studentId,
      studentName,
      sessionsCompleted: progress?.sessions_completed || 0,
      averageScore: metrics.averageScore,
      improvementTrend: metrics.scoreImprovement,
      lastActiveDate: progress ? new Date(progress.last_active_date) : new Date(),
      engagementLevel,
      needsIntervention
    };
  }

  /**
   * Calculate engagement level based on sessions per week
   */
  private calculateEngagementLevel(sessionsPerWeek: number): 'high' | 'medium' | 'low' {
    if (sessionsPerWeek >= 3) return 'high';
    if (sessionsPerWeek >= 1) return 'medium';
    return 'low';
  }

  /**
   * Determine if student needs intervention
   */
  private needsIntervention(metrics: ProgressMetrics): boolean {
    // Declining performance (negative improvement)
    if (metrics.scoreImprovement < -0.5) return true;

    // Low engagement (less than 1 session per week)
    if (metrics.sessionsPerWeek < 1) return true;

    // Poor consistency
    if (metrics.consistencyRating < 0.3) return true;

    return false;
  }

  /**
   * Get common form issues across all students in a group
   */
  private async getCommonFormIssues(req: Request, res: Response): Promise<void> {
    try {
      const { coachId } = req.params;

      // Get all students for this coach
      const studentsResult = await DatabaseManager.executeSql(
        'SELECT id FROM students WHERE coach_id = ?',
        [coachId]
      );

      const studentIds: string[] = [];
      for (let i = 0; i < studentsResult.rows.length; i++) {
        studentIds.push(studentsResult.rows.item(i).id);
      }

      if (studentIds.length === 0) {
        res.json({ success: true, issues: [] });
        return;
      }

      // Get all form issues for these students from recent sessions (last 30 days)
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const placeholders = studentIds.map(() => '?').join(',');

      const issuesResult = await DatabaseManager.executeSql(
        `SELECT fi.issue_type, fi.severity, ss.user_id
         FROM form_issues fi
         JOIN shooting_sessions ss ON fi.session_id = ss.id
         WHERE ss.user_id IN (${placeholders})
         AND ss.timestamp >= ?`,
        [...studentIds, thirtyDaysAgo]
      );

      // Aggregate issues
      const issueMap = new Map<FormIssueType, {
        count: number;
        students: Set<string>;
        severitySum: number;
      }>();

      for (let i = 0; i < issuesResult.rows.length; i++) {
        const row = issuesResult.rows.item(i);
        const issueType = row.issue_type as FormIssueType;

        if (!issueMap.has(issueType)) {
          issueMap.set(issueType, {
            count: 0,
            students: new Set(),
            severitySum: 0
          });
        }

        const issue = issueMap.get(issueType)!;
        issue.count++;
        issue.students.add(row.user_id);
        issue.severitySum += this.severityToNumeric(row.severity);
      }

      // Convert to array and calculate averages
      const commonIssues: CommonFormIssue[] = Array.from(issueMap.entries()).map(
        ([issueType, data]) => ({
          issueType,
          occurrenceCount: data.count,
          affectedStudents: data.students.size,
          averageSeverity: data.severitySum / data.count
        })
      );

      // Sort by occurrence count
      commonIssues.sort((a, b) => b.occurrenceCount - a.occurrenceCount);

      res.json({ success: true, issues: commonIssues });
    } catch (error) {
      console.error('Error fetching common form issues:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch form issues' });
    }
  }

  /**
   * Get intervention alerts for students needing attention
   */
  private async getInterventionAlerts(req: Request, res: Response): Promise<void> {
    try {
      const { coachId } = req.params;

      // Get all students for this coach
      const studentsResult = await DatabaseManager.executeSql(
        'SELECT id, name FROM students WHERE coach_id = ?',
        [coachId]
      );

      const alerts: InterventionAlert[] = [];

      for (let i = 0; i < studentsResult.rows.length; i++) {
        const student = studentsResult.rows.item(i);
        const studentAlerts = await this.generateStudentAlerts(student.id, student.name);
        alerts.push(...studentAlerts);
      }

      // Sort by severity
      const severityOrder = { high: 0, medium: 1, low: 2 };
      alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

      res.json({ success: true, alerts });
    } catch (error) {
      console.error('Error fetching intervention alerts:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch alerts' });
    }
  }

  /**
   * Generate intervention alerts for a student
   */
  private async generateStudentAlerts(
    studentId: string,
    studentName: string
  ): Promise<InterventionAlert[]> {
    const alerts: InterventionAlert[] = [];
    const metrics = await ProgressAnalytics.calculateMetrics(studentId, '30d');

    // Check for declining performance
    if (metrics.scoreImprovement < -0.5) {
      alerts.push({
        studentId,
        studentName,
        alertType: 'declining_performance',
        severity: metrics.scoreImprovement < -1.0 ? 'high' : 'medium',
        details: `Performance has declined by ${Math.abs(metrics.scoreImprovement).toFixed(2)} points over the last 30 days`,
        recommendedAction: 'Schedule one-on-one coaching session to identify challenges'
      });
    }

    // Check for low engagement
    if (metrics.sessionsPerWeek < 1) {
      alerts.push({
        studentId,
        studentName,
        alertType: 'low_engagement',
        severity: metrics.sessionsPerWeek < 0.5 ? 'high' : 'medium',
        details: `Only ${metrics.sessionsPerWeek.toFixed(1)} sessions per week in the last 30 days`,
        recommendedAction: 'Reach out to student to understand barriers to practice'
      });
    }

    // Check for persistent issues
    if (metrics.persistentIssues.length >= 2) {
      alerts.push({
        studentId,
        studentName,
        alertType: 'persistent_issues',
        severity: 'medium',
        details: `${metrics.persistentIssues.length} form issues persist: ${metrics.persistentIssues.join(', ')}`,
        recommendedAction: 'Provide targeted drills and additional guidance for persistent issues'
      });
    }

    return alerts;
  }

  /**
   * Get detailed analytics for a specific student
   */
  private async getStudentAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { studentId } = req.params;

      // Get all timeframe metrics
      const allMetrics = await ProgressAnalytics.calculateAllTimeframes(studentId);

      // Get recent sessions
      const sessions = await SessionOperations.getUserSessions(studentId);
      const recentSessions = sessions.slice(0, 10);

      // Get student info
      const studentResult = await DatabaseManager.executeSql(
        'SELECT * FROM students WHERE id = ?',
        [studentId]
      );

      if (studentResult.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Student not found' });
        return;
      }

      const student = studentResult.rows.item(0);

      res.json({
        success: true,
        student: {
          id: student.id,
          name: student.name,
          age: student.age,
          skillLevel: student.skill_level
        },
        metrics: allMetrics,
        recentSessions: recentSessions.map(s => ({
          id: s.id,
          timestamp: s.timestamp,
          formScore: s.formScore,
          practiceTime: s.practiceTime,
          shotCount: s.shotCount
        }))
      });
    } catch (error) {
      console.error('Error fetching student analytics:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch student analytics' });
    }
  }

  /**
   * Convert severity string to numeric value
   */
  private severityToNumeric(severity: string): number {
    const severityMap: { [key: string]: number } = {
      'minor': 1,
      'moderate': 2,
      'major': 3
    };
    return severityMap[severity] || 1;
  }

  /**
   * Get the Express router
   */
  getRouter(): Router {
    return this.router;
  }
}

export default new CoachDashboardAPI();
