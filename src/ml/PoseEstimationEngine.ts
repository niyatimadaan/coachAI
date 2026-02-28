/**
 * Pose Estimation Engine
 * Handles TensorFlow Lite pose estimation for lightweight ML analysis
 * Provides keypoint detection for major joints using quantized models
 */

import { PoseLandmark, PoseEstimationResult } from '../types/models';
import { loadMLModel, runInference, ML_MODELS } from './TensorFlowConfig';

/**
 * Major joint keypoints for basketball shooting analysis
 * Subset of full pose estimation focused on upper body
 */
export enum MajorJoint {
  NOSE = 0,
  LEFT_SHOULDER = 5,
  RIGHT_SHOULDER = 6,
  LEFT_ELBOW = 7,
  RIGHT_ELBOW = 8,
  LEFT_WRIST = 9,
  RIGHT_WRIST = 10,
  LEFT_HIP = 11,
  RIGHT_HIP = 12,
  LEFT_KNEE = 13,
  RIGHT_KNEE = 14,
  LEFT_ANKLE = 15,
  RIGHT_ANKLE = 16,
}

/**
 * Keypoint detection result for a single frame
 */
export interface KeypointFrame {
  keypoints: Map<MajorJoint, PoseLandmark>;
  timestamp: number;
  confidence: number;
}

/**
 * Video frame data for pose estimation
 */
export interface VideoFrame {
  imageData: number[]; // Flattened RGB array
  width: number;
  height: number;
  timestamp: number;
}

/**
 * Load quantized pose estimation model for lightweight ML
 */
export async function loadPoseEstimationModel(): Promise<any> {
  try {
    console.log('Loading lightweight pose estimation model...');
    const model = await loadMLModel('lightweight_ml');
    console.log('Pose estimation model loaded successfully');
    return model;
  } catch (error) {
    console.error('Failed to load pose estimation model:', error);
    throw new Error(`Model loading failed: ${error}`);
  }
}

/**
 * Preprocess video frame for model input
 * Resize and normalize image data to match model input shape
 */
export function preprocessFrame(frame: VideoFrame): number[] {
  const modelConfig = ML_MODELS.lightweight_ml;
  if (!modelConfig) {
    throw new Error('Lightweight ML model config not found');
  }

  const [, targetHeight, targetWidth, channels] = modelConfig.inputShape;
  
  console.log(`Preprocessing frame: ${frame.width}x${frame.height} -> ${targetWidth}x${targetHeight}`);
  
  // In production, this would:
  // 1. Resize image to model input size (192x192)
  // 2. Normalize pixel values to [0, 1] or [-1, 1]
  // 3. Convert to model's expected format
  
  // For MVP, simulate preprocessing
  const processedData = new Array(targetHeight * targetWidth * channels).fill(0);
  
  // Simple bilinear resize simulation
  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const srcX = Math.floor((x / targetWidth) * frame.width);
      const srcY = Math.floor((y / targetHeight) * frame.height);
      const srcIdx = (srcY * frame.width + srcX) * channels;
      const dstIdx = (y * targetWidth + x) * channels;
      
      for (let c = 0; c < channels; c++) {
        if (srcIdx + c < frame.imageData.length) {
          // Normalize to [0, 1]
          processedData[dstIdx + c] = frame.imageData[srcIdx + c] / 255.0;
        }
      }
    }
  }
  
  return processedData;
}

/**
 * Run pose estimation inference on preprocessed frame
 */
export async function detectKeypoints(
  model: any,
  frame: VideoFrame
): Promise<KeypointFrame> {
  try {
    // Preprocess frame
    const inputData = preprocessFrame(frame);
    
    // Run inference
    const output = await runInference(model, inputData);
    
    // Parse output to keypoints
    const keypoints = parseModelOutput(output, frame.timestamp);
    
    return keypoints;
  } catch (error) {
    console.error('Keypoint detection failed:', error);
    throw new Error(`Keypoint detection failed: ${error}`);
  }
}

/**
 * Parse model output into keypoint structure
 * Lightweight model outputs 17 keypoints with x, y, confidence
 */
export function parseModelOutput(
  output: number[][],
  timestamp: number
): KeypointFrame {
  const keypoints = new Map<MajorJoint, PoseLandmark>();
  
  // In production, parse actual model output
  // For MVP, simulate keypoint detection with realistic values
  const joints = [
    MajorJoint.NOSE,
    MajorJoint.LEFT_SHOULDER,
    MajorJoint.RIGHT_SHOULDER,
    MajorJoint.LEFT_ELBOW,
    MajorJoint.RIGHT_ELBOW,
    MajorJoint.LEFT_WRIST,
    MajorJoint.RIGHT_WRIST,
    MajorJoint.LEFT_HIP,
    MajorJoint.RIGHT_HIP,
    MajorJoint.LEFT_KNEE,
    MajorJoint.RIGHT_KNEE,
    MajorJoint.LEFT_ANKLE,
    MajorJoint.RIGHT_ANKLE,
  ];
  
  let totalConfidence = 0;
  
  joints.forEach((joint, idx) => {
    // Simulate realistic keypoint positions
    const x = 0.3 + Math.random() * 0.4; // Center region
    const y = 0.2 + (idx / joints.length) * 0.6; // Vertical distribution
    const z = (Math.random() - 0.5) * 0.2; // Depth variation
    const visibility = 0.7 + Math.random() * 0.3; // High confidence
    
    keypoints.set(joint, { x, y, z, visibility });
    totalConfidence += visibility;
  });
  
  const avgConfidence = totalConfidence / joints.length;
  
  return {
    keypoints,
    timestamp,
    confidence: avgConfidence,
  };
}

/**
 * Extract video frames for pose estimation
 * Samples frames at appropriate intervals for analysis
 */
export async function extractVideoFrames(
  videoPath: string,
  frameRate: number = 10
): Promise<VideoFrame[]> {
  try {
    console.log(`Extracting frames from video: ${videoPath} at ${frameRate} fps`);
    
    // In production, this would:
    // 1. Use FFmpeg or native video decoder
    // 2. Extract frames at specified rate
    // 3. Convert to RGB format
    
    // For MVP, simulate frame extraction
    const duration = 2000; // 2 seconds
    const frameCount = Math.floor((duration / 1000) * frameRate);
    const frames: VideoFrame[] = [];
    
    for (let i = 0; i < frameCount; i++) {
      const timestamp = (i / frameRate) * 1000;
      
      // Simulate 192x192 RGB frame
      const width = 192;
      const height = 192;
      const imageData = new Array(width * height * 3).fill(0).map(() => 
        Math.floor(Math.random() * 256)
      );
      
      frames.push({
        imageData,
        width,
        height,
        timestamp,
      });
    }
    
    console.log(`Extracted ${frames.length} frames`);
    return frames;
  } catch (error) {
    console.error('Frame extraction failed:', error);
    throw new Error(`Frame extraction failed: ${error}`);
  }
}

/**
 * Process entire video for pose estimation
 * Returns keypoints for all frames
 */
export async function processVideoForPose(
  videoPath: string,
  model: any
): Promise<KeypointFrame[]> {
  try {
    console.log(`Processing video for pose estimation: ${videoPath}`);
    const startTime = Date.now();
    
    // Extract frames
    const frames = await extractVideoFrames(videoPath);
    
    // Process each frame
    const keypointFrames: KeypointFrame[] = [];
    
    for (const frame of frames) {
      const keypoints = await detectKeypoints(model, frame);
      keypointFrames.push(keypoints);
    }
    
    const processingTime = Date.now() - startTime;
    console.log(`Pose estimation completed in ${processingTime}ms for ${keypointFrames.length} frames`);
    
    return keypointFrames;
  } catch (error) {
    console.error('Video pose processing failed:', error);
    throw new Error(`Video pose processing failed: ${error}`);
  }
}

/**
 * Handle model loading failures with graceful fallback
 * Returns null if model cannot be loaded, allowing fallback to basic analysis
 */
export async function loadPoseModelWithFallback(): Promise<any | null> {
  try {
    const model = await loadPoseEstimationModel();
    return model;
  } catch (error) {
    console.warn('Pose model loading failed, will fallback to basic analysis:', error);
    return null;
  }
}

/**
 * Validate keypoint detection quality
 * Ensures detected keypoints meet minimum confidence threshold
 */
export function validateKeypointQuality(
  keypointFrame: KeypointFrame,
  minConfidence: number = 0.5
): boolean {
  if (keypointFrame.confidence < minConfidence) {
    console.warn(`Low keypoint confidence: ${keypointFrame.confidence}`);
    return false;
  }
  
  // Check that critical joints are detected
  const criticalJoints = [
    MajorJoint.LEFT_SHOULDER,
    MajorJoint.RIGHT_SHOULDER,
    MajorJoint.LEFT_ELBOW,
    MajorJoint.RIGHT_ELBOW,
    MajorJoint.LEFT_WRIST,
    MajorJoint.RIGHT_WRIST,
  ];
  
  for (const joint of criticalJoints) {
    const keypoint = keypointFrame.keypoints.get(joint);
    if (!keypoint || keypoint.visibility < minConfidence) {
      console.warn(`Critical joint ${joint} not detected or low visibility`);
      return false;
    }
  }
  
  return true;
}

/**
 * Get shooting hand keypoints (right-handed shooter)
 * Returns wrist, elbow, and shoulder for shooting arm
 */
export function getShootingArmKeypoints(
  keypointFrame: KeypointFrame,
  isLeftHanded: boolean = false
): {
  wrist: PoseLandmark;
  elbow: PoseLandmark;
  shoulder: PoseLandmark;
} | null {
  const wristJoint = isLeftHanded ? MajorJoint.LEFT_WRIST : MajorJoint.RIGHT_WRIST;
  const elbowJoint = isLeftHanded ? MajorJoint.LEFT_ELBOW : MajorJoint.RIGHT_ELBOW;
  const shoulderJoint = isLeftHanded ? MajorJoint.LEFT_SHOULDER : MajorJoint.RIGHT_SHOULDER;
  
  const wrist = keypointFrame.keypoints.get(wristJoint);
  const elbow = keypointFrame.keypoints.get(elbowJoint);
  const shoulder = keypointFrame.keypoints.get(shoulderJoint);
  
  if (!wrist || !elbow || !shoulder) {
    console.warn('Shooting arm keypoints not fully detected');
    return null;
  }
  
  return { wrist, elbow, shoulder };
}

/**
 * Calculate angle between three keypoints
 * Used for biomechanical analysis
 */
export function calculateJointAngle(
  point1: PoseLandmark,
  point2: PoseLandmark,
  point3: PoseLandmark
): number {
  // Vector from point2 to point1
  const v1x = point1.x - point2.x;
  const v1y = point1.y - point2.y;
  
  // Vector from point2 to point3
  const v2x = point3.x - point2.x;
  const v2y = point3.y - point2.y;
  
  // Calculate angle using dot product
  const dotProduct = v1x * v2x + v1y * v2y;
  const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
  const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);
  
  if (mag1 === 0 || mag2 === 0) {
    return 0;
  }
  
  const cosAngle = dotProduct / (mag1 * mag2);
  const angleRad = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
  const angleDeg = (angleRad * 180) / Math.PI;
  
  return angleDeg;
}
