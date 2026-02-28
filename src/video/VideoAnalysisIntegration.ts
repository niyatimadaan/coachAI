/**
 * Video Analysis Integration
 * Integrates video capture with adaptive analysis pipeline
 */

import { ProcessingConfig, ShootingSession, FormAnalysisResult } from '../types/models';
import { routeVideoAnalysis, ProcessingResult } from '../utils/AdaptiveProcessingRouter';
import {
  recordShootingSession,
  RecordingResult,
  validateVideoFile,
  compressVideoForUpload,
  cleanupVideoFile,
} from './VideoCaptureManager';
import { performBasicAnalysis } from '../analysis/BasicAnalysisEngine';

/**
 * Complete shooting session result
 */
export interface ShootingSessionResult {
  success: boolean;
  session?: ShootingSession;
  error?: string;
  processingDetails: {
    tier: string;
    processingTime: number;
    fallbackUsed: boolean;
  };
}

/**
 * Analysis function type for routing
 */
type AnalysisFunction = (videoPath: string, tier: string) => Promise<FormAnalysisResult>;

/**
 * Perform analysis based on selected tier
 */
async function performAnalysisByTier(
  videoPath: string,
  tier: string
): Promise<FormAnalysisResult> {
  switch (tier) {
    case 'basic':
      return await performBasicAnalysis(videoPath);
    
    case 'lightweight_ml':
      // TODO: Implement in task 5
      console.log('Lightweight ML analysis not yet implemented, falling back to basic');
      return await performBasicAnalysis(videoPath);
    
    case 'full_ml':
      // TODO: Implement in task 5
      console.log('Full ML analysis not yet implemented, falling back to basic');
      return await performBasicAnalysis(videoPath);
    
    case 'cloud':
      // TODO: Implement in task 9
      console.log('Cloud analysis not yet implemented, falling back to basic');
      return await performBasicAnalysis(videoPath);
    
    default:
      throw new Error(`Unknown analysis tier: ${tier}`);
  }
}

/**
 * Record and analyze a complete shooting session
 * Handles the full pipeline from capture to analysis
 */
export async function recordAndAnalyzeSession(
  userId: string,
  processingConfig: ProcessingConfig,
  outputPath: string
): Promise<ShootingSessionResult> {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`Starting shooting session: ${sessionId}`);
    
    // Step 1: Record video
    console.log('Step 1: Recording video...');
    const recordingResult: RecordingResult = await recordShootingSession(
      processingConfig,
      outputPath
    );
    
    // Step 2: Validate video
    console.log('Step 2: Validating video...');
    const validation = validateVideoFile(recordingResult);
    if (!validation.valid) {
      return {
        success: false,
        error: `Video validation failed: ${validation.issues.join(', ')}`,
        processingDetails: {
          tier: 'none',
          processingTime: 0,
          fallbackUsed: false,
        },
      };
    }
    
    // Step 3: Route to appropriate analysis
    console.log('Step 3: Analyzing video...');
    const analysisResult: ProcessingResult<FormAnalysisResult> = await routeVideoAnalysis(
      recordingResult.videoPath!,
      processingConfig,
      performAnalysisByTier as AnalysisFunction
    );
    
    // Step 4: Create session record
    console.log('Step 4: Creating session record...');
    const session: ShootingSession = {
      id: sessionId,
      userId,
      timestamp: new Date(),
      duration: recordingResult.duration || 0,
      shotAttempts: 1, // Basic analysis counts as 1 attempt
      videoPath: recordingResult.videoPath!,
      formScore: analysisResult.data.overallScore,
      detectedIssues: analysisResult.data.detectedIssues,
      practiceTime: recordingResult.duration || 0,
      shotCount: 1,
      formAnalysis: analysisResult.data,
      videoMetadata: {
        resolution: recordingResult.metadata.resolution,
        frameRate: recordingResult.metadata.frameRate,
        lighting: 'good', // TODO: Implement lighting detection
      },
      syncStatus: 'local',
      lastModified: new Date(),
    };
    
    console.log(`Shooting session completed: ${sessionId}`, {
      score: session.formScore,
      issues: session.detectedIssues.length,
      tier: analysisResult.tier,
      time: analysisResult.processingTime,
    });
    
    return {
      success: true,
      session,
      processingDetails: {
        tier: analysisResult.tier,
        processingTime: analysisResult.processingTime,
        fallbackUsed: analysisResult.fallbackUsed,
      },
    };
  } catch (error) {
    console.error(`Shooting session failed: ${sessionId}`, error);
    return {
      success: false,
      error: `Session failed: ${error}`,
      processingDetails: {
        tier: 'none',
        processingTime: 0,
        fallbackUsed: false,
      },
    };
  }
}

/**
 * Analyze an existing video file
 * Useful for re-analyzing or batch processing
 */
export async function analyzeExistingVideo(
  videoPath: string,
  processingConfig: ProcessingConfig
): Promise<ProcessingResult<FormAnalysisResult>> {
  try {
    console.log(`Analyzing existing video: ${videoPath}`);
    
    const result = await routeVideoAnalysis(
      videoPath,
      processingConfig,
      performAnalysisByTier as AnalysisFunction
    );
    
    console.log('Analysis completed:', {
      tier: result.tier,
      score: result.data.overallScore,
      time: result.processingTime,
    });
    
    return result;
  } catch (error) {
    console.error('Video analysis failed:', error);
    throw new Error(`Failed to analyze video: ${error}`);
  }
}

/**
 * Prepare video for cloud upload if needed
 */
export async function prepareVideoForCloud(
  videoPath: string,
  processingConfig: ProcessingConfig
): Promise<string> {
  if (!processingConfig.userConsent.cloudProcessing) {
    throw new Error('Cloud processing consent not granted');
  }
  
  if (!processingConfig.hasConnectivity) {
    throw new Error('No network connectivity available');
  }
  
  console.log('Preparing video for cloud upload...');
  const compressedPath = await compressVideoForUpload(videoPath);
  
  return compressedPath;
}

/**
 * Clean up session video files
 */
export async function cleanupSessionVideo(session: ShootingSession): Promise<void> {
  try {
    await cleanupVideoFile(session.videoPath);
    console.log(`Cleaned up video for session: ${session.id}`);
  } catch (error) {
    console.error(`Failed to cleanup session video: ${session.id}`, error);
    // Non-critical error - don't throw
  }
}
