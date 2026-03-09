/**
 * ML Video Analysis Service
 * Processes uploaded videos using ML models to generate form scores
 */

import { performMLAnalysisWithFallback } from '../ml/MLAnalysisIntegration';
import { AnalysisTier, FormAnalysisResult } from '../types/models';
import VideoStorageService from './VideoStorageService';
import DatabaseManager from './database/DatabaseManager';
import AWSAIService, { DrillRecommendation } from './services/AWSAIService';

export interface VideoAnalysisRequest {
  videoId: string;
  fileName: string;
  studentId: string;
  analysisTier?: AnalysisTier;
}

export interface VideoAnalysisResult {
  sessionId: string;
  videoId: string;
  studentId: string;
  analysis: FormAnalysisResult;
  processingTime: number;
  analysisTier: AnalysisTier;
  timestamp: Date;
  drillRecommendations?: DrillRecommendation;
}

class MLVideoAnalysisService {
  private defaultTier: AnalysisTier;
  private processingTimeout: number;
  private maxVideoDuration: number;

  constructor() {
    this.defaultTier = (process.env.DEFAULT_ML_TIER as AnalysisTier) || 'lightweight_ml';
    this.processingTimeout = parseInt(process.env.ML_PROCESSING_TIMEOUT || '60000');
    this.maxVideoDuration = parseInt(process.env.ML_MAX_VIDEO_DURATION_SEC || '120');
  }

  /**
   * Analyze video with ML
   */
  async analyzeVideo(request: VideoAnalysisRequest): Promise<VideoAnalysisResult> {
    const startTime = Date.now();
    const analysisTier = request.analysisTier || this.defaultTier;

    console.log(`Starting ML analysis for video ${request.videoId} with tier: ${analysisTier}`);

    try {
      // Get video file path
      const videoPath = await VideoStorageService.getVideoPath(request.fileName);

      // Run ML analysis with timeout
      const analysisPromise = performMLAnalysisWithFallback(videoPath, analysisTier);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('ML analysis timeout')), this.processingTimeout);
      });

      const analysis = await Promise.race([analysisPromise, timeoutPromise]);

      const processingTime = Date.now() - startTime;

      // Get student info for personalized drill suggestions
      const student = await DatabaseManager.query(
        'SELECT name, age, skill_level FROM students WHERE id = $1',
        [request.studentId]
      );
      
      const studentLevel = student.rows.length > 0 ? student.rows[0].skill_level : 'intermediate';
      const studentAge = student.rows.length > 0 ? student.rows[0].age : undefined;

      // Generate AI-powered drill suggestions
      let drillRecommendations: DrillRecommendation | undefined;
      try {
        console.log('🤖 Generating personalized drill suggestions...');
        drillRecommendations = await AWSAIService.generateDrillSuggestions(
          analysis.detectedIssues || [],
          analysis.biomechanicalMetrics || {
            elbowAlignment: 0,
            wristAngle: 0,
            shoulderSquare: 0,
            followThrough: 0,
          },
          studentLevel,
          studentAge
        );
        console.log(`✅ Generated ${drillRecommendations.drills.length} drill recommendations`);
      } catch (error) {
        console.error('Error generating drill suggestions:', error);
        // Continue without drill suggestions
      }

      // Save session to database
      const sessionId = await this.saveAnalysisSession(
        request.studentId,
        request.videoId,
        videoPath,
        analysis,
        processingTime,
        drillRecommendations
      );

      console.log(`ML analysis completed in ${processingTime}ms with score: ${analysis.overallScore}`);

      return {
        sessionId,
        videoId: request.videoId,
        studentId: request.studentId,
        analysis,
        processingTime,
        analysisTier,
        timestamp: new Date(),
        drillRecommendations,
      };
    } catch (error: any) {
      console.error('ML analysis failed:', error);
      
      // If ML fails, try basic analysis as fallback
      if (analysisTier !== 'basic') {
        console.log('Falling back to basic analysis...');
        return await this.analyzeVideo({
          ...request,
          analysisTier: 'basic',
        });
      }
      
      throw new Error(`Video analysis failed: ${error.message}`);
    }
  }

  /**
   * Save analysis session to database
   */
  private async saveAnalysisSession(
    studentId: string,
    videoId: string,
    videoPath: string,
    analysis: FormAnalysisResult,
    processingTime: number,
    drillRecommendations?: DrillRecommendation
  ): Promise<string> {
    // Create shooting session
    const session = await DatabaseManager.createShootingSession({
      user_id: studentId,
      timestamp: new Date(),
      duration: Math.round(processingTime / 1000), // Convert to seconds
      shot_attempts: 1, // Assuming 1 shot per video for now
      video_path: videoPath,
      form_score: analysis.overallScore.toString(),
      practice_time: 0,
      shot_count: 1,
    });

    // Save form issues if any
    if (analysis.detectedIssues && analysis.detectedIssues.length > 0) {
      for (const issue of analysis.detectedIssues) {
        await DatabaseManager.query(
          `INSERT INTO form_issues (session_id, issue_type, severity, description)
           VALUES ($1, $2, $3, $4)`,
          [session.id, issue.type, issue.severity, issue.description]
        );
      }
    }

    // Save biomechanical metrics if available
    if (analysis.biomechanicalMetrics) {
      await DatabaseManager.query(
        `INSERT INTO biomechanical_metrics 
         (session_id, elbow_alignment, wrist_angle, shoulder_square, follow_through, body_balance)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          session.id,
          analysis.biomechanicalMetrics.elbowAlignment,
          analysis.biomechanicalMetrics.wristAngle,
          analysis.biomechanicalMetrics.shoulderSquare,
          analysis.biomechanicalMetrics.followThrough,
          analysis.biomechanicalMetrics.bodyBalance,
        ]
      );
    }

    return session.id;
  }

  /**
   * Get analysis result by session ID
   */
  async getAnalysisResult(sessionId: string): Promise<VideoAnalysisResult | null> {
    const session = await DatabaseManager.query(
      `SELECT 
        ss.*,
        s.id as student_id,
        s.name as student_name
      FROM shooting_sessions ss
      JOIN students s ON ss.user_id = s.id
      WHERE ss.id = $1`,
      [sessionId]
    );

    if (session.rows.length === 0) {
      return null;
    }

    const sessionData = session.rows[0];

    // Get form issues
    const issuesResult = await DatabaseManager.query(
      'SELECT * FROM form_issues WHERE session_id = $1',
      [sessionId]
    );

    // Get biomechanical metrics
    const metricsResult = await DatabaseManager.query(
      'SELECT * FROM biomechanical_metrics WHERE session_id = $1',
      [sessionId]
    );

    const detectedIssues = issuesResult.rows.map((issue: any) => ({
      type: issue.issue_type,
      severity: issue.severity,
      description: issue.description,
      timestamp: issue.timestamp,
    }));

    const biomechanicalMetrics = metricsResult.rows.length > 0 ? {
      elbowAlignment: parseFloat(metricsResult.rows[0].elbow_alignment),
      wristAngle: parseFloat(metricsResult.rows[0].wrist_angle),
      shoulderSquare: parseFloat(metricsResult.rows[0].shoulder_square),
      followThrough: parseFloat(metricsResult.rows[0].follow_through),
      bodyBalance: parseFloat(metricsResult.rows[0].body_balance),
    } : {
      elbowAlignment: 0,
      wristAngle: 0,
      shoulderSquare: 0,
      followThrough: 0,
      bodyBalance: 0,
    };

    return {
      sessionId: sessionData.id,
      videoId: sessionData.video_path || '',
      studentId: sessionData.student_id,
      analysis: {
        overallScore: 'C' as any, // Convert back to letter grade or keep numeric
        detectedIssues,
        biomechanicalMetrics,
      },
      processingTime: sessionData.duration * 1000, // Convert back to ms
      analysisTier: 'lightweight_ml',
      timestamp: sessionData.timestamp,
    };
  }

  /**
   * Get storage and ML configuration info
   */
  getConfiguration() {
    return {
      defaultTier: this.defaultTier,
      processingTimeout: this.processingTimeout,
      maxVideoDuration: this.maxVideoDuration,
      storage: VideoStorageService.getStorageInfo(),
    };
  }
}

export default new MLVideoAnalysisService();
