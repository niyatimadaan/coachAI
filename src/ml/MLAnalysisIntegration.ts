/**
 * ML Analysis Integration
 * Integrates lightweight ML analysis with the adaptive processing router
 * Provides unified interface for ML-based form analysis
 */

import { FormAnalysisResult, AnalysisTier } from '../types/models';
import { performLightweightMLAnalysis } from './LightweightFormAnalyzer';
import { performBasicAnalysis } from '../analysis/BasicAnalysisEngine';
import { loadMLModelWithFallback } from './TensorFlowConfig';

/**
 * Perform ML-based analysis with automatic fallback
 * Attempts lightweight ML analysis, falls back to basic if ML fails
 */
export async function performMLAnalysisWithFallback(
  videoPath: string,
  tier: AnalysisTier
): Promise<FormAnalysisResult> {
  console.log(`Performing ML analysis with tier: ${tier}`);
  
  // For lightweight_ml tier, try ML analysis with fallback
  if (tier === 'lightweight_ml') {
    try {
      const result = await performLightweightMLAnalysis(videoPath);
      console.log('Lightweight ML analysis succeeded');
      return result;
    } catch (error) {
      console.warn('Lightweight ML analysis failed, falling back to basic:', error);
      return await performBasicAnalysis(videoPath);
    }
  }
  
  // For full_ml tier (not yet implemented), fall back to lightweight or basic
  if (tier === 'full_ml') {
    console.log('Full ML not yet implemented, falling back to lightweight ML');
    try {
      const result = await performLightweightMLAnalysis(videoPath);
      return result;
    } catch (error) {
      console.warn('Lightweight ML fallback failed, using basic:', error);
      return await performBasicAnalysis(videoPath);
    }
  }
  
  // For cloud tier (not yet implemented), fall back to local ML
  if (tier === 'cloud') {
    console.log('Cloud processing not yet implemented, falling back to local ML');
    try {
      const result = await performLightweightMLAnalysis(videoPath);
      return result;
    } catch (error) {
      console.warn('Local ML fallback failed, using basic:', error);
      return await performBasicAnalysis(videoPath);
    }
  }
  
  // For basic tier, use basic analysis
  return await performBasicAnalysis(videoPath);
}

/**
 * Check if ML analysis is available for the given tier
 */
export async function isMLAnalysisAvailable(tier: AnalysisTier): Promise<boolean> {
  if (tier === 'basic') {
    return true; // Basic analysis always available
  }
  
  if (tier === 'lightweight_ml' || tier === 'full_ml') {
    try {
      const model = await loadMLModelWithFallback(tier);
      return model !== null;
    } catch (error) {
      console.warn(`ML availability check failed for tier ${tier}:`, error);
      return false;
    }
  }
  
  if (tier === 'cloud') {
    // Cloud availability would check network connectivity
    // For MVP, return false as cloud is not yet implemented
    return false;
  }
  
  return false;
}

/**
 * Get recommended analysis tier based on ML availability
 */
export async function getRecommendedAnalysisTier(
  preferredTier: AnalysisTier
): Promise<AnalysisTier> {
  // Check if preferred tier is available
  const isAvailable = await isMLAnalysisAvailable(preferredTier);
  
  if (isAvailable) {
    return preferredTier;
  }
  
  // Fall back through tiers
  if (preferredTier === 'cloud' || preferredTier === 'full_ml') {
    const lightweightAvailable = await isMLAnalysisAvailable('lightweight_ml');
    if (lightweightAvailable) {
      console.log(`Falling back from ${preferredTier} to lightweight_ml`);
      return 'lightweight_ml';
    }
  }
  
  // Final fallback to basic
  console.log(`Falling back to basic analysis`);
  return 'basic';
}

/**
 * Validate that analysis tier is appropriate for video
 * Checks video quality and device capabilities
 */
export function validateAnalysisTierForVideo(
  tier: AnalysisTier,
  videoMetadata: {
    resolution: string;
    frameRate: number;
    duration: number;
  }
): { valid: boolean; reason?: string } {
  // Basic analysis works with any video
  if (tier === 'basic') {
    return { valid: true };
  }
  
  // ML analysis requires minimum video quality
  if (tier === 'lightweight_ml' || tier === 'full_ml') {
    // Check minimum resolution (should be at least 480p)
    const [width, height] = videoMetadata.resolution.split('x').map(Number);
    if (width < 640 || height < 480) {
      return {
        valid: false,
        reason: 'Video resolution too low for ML analysis (minimum 640x480)',
      };
    }
    
    // Check minimum frame rate
    if (videoMetadata.frameRate < 15) {
      return {
        valid: false,
        reason: 'Video frame rate too low for ML analysis (minimum 15 fps)',
      };
    }
    
    // Check video duration (should be 1-10 seconds)
    if (videoMetadata.duration < 1000 || videoMetadata.duration > 10000) {
      return {
        valid: false,
        reason: 'Video duration should be between 1-10 seconds',
      };
    }
  }
  
  return { valid: true };
}

/**
 * Estimate processing time for analysis tier
 */
export function estimateProcessingTime(
  tier: AnalysisTier,
  videoMetadata: {
    resolution: string;
    frameRate: number;
    duration: number;
  }
): number {
  const durationSeconds = videoMetadata.duration / 1000;
  
  switch (tier) {
    case 'basic':
      // Basic analysis: ~1 second regardless of video length
      return 1000;
    
    case 'lightweight_ml':
      // Lightweight ML: ~2-3 seconds for typical video
      return 2000 + (durationSeconds * 500);
    
    case 'full_ml':
      // Full ML: ~4-5 seconds for typical video
      return 4000 + (durationSeconds * 1000);
    
    case 'cloud':
      // Cloud: depends on network, estimate 3-8 seconds
      return 5000;
    
    default:
      return 2000;
  }
}

/**
 * Compare analysis results from different tiers
 * Useful for validation and testing
 */
export interface AnalysisComparison {
  tier1: AnalysisTier;
  tier2: AnalysisTier;
  scoreDifference: number;
  issueOverlap: number;
  metricsCorrelation: number;
}

export function compareAnalysisResults(
  result1: FormAnalysisResult,
  tier1: AnalysisTier,
  result2: FormAnalysisResult,
  tier2: AnalysisTier
): AnalysisComparison {
  // Convert letter grades to numeric for comparison
  const gradeToNumber = (grade: string): number => {
    const grades: Record<string, number> = { A: 95, B: 85, C: 75, D: 65, F: 50 };
    return grades[grade] || 0;
  };
  
  const score1 = gradeToNumber(result1.overallScore);
  const score2 = gradeToNumber(result2.overallScore);
  const scoreDifference = Math.abs(score1 - score2);
  
  // Calculate issue overlap
  const issues1 = new Set(result1.detectedIssues.map(i => i.type));
  const issues2 = new Set(result2.detectedIssues.map(i => i.type));
  const overlap = [...issues1].filter(i => issues2.has(i)).length;
  const issueOverlap = overlap / Math.max(issues1.size, issues2.size, 1);
  
  // Calculate metrics correlation
  const m1 = result1.biomechanicalMetrics;
  const m2 = result2.biomechanicalMetrics;
  const avgDiff = (
    Math.abs(m1.elbowAlignment - m2.elbowAlignment) +
    Math.abs(m1.wristAngle - m2.wristAngle) +
    Math.abs(m1.shoulderSquare - m2.shoulderSquare) +
    Math.abs(m1.followThrough - m2.followThrough)
  ) / 4;
  const metricsCorrelation = Math.max(0, 100 - avgDiff) / 100;
  
  return {
    tier1,
    tier2,
    scoreDifference,
    issueOverlap,
    metricsCorrelation,
  };
}
