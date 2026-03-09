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
    const scoreResult = calculateFormScore(biomechanics);
    
    // Detect specific form issues
    const detectedIssues = detectFormIssuesFromPose(biomechanics, phases);
    
    // Convert to standard metrics format
    const biomechanicalMetrics: BiomechanicalMetrics = {
      elbowAlignment: biomechanics.elbowAlignment,
      wristAngle: biomechanics.wristAngle,
      shoulderSquare: biomechanics.shoulderSquare,
      followThrough: biomechanics.followThrough,
      bodyBalance: biomechanics.bodyBalance,
    };
    
    const processingTime = Date.now() - startTime;
    console.log(`Lightweight ML analysis completed in ${processingTime}ms`);
    
    return {
      overallScore: scoreResult.letter,
      numericScore: scoreResult.numeric,
      detectedIssues,
      biomechanicalMetrics,
      keypointFrames, // Include for visualization
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
 * Uses range-based scoring for more realistic evaluation
 */
export function calculateElbowAlignment(
  shoulder: PoseLandmark,
  elbow: PoseLandmark,
  wrist: PoseLandmark
): number {
  // Calculate angle at elbow joint
  const angle = calculateJointAngle(shoulder, elbow, wrist);
  
  let score: number;
  
  // Range-based scoring (more generous)
  if (angle >= 80 && angle <= 100) {
    // Perfect range: 80-100° = 95-100 points
    const centerDist = Math.abs(angle - 90);
    score = 100 - (centerDist * 0.5);
  } else if ((angle >= 70 && angle < 80) || (angle > 100 && angle <= 115)) {
    // Good range: 70-80° or 100-115° = 85-95 points
    const deviation = angle < 80 ? (80 - angle) : (angle - 100);
    score = 95 - (deviation * 1.0);
  } else if ((angle >= 55 && angle < 70) || (angle > 115 && angle <= 130)) {
    // Acceptable range: 55-70° or 115-130° = 70-85 points
    const deviation = angle < 70 ? (70 - angle) : (angle - 115);
    score = 85 - (deviation * 1.0);
  } else {
    // Poor: <55° or >130° = 0-70 points
    const deviation = angle < 55 ? (55 - angle) : (angle - 130);
    score = Math.max(0, 70 - (deviation * 1.5));
  }
  
  console.log(`Elbow alignment: angle=${angle.toFixed(1)}°, score=${score.toFixed(1)}`);
  
  return Math.round(score);
}

/**
 * Calculate wrist angle score
 * Measures wrist position at release
 * For basketball shooting, wrist should be cocked back (45-75° from vertical)
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
  
  let score: number;
  
  // Range-based scoring for basketball shooting mechanics
  if (angleFromVertical >= 45 && angleFromVertical <= 75) {
    // Perfect range: 45-75° (good wrist cock) = 95-100 points
    const centerDist = Math.abs(angleFromVertical - 60);
    score = 100 - (centerDist * 0.33);
  } else if ((angleFromVertical >= 30 && angleFromVertical < 45) || (angleFromVertical > 75 && angleFromVertical <= 90)) {
    // Good range: 30-45° or 75-90° = 80-95 points
    const deviation = angleFromVertical < 45 ? (45 - angleFromVertical) : (angleFromVertical - 75);
    score = 95 - (deviation * 1.0);
  } else if ((angleFromVertical >= 15 && angleFromVertical < 30) || (angleFromVertical > 90 && angleFromVertical <= 110)) {
    // Acceptable range: 15-30° or 90-110° = 60-80 points
    const deviation = angleFromVertical < 30 ? (30 - angleFromVertical) : (angleFromVertical - 90);
    score = 80 - (deviation * 1.33);
  } else {
    // Poor: <15° or >110° = 0-60 points
    const deviation = angleFromVertical < 15 ? (15 - angleFromVertical) : (angleFromVertical - 110);
    score = Math.max(0, 60 - (deviation * 1.0));
  }
  
  console.log(`Wrist angle: ${angleFromVertical.toFixed(1)}° from vertical, score=${score.toFixed(1)}`);
  
  return Math.round(score);
}

/**
 * Calculate shoulder square score
 * Measures how square the shoulders are to the basket
 * Uses range-based scoring with generous margins
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
  
  let score: number;
  
  // Range-based scoring
  if (angle <= 5) {
    // Perfect: 0-5° = 95-100 points
    score = 100 - (angle * 1.0);
  } else if (angle <= 15) {
    // Good: 5-15° = 80-95 points
    score = 95 - ((angle - 5) * 1.5);
  } else if (angle <= 30) {
    // Acceptable: 15-30° = 60-80 points
    score = 80 - ((angle - 15) * 1.33);
  } else if (angle <= 50) {
    // Poor: 30-50° = 40-60 points
    score = 60 - ((angle - 30) * 1.0);
  } else {
    // Very poor: >50° = 0-40 points
    score = Math.max(0, 40 - ((angle - 50) * 0.8));
  }
  
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
 * Returns both numeric score and letter grade
 */
export function calculateFormScore(biomechanics: BiomechanicalAnalysis): { numeric: number; letter: FormScore } {
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
  let letter: FormScore;
  if (totalScore >= 90) letter = 'A';
  else if (totalScore >= 80) letter = 'B';
  else if (totalScore >= 70) letter = 'C';
  else if (totalScore >= 60) letter = 'D';
  else letter = 'F';
  
  return { numeric: Math.round(totalScore), letter };
}

/**
 * Detect specific form issues from biomechanical analysis
 */
export function detectFormIssuesFromPose(
  biomechanics: BiomechanicalAnalysis,
  phases: ShootingPhases
): FormIssue[] {
  const issues: FormIssue[] = [];
  
  // Check elbow alignment (with generous thresholds)
  if (biomechanics.elbowAlignment < 70) {
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
  } else if (biomechanics.elbowAlignment < 85) {
    issues.push({
      type: 'elbow_flare',
      severity: 'moderate',
      description: 'Your elbow alignment could be better. Try to keep it more vertical.',
      recommendedDrills: [
        'One-hand form shooting',
        'Mirror practice - Watch your elbow position',
      ],
    });
  }
  
  // Check wrist angle (based on proper basketball shooting mechanics)
  if (biomechanics.wristAngle < 60) {
    issues.push({
      type: 'wrist_angle',
      severity: 'moderate',
      description: 'Your wrist position at release needs work. Focus on proper wrist cock and snap.',
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
      description: 'Minor wrist angle adjustment could improve your shot consistency.',
      recommendedDrills: ['Wrist flick drill'],
    });
  }
  
  // Check shoulder square (more generous thresholds)
  if (biomechanics.shoulderSquare < 60) {
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
  } else if (biomechanics.shoulderSquare < 80) {
    issues.push({
      type: 'stance',
      severity: 'minor',
      description: 'Your shoulder alignment could be more square to improve accuracy.',
      recommendedDrills: [
        'Square-up drill before shooting',
      ],
    });
  }
  
  // Check follow-through (more generous)
  if (biomechanics.followThrough < 50) {
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
  } else if (biomechanics.followThrough < 70) {
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
