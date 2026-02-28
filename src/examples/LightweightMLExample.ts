/**
 * Lightweight ML Analysis Example
 * Demonstrates how to use the lightweight ML analysis tier
 */

import { performMLAnalysisWithFallback } from '../ml/MLAnalysisIntegration';
import { initializeProcessingConfig, routeVideoAnalysis } from '../utils/AdaptiveProcessingRouter';
import { AnalysisTier, FormAnalysisResult } from '../types/models';

/**
 * Example 1: Basic ML analysis with automatic fallback
 */
export async function example1_BasicMLAnalysis() {
  console.log('\n=== Example 1: Basic ML Analysis ===\n');
  
  const videoPath = 'sample_shooting_video.mp4';
  
  try {
    // Perform analysis with lightweight ML tier
    const result = await performMLAnalysisWithFallback(videoPath, 'lightweight_ml');
    
    console.log('Analysis Result:');
    console.log(`Overall Score: ${result.overallScore}`);
    console.log('\nBiomechanical Metrics:');
    console.log(`  Elbow Alignment: ${result.biomechanicalMetrics.elbowAlignment}/100`);
    console.log(`  Wrist Angle: ${result.biomechanicalMetrics.wristAngle}/100`);
    console.log(`  Shoulder Square: ${result.biomechanicalMetrics.shoulderSquare}/100`);
    console.log(`  Follow Through: ${result.biomechanicalMetrics.followThrough}/100`);
    
    console.log('\nDetected Issues:');
    result.detectedIssues.forEach((issue, idx) => {
      console.log(`  ${idx + 1}. [${issue.severity.toUpperCase()}] ${issue.description}`);
      console.log(`     Recommended Drills:`);
      issue.recommendedDrills.forEach(drill => {
        console.log(`       - ${drill}`);
      });
    });
    
    return result;
  } catch (error) {
    console.error('Analysis failed:', error);
    throw error;
  }
}

/**
 * Example 2: Adaptive processing with device capability detection
 */
export async function example2_AdaptiveProcessing() {
  console.log('\n=== Example 2: Adaptive Processing ===\n');
  
  const videoPath = 'sample_shooting_video.mp4';
  
  // Initialize processing config based on device and user consent
  const config = await initializeProcessingConfig({
    cloudProcessing: false, // User hasn't consented to cloud
    dataSharing: false,
  });
  
  console.log(`Device tier: ${config.deviceCapabilities.tier}`);
  console.log(`Selected analysis tier: ${config.selectedTier}`);
  console.log(`ML framework supported: ${config.deviceCapabilities.mlFrameworkSupported}`);
  
  // Route analysis with automatic fallback
  const result = await routeVideoAnalysis(
    videoPath,
    config,
    async (path: string, tier: AnalysisTier) => {
      return await performMLAnalysisWithFallback(path, tier);
    }
  );
  
  console.log(`\nAnalysis completed with tier: ${result.tier}`);
  console.log(`Processing time: ${result.processingTime}ms`);
  console.log(`Fallback used: ${result.fallbackUsed}`);
  console.log(`Overall score: ${result.data.overallScore}`);
  
  return result;
}

/**
 * Example 3: Comparing basic vs ML analysis
 */
export async function example3_CompareAnalysisTiers() {
  console.log('\n=== Example 3: Compare Analysis Tiers ===\n');
  
  const videoPath = 'sample_shooting_video.mp4';
  
  // Run basic analysis
  console.log('Running basic rule-based analysis...');
  const basicResult = await performMLAnalysisWithFallback(videoPath, 'basic');
  
  // Run lightweight ML analysis
  console.log('Running lightweight ML analysis...');
  const mlResult = await performMLAnalysisWithFallback(videoPath, 'lightweight_ml');
  
  // Compare results
  console.log('\nComparison:');
  console.log(`Basic Score: ${basicResult.overallScore}`);
  console.log(`ML Score: ${mlResult.overallScore}`);
  
  console.log('\nBasic Issues Detected:');
  basicResult.detectedIssues.forEach(issue => {
    console.log(`  - ${issue.type} (${issue.severity})`);
  });
  
  console.log('\nML Issues Detected:');
  mlResult.detectedIssues.forEach(issue => {
    console.log(`  - ${issue.type} (${issue.severity})`);
  });
  
  console.log('\nMetrics Comparison:');
  console.log('                    Basic    ML');
  console.log(`Elbow Alignment:    ${basicResult.biomechanicalMetrics.elbowAlignment}      ${mlResult.biomechanicalMetrics.elbowAlignment}`);
  console.log(`Wrist Angle:        ${basicResult.biomechanicalMetrics.wristAngle}      ${mlResult.biomechanicalMetrics.wristAngle}`);
  console.log(`Shoulder Square:    ${basicResult.biomechanicalMetrics.shoulderSquare}      ${mlResult.biomechanicalMetrics.shoulderSquare}`);
  console.log(`Follow Through:     ${basicResult.biomechanicalMetrics.followThrough}      ${mlResult.biomechanicalMetrics.followThrough}`);
  
  return { basicResult, mlResult };
}

/**
 * Example 4: Handling analysis failures gracefully
 */
export async function example4_GracefulFallback() {
  console.log('\n=== Example 4: Graceful Fallback ===\n');
  
  const videoPath = 'sample_shooting_video.mp4';
  
  // Try to use full ML (not implemented), should fallback
  console.log('Attempting full ML analysis (will fallback)...');
  
  try {
    const result = await performMLAnalysisWithFallback(videoPath, 'full_ml');
    
    console.log('Analysis succeeded with fallback');
    console.log(`Score: ${result.overallScore}`);
    console.log(`Issues detected: ${result.detectedIssues.length}`);
    
    return result;
  } catch (error) {
    console.error('Analysis failed even with fallback:', error);
    throw error;
  }
}

/**
 * Example 5: Processing multiple videos in sequence
 */
export async function example5_BatchProcessing() {
  console.log('\n=== Example 5: Batch Processing ===\n');
  
  const videoPaths = [
    'video1.mp4',
    'video2.mp4',
    'video3.mp4',
  ];
  
  const results: FormAnalysisResult[] = [];
  
  for (const videoPath of videoPaths) {
    console.log(`Processing ${videoPath}...`);
    
    const result = await performMLAnalysisWithFallback(videoPath, 'lightweight_ml');
    results.push(result);
    
    console.log(`  Score: ${result.overallScore}`);
    console.log(`  Issues: ${result.detectedIssues.length}`);
  }
  
  // Calculate average metrics
  const avgElbow = results.reduce((sum, r) => sum + r.biomechanicalMetrics.elbowAlignment, 0) / results.length;
  const avgWrist = results.reduce((sum, r) => sum + r.biomechanicalMetrics.wristAngle, 0) / results.length;
  const avgShoulder = results.reduce((sum, r) => sum + r.biomechanicalMetrics.shoulderSquare, 0) / results.length;
  const avgFollow = results.reduce((sum, r) => sum + r.biomechanicalMetrics.followThrough, 0) / results.length;
  
  console.log('\nAverage Metrics Across All Videos:');
  console.log(`  Elbow Alignment: ${avgElbow.toFixed(1)}/100`);
  console.log(`  Wrist Angle: ${avgWrist.toFixed(1)}/100`);
  console.log(`  Shoulder Square: ${avgShoulder.toFixed(1)}/100`);
  console.log(`  Follow Through: ${avgFollow.toFixed(1)}/100`);
  
  return results;
}

/**
 * Example 6: Real-time feedback generation
 */
export async function example6_RealtimeFeedback() {
  console.log('\n=== Example 6: Real-time Feedback ===\n');
  
  const videoPath = 'sample_shooting_video.mp4';
  
  console.log('Analyzing shooting form...');
  const startTime = Date.now();
  
  const result = await performMLAnalysisWithFallback(videoPath, 'lightweight_ml');
  
  const processingTime = Date.now() - startTime;
  console.log(`Analysis completed in ${processingTime}ms`);
  
  // Generate user-friendly feedback
  console.log('\n--- SHOOTING FORM ANALYSIS ---');
  console.log(`\nOverall Grade: ${result.overallScore}`);
  
  if (result.overallScore === 'A') {
    console.log('Excellent form! Keep up the great work.');
  } else if (result.overallScore === 'B') {
    console.log('Good form with room for minor improvements.');
  } else if (result.overallScore === 'C') {
    console.log('Decent form. Focus on the areas below to improve.');
  } else {
    console.log('Your form needs work. Practice the recommended drills.');
  }
  
  console.log('\n--- KEY METRICS ---');
  const metrics = result.biomechanicalMetrics;
  
  const formatMetric = (name: string, value: number) => {
    const bar = '█'.repeat(Math.floor(value / 10)) + '░'.repeat(10 - Math.floor(value / 10));
    return `${name.padEnd(20)} [${bar}] ${value}/100`;
  };
  
  console.log(formatMetric('Elbow Alignment', metrics.elbowAlignment));
  console.log(formatMetric('Wrist Angle', metrics.wristAngle));
  console.log(formatMetric('Shoulder Square', metrics.shoulderSquare));
  console.log(formatMetric('Follow Through', metrics.followThrough));
  
  if (result.detectedIssues.length > 0) {
    console.log('\n--- AREAS TO IMPROVE ---');
    result.detectedIssues.forEach((issue, idx) => {
      console.log(`\n${idx + 1}. ${issue.description}`);
      console.log('   Recommended drills:');
      issue.recommendedDrills.slice(0, 2).forEach(drill => {
        console.log(`   • ${drill}`);
      });
    });
  }
  
  console.log('\n--- END OF ANALYSIS ---\n');
  
  return result;
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  try {
    await example1_BasicMLAnalysis();
    await example2_AdaptiveProcessing();
    await example3_CompareAnalysisTiers();
    await example4_GracefulFallback();
    await example5_BatchProcessing();
    await example6_RealtimeFeedback();
    
    console.log('\n✓ All examples completed successfully!\n');
  } catch (error) {
    console.error('\n✗ Example execution failed:', error);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples();
}
