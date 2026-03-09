/**
 * Student API Routes
 * Handles student-specific endpoints for viewing their own sessions and progress
 */

import { Router, Request, Response } from 'express';
import DatabaseManager from './database/DatabaseManager';

class StudentAPI {
  private router: Router;

  constructor() {
    this.router = Router();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Get student's own sessions
    this.router.get('/sessions', this.getStudentSessions.bind(this));
    
    // Get student's session analytics
    this.router.get('/sessions/:sessionId/analytics', this.getSessionAnalytics.bind(this));
    
    // Get student's personal performance report
    this.router.get('/report', this.getStudentReport.bind(this));
  }

  /**
   * Get Express router instance
   */
  public getRouter(): Router {
    return this.router;
  }

  /**
   * GET /api/student/sessions?userId=xxx
   * Get all sessions for a specific student
   */
  private async getStudentSessions(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.query;

      if (!userId) {
        res.status(400).json({ success: false, error: 'userId is required' });
        return;
      }

      // Convert user ID to student ID
      // userId from the frontend is users.id, but shooting_sessions.user_id references students.id
      const studentId = await DatabaseManager.getStudentIdByUserId(userId as string);

      if (!studentId) {
        res.status(404).json({ 
          success: false, 
          error: 'No student record found for this user. Please contact support.' 
        });
        return;
      }

      const query = `
        SELECT 
          ss.id,
          ss.user_id as "userId",
          ss.timestamp,
          ss.duration,
          ss.shot_attempts as "shotAttempts",
          ss.form_score as "formScore",
          ss.practice_time as "practiceTime",
          ss.shot_count as "shotCount",
          ss.video_path as "videoPath"
        FROM shooting_sessions ss
        WHERE ss.user_id = $1
        ORDER BY ss.timestamp DESC
        LIMIT 100
      `;

      const result = await DatabaseManager.query(query, [studentId]);

      const sessions = result.rows.map((row: any) => ({
        id: row.id,
        userId: row.userId,
        timestamp: row.timestamp,
        duration: row.duration,
        shotAttempts: row.shotAttempts,
        formScore: parseFloat(row.formScore) || 0,
        practiceTime: row.practiceTime,
        shotCount: row.shotCount,
        videoPath: row.videoPath,
      }));

      res.json({ success: true, data: sessions });
    } catch (error) {
      console.error('Error fetching student sessions:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch sessions' });
    }
  }

  /**
   * GET /api/student/sessions/:sessionId/analytics
   * Get detailed analytics for a specific session
   */
  private async getSessionAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        res.status(400).json({ success: false, error: 'sessionId is required' });
        return;
      }

      // Get biomechanical metrics
      const metricsQuery = `
        SELECT 
          session_id as "sessionId",
          elbow_alignment as "elbowAlignment",
          wrist_angle as "wristAngle",
          shoulder_square as "shoulderSquare",
          follow_through as "followThrough",
          body_balance as "bodyBalance"
        FROM biomechanical_metrics
        WHERE session_id = $1
        LIMIT 1
      `;

      const metricsResult = await DatabaseManager.query(metricsQuery, [sessionId]);

      // Get form issues
      const issuesQuery = `
        SELECT 
          id,
          session_id as "sessionId",
          issue_type as "issueType",
          severity,
          description,
          timestamp
        FROM form_issues
        WHERE session_id = $1
        ORDER BY severity DESC, timestamp DESC
      `;

      const issuesResult = await DatabaseManager.query(issuesQuery, [sessionId]);

      // Convert DECIMAL types to numbers (PostgreSQL returns them as strings)
      const biomechanicalMetrics = metricsResult.rows.length > 0 ? {
        sessionId: metricsResult.rows[0].sessionId,
        elbowAlignment: parseFloat(metricsResult.rows[0].elbowAlignment),
        wristAngle: parseFloat(metricsResult.rows[0].wristAngle),
        shoulderSquare: parseFloat(metricsResult.rows[0].shoulderSquare),
        followThrough: parseFloat(metricsResult.rows[0].followThrough),
        bodyBalance: parseFloat(metricsResult.rows[0].bodyBalance),
      } : null;

      const analytics = {
        biomechanicalMetrics,
        formIssues: issuesResult.rows,
      };

      res.json({ success: true, data: analytics });
    } catch (error) {
      console.error('Error fetching session analytics:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch session analytics' });
    }
  }
  /**
   * GET /api/student/report?userId=xxx
   * Get comprehensive personal performance report for a student
   */
  private async getStudentReport(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.query;

      if (!userId) {
        res.status(400).json({ success: false, error: 'userId is required' });
        return;
      }

      // Convert user ID to student ID
      const studentId = await DatabaseManager.getStudentIdByUserId(userId as string);

      if (!studentId) {
        res.status(404).json({ 
          success: false, 
          error: 'No student record found for this user.' 
        });
        return;
      }

      // Get student info
      const studentInfo = await DatabaseManager.getStudentById(studentId);

      // Get all sessions for the last 30 days
      const sessionsQuery = `
        SELECT *
        FROM shooting_sessions
        WHERE user_id = $1 AND timestamp > NOW() - INTERVAL '30 days'
        ORDER BY timestamp DESC
      `;
      const sessionsResult = await DatabaseManager.query(sessionsQuery, [studentId]);
      const sessions = sessionsResult.rows;

      // Calculate statistics
      const totalSessions = sessions.length;
      const averageScore = sessions.length > 0 
        ? sessions.reduce((sum: number, s: any) => sum + parseFloat(s.form_score || 0), 0) / sessions.length 
        : 0;
      const bestScore = sessions.length > 0
        ? Math.max(...sessions.map((s: any) => parseFloat(s.form_score || 0)))
        : 0;
      const totalPracticeTime = sessions.reduce((sum: number, s: any) => sum + (s.practice_time || 0), 0);
      const totalShots = sessions.reduce((sum: number, s: any) => sum + (s.shot_count || 0), 0);

      // Get form issues breakdown
      const issuesQuery = `
        SELECT 
          fi.issue_type,
          fi.severity,
          COUNT(*) as count
        FROM form_issues fi
        JOIN shooting_sessions ss ON fi.session_id = ss.id
        WHERE ss.user_id = $1 AND ss.timestamp > NOW() - INTERVAL '30 days'
        GROUP BY fi.issue_type, fi.severity
        ORDER BY count DESC
      `;
      const issuesResult = await DatabaseManager.query(issuesQuery, [studentId]);
      const formIssues = issuesResult.rows;

      // Get biomechanical metrics
      const metricsQuery = `
        SELECT 
          AVG(bm.elbow_alignment) as avg_elbow_alignment,
          AVG(bm.wrist_angle) as avg_wrist_angle,
          AVG(bm.shoulder_square) as avg_shoulder_square,
          AVG(bm.follow_through) as avg_follow_through,
          AVG(bm.body_balance) as avg_body_balance
        FROM biomechanical_metrics bm
        JOIN shooting_sessions ss ON bm.session_id = ss.id
        WHERE ss.user_id = $1 AND ss.timestamp > NOW() - INTERVAL '30 days'
      `;
      const metricsResult = await DatabaseManager.query(metricsQuery, [studentId]);
      const biomechanics = metricsResult.rows[0];

      const personalBiomechanics = biomechanics && biomechanics.avg_elbow_alignment ? {
        elbowAlignment: parseFloat(biomechanics.avg_elbow_alignment),
        wristAngle: parseFloat(biomechanics.avg_wrist_angle),
        shoulderSquare: parseFloat(biomechanics.avg_shoulder_square),
        followThrough: parseFloat(biomechanics.avg_follow_through),
        bodyBalance: parseFloat(biomechanics.avg_body_balance),
      } : null;

      // Get score distribution
      const scoreDistribution = {
        excellent: sessions.filter((s: any) => parseFloat(s.form_score) >= 90).length,
        good: sessions.filter((s: any) => parseFloat(s.form_score) >= 75 && parseFloat(s.form_score) < 90).length,
        average: sessions.filter((s: any) => parseFloat(s.form_score) >= 60 && parseFloat(s.form_score) < 75).length,
        needsWork: sessions.filter((s: any) => parseFloat(s.form_score) < 60).length,
      };

      // Get progress over time (last 10 sessions)
      const recentSessions = sessions.slice(0, 10).reverse().map((s: any) => ({
        date: new Date(s.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        score: parseFloat(s.form_score || 0),
        shots: s.shot_count || 0,
      }));

      // Generate personalized drill recommendations
      let recommendedDrills: any[] = [];
      
      if (formIssues.length > 0) {
        try {
          const AWSAIService = (await import('./services/AWSAIService')).default;
          
          const detectedIssues = formIssues.map((issue: any) => ({
            type: issue.issue_type,
            severity: issue.severity,
            description: `Occurred ${issue.count} times in recent sessions`,
            timestamp: Date.now()
          }));

          const drillRecommendations = await AWSAIService.generateDrillSuggestions(
            detectedIssues,
            personalBiomechanics || {
              elbowAlignment: 0,
              wristAngle: 0,
              shoulderSquare: 0,
              followThrough: 0,
              bodyBalance: 0,
            },
            studentInfo?.skill_level || 'beginner',
            undefined
          );

          recommendedDrills = drillRecommendations.drills.map((drill: any) => ({
            drillName: drill.drillName,
            description: drill.description,
            instructions: drill.instructions,
            sets: drill.sets,
            focusPoints: drill.focusPoints,
            difficulty: drill.difficulty,
            targetIssue: drill.issue,
            videoUrl: drill.videoUrl || null,
          }));
        } catch (error) {
          console.log('⚠️  Could not generate AI drill recommendations');
        }
      }

      const studentReport = {
        summary: {
          totalSessions,
          averageScore: Math.round(averageScore * 10) / 10,
          bestScore: Math.round(bestScore * 10) / 10,
          totalPracticeTime,
          totalShots,
        },
        scoreDistribution,
        progressOverTime: recentSessions,
        formIssues: formIssues.map((issue: any) => ({
          type: issue.issue_type,
          severity: issue.severity,
          count: parseInt(issue.count),
          percentage: totalSessions > 0 ? Math.round((parseInt(issue.count) / totalSessions) * 100) : 0
        })),
        biomechanics: personalBiomechanics,
        recommendedDrills,
      };

      res.json({ success: true, data: studentReport });
    } catch (error) {
      console.error('Error fetching student report:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch student report' });
    }
  }
}

export default new StudentAPI();
