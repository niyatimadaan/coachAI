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

    // Get comprehensive team report
    this.router.get('/reports/:coachId/team', this.getTeamReport.bind(this));
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

  /**
   * Get comprehensive team report with aggregated stats, charts data, and drill recommendations
   */
  private async getTeamReport(req: Request, res: Response): Promise<void> {
    try {
      const { coachId } = req.params;

      // Get all students
      const students = await DatabaseManager.getStudentsByCoachId(coachId as string);

      // Get all sessions for the last 30 days
      const sessionsQuery = `
        SELECT 
          ss.*,
          s.name as student_name,
          s.skill_level
        FROM shooting_sessions ss
        JOIN students s ON ss.user_id = s.id
        WHERE s.coach_id = $1 AND ss.timestamp > NOW() - INTERVAL '30 days'
        ORDER BY ss.timestamp DESC
      `;
      const sessionsResult = await DatabaseManager.query(sessionsQuery, [coachId]);
      const sessions = sessionsResult.rows;

      // Calculate team statistics
      const totalSessions = sessions.length;
      const averageScore = sessions.length > 0 
        ? sessions.reduce((sum: number, s: any) => sum + parseFloat(s.form_score || 0), 0) / sessions.length 
        : 0;

      // Get form issues breakdown
      const issuesQuery = `
        SELECT 
          fi.issue_type,
          fi.severity,
          COUNT(*) as count,
          COUNT(DISTINCT ss.user_id) as affected_students
        FROM form_issues fi
        JOIN shooting_sessions ss ON fi.session_id = ss.id
        JOIN students s ON ss.user_id = s.id
        WHERE s.coach_id = $1 AND ss.timestamp > NOW() - INTERVAL '30 days'
        GROUP BY fi.issue_type, fi.severity
        ORDER BY count DESC
      `;
      const issuesResult = await DatabaseManager.query(issuesQuery, [coachId]);
      const formIssues = issuesResult.rows;

      // Get biomechanical metrics aggregated
      const metricsQuery = `
        SELECT 
          ss.user_id,
          s.name as student_name,
          AVG(bm.elbow_alignment) as avg_elbow_alignment,
          AVG(bm.wrist_angle) as avg_wrist_angle,
          AVG(bm.shoulder_square) as avg_shoulder_square,
          AVG(bm.follow_through) as avg_follow_through,
          AVG(bm.body_balance) as avg_body_balance
        FROM biomechanical_metrics bm
        JOIN shooting_sessions ss ON bm.session_id = ss.id
        JOIN students s ON ss.user_id = s.id
        WHERE s.coach_id = $1 AND ss.timestamp > NOW() - INTERVAL '30 days'
        GROUP BY ss.user_id, s.name
      `;
      const metricsResult = await DatabaseManager.query(metricsQuery, [coachId]);
      const biomechanics = metricsResult.rows;

      // Calculate average biomechanics for the team
      const teamBiomechanics = biomechanics.length > 0 ? {
        elbowAlignment: biomechanics.reduce((sum: number, m: any) => sum + parseFloat(m.avg_elbow_alignment || 0), 0) / biomechanics.length,
        wristAngle: biomechanics.reduce((sum: number, m: any) => sum + parseFloat(m.avg_wrist_angle || 0), 0) / biomechanics.length,
        shoulderSquare: biomechanics.reduce((sum: number, m: any) => sum + parseFloat(m.avg_shoulder_square || 0), 0) / biomechanics.length,
        followThrough: biomechanics.reduce((sum: number, m: any) => sum + parseFloat(m.avg_follow_through || 0), 0) / biomechanics.length,
        bodyBalance: biomechanics.reduce((sum: number, m: any) => sum + parseFloat(m.avg_body_balance || 0), 0) / biomechanics.length,
      } : null;

      // Get score distribution for chart
      const scoreDistribution = {
        excellent: sessions.filter((s: any) => parseFloat(s.form_score) >= 90).length,
        good: sessions.filter((s: any) => parseFloat(s.form_score) >= 75 && parseFloat(s.form_score) < 90).length,
        average: sessions.filter((s: any) => parseFloat(s.form_score) >= 60 && parseFloat(s.form_score) < 75).length,
        needsWork: sessions.filter((s: any) => parseFloat(s.form_score) < 60).length,
      };

      // Get individual student reports
      const studentReports = await Promise.all(
        students.map(async (student: any) => {
          const studentSessions = sessions.filter((s: any) => s.user_id === student.id);
          const studentAvgScore = studentSessions.length > 0
            ? studentSessions.reduce((sum: number, s: any) => sum + parseFloat(s.form_score || 0), 0) / studentSessions.length
            : 0;

          // Get student's top issues
          const studentIssuesQuery = `
            SELECT 
              fi.issue_type,
              COUNT(*) as count
            FROM form_issues fi
            JOIN shooting_sessions ss ON fi.session_id = ss.id
            WHERE ss.user_id = $1 AND ss.timestamp > NOW() - INTERVAL '30 days'
            GROUP BY fi.issue_type
            ORDER BY count DESC
            LIMIT 3
          `;
          const studentIssuesResult = await DatabaseManager.query(studentIssuesQuery, [student.id]);

          return {
            studentId: student.id,
            studentName: student.name,
            age: student.age,
            skillLevel: student.skill_level,
            sessionsCompleted: studentSessions.length,
            averageScore: studentAvgScore,
            topIssues: studentIssuesResult.rows.map((i: any) => ({
              type: i.issue_type,
              count: parseInt(i.count)
            }))
          };
        })
      );

      // Generate drill recommendations on-demand for top team issues
      const topIssues = formIssues.slice(0, 5);
      let recommendedDrills: any[] = [];
      
      // Only generate drills if there are issues and AWS AI is available
      if (topIssues.length > 0) {
        try {
          const AWSAIService = (await import('./services/AWSAIService')).default;
          
          // Create mock detected issues from team stats
          const detectedIssues = topIssues.map((issue: any) => ({
            type: issue.issue_type,
            severity: issue.severity,
            description: `${issue.count} occurrences across ${issue.affected_students} students`,
            timestamp: Date.now()
          }));

          // Generate team-level drill recommendations
          const drillRecommendations = await AWSAIService.generateDrillSuggestions(
            detectedIssues,
            teamBiomechanics || {
              elbowAlignment: 0,
              wristAngle: 0,
              shoulderSquare: 0,
              followThrough: 0,
              bodyBalance: 0,
            },
            'intermediate', // Team average level
            undefined
          );

          recommendedDrills = drillRecommendations.drills.map((drill: any) => ({
            drillName: drill.drillName,
            description: drill.description,
            instructions: drill.instructions,
            sets: drill.sets,
            focusPoints: drill.focusPoints,
            difficulty: drill.difficulty,
            targetIssue: drill.issue
          }));
        } catch (error) {
          console.log('⚠️  Could not generate AI drill recommendations, continuing without them');
        }
      }

      const teamReport = {
        summary: {
          totalStudents: students.length,
          totalSessions,
          averageScore: Math.round(averageScore * 10) / 10,
          activePractitioners: students.filter((s: any) => 
            sessions.some((sess: any) => sess.user_id === s.id)
          ).length,
        },
        scoreDistribution,
        formIssues: formIssues.map((issue: any) => ({
          type: issue.issue_type,
          severity: issue.severity,
          count: parseInt(issue.count),
          affectedStudents: parseInt(issue.affected_students),
          percentage: Math.round((parseInt(issue.count) / totalSessions) * 100)
        })),
        teamBiomechanics,
        studentReports: studentReports.sort((a, b) => b.averageScore - a.averageScore),
        recommendedDrills,
      };

      res.json({ success: true, data: teamReport });
    } catch (error) {
      console.error('Error fetching team report:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch team report' });
    }
  }
}

export default new CoachDashboardAPI();
