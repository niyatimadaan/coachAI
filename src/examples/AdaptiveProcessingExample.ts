/**
 * Example usage of Device Capability Detection and Adaptive Processing Router
 * This demonstrates how the two systems work together
 */

import { detectDeviceCapabilities } from '../utils/DeviceCapabilityDetector';
import {
  initializeProcessingConfig,
  routeVideoAnalysis,
  checkConnectivity,
  updateConfigForConnectivity,
} from '../utils/AdaptiveProcessingRouter';
import { AnalysisTier, FormAnalysisResult } from '../types/models';

/**
 * Example: Initialize the app with device detection and processing configuration
 */
export async function initializeApp() {
  console.log('=== Initializing CoachAI ===');
  
  // Step 1: Detect device capabilities
  console.log('Detecting device capabilities...');
  const capabilities = await detectDeviceCapabilities();
  console.log('Device tier:', capabilities.tier);
  console.log('RAM:', capabilities.availableRAM, 'MB');
  console.log('CPU cores:', capabilities.cpuCores);
  console.log('ML framework supported:', capabilities.mlFrameworkSupported);
  console.log('Benchmark score:', capabilities.benchmarkScore);
  
  // Step 2: Initialize processing configuration
  console.log('\nInitializing processing configuration...');
  const userConsent = {
    cloudProcessing: true, // User has consented to cloud processing
    dataSharing: false,
  };
  
  const config = await initializeProcessingConfig(userConsent);
  console.log('Selected processing tier:', config.selectedTier);
  console.log('Has connectivity:', config.hasConnectivity);
  
  return config;
}

/**
 * Example: Process a shooting video with adaptive routing
 */
export async function processShootingVideo(videoPath: string) {
  console.log('\n=== Processing Shooting Video ===');
  console.log('Video path:', videoPath);
  
  // Get current processing configuration
  const config = await initializeProcessingConfig({
    cloudProcessing: true,
    dataSharing: false,
  });
  
  // Mock analysis function that would normally call the actual ML/analysis code
  const mockAnalysisFunction = async (
    path: string,
    tier: AnalysisTier
  ): Promise<FormAnalysisResult> => {
    console.log(`Analyzing video with tier: ${tier}`);
    
    // Simulate processing time based on tier
    const processingTimes = {
      basic: 1500,
      lightweight_ml: 3000,
      full_ml: 4500,
      cloud: 2000,
    };
    
    await new Promise(resolve => setTimeout(resolve, processingTimes[tier]));
    
    // Return mock analysis result
    return {
      overallScore: 'B',
      detectedIssues: [
        {
          type: 'elbow_flare',
          severity: 'moderate',
          description: 'Elbow is flaring out during shot release',
          recommendedDrills: ['Wall shooting drill', 'Close-range form shots'],
        },
      ],
      biomechanicalMetrics: {
        elbowAlignment: 75,
        wristAngle: 85,
        shoulderSquare: 90,
        followThrough: 80,
      },
    };
  };
  
  // Route the analysis with automatic fallback handling
  try {
    const result = await routeVideoAnalysis(
      videoPath,
      config,
      mockAnalysisFunction
    );
    
    console.log('\n=== Analysis Complete ===');
    console.log('Processing tier used:', result.tier);
    console.log('Processing time:', result.processingTime, 'ms');
    console.log('Fallback used:', result.fallbackUsed);
    console.log('Form score:', result.data.overallScore);
    console.log('Issues detected:', result.data.detectedIssues.length);
    
    return result;
  } catch (error) {
    console.error('Video analysis failed:', error);
    throw error;
  }
}

/**
 * Example: Handle connectivity changes during app usage
 */
export async function handleConnectivityChange() {
  console.log('\n=== Handling Connectivity Change ===');
  
  // Get current config
  let config = await initializeProcessingConfig({
    cloudProcessing: true,
    dataSharing: false,
  });
  
  console.log('Initial tier:', config.selectedTier);
  
  // Simulate connectivity loss
  console.log('\nConnectivity lost...');
  const offlineConnectivity = {
    isConnected: false,
    connectionType: 'none' as const,
    isMetered: false,
  };
  
  config = updateConfigForConnectivity(config, offlineConnectivity);
  console.log('Updated tier (offline):', config.selectedTier);
  
  // Simulate connectivity restoration
  console.log('\nConnectivity restored (WiFi)...');
  const onlineConnectivity = {
    isConnected: true,
    connectionType: 'wifi' as const,
    isMetered: false,
  };
  
  config = updateConfigForConnectivity(config, onlineConnectivity);
  console.log('Updated tier (online):', config.selectedTier);
  
  return config;
}

/**
 * Example: Complete workflow from app start to video analysis
 */
export async function completeWorkflowExample() {
  console.log('=== CoachAI Complete Workflow Example ===\n');
  
  try {
    // 1. Initialize app
    const config = await initializeApp();
    
    // 2. Process a video
    await processShootingVideo('/path/to/shooting-video.mp4');
    
    // 3. Handle connectivity changes
    await handleConnectivityChange();
    
    console.log('\n=== Workflow Complete ===');
  } catch (error) {
    console.error('Workflow failed:', error);
  }
}

// Export for use in app
export default {
  initializeApp,
  processShootingVideo,
  handleConnectivityChange,
  completeWorkflowExample,
};
