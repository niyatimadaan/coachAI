/**
 * Drill Recommendations API
 * Provides endpoints for fetching AI-generated drill suggestions
 */

import { Router, Request, Response } from 'express';
import DatabaseManager from './database/DatabaseManager';

const router = Router();

/**
 * GET /api/drills/:sessionId
 * Get drill recommendations for a specific session
 */
router.get('/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    // Get drill suggestions
    const drillsResult = await DatabaseManager.query(
      `SELECT * FROM drill_suggestions WHERE session_id = $1 ORDER BY id`,
      [sessionId]
    );

    // Get practice routine
    const routineResult = await DatabaseManager.query(
      `SELECT * FROM practice_routines WHERE session_id = $1 LIMIT 1`,
      [sessionId]
    );

    if (drillsResult.rows.length === 0 && routineResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No drill recommendations found for this session',
      });
    }

    // Parse stored JSON
    const drills = drillsResult.rows.map((row: any) => ({
      id: row.id,
      issue: row.issue,
      drillName: row.drill_name,
      description: row.description,
      instructions: JSON.parse(row.instructions),
      sets: row.sets,
      focusPoints: JSON.parse(row.focus_points),
      commonMistakes: JSON.parse(row.common_mistakes),
      difficulty: row.difficulty,
      aiGenerated: row.ai_generated === 1,
    }));

    const routine = routineResult.rows.length > 0 ? {
      priorityIssues: JSON.parse(routineResult.rows[0].priority_issues),
      practiceRoutine: {
        warmup: routineResult.rows[0].warmup,
        mainDrills: routineResult.rows[0].main_drills,
        cooldown: routineResult.rows[0].cooldown,
        totalDuration: routineResult.rows[0].total_duration,
      },
      progressIndicators: JSON.parse(routineResult.rows[0].progress_indicators),
      motivationalMessage: routineResult.rows[0].motivational_message,
      aiGenerated: routineResult.rows[0].ai_generated === 1,
    } : null;

    res.json({
      success: true,
      sessionId,
      drills,
      routine,
    });
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
 * Get all drill recommendations for a student (from recent sessions)
 */
router.get('/student/:studentId', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { limit = 5 } = req.query;

    // Get recent sessions with drills
    const sessionsResult = await DatabaseManager.query(
      `SELECT DISTINCT ss.id, ss.timestamp, ss.form_score
       FROM shooting_sessions ss
       INNER JOIN drill_suggestions ds ON ss.id = ds.session_id
       WHERE ss.user_id = $1
       ORDER BY ss.timestamp DESC
       LIMIT $2`,
      [studentId, parseInt(limit as string)]
    );

    const sessions = [];
    
    for (const session of sessionsResult.rows) {
      // Get drills for this session
      const drillsResult = await DatabaseManager.query(
        `SELECT * FROM drill_suggestions WHERE session_id = $1`,
        [session.id]
      );

      const drills = drillsResult.rows.map((row: any) => ({
        id: row.id,
        issue: row.issue,
        drillName: row.drill_name,
        description: row.description,
        instructions: JSON.parse(row.instructions),
        sets: row.sets,
        focusPoints: JSON.parse(row.focus_points),
        commonMistakes: JSON.parse(row.common_mistakes),
        difficulty: row.difficulty,
        aiGenerated: row.ai_generated === 1,
      }));

      sessions.push({
        sessionId: session.id,
        timestamp: session.timestamp,
        formScore: session.form_score,
        drillCount: drills.length,
        drills,
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
 * Get recommended drills for a specific form issue
 */
router.get('/issue/:issueType', async (req: Request, res: Response) => {
  try {
    const { issueType } = req.params;
    const { limit = 10 } = req.query;

    // Get most recent drills for this issue type
    const drillsResult = await DatabaseManager.query(
      `SELECT DISTINCT ON (drill_name) *
       FROM drill_suggestions
       WHERE issue = $1
       ORDER BY drill_name, created_at DESC
       LIMIT $2`,
      [issueType, parseInt(limit as string)]
    );

    const drills = drillsResult.rows.map((row: any) => ({
      id: row.id,
      issue: row.issue,
      drillName: row.drill_name,
      description: row.description,
      instructions: JSON.parse(row.instructions),
      sets: row.sets,
      focusPoints: JSON.parse(row.focus_points),
      commonMistakes: JSON.parse(row.common_mistakes),
      difficulty: row.difficulty,
      aiGenerated: row.ai_generated === 1,
    }));

    res.json({
      success: true,
      issueType,
      drills,
    });
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
