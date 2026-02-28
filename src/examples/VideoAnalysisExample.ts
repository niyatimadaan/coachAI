/**
 * Video Analysis Example
 * Demonstrates how to use the video capture and analysis system
 */

import { initializeProcessingConfig } from '../utils/AdaptiveProcessingRouter';
import { recordAndAnalyzeSession, analyzeExistingVideo } from '../video/VideoAnalysisIntegration';
import {
  initializeCamera,
  requestCameraPermission,
  CameraError,
} from '../video/VideoCaptureManager';
import DatabaseManager from '../database/DatabaseManager';

/**
 * Example 1: Complete shooting session workflow
 * Records video and analyzes it with adaptive processing
 */
export async function exampleCompleteSession() {
  console.log('\n=== Example 1: Complete Shooting Session ===\n');
  
  try {
    // Step 1: Request camera permission
    console.log('Requesting camera permission...');
    const permission = await requestCameraPermission();
    
    if (permission !== 'granted') {
      console.error('Camera permission denied');
      return;
    }
    
    // Step 2: Initialize camera
    console.log('Initializing camera...');
    await initializeCamera();
    
    // Step 3: Initialize processing configuration
    console.log('Initializing processing configuration...');
    const processingConfig = await initializeProcessingConfig({
      cloudProcessing: false, // Offline-first for this example
      dataSharing: false,
    });
    
    console.log(`Selected processing tier: ${processingConfig.selectedTier}`);
    console.log(`Device tier: ${processingConfig.deviceCapabilities.tier}`);
    
    // Step 4: Record and analyze session
    console.log('Recording and analyzing shooting session...');
    const userId = 'user_123';
    const outputPath = '/tmp/shooting_session.mp4';
    
    const result = await recordAndAnalyzeSession(
      userId,
      processingConfig,
      outputPath
    );
    
    // Step 5: Display results
    if (result.success && result.session) {
      console.log('\n✓ Session completed successfully!');
      console.log(`Session ID: ${result.session.id}`);
      console.log(`Form Score: ${result.session.formScore}`);
      console.log(`Processing Tier: ${result.processingDetails.tier}`);
      console.log(`Processing Time: ${result.processingDetails.processingTime}ms`);
      console.log(`Fallback Used: ${result.processingDetails.fallbackUsed}`);
      
      console.log('\nDetected Issues:');
      result.session.detectedIssues.forEach((issue, index) => {
        console.log(`  ${index + 1}. [${issue.severity}] ${issue.description}`);
        console.log(`     Drills: ${issue.recommendedDrills.join(', ')}`);
      });
      
      console.log('\nBiomechanical Metrics:');
      const metrics = result.session.formAnalysis.biomechanicalMetrics;
      console.log(`  Elbow Alignment: ${metrics.elbowAlignment}/100`);
      console.log(`  Wrist Angle: ${metrics.wristAngle}/100`);
      console.log(`  Shoulder Square: ${metrics.shoulderSquare}/100`);
      console.log(`  Follow Through: ${metrics.followThrough}/100`);
      
      // Step 6: Save to database
      console.log('\nSaving session to database...');
      // Note: In production, implement a saveShootingSession method in DatabaseManager
      // For now, we'll just log that it would be saved
      console.log('✓ Session would be saved to database (method not yet implemented)');
    } else {
      console.error('✗ Session failed:', result.error);
    }
  } catch (error) {
    if (error instanceof CameraError) {
      console.error(`Camera error [${error.code}]:`, error.message);
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

/**
 * Example 2: Analyze existing video file
 * Useful for batch processing or re-analysis
 */
export async function exampleAnalyzeExisting() {
  console.log('\n=== Example 2: Analyze Existing Video ===\n');
  
  try {
    // Initialize processing configuration
    const processingConfig = await initializeProcessingConfig({
      cloudProcessing: false,
      dataSharing: false,
    });
    
    // Analyze existing video
    const videoPath = '/path/to/existing/video.mp4';
    console.log(`Analyzing video: ${videoPath}`);
    
    const result = await analyzeExistingVideo(videoPath, processingConfig);
    
    console.log('\n✓ Analysis completed!');
    console.log(`Processing Tier: ${result.tier}`);
    console.log(`Processing Time: ${result.processingTime}ms`);
    console.log(`Form Score: ${result.data.overallScore}`);
    console.log(`Issues Detected: ${result.data.detectedIssues.length}`);
  } catch (error) {
    console.error('Analysis failed:', error);
  }
}

/**
 * Example 3: Adaptive processing demonstration
 * Shows how the system adapts to different device capabilities
 */
export async function exampleAdaptiveProcessing() {
  console.log('\n=== Example 3: Adaptive Processing ===\n');
  
  try {
    // Test with different consent settings
    const scenarios = [
      {
        name: 'Offline Only',
        consent: { cloudProcessing: false, dataSharing: false },
      },
      {
        name: 'Cloud Enabled',
        consent: { cloudProcessing: true, dataSharing: false },
      },
      {
        name: 'Full Consent',
        consent: { cloudProcessing: true, dataSharing: true },
      },
    ];
    
    for (const scenario of scenarios) {
      console.log(`\nScenario: ${scenario.name}`);
      const config = await initializeProcessingConfig(scenario.consent);
      
      console.log(`  Device Tier: ${config.deviceCapabilities.tier}`);
      console.log(`  Selected Processing: ${config.selectedTier}`);
      console.log(`  ML Framework: ${config.deviceCapabilities.mlFrameworkSupported ? 'Yes' : 'No'}`);
      console.log(`  Connectivity: ${config.hasConnectivity ? 'Yes' : 'No'}`);
      console.log(`  Benchmark Score: ${config.deviceCapabilities.benchmarkScore}/100`);
    }
  } catch (error) {
    console.error('Adaptive processing demo failed:', error);
  }
}

/**
 * Example 4: Error handling demonstration
 * Shows how the system handles various error scenarios
 */
export async function exampleErrorHandling() {
  console.log('\n=== Example 4: Error Handling ===\n');
  
  try {
    // Simulate camera permission denied
    console.log('Test 1: Camera permission denied');
    try {
      await initializeCamera();
      console.log('  ✓ Camera initialized (permission granted)');
    } catch (error) {
      if (error instanceof CameraError) {
        console.log(`  ✗ Expected error: ${error.message}`);
      }
    }
    
    // Simulate invalid video file
    console.log('\nTest 2: Invalid video file');
    const processingConfig = await initializeProcessingConfig({
      cloudProcessing: false,
      dataSharing: false,
    });
    
    try {
      await analyzeExistingVideo('/invalid/path.mp4', processingConfig);
      console.log('  ✓ Analysis succeeded');
    } catch (error) {
      console.log(`  ✗ Expected error: ${error}`);
    }
    
    console.log('\n✓ Error handling tests completed');
  } catch (error) {
    console.error('Error handling demo failed:', error);
  }
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║  CoachAI Video Analysis Examples          ║');
  console.log('╚════════════════════════════════════════════╝');
  
  await exampleCompleteSession();
  await exampleAnalyzeExisting();
  await exampleAdaptiveProcessing();
  await exampleErrorHandling();
  
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║  All examples completed!                   ║');
  console.log('╚════════════════════════════════════════════╝\n');
}

// Export for use in other modules
export default {
  exampleCompleteSession,
  exampleAnalyzeExisting,
  exampleAdaptiveProcessing,
  exampleErrorHandling,
  runAllExamples,
};
