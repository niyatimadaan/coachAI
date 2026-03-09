/**
 * Drill Recommendations API
 * Provides endpoints for fetching AI-generated drill suggestions
 */

import { Router, Request, Response } from 'express';
import DatabaseManager from './database/DatabaseManager';

const router = Router();

/**
 * GET /api/drills/:sessionId
 * Get drill recommendations for a specific session (generated on-demand)
 */
router.get('/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    // Get session with form issues and biomechanics
    const sessionResult = await DatabaseManager.query(
      `SELECT ss.*, s.skill_level, s.age
       FROM shooting_sessions ss
       JOIN students s ON ss.user_id = s.id
       WHERE ss.id = $1`,
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }

    const session = sessionResult.rows[0];

    // Get form issues for this session
    const issuesResult = await DatabaseManager.query(
      `SELECT * FROM form_issues WHERE session_id = $1`,
      [sessionId]
    );

    // Get biomechanics for this session
    const metricsResult = await DatabaseManager.query(
      `SELECT * FROM biomechanical_metrics WHERE session_id = $1`,
      [sessionId]
    );

    if (issuesResult.rows.length === 0) {
      return res.json({
        success: true,
        sessionId,
        drills: [],
        routine: null,
        message: 'No form issues detected - great form!',
      });
    }

    // Generate drill recommendations on-demand
    try {
      const AWSAIService = (await import('./services/AWSAIService')).default;

      const detectedIssues = issuesResult.rows.map((issue: any) => ({
        type: issue.issue_type,
        severity: issue.severity,
        description: issue.description,
        timestamp: issue.timestamp,
      }));

      const biomechanics = metricsResult.rows.length > 0 ? {
        elbowAlignment: parseFloat(metricsResult.rows[0].elbow_alignment),
        wristAngle: parseFloat(metricsResult.rows[0].wrist_angle),
        shoulderSquare: parseFloat(metricsResult.rows[0].shoulder_square),
        followThrough: parseFloat(metricsResult.rows[0].follow_through),
        bodyBalance: parseFloat(metricsResult.rows[0].body_balance || 0),
      } : {
        elbowAlignment: 0,
        wristAngle: 0,
        shoulderSquare: 0,
        followThrough: 0,
        bodyBalance: 0,
      };

      const drillRecommendations = await AWSAIService.generateDrillSuggestions(
        detectedIssues,
        biomechanics,
        session.skill_level || 'intermediate',
        session.age
      );

      const drills = drillRecommendations.drills.map((drill: any) => ({
        issue: drill.issue,
        drillName: drill.drillName,
        description: drill.description,
        instructions: drill.instructions,
        sets: drill.sets,
        focusPoints: drill.focusPoints,
        commonMistakes: drill.commonMistakes,
        difficulty: drill.difficulty,
        aiGenerated: true,
      }));

      const routine = {
        priorityIssues: drillRecommendations.priorityIssues,
        practiceRoutine: {
          warmup: drillRecommendations.practiceRoutine.warmup,
          mainDrills: drillRecommendations.practiceRoutine.mainDrills,
          cooldown: drillRecommendations.practiceRoutine.cooldown,
          totalDuration: drillRecommendations.practiceRoutine.totalDuration,
        },
        progressIndicators: drillRecommendations.progressIndicators,
        motivationalMessage: drillRecommendations.motivationalMessage,
        aiGenerated: true,
      };

      res.json({
        success: true,
        sessionId,
        drills,
        routine,
      });
    } catch (aiError) {
      console.error('Error generating AI drills:', aiError);
      // Return basic response if AI fails
      return res.json({
        success: true,
        sessionId,
        drills: [],
        routine: null,
        message: 'Unable to generate personalized drills at this time',
      });
    }
  } catch (error: any) {
    console.error('Drill recommendations API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/drills/student/:studentId
 * Get recent sessions with form issues for a student
 */
router.get('/student/:studentId', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { limit = 5 } = req.query;

    // Get recent sessions with form issues
    const sessionsResult = await DatabaseManager.query(
      `SELECT DISTINCT ss.id, ss.timestamp, ss.form_score
       FROM shooting_sessions ss
       INNER JOIN form_issues fi ON ss.id = fi.session_id
       WHERE ss.user_id = $1
       ORDER BY ss.timestamp DESC
       LIMIT $2`,
      [studentId, parseInt(limit as string)]
    );

    const sessions = [];
    
    for (const session of sessionsResult.rows) {
      // Get form issues for this session
      const issuesResult = await DatabaseManager.query(
        `SELECT issue_type, severity FROM form_issues WHERE session_id = $1`,
        [session.id]
      );

      const issues = issuesResult.rows.map((row: any) => ({
        type: row.issue_type,
        severity: row.severity,
      }));

      sessions.push({
        sessionId: session.id,
        timestamp: session.timestamp,
        formScore: session.form_score,
        issueCount: issues.length,
        issues,
      });
    }

    res.json({
      success: true,
      studentId,
      sessions,
    });
  } catch (error: any) {
    console.error('Student drills API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/drills/issue/:issueType
 * Get recommended drills for a specific form issue (generated on-demand)
 */
router.get('/issue/:issueType', async (req: Request, res: Response) => {
  try {
    const { issueType } = req.params;
    const issueTypeStr = Array.isArray(issueType) ? issueType[0] : issueType;

    // Generate drills for this specific issue type
    try {
      const AWSAIService = (await import('./services/AWSAIService')).default;

      const detectedIssues = [{
        type: issueTypeStr as any,
        severity: 'medium' as any,
        description: `Focus on improving ${issueTypeStr.replace(/_/g, ' ')}`,
        recommendedDrills: [],
        timestamp: Date.now(),
      }];

      const drillRecommendations = await AWSAIService.generateDrillSuggestions(
        detectedIssues,
        {
          elbowAlignment: 50,
          wristAngle: 50,
          shoulderSquare: 50,
          followThrough: 50,
          bodyBalance: 50,
        },
        'intermediate', 
        undefined
      );

      const drills = drillRecommendations.drills.map((drill: any) => ({
        issue: drill.issue,
        drillName: drill.drillName,
        description: drill.description,
        instructions: drill.instructions,
        sets: drill.sets,
        focusPoints: drill.focusPoints,
        commonMistakes: drill.commonMistakes,
        difficulty: drill.difficulty,
        aiGenerated: true,
      }));

      res.json({
        success: true,
        issueType: issueTypeStr,
        drills,
      });
    } catch (aiError) {
      console.error('Error generating AI drills:', aiError);
      res.json({
        success: true,
        issueType: issueTypeStr,
        drills: [],
        message: 'Unable to generate drills at this time',
      });
    }
  } catch (error: any) {
    console.error('Issue drills API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
export { router as getRouter };
