/**
 * Video Capture Manager
 * Handles camera access, recording, and adaptive quality settings
 */

import { AnalysisTier, ProcessingConfig } from '../types/models';

/**
 * Camera permission status
 */
export type CameraPermissionStatus = 'granted' | 'denied' | 'not_determined';

/**
 * Video quality settings based on analysis tier
 */
export interface VideoQualitySettings {
  resolution: { width: number; height: number };
  frameRate: number;
  bitrate: number;
  codec: string;
}

/**
 * Video recording configuration
 */
export interface RecordingConfig {
  quality: VideoQualitySettings;
  maxDuration: number; // in seconds
  outputPath: string;
}

/**
 * Recording result with metadata
 */
export interface RecordingResult {
  success: boolean;
  videoPath?: string;
  duration?: number;
  error?: string;
  metadata: {
    resolution: string;
    frameRate: number;
    fileSize: number;
  };
}

/**
 * Camera error types
 */
export class CameraError extends Error {
  constructor(
    message: string,
    public code: 'PERMISSION_DENIED' | 'CAMERA_UNAVAILABLE' | 'RECORDING_FAILED' | 'UNKNOWN'
  ) {
    super(message);
    this.name = 'CameraError';
  }
}

/**
 * Request camera permissions from the user
 */
export async function requestCameraPermission(): Promise<CameraPermissionStatus> {
  try {
    // This will use react-native-permissions or expo-camera
    // For MVP, we'll simulate the permission flow
    console.log('Requesting camera permission...');
    
    // In production, use:
    // import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
    // const result = await request(PERMISSIONS.ANDROID.CAMERA);
    
    // Simulate permission grant for development
    return 'granted';
  } catch (error) {
    console.error('Failed to request camera permission:', error);
    return 'denied';
  }
}

/**
 * Check current camera permission status
 */
export async function checkCameraPermission(): Promise<CameraPermissionStatus> {
  try {
    // In production, use:
    // import { check, PERMISSIONS } from 'react-native-permissions';
    // const result = await check(PERMISSIONS.ANDROID.CAMERA);
    
    // Simulate permission check for development
    return 'granted';
  } catch (error) {
    console.error('Failed to check camera permission:', error);
    return 'not_determined';
  }
}

/**
 * Get optimal video quality settings based on processing tier
 */
export function getQualitySettingsForTier(tier: AnalysisTier): VideoQualitySettings {
  switch (tier) {
    case 'cloud':
    case 'full_ml':
      // High quality for advanced analysis
      return {
        resolution: { width: 1920, height: 1080 }, // 1080p
        frameRate: 30,
        bitrate: 5000000, // 5 Mbps
        codec: 'h264',
      };
    
    case 'lightweight_ml':
      // Medium quality for lightweight ML
      return {
        resolution: { width: 1280, height: 720 }, // 720p
        frameRate: 30,
        bitrate: 3000000, // 3 Mbps
        codec: 'h264',
      };
    
    case 'basic':
      // Lower quality for basic rule-based analysis
      return {
        resolution: { width: 854, height: 480 }, // 480p
        frameRate: 24,
        bitrate: 1500000, // 1.5 Mbps
        codec: 'h264',
      };
    
    default:
      // Default to basic quality
      return {
        resolution: { width: 854, height: 480 },
        frameRate: 24,
        bitrate: 1500000,
        codec: 'h264',
      };
  }
}

/**
 * Create recording configuration based on processing config
 */
export function createRecordingConfig(
  processingConfig: ProcessingConfig,
  outputPath: string
): RecordingConfig {
  const quality = getQualitySettingsForTier(processingConfig.selectedTier);
  
  return {
    quality,
    maxDuration: 30, // 30 seconds max for shooting analysis
    outputPath,
  };
}

/**
 * Initialize camera for recording
 * Checks permissions and prepares camera hardware
 */
export async function initializeCamera(): Promise<void> {
  try {
    console.log('Initializing camera...');
    
    // Check permission status
    const permissionStatus = await checkCameraPermission();
    
    if (permissionStatus === 'denied') {
      throw new CameraError(
        'Camera permission denied. Please enable camera access in settings.',
        'PERMISSION_DENIED'
      );
    }
    
    if (permissionStatus === 'not_determined') {
      const requestResult = await requestCameraPermission();
      if (requestResult !== 'granted') {
        throw new CameraError(
          'Camera permission is required to record shooting sessions.',
          'PERMISSION_DENIED'
        );
      }
    }
    
    // In production, initialize camera hardware here
    // This would involve setting up the camera preview and preparing for recording
    
    console.log('Camera initialized successfully');
  } catch (error) {
    if (error instanceof CameraError) {
      throw error;
    }
    throw new CameraError(
      `Failed to initialize camera: ${error}`,
      'CAMERA_UNAVAILABLE'
    );
  }
}

/**
 * Start video recording with specified configuration
 */
export async function startRecording(config: RecordingConfig): Promise<void> {
  try {
    console.log('Starting video recording...', {
      resolution: `${config.quality.resolution.width}x${config.quality.resolution.height}`,
      frameRate: config.quality.frameRate,
      maxDuration: config.maxDuration,
    });
    
    // In production, use react-native-camera or expo-camera:
    // await camera.recordAsync({
    //   quality: config.quality,
    //   maxDuration: config.maxDuration,
    //   videoBitrate: config.quality.bitrate,
    // });
    
    console.log('Recording started successfully');
  } catch (error) {
    throw new CameraError(
      `Failed to start recording: ${error}`,
      'RECORDING_FAILED'
    );
  }
}

/**
 * Stop video recording and return result
 */
export async function stopRecording(): Promise<RecordingResult> {
  try {
    console.log('Stopping video recording...');
    
    // In production, stop the camera recording:
    // const data = await camera.stopRecording();
    
    // Simulate recording result for development
    const mockResult: RecordingResult = {
      success: true,
      videoPath: '/mock/path/to/video.mp4',
      duration: 5.2,
      metadata: {
        resolution: '1280x720',
        frameRate: 30,
        fileSize: 2048000, // 2MB
      },
    };
    
    console.log('Recording stopped successfully', mockResult);
    return mockResult;
  } catch (error) {
    return {
      success: false,
      error: `Failed to stop recording: ${error}`,
      metadata: {
        resolution: '0x0',
        frameRate: 0,
        fileSize: 0,
      },
    };
  }
}

/**
 * Record a complete shooting session
 * Handles the full recording lifecycle with error handling
 */
export async function recordShootingSession(
  processingConfig: ProcessingConfig,
  outputPath: string
): Promise<RecordingResult> {
  try {
    // Initialize camera
    await initializeCamera();
    
    // Create recording configuration
    const recordingConfig = createRecordingConfig(processingConfig, outputPath);
    
    // Start recording
    await startRecording(recordingConfig);
    
    // Note: In production, this would wait for user to stop recording
    // or automatically stop after maxDuration
    // For now, we'll simulate immediate stop for testing
    
    // Stop recording and get result
    const result = await stopRecording();
    
    return result;
  } catch (error) {
    if (error instanceof CameraError) {
      return {
        success: false,
        error: error.message,
        metadata: {
          resolution: '0x0',
          frameRate: 0,
          fileSize: 0,
        },
      };
    }
    
    return {
      success: false,
      error: `Unexpected error during recording: ${error}`,
      metadata: {
        resolution: '0x0',
        frameRate: 0,
        fileSize: 0,
      },
    };
  }
}

/**
 * Validate video file for analysis
 * Checks if video meets minimum requirements
 */
export function validateVideoFile(result: RecordingResult): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  if (!result.success) {
    issues.push('Recording failed');
    return { valid: false, issues };
  }
  
  if (!result.videoPath) {
    issues.push('No video path provided');
  }
  
  if (!result.duration || result.duration < 1) {
    issues.push('Video duration too short (minimum 1 second)');
  }
  
  if (result.duration && result.duration > 30) {
    issues.push('Video duration too long (maximum 30 seconds)');
  }
  
  if (result.metadata.fileSize === 0) {
    issues.push('Video file is empty');
  }
  
  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Compress video for cloud upload
 * Reduces file size while maintaining analysis quality
 */
export async function compressVideoForUpload(
  videoPath: string,
  targetSizeMB: number = 5
): Promise<string> {
  try {
    console.log(`Compressing video for upload: ${videoPath}, target: ${targetSizeMB}MB`);
    
    // In production, use react-native-video-processing or similar:
    // const compressedPath = await VideoProcessing.compress(videoPath, {
    //   width: 1280,
    //   height: 720,
    //   bitrateMultiplier: 0.5,
    // });
    
    // Simulate compression for development
    const compressedPath = videoPath.replace('.mp4', '_compressed.mp4');
    
    console.log(`Video compressed successfully: ${compressedPath}`);
    return compressedPath;
  } catch (error) {
    console.error('Failed to compress video:', error);
    throw new Error(`Video compression failed: ${error}`);
  }
}

/**
 * Clean up temporary video files
 */
export async function cleanupVideoFile(videoPath: string): Promise<void> {
  try {
    console.log(`Cleaning up video file: ${videoPath}`);
    
    // In production, use react-native-fs:
    // const RNFS = require('react-native-fs');
    // await RNFS.unlink(videoPath);
    
    console.log('Video file cleaned up successfully');
  } catch (error) {
    console.error('Failed to cleanup video file:', error);
    // Non-critical error - don't throw
  }
}
