/**
 * Coach Dashboard Backend API
 * RESTful API for coach features including student progress aggregation,
 * common form issues analysis, and intervention alerts
 */

import express, { Request, Response, Router } from 'express';
import DatabaseManager from './database/DatabaseManager';
import { FormIssueType } from '../types/models';

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

    // Get sessions for a coach with optional filters
    this.router.get('/sessions', this.getCoachSessions.bind(this));

    // Get a specific session with details
    this.router.get('/session/:sessionId', this.getSessionDetail.bind(this));
  }

  /**
   * Get Express router instance
   */
  public getRouter(): Router {
    return this.router;
  }

  /**
   * Get all students for a coach
   */
  private async getCoachStudents(req: Request, res: Response): Promise<void> {
    try {
      const { coachId } = req.params;

      const students = await DatabaseManager.getStudentsByCoachId(coachId as string);

      res.json({ success: true, data: students });
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

      const summaries = await DatabaseManager.getStudentProgressSummary(coachId as string);

      // Transform and add engagement analysis
      const enrichedSummaries = summaries.map((summary: any) => {
        const avgScore = parseFloat(summary.average_score) || 0;
        const sessionsCompleted = parseInt(summary.sessions_completed) || 0;
        
        // Determine engagement level
        let engagementLevel: 'high' | 'medium' | 'low' = 'low';
        if (sessionsCompleted >= 12) engagementLevel = 'high';
        else if (sessionsCompleted >= 4) engagementLevel = 'medium';

        // Check if needs intervention
        const needsIntervention = avgScore < 60 || sessionsCompleted === 0;

        return {
          studentId: summary.student_id,
          studentName: summary.student_name,
          sessionsCompleted,
          averageScore: avgScore,
          improvementTrend: 0, // Can be calculated from historical data
          lastActiveDate: summary.last_active_date || new Date(),
          engagementLevel,
          needsIntervention
        };
      });

      res.json({ success: true, data: enrichedSummaries });
    } catch (error) {
      console.error('Error fetching student progress summaries:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch progress summaries' });
    }
  }



  /**
   * Get common form issues across all students in a group
   */
  private async getCommonFormIssues(req: Request, res: Response): Promise<void> {
    try {
      const { coachId } = req.params;

      const issues = await DatabaseManager.getCommonFormIssues(coachId as string, 30);

      const commonIssues: CommonFormIssue[] = issues.map((issue: any) => ({
        issueType: issue.issue_type,
        occurrenceCount: parseInt(issue.occurrence_count),
        affectedStudents: parseInt(issue.affected_students),
        averageSeverity: 2 // Default to moderate
      }));

      res.json({ success: true, data: commonIssues });
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

      const summaries = await DatabaseManager.getStudentProgressSummary(coachId as string);
      const alerts: InterventionAlert[] = [];

      summaries.forEach((summary: any) => {
        const avgScore = parseFloat(summary.average_score) || 0;
        const sessionsCompleted = parseInt(summary.sessions_completed) || 0;

        // Low engagement alert
        if (sessionsCompleted < 3) {
          alerts.push({
            studentId: summary.student_id,
            studentName: summary.student_name,
            alertType: 'low_engagement',
            severity: sessionsCompleted === 0 ? 'high' : 'medium',
            details: `Only ${sessionsCompleted} sessions in the last 30 days`,
            recommendedAction: 'Reach out to understand barriers to practice'
          });
        }

        // Declining performance alert
        if (avgScore < 60 && sessionsCompleted > 0) {
          alerts.push({
            studentId: summary.student_id,
            studentName: summary.student_name,
            alertType: 'declining_performance',
            severity: avgScore < 40 ? 'high' : 'medium',
            details: `Average score is ${avgScore.toFixed(1)}`,
            recommendedAction: 'Schedule one-on-one coaching session'
          });
        }
      });

      // Sort by severity
      const severityOrder = { high: 0, medium: 1, low: 2 };
      alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

      res.json({ success: true, data: alerts });
    } catch (error) {
      console.error('Error fetching intervention alerts:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch alerts' });
    }
  }

  /**
   * Get detailed analytics for a specific student
   */
  private async getStudentAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { studentId } = req.params;

      const student = await DatabaseManager.getStudentById(studentId as string);
      if (!student) {
        res.status(404).json({ success: false, error: 'Student not found' });
        return;
      }

      const sessions = await DatabaseManager.getSessionsByUserId(studentId as string, 20);

      res.json({
        success: true,
        student: {
          id: student.id,
          name: student.name,
          age: student.age,
          skillLevel: student.skill_level
        },
        metrics: {
          '7d': { averageScore: 0, scoreImprovement: 0, sessionsPerWeek: 0, consistencyRating: 0, persistentIssues: [] },
          '30d': { averageScore: 0, scoreImprovement: 0, sessionsPerWeek: 0, consistencyRating: 0, persistentIssues: [] },
          '90d': { averageScore: 0, scoreImprovement: 0, sessionsPerWeek: 0, consistencyRating: 0, persistentIssues: [] }
        },
        recentSessions: sessions.map(s => ({
          id: s.id,
          timestamp: s.timestamp,
          formScore: s.form_score,
          practiceTime: s.practice_time,
          shotCount: s.shot_count
        }))
      });
    } catch (error) {
      console.error('Error fetching student analytics:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch student analytics' });
    }
  }

  /**
   * Get sessions for a coach with optional filters
   */
  private async getCoachSessions(req: Request, res: Response): Promise<void> {
    try {
      const { coachId, studentId, startDate, endDate, minScore, maxScore } = req.query;

      if (!coachId) {
        res.status(400).json({ success: false, error: 'coachId is required' });
        return;
      }

      // Build query
      let query = `
        SELECT 
          ss.id,
          ss.user_id as student_id,
          s.name as student_name,
          ss.timestamp,
          ss.duration,
          ss.shot_attempts,
          ss.form_score,
          ss.practice_time,
          ss.shot_count,
          ss.video_path
        FROM shooting_sessions ss
        JOIN students s ON ss.user_id = s.id
        WHERE s.coach_id = $1
      `;

      const params: any[] = [coachId];
      let paramIndex = 2;

      // Add filters
      if (studentId) {
        query += ` AND ss.user_id = $${paramIndex}`;
        params.push(studentId);
        paramIndex++;
      }

      if (startDate) {
        query += ` AND ss.timestamp >= $${paramIndex}`;
        params.push(new Date(startDate as string));
        paramIndex++;
      }

      if (endDate) {
        query += ` AND ss.timestamp <= $${paramIndex}`;
        params.push(new Date(endDate as string));
        paramIndex++;
      }

      if (minScore !== undefined) {
        query += ` AND ss.form_score >= $${paramIndex}`;
        params.push(parseFloat(minScore as string));
        paramIndex++;
      }

      if (maxScore !== undefined) {
        query += ` AND ss.form_score <= $${paramIndex}`;
        params.push(parseFloat(maxScore as string));
        paramIndex++;
      }

      query += ` ORDER BY ss.timestamp DESC LIMIT 100`;

      const result = await DatabaseManager.query(query, params);

      const sessions = result.rows.map((row: any) => ({
        id: row.id,
        studentId: row.student_id,
        studentName: row.student_name,
        timestamp: row.timestamp,
        duration: row.duration,
        shotAttempts: row.shot_attempts,
        formScore: parseFloat(row.form_score) || 0,
        practiceTime: row.practice_time,
        shotCount: row.shot_count,
        videoPath: row.video_path
      }));

      res.json({ success: true, data: sessions });
    } catch (error) {
      console.error('Error fetching coach sessions:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch sessions' });
    }
  }

  /**
   * Get detailed information for a specific session
   */
  private async getSessionDetail(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      // Get session basic info
      const sessionQuery = `
        SELECT 
          ss.*,
          s.name as student_name,
          s.age as student_age,
          s.skill_level
        FROM shooting_sessions ss
        JOIN students s ON ss.user_id = s.id
        WHERE ss.id = $1
      `;

      const sessionResult = await DatabaseManager.query(sessionQuery, [sessionId]);

      if (sessionResult.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Session not found' });
        return;
      }

      const session = sessionResult.rows[0];

      // Get form issues for this session
      const issuesQuery = `
        SELECT 
          id,
          issue_type,
          severity,
          description,
          timestamp
        FROM form_issues
        WHERE session_id = $1
        ORDER BY timestamp
      `;

      const issuesResult = await DatabaseManager.query(issuesQuery, [sessionId]);

      // Get biomechanical metrics if available
      const metricsQuery = `
        SELECT 
          elbow_alignment,
          wrist_angle,
          shoulder_square,
          follow_through
        FROM biomechanical_metrics
        WHERE session_id = $1
      `;

      const metricsResult = await DatabaseManager.query(metricsQuery, [sessionId]);

      const sessionDetail = {
        id: session.id,
        studentId: session.user_id,
        studentName: session.student_name,
        studentAge: session.student_age,
        skillLevel: session.skill_level,
        timestamp: session.timestamp,
        duration: session.duration,
        shotAttempts: session.shot_attempts,
        formScore: parseFloat(session.form_score) || 0,
        practiceTime: session.practice_time,
        shotCount: session.shot_count,
        videoPath: session.video_path,
        formIssues: issuesResult.rows.map((issue: any) => ({
          id: issue.id,
          issueType: issue.issue_type,
          severity: issue.severity,
          description: issue.description,
          timestamp: issue.timestamp
        })),
        biomechanics: metricsResult.rows.length > 0 ? {
          elbowAlignment: parseFloat(metricsResult.rows[0].elbow_alignment),
          wristAngle: parseFloat(metricsResult.rows[0].wrist_angle),
          shoulderSquare: parseFloat(metricsResult.rows[0].shoulder_square),
          followThrough: parseFloat(metricsResult.rows[0].follow_through)
        } : null
      };

      res.json({ success: true, data: sessionDetail });
    } catch (error) {
      console.error('Error fetching session detail:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch session detail' });
    }
  }
}

export default new CoachDashboardAPI();
