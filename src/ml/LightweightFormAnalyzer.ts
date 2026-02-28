/**
 * Lightweight Form Analyzer
 * Analyzes basketball shooting form using pose estimation keypoints
 * Calculates biomechanical metrics and generates form scores
 */

import {
  FormAnalysisResult,
  FormScore,
  FormIssue,
  FormIssueType,
  FormIssueSeverity,
  BiomechanicalMetrics,
  PoseLandmark,
} from '../types/models';
import {
  KeypointFrame,
  MajorJoint,
  getShootingArmKeypoints,
  calculateJointAngle,
  processVideoForPose,
  loadPoseModelWithFallback,
} from './PoseEstimationEngine';

/**
 * Shooting phase detection from keypoint sequence
 */
export interface ShootingPhases {
  preparation: KeypointFrame[];
  release: KeypointFrame[];
  followThrough: KeypointFrame[];
}

/**
 * Biomechanical analysis from keypoints
 */
export interface BiomechanicalAnalysis {
  elbowAlignment: number; // 0-100 score
  wristAngle: number; // 0-100 score
  shoulderSquare: number; // 0-100 score
  followThrough: number; // 0-100 score
  releaseHeight: number; // normalized height
  bodyBalance: number; // 0-100 score
}

/**
 * Perform lightweight ML form analysis on video
 * Main entry point for Tier 2 analysis
 */
export async function performLightweightMLAnalysis(
  videoPath: string
): Promise<FormAnalysisResult> {
  try {
    console.log(`Starting lightweight ML analysis for: ${videoPath}`);
    const startTime = Date.now();
    
    // Load pose estimation model
    const model = await loadPoseModelWithFallback();
    if (!model) {
      throw new Error('Failed to load pose estimation model');
    }
    
    // Process video for pose keypoints
    const keypointFrames = await processVideoForPose(videoPath, model);
    
    if (keypointFrames.length === 0) {
      throw new Error('No keypoints detected in video');
    }
    
    // Detect shooting phases
    const phases = detectShootingPhases(keypointFrames);
    
    // Calculate biomechanical metrics
    const biomechanics = calculateBiomechanicsFromPose(phases);
    
    // Generate form score
    const overallScore = calculateFormScore(biomechanics);
    
    // Detect specific form issues
    const detectedIssues = detectFormIssuesFromPose(biomechanics, phases);
    
    // Convert to standard metrics format
    const biomechanicalMetrics: BiomechanicalMetrics = {
      elbowAlignment: biomechanics.elbowAlignment,
      wristAngle: biomechanics.wristAngle,
      shoulderSquare: biomechanics.shoulderSquare,
      followThrough: biomechanics.followThrough,
    };
    
    const processingTime = Date.now() - startTime;
    console.log(`Lightweight ML analysis completed in ${processingTime}ms`);
    
    return {
      overallScore,
      detectedIssues,
      biomechanicalMetrics,
    };
  } catch (error) {
    console.error('Lightweight ML analysis failed:', error);
    throw new Error(`Lightweight ML analysis failed: ${error}`);
  }
}

/**
 * Detect shooting phases from keypoint sequence
 * Identifies preparation, release, and follow-through phases
 */
export function detectShootingPhases(
  keypointFrames: KeypointFrame[]
): ShootingPhases {
  if (keypointFrames.length === 0) {
    throw new Error('No keypoint frames to analyze');
  }
  
  // Analyze wrist height trajectory to detect phases
  const wristHeights = keypointFrames.map(frame => {
    const rightWrist = frame.keypoints.get(MajorJoint.RIGHT_WRIST);
    return rightWrist ? rightWrist.y : 0;
  });
  
  // Find release point (highest wrist position)
  let releaseIdx = 0;
  let maxHeight = wristHeights[0];
  
  for (let i = 1; i < wristHeights.length; i++) {
    if (wristHeights[i] < maxHeight) { // Lower y = higher position
      maxHeight = wristHeights[i];
      releaseIdx = i;
    }
  }
  
  // Define phase boundaries
  const prepEndIdx = Math.max(0, releaseIdx - 2);
  const releaseEndIdx = Math.min(keypointFrames.length - 1, releaseIdx + 2);
  
  const phases: ShootingPhases = {
    preparation: keypointFrames.slice(0, prepEndIdx + 1),
    release: keypointFrames.slice(prepEndIdx, releaseEndIdx + 1),
    followThrough: keypointFrames.slice(releaseEndIdx),
  };
  
  console.log(`Detected phases: prep=${phases.preparation.length}, release=${phases.release.length}, follow=${phases.followThrough.length}`);
  
  return phases;
}

/**
 * Calculate biomechanical metrics from pose keypoints
 */
export function calculateBiomechanicsFromPose(
  phases: ShootingPhases
): BiomechanicalAnalysis {
  // Analyze release phase for key metrics
  const releaseFrame = phases.release[Math.floor(phases.release.length / 2)];
  
  if (!releaseFrame) {
    throw new Error('No release frame available');
  }
  
  // Get shooting arm keypoints
  const armKeypoints = getShootingArmKeypoints(releaseFrame, false);
  
  if (!armKeypoints) {
    throw new Error('Could not detect shooting arm keypoints');
  }
  
  const { wrist, elbow, shoulder } = armKeypoints;
  
  // Calculate elbow alignment
  const elbowAlignment = calculateElbowAlignment(shoulder, elbow, wrist);
  
  // Calculate wrist angle
  const wristAngle = calculateWristAngle(elbow, wrist, releaseFrame);
  
  // Calculate shoulder square
  const shoulderSquare = calculateShoulderSquare(releaseFrame);
  
  // Calculate follow-through quality
  const followThrough = calculateFollowThroughQuality(phases.followThrough);
  
  // Calculate release height
  const releaseHeight = 1.0 - wrist.y; // Convert to normalized height
  
  // Calculate body balance
  const bodyBalance = calculateBodyBalance(releaseFrame);
  
  return {
    elbowAlignment,
    wristAngle,
    shoulderSquare,
    followThrough,
    releaseHeight,
    bodyBalance,
  };
}

/**
 * Calculate elbow alignment score
 * Measures how well the elbow is aligned under the ball
 */
export function calculateElbowAlignment(
  shoulder: PoseLandmark,
  elbow: PoseLandmark,
  wrist: PoseLandmark
): number {
  // Calculate angle at elbow joint
  const angle = calculateJointAngle(shoulder, elbow, wrist);
  
  // Optimal elbow angle is around 90 degrees
  const optimalAngle = 90;
  const deviation = Math.abs(angle - optimalAngle);
  
  // Score decreases with deviation from optimal
  // 0 deviation = 100 score, 30+ deviation = 0 score
  const score = Math.max(0, 100 - (deviation * 3.33));
  
  console.log(`Elbow alignment: angle=${angle.toFixed(1)}°, score=${score.toFixed(1)}`);
  
  return Math.round(score);
}

/**
 * Calculate wrist angle score
 * Measures wrist position at release
 */
export function calculateWristAngle(
  elbow: PoseLandmark,
  wrist: PoseLandmark,
  frame: KeypointFrame
): number {
  // Calculate wrist extension angle
  // In production, would use hand keypoints if available
  // For MVP, estimate from elbow-wrist vector
  
  const dx = wrist.x - elbow.x;
  const dy = wrist.y - elbow.y;
  
  // Calculate angle from vertical
  const angleFromVertical = Math.abs(Math.atan2(dx, dy) * (180 / Math.PI));
  
  // Optimal wrist should be relatively straight (small angle from vertical)
  const deviation = Math.abs(angleFromVertical - 0);
  
  // Score decreases with deviation
  const score = Math.max(0, 100 - (deviation * 5));
  
  console.log(`Wrist angle: deviation=${deviation.toFixed(1)}°, score=${score.toFixed(1)}`);
  
  return Math.round(score);
}

/**
 * Calculate shoulder square score
 * Measures how square the shoulders are to the basket
 */
export function calculateShoulderSquare(frame: KeypointFrame): number {
  const leftShoulder = frame.keypoints.get(MajorJoint.LEFT_SHOULDER);
  const rightShoulder = frame.keypoints.get(MajorJoint.RIGHT_SHOULDER);
  
  if (!leftShoulder || !rightShoulder) {
    console.warn('Shoulder keypoints not detected');
    return 50; // Default score
  }
  
  // Calculate shoulder line angle
  const dx = rightShoulder.x - leftShoulder.x;
  const dy = rightShoulder.y - leftShoulder.y;
  
  // Angle from horizontal (0 = perfectly square)
  const angle = Math.abs(Math.atan2(dy, dx) * (180 / Math.PI));
  
  // Optimal is close to 0 degrees (horizontal)
  const deviation = Math.abs(angle);
  
  // Score decreases with deviation
  const score = Math.max(0, 100 - (deviation * 5));
  
  console.log(`Shoulder square: angle=${angle.toFixed(1)}°, score=${score.toFixed(1)}`);
  
  return Math.round(score);
}

/**
 * Calculate follow-through quality score
 * Measures consistency and duration of follow-through
 */
export function calculateFollowThroughQuality(
  followThroughFrames: KeypointFrame[]
): number {
  if (followThroughFrames.length === 0) {
    return 0;
  }
  
  // Check wrist position consistency in follow-through
  const wristPositions = followThroughFrames
    .map(frame => frame.keypoints.get(MajorJoint.RIGHT_WRIST))
    .filter(wrist => wrist !== undefined) as PoseLandmark[];
  
  if (wristPositions.length < 2) {
    return 50; // Default score
  }
  
  // Calculate position variance (lower is better - more consistent)
  const avgY = wristPositions.reduce((sum, w) => sum + w.y, 0) / wristPositions.length;
  const variance = wristPositions.reduce((sum, w) => sum + Math.pow(w.y - avgY, 2), 0) / wristPositions.length;
  
  // Duration score (longer follow-through is better)
  const durationScore = Math.min(100, (followThroughFrames.length / 5) * 100);
  
  // Consistency score (lower variance is better)
  const consistencyScore = Math.max(0, 100 - (variance * 500));
  
  // Combined score
  const score = (durationScore * 0.6) + (consistencyScore * 0.4);
  
  console.log(`Follow-through: duration=${followThroughFrames.length} frames, score=${score.toFixed(1)}`);
  
  return Math.round(score);
}

/**
 * Calculate body balance score
 * Measures overall body alignment and stability
 */
export function calculateBodyBalance(frame: KeypointFrame): number {
  const leftHip = frame.keypoints.get(MajorJoint.LEFT_HIP);
  const rightHip = frame.keypoints.get(MajorJoint.RIGHT_HIP);
  const leftAnkle = frame.keypoints.get(MajorJoint.LEFT_ANKLE);
  const rightAnkle = frame.keypoints.get(MajorJoint.RIGHT_ANKLE);
  
  if (!leftHip || !rightHip || !leftAnkle || !rightAnkle) {
    return 50; // Default score
  }
  
  // Check hip alignment
  const hipDy = Math.abs(leftHip.y - rightHip.y);
  const hipScore = Math.max(0, 100 - (hipDy * 500));
  
  // Check stance width (feet should be shoulder-width apart)
  const stanceWidth = Math.abs(leftAnkle.x - rightAnkle.x);
  const optimalWidth = 0.3; // Normalized
  const stanceDeviation = Math.abs(stanceWidth - optimalWidth);
  const stanceScore = Math.max(0, 100 - (stanceDeviation * 200));
  
  // Combined balance score
  const score = (hipScore * 0.5) + (stanceScore * 0.5);
  
  console.log(`Body balance: hip=${hipScore.toFixed(1)}, stance=${stanceScore.toFixed(1)}, total=${score.toFixed(1)}`);
  
  return Math.round(score);
}

/**
 * Calculate overall form score from biomechanical metrics
 */
export function calculateFormScore(biomechanics: BiomechanicalAnalysis): FormScore {
  // Weighted average of all metrics
  const weights = {
    elbowAlignment: 0.25,
    wristAngle: 0.20,
    shoulderSquare: 0.20,
    followThrough: 0.25,
    bodyBalance: 0.10,
  };
  
  const totalScore = 
    biomechanics.elbowAlignment * weights.elbowAlignment +
    biomechanics.wristAngle * weights.wristAngle +
    biomechanics.shoulderSquare * weights.shoulderSquare +
    biomechanics.followThrough * weights.followThrough +
    biomechanics.bodyBalance * weights.bodyBalance;
  
  console.log(`Total form score: ${totalScore.toFixed(1)}`);
  
  // Convert to letter grade
  if (totalScore >= 90) return 'A';
  if (totalScore >= 80) return 'B';
  if (totalScore >= 70) return 'C';
  if (totalScore >= 60) return 'D';
  return 'F';
}

/**
 * Detect specific form issues from biomechanical analysis
 */
export function detectFormIssuesFromPose(
  biomechanics: BiomechanicalAnalysis,
  phases: ShootingPhases
): FormIssue[] {
  const issues: FormIssue[] = [];
  
  // Check elbow alignment
  if (biomechanics.elbowAlignment < 60) {
    issues.push({
      type: 'elbow_flare',
      severity: 'major',
      description: 'Your elbow is significantly out of alignment. Focus on keeping it under the ball.',
      recommendedDrills: [
        'Wall shooting drill - Practice form against a wall',
        'One-hand form shooting - Focus on elbow alignment',
        'Chair drill - Sit and practice shooting motion',
      ],
    });
  } else if (biomechanics.elbowAlignment < 75) {
    issues.push({
      type: 'elbow_flare',
      severity: 'moderate',
      description: 'Your elbow alignment needs improvement. Keep it more vertical.',
      recommendedDrills: [
        'One-hand form shooting',
        'Mirror practice - Watch your elbow position',
      ],
    });
  }
  
  // Check wrist angle
  if (biomechanics.wristAngle < 65) {
    issues.push({
      type: 'wrist_angle',
      severity: 'moderate',
      description: 'Your wrist position at release needs work. Aim for a straighter wrist with good snap.',
      recommendedDrills: [
        'Wrist flick drill - Practice wrist snap motion',
        'Close-range shooting - Focus on wrist follow-through',
        'Lying down shooting - Isolate wrist motion',
      ],
    });
  } else if (biomechanics.wristAngle < 80) {
    issues.push({
      type: 'wrist_angle',
      severity: 'minor',
      description: 'Minor wrist angle adjustment needed for optimal release.',
      recommendedDrills: ['Wrist flick drill'],
    });
  }
  
  // Check shoulder square
  if (biomechanics.shoulderSquare < 70) {
    issues.push({
      type: 'stance',
      severity: 'moderate',
      description: 'Your shoulders are not square to the basket. Align your body properly.',
      recommendedDrills: [
        'Stance and alignment drills',
        'Feet positioning practice',
        'Square-up drill before shooting',
      ],
    });
  }
  
  // Check follow-through
  if (biomechanics.followThrough < 60) {
    issues.push({
      type: 'follow_through',
      severity: 'major',
      description: 'Your follow-through is inconsistent or too short. Hold your form longer.',
      recommendedDrills: [
        'Freeze drill - Hold follow-through for 2 seconds',
        'Slow-motion shooting - Practice complete follow-through',
        'Goose-neck finish - Focus on wrist position',
      ],
    });
  } else if (biomechanics.followThrough < 75) {
    issues.push({
      type: 'follow_through',
      severity: 'moderate',
      description: 'Extend your follow-through for better consistency.',
      recommendedDrills: [
        'Freeze drill',
        'Count to 2 after release',
      ],
    });
  }
  
  // Sort by severity
  issues.sort((a, b) => {
    const severityOrder = { major: 0, moderate: 1, minor: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
  
  // Limit to top 3 issues for lightweight analysis
  return issues.slice(0, 3);
}

/**
 * Validate that pose-based analysis produced valid results
 */
export function validatePoseAnalysisResult(
  result: FormAnalysisResult
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (!result.overallScore) {
    issues.push('Missing overall score');
  }
  
  if (!result.biomechanicalMetrics) {
    issues.push('Missing biomechanical metrics');
  } else {
    const metrics = result.biomechanicalMetrics;
    
    // Validate all metrics are in valid range
    if (metrics.elbowAlignment < 0 || metrics.elbowAlignment > 100) {
      issues.push('Elbow alignment out of range');
    }
    if (metrics.wristAngle < 0 || metrics.wristAngle > 100) {
      issues.push('Wrist angle out of range');
    }
    if (metrics.shoulderSquare < 0 || metrics.shoulderSquare > 100) {
      issues.push('Shoulder square out of range');
    }
    if (metrics.followThrough < 0 || metrics.followThrough > 100) {
      issues.push('Follow-through out of range');
    }
  }
  
  if (!result.detectedIssues || result.detectedIssues.length === 0) {
    issues.push('No form issues detected (suspicious)');
  }
  
  return {
    valid: issues.length === 0,
    issues,
  };
}
