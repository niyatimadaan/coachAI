/**
 * Basic Rule-Based Analysis Engine
 * Provides offline shooting form analysis without ML dependencies
 * Uses computer vision and basketball fundamentals for assessment
 */

import {
  FormAnalysisResult,
  FormScore,
  FormIssue,
  FormIssueType,
  FormIssueSeverity,
  BiomechanicalMetrics,
} from '../types/models';

/**
 * Shot trajectory data extracted from video
 */
export interface ShotTrajectory {
  releaseAngle: number; // degrees from horizontal
  releaseHeight: number; // normalized 0-1
  arcHeight: number; // normalized 0-1
  releaseSpeed: number; // normalized 0-1
  followThroughDuration: number; // milliseconds
}

/**
 * Body positioning data from basic video analysis
 */
export interface BodyPositioning {
  shoulderAlignment: number; // degrees from square (0 = perfect)
  elbowAngle: number; // degrees
  wristAngle: number; // degrees from straight (0 = perfect)
  stanceWidth: number; // normalized 0-1
  kneeFlexion: number; // degrees
}

/**
 * Video motion analysis result
 */
export interface MotionAnalysisResult {
  trajectory: ShotTrajectory;
  positioning: BodyPositioning;
  timing: {
    totalDuration: number;
    preparationPhase: number;
    releasePhase: number;
    followThroughPhase: number;
  };
}

/**
 * Extract shot trajectory from video motion vectors
 * Uses basic computer vision without ML models
 */
export async function extractShotTrajectory(videoPath: string): Promise<ShotTrajectory> {
  try {
    console.log(`Extracting shot trajectory from: ${videoPath}`);
    
    // In production, this would use OpenCV or similar for:
    // 1. Ball detection using color/shape detection
    // 2. Tracking ball position across frames
    // 3. Calculating trajectory parameters
    
    // For MVP, simulate trajectory extraction
    // These values would come from actual video analysis
    const trajectory: ShotTrajectory = {
      releaseAngle: 48 + (Math.random() - 0.5) * 10, // 43-53 degrees (optimal ~48)
      releaseHeight: 0.7 + (Math.random() - 0.5) * 0.2, // 0.6-0.8 (normalized)
      arcHeight: 0.75 + (Math.random() - 0.5) * 0.15, // 0.675-0.825
      releaseSpeed: 0.65 + (Math.random() - 0.5) * 0.2, // 0.55-0.75
      followThroughDuration: 300 + Math.random() * 200, // 300-500ms
    };
    
    console.log('Trajectory extracted:', trajectory);
    return trajectory;
  } catch (error) {
    console.error('Failed to extract trajectory:', error);
    throw new Error(`Trajectory extraction failed: ${error}`);
  }
}

/**
 * Analyze body positioning from video frames
 * Uses basic computer vision for joint detection
 */
export async function analyzeBodyPositioning(videoPath: string): Promise<BodyPositioning> {
  try {
    console.log(`Analyzing body positioning from: ${videoPath}`);
    
    // In production, this would use:
    // 1. Basic edge detection for body outline
    // 2. Simple joint estimation using geometric patterns
    // 3. Angle calculations from detected points
    
    // For MVP, simulate positioning analysis
    const positioning: BodyPositioning = {
      shoulderAlignment: (Math.random() - 0.5) * 20, // -10 to +10 degrees
      elbowAngle: 85 + (Math.random() - 0.5) * 20, // 75-95 degrees (optimal ~90)
      wristAngle: (Math.random() - 0.5) * 15, // -7.5 to +7.5 degrees
      stanceWidth: 0.5 + (Math.random() - 0.5) * 0.3, // 0.35-0.65
      kneeFlexion: 120 + (Math.random() - 0.5) * 30, // 105-135 degrees
    };
    
    console.log('Positioning analyzed:', positioning);
    return positioning;
  } catch (error) {
    console.error('Failed to analyze positioning:', error);
    throw new Error(`Positioning analysis failed: ${error}`);
  }
}

/**
 * Analyze video timing and phases
 */
export async function analyzeShootingTiming(videoPath: string): Promise<MotionAnalysisResult['timing']> {
  try {
    console.log(`Analyzing shooting timing from: ${videoPath}`);
    
    // In production, detect motion phases from video
    // For MVP, simulate timing analysis
    const totalDuration = 1500 + Math.random() * 500; // 1.5-2 seconds
    
    const timing = {
      totalDuration,
      preparationPhase: totalDuration * 0.4, // ~40% preparation
      releasePhase: totalDuration * 0.2, // ~20% release
      followThroughPhase: totalDuration * 0.4, // ~40% follow-through
    };
    
    console.log('Timing analyzed:', timing);
    return timing;
  } catch (error) {
    console.error('Failed to analyze timing:', error);
    throw new Error(`Timing analysis failed: ${error}`);
  }
}

/**
 * Perform complete motion analysis on video
 */
export async function analyzeVideoMotion(videoPath: string): Promise<MotionAnalysisResult> {
  const [trajectory, positioning, timing] = await Promise.all([
    extractShotTrajectory(videoPath),
    analyzeBodyPositioning(videoPath),
    analyzeShootingTiming(videoPath),
  ]);
  
  return {
    trajectory,
    positioning,
    timing,
  };
}

/**
 * Calculate shooting angles from motion data
 */
export function calculateShootingAngles(motion: MotionAnalysisResult): {
  releaseAngle: number;
  elbowAngle: number;
  shoulderAngle: number;
} {
  return {
    releaseAngle: motion.trajectory.releaseAngle,
    elbowAngle: motion.positioning.elbowAngle,
    shoulderAngle: motion.positioning.shoulderAlignment,
  };
}

/**
 * Apply rule-based scoring using basketball fundamentals
 */
export function applyRuleBasedScoring(motion: MotionAnalysisResult): FormScore {
  let score = 100;
  
  // Release angle scoring (optimal: 45-50 degrees)
  const releaseAngleDiff = Math.abs(motion.trajectory.releaseAngle - 48);
  if (releaseAngleDiff > 10) {
    score -= 20;
  } else if (releaseAngleDiff > 5) {
    score -= 10;
  }
  
  // Elbow alignment scoring (optimal: 85-95 degrees)
  const elbowAngleDiff = Math.abs(motion.positioning.elbowAngle - 90);
  if (elbowAngleDiff > 15) {
    score -= 20;
  } else if (elbowAngleDiff > 10) {
    score -= 10;
  }
  
  // Shoulder alignment scoring (optimal: 0 degrees = square)
  const shoulderDiff = Math.abs(motion.positioning.shoulderAlignment);
  if (shoulderDiff > 15) {
    score -= 15;
  } else if (shoulderDiff > 10) {
    score -= 8;
  }
  
  // Follow-through scoring (optimal: 300-500ms)
  if (motion.trajectory.followThroughDuration < 200) {
    score -= 15;
  } else if (motion.trajectory.followThroughDuration < 250) {
    score -= 8;
  }
  
  // Arc height scoring (optimal: 0.7-0.8)
  const arcDiff = Math.abs(motion.trajectory.arcHeight - 0.75);
  if (arcDiff > 0.15) {
    score -= 10;
  } else if (arcDiff > 0.1) {
    score -= 5;
  }
  
  // Convert numeric score to letter grade
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Detect form issues from motion analysis
 */
export function detectFormIssues(motion: MotionAnalysisResult): FormIssue[] {
  const issues: FormIssue[] = [];
  
  // Check elbow alignment
  const elbowAngleDiff = Math.abs(motion.positioning.elbowAngle - 90);
  if (elbowAngleDiff > 15) {
    issues.push({
      type: 'elbow_flare',
      severity: 'major',
      description: 'Your elbow is flaring out too much. Keep it aligned under the ball.',
      recommendedDrills: [
        'Wall shooting drill - Practice form against a wall',
        'One-hand form shooting - Focus on elbow alignment',
      ],
    });
  } else if (elbowAngleDiff > 10) {
    issues.push({
      type: 'elbow_flare',
      severity: 'moderate',
      description: 'Your elbow alignment could be improved. Try to keep it more vertical.',
      recommendedDrills: ['One-hand form shooting'],
    });
  }
  
  // Check wrist angle
  const wristDiff = Math.abs(motion.positioning.wristAngle);
  if (wristDiff > 10) {
    issues.push({
      type: 'wrist_angle',
      severity: 'moderate',
      description: 'Your wrist angle at release needs adjustment. Aim for a straight wrist.',
      recommendedDrills: [
        'Wrist flick drill - Practice wrist snap motion',
        'Close-range shooting - Focus on wrist follow-through',
      ],
    });
  }
  
  // Check stance
  const stanceDiff = Math.abs(motion.positioning.stanceWidth - 0.5);
  if (stanceDiff > 0.2) {
    issues.push({
      type: 'stance',
      severity: 'minor',
      description: 'Your stance width could be better. Feet should be shoulder-width apart.',
      recommendedDrills: ['Balance and stance drills'],
    });
  }
  
  // Check follow-through
  if (motion.trajectory.followThroughDuration < 200) {
    issues.push({
      type: 'follow_through',
      severity: 'major',
      description: 'Your follow-through is too short. Hold your form longer after release.',
      recommendedDrills: [
        'Freeze drill - Hold follow-through position for 2 seconds',
        'Slow-motion shooting - Practice complete follow-through',
      ],
    });
  } else if (motion.trajectory.followThroughDuration < 250) {
    issues.push({
      type: 'follow_through',
      severity: 'moderate',
      description: 'Extend your follow-through slightly longer for better consistency.',
      recommendedDrills: ['Freeze drill'],
    });
  }
  
  return issues;
}

/**
 * Calculate biomechanical metrics from motion data
 */
export function calculateBiomechanicalMetrics(motion: MotionAnalysisResult): BiomechanicalMetrics {
  // Normalize metrics to 0-100 scale
  
  // Elbow alignment (90 degrees is perfect)
  const elbowScore = Math.max(0, 100 - Math.abs(motion.positioning.elbowAngle - 90) * 5);
  
  // Wrist angle (0 degrees deviation is perfect)
  const wristScore = Math.max(0, 100 - Math.abs(motion.positioning.wristAngle) * 6);
  
  // Shoulder square (0 degrees is perfect)
  const shoulderScore = Math.max(0, 100 - Math.abs(motion.positioning.shoulderAlignment) * 4);
  
  // Follow-through (350ms is optimal)
  const followThroughDiff = Math.abs(motion.trajectory.followThroughDuration - 350);
  const followThroughScore = Math.max(0, 100 - followThroughDiff * 0.3);
  
  return {
    elbowAlignment: Math.round(elbowScore),
    wristAngle: Math.round(wristScore),
    shoulderSquare: Math.round(shoulderScore),
    followThrough: Math.round(followThroughScore),
  };
}

/**
 * Generate simple feedback messages
 */
export function generateFeedbackMessages(
  score: FormScore,
  issues: FormIssue[]
): string[] {
  const messages: string[] = [];
  
  // Overall score message
  if (score === 'A') {
    messages.push('Excellent form! Keep up the great work.');
  } else if (score === 'B') {
    messages.push('Good form with room for minor improvements.');
  } else if (score === 'C') {
    messages.push('Decent form, but focus on the issues below to improve.');
  } else if (score === 'D') {
    messages.push('Your form needs work. Focus on fundamentals.');
  } else {
    messages.push('Significant form issues detected. Practice the recommended drills.');
  }
  
  // Add issue-specific messages (limit to top 2 for basic analysis)
  const topIssues = issues
    .sort((a, b) => {
      const severityOrder = { major: 0, moderate: 1, minor: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    })
    .slice(0, 2);
  
  topIssues.forEach(issue => {
    messages.push(issue.description);
  });
  
  return messages;
}

/**
 * Perform complete basic rule-based analysis
 * Main entry point for Tier 1 analysis
 */
export async function performBasicAnalysis(videoPath: string): Promise<FormAnalysisResult> {
  try {
    console.log(`Starting basic rule-based analysis for: ${videoPath}`);
    const startTime = Date.now();
    
    // Step 1: Analyze video motion
    const motion = await analyzeVideoMotion(videoPath);
    
    // Step 2: Calculate shooting angles
    const angles = calculateShootingAngles(motion);
    console.log('Shooting angles:', angles);
    
    // Step 3: Apply rule-based scoring
    const overallScore = applyRuleBasedScoring(motion);
    
    // Step 4: Detect form issues
    const detectedIssues = detectFormIssues(motion);
    
    // Step 5: Calculate biomechanical metrics
    const biomechanicalMetrics = calculateBiomechanicalMetrics(motion);
    
    // Step 6: Generate feedback
    const feedbackMessages = generateFeedbackMessages(overallScore, detectedIssues);
    console.log('Feedback:', feedbackMessages);
    
    const processingTime = Date.now() - startTime;
    console.log(`Basic analysis completed in ${processingTime}ms`);
    
    const result: FormAnalysisResult = {
      overallScore,
      detectedIssues,
      biomechanicalMetrics,
    };
    
    return result;
  } catch (error) {
    console.error('Basic analysis failed:', error);
    throw new Error(`Basic analysis failed: ${error}`);
  }
}

/**
 * Validate analysis result meets minimum quality standards
 */
export function validateAnalysisResult(result: FormAnalysisResult): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  if (!result.overallScore) {
    issues.push('Missing overall score');
  }
  
  if (!result.biomechanicalMetrics) {
    issues.push('Missing biomechanical metrics');
  }
  
  if (!result.detectedIssues) {
    issues.push('Missing detected issues');
  }
  
  // Validate biomechanical metrics are in valid range (0-100)
  if (result.biomechanicalMetrics) {
    const metrics = result.biomechanicalMetrics;
    if (
      metrics.elbowAlignment < 0 || metrics.elbowAlignment > 100 ||
      metrics.wristAngle < 0 || metrics.wristAngle > 100 ||
      metrics.shoulderSquare < 0 || metrics.shoulderSquare > 100 ||
      metrics.followThrough < 0 || metrics.followThrough > 100
    ) {
      issues.push('Biomechanical metrics out of valid range');
    }
  }
  
  return {
    valid: issues.length === 0,
    issues,
  };
}
