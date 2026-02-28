/**
 * Integration tests for ML Analysis
 * Tests the complete ML analysis pipeline with adaptive routing
 */

import {
  performMLAnalysisWithFallback,
  isMLAnalysisAvailable,
  getRecommendedAnalysisTier,
  validateAnalysisTierForVideo,
  estimateProcessingTime,
  compareAnalysisResults,
} from '../MLAnalysisIntegration';
import { AnalysisTier, FormScore } from '../../types/models';

describe('MLAnalysisIntegration', () => {
  const testVideoPath = 'test_video.mp4';

  describe('performMLAnalysisWithFallback', () => {
    it('should perform basic analysis successfully', async () => {
      const result = await performMLAnalysisWithFallback(testVideoPath, 'basic');
      
      expect(result).toBeDefined();
      expect(result.overallScore).toMatch(/^[A-F]$/);
      expect(result.biomechanicalMetrics).toBeDefined();
      expect(result.detectedIssues).toBeDefined();
    });

    it('should attempt lightweight ML and fallback to basic if needed', async () => {
      const result = await performMLAnalysisWithFallback(testVideoPath, 'lightweight_ml');
      
      expect(result).toBeDefined();
      expect(result.overallScore).toMatch(/^[A-F]$/);
      expect(result.biomechanicalMetrics).toBeDefined();
    });

    it('should return valid biomechanical metrics', async () => {
      const result = await performMLAnalysisWithFallback(testVideoPath, 'basic');
      
      const metrics = result.biomechanicalMetrics;
      expect(metrics.elbowAlignment).toBeGreaterThanOrEqual(0);
      expect(metrics.elbowAlignment).toBeLessThanOrEqual(100);
      expect(metrics.wristAngle).toBeGreaterThanOrEqual(0);
      expect(metrics.wristAngle).toBeLessThanOrEqual(100);
      expect(metrics.shoulderSquare).toBeGreaterThanOrEqual(0);
      expect(metrics.shoulderSquare).toBeLessThanOrEqual(100);
      expect(metrics.followThrough).toBeGreaterThanOrEqual(0);
      expect(metrics.followThrough).toBeLessThanOrEqual(100);
    });

    it('should detect form issues when present', async () => {
      const result = await performMLAnalysisWithFallback(testVideoPath, 'basic');
      
      // Issues array should be defined (may be empty for perfect form)
      expect(result.detectedIssues).toBeDefined();
      expect(Array.isArray(result.detectedIssues)).toBe(true);
      
      // If issues are detected, they should have proper structure
      if (result.detectedIssues.length > 0) {
        expect(result.detectedIssues[0]).toHaveProperty('type');
        expect(result.detectedIssues[0]).toHaveProperty('severity');
        expect(result.detectedIssues[0]).toHaveProperty('description');
        expect(result.detectedIssues[0]).toHaveProperty('recommendedDrills');
      }
    });
  });

  describe('isMLAnalysisAvailable', () => {
    it('should return true for basic tier', async () => {
      const available = await isMLAnalysisAvailable('basic');
      expect(available).toBe(true);
    });

    it('should check lightweight ML availability', async () => {
      const available = await isMLAnalysisAvailable('lightweight_ml');
      expect(typeof available).toBe('boolean');
    });

    it('should return false for cloud tier (not implemented)', async () => {
      const available = await isMLAnalysisAvailable('cloud');
      expect(available).toBe(false);
    });
  });

  describe('getRecommendedAnalysisTier', () => {
    it('should recommend basic tier as fallback', async () => {
      const tier = await getRecommendedAnalysisTier('cloud');
      expect(['basic', 'lightweight_ml']).toContain(tier);
    });

    it('should return valid tier', async () => {
      const tier = await getRecommendedAnalysisTier('lightweight_ml');
      expect(['basic', 'lightweight_ml', 'full_ml', 'cloud']).toContain(tier);
    });
  });

  describe('validateAnalysisTierForVideo', () => {
    it('should validate basic tier for any video', () => {
      const validation = validateAnalysisTierForVideo('basic', {
        resolution: '320x240',
        frameRate: 10,
        duration: 500,
      });
      
      expect(validation.valid).toBe(true);
    });

    it('should reject low resolution for ML analysis', () => {
      const validation = validateAnalysisTierForVideo('lightweight_ml', {
        resolution: '320x240',
        frameRate: 30,
        duration: 2000,
      });
      
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('resolution');
    });

    it('should reject low frame rate for ML analysis', () => {
      const validation = validateAnalysisTierForVideo('lightweight_ml', {
        resolution: '1280x720',
        frameRate: 10,
        duration: 2000,
      });
      
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('frame rate');
    });

    it('should reject invalid duration for ML analysis', () => {
      const validation = validateAnalysisTierForVideo('lightweight_ml', {
        resolution: '1280x720',
        frameRate: 30,
        duration: 500, // Too short
      });
      
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('duration');
    });

    it('should accept valid video for ML analysis', () => {
      const validation = validateAnalysisTierForVideo('lightweight_ml', {
        resolution: '1280x720',
        frameRate: 30,
        duration: 2000,
      });
      
      expect(validation.valid).toBe(true);
    });
  });

  describe('estimateProcessingTime', () => {
    it('should estimate ~1 second for basic analysis', () => {
      const time = estimateProcessingTime('basic', {
        resolution: '1280x720',
        frameRate: 30,
        duration: 2000,
      });
      
      expect(time).toBeLessThanOrEqual(2000);
    });

    it('should estimate 2-4 seconds for lightweight ML', () => {
      const time = estimateProcessingTime('lightweight_ml', {
        resolution: '1280x720',
        frameRate: 30,
        duration: 2000,
      });
      
      expect(time).toBeGreaterThanOrEqual(2000);
      expect(time).toBeLessThanOrEqual(5000);
    });

    it('should scale with video duration', () => {
      const time1 = estimateProcessingTime('lightweight_ml', {
        resolution: '1280x720',
        frameRate: 30,
        duration: 1000,
      });
      
      const time2 = estimateProcessingTime('lightweight_ml', {
        resolution: '1280x720',
        frameRate: 30,
        duration: 3000,
      });
      
      expect(time2).toBeGreaterThan(time1);
    });
  });

  describe('compareAnalysisResults', () => {
    it('should compare two analysis results', () => {
      const result1 = {
        overallScore: 'B' as FormScore,
        detectedIssues: [
          {
            type: 'elbow_flare' as const,
            severity: 'moderate' as const,
            description: 'Test',
            recommendedDrills: [],
          },
        ],
        biomechanicalMetrics: {
          elbowAlignment: 80,
          wristAngle: 85,
          shoulderSquare: 90,
          followThrough: 75,
        },
      };
      
      const result2 = {
        overallScore: 'B' as FormScore,
        detectedIssues: [
          {
            type: 'elbow_flare' as const,
            severity: 'moderate' as const,
            description: 'Test',
            recommendedDrills: [],
          },
        ],
        biomechanicalMetrics: {
          elbowAlignment: 82,
          wristAngle: 83,
          shoulderSquare: 88,
          followThrough: 77,
        },
      };
      
      const comparison = compareAnalysisResults(result1, 'basic', result2, 'lightweight_ml');
      
      expect(comparison.scoreDifference).toBeLessThanOrEqual(10);
      expect(comparison.issueOverlap).toBeGreaterThanOrEqual(0);
      expect(comparison.issueOverlap).toBeLessThanOrEqual(1);
      expect(comparison.metricsCorrelation).toBeGreaterThanOrEqual(0);
      expect(comparison.metricsCorrelation).toBeLessThanOrEqual(1);
    });

    it('should detect high correlation for similar results', () => {
      const result1 = {
        overallScore: 'A' as FormScore,
        detectedIssues: [],
        biomechanicalMetrics: {
          elbowAlignment: 95,
          wristAngle: 92,
          shoulderSquare: 94,
          followThrough: 90,
        },
      };
      
      const result2 = {
        overallScore: 'A' as FormScore,
        detectedIssues: [],
        biomechanicalMetrics: {
          elbowAlignment: 94,
          wristAngle: 93,
          shoulderSquare: 95,
          followThrough: 91,
        },
      };
      
      const comparison = compareAnalysisResults(result1, 'basic', result2, 'lightweight_ml');
      
      expect(comparison.metricsCorrelation).toBeGreaterThan(0.9);
    });
  });

  describe('End-to-end ML analysis', () => {
    it('should complete analysis within time limit', async () => {
      const startTime = Date.now();
      
      await performMLAnalysisWithFallback(testVideoPath, 'basic');
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(3000); // Should complete in <3 seconds
    });

    it('should produce consistent results across multiple runs', async () => {
      const result1 = await performMLAnalysisWithFallback(testVideoPath, 'basic');
      const result2 = await performMLAnalysisWithFallback(testVideoPath, 'basic');
      
      // Scores should be similar (within 1 grade)
      const grades = ['F', 'D', 'C', 'B', 'A'];
      const idx1 = grades.indexOf(result1.overallScore);
      const idx2 = grades.indexOf(result2.overallScore);
      
      expect(Math.abs(idx1 - idx2)).toBeLessThanOrEqual(1);
    });
  });
});
