/**
 * Integration tests for basic video processing pipeline
 * Tests the complete flow from video capture to analysis
 */

import { recordAndAnalyzeSession } from '../video/VideoAnalysisIntegration';
import { ProcessingConfig } from '../types/models';

describe('Basic Video Processing Pipeline Integration', () => {
  const mockProcessingConfig: ProcessingConfig = {
    selectedTier: 'basic',
    deviceCapabilities: {
      tier: 'low',
      availableRAM: 2048,
      cpuCores: 2,
      hasGPU: false,
      mlFrameworkSupported: false,
      benchmarkScore: 30,
    },
    hasConnectivity: false,
    userConsent: {
      cloudProcessing: false,
      dataSharing: false,
    },
  };

  it('should complete a full shooting session with basic analysis', async () => {
    const result = await recordAndAnalyzeSession(
      'test-user-123',
      mockProcessingConfig,
      '/mock/output/path.mp4'
    );

    expect(result.success).toBe(true);
    expect(result.session).toBeDefined();
    expect(result.session?.formScore).toMatch(/^[A-F]$/);
    expect(result.processingDetails.tier).toBe('basic');
  });

  it('should generate valid form analysis results', async () => {
    const result = await recordAndAnalyzeSession(
      'test-user-456',
      mockProcessingConfig,
      '/mock/output/path2.mp4'
    );

    expect(result.success).toBe(true);
    expect(result.session?.formAnalysis).toBeDefined();
    expect(result.session?.formAnalysis.overallScore).toMatch(/^[A-F]$/);
    expect(result.session?.formAnalysis.biomechanicalMetrics).toBeDefined();
    expect(result.session?.formAnalysis.detectedIssues).toBeInstanceOf(Array);
  });

  it('should validate biomechanical metrics are in valid range', async () => {
    const result = await recordAndAnalyzeSession(
      'test-user-789',
      mockProcessingConfig,
      '/mock/output/path3.mp4'
    );

    expect(result.success).toBe(true);
    const metrics = result.session?.formAnalysis.biomechanicalMetrics;
    expect(metrics).toBeDefined();
    
    if (metrics) {
      expect(metrics.elbowAlignment).toBeGreaterThanOrEqual(0);
      expect(metrics.elbowAlignment).toBeLessThanOrEqual(100);
      expect(metrics.wristAngle).toBeGreaterThanOrEqual(0);
      expect(metrics.wristAngle).toBeLessThanOrEqual(100);
      expect(metrics.shoulderSquare).toBeGreaterThanOrEqual(0);
      expect(metrics.shoulderSquare).toBeLessThanOrEqual(100);
      expect(metrics.followThrough).toBeGreaterThanOrEqual(0);
      expect(metrics.followThrough).toBeLessThanOrEqual(100);
    }
  });

  it('should work offline without connectivity', async () => {
    const offlineConfig: ProcessingConfig = {
      ...mockProcessingConfig,
      hasConnectivity: false,
    };

    const result = await recordAndAnalyzeSession(
      'test-user-offline',
      offlineConfig,
      '/mock/output/offline.mp4'
    );

    expect(result.success).toBe(true);
    expect(result.processingDetails.tier).toBe('basic');
    expect(result.session).toBeDefined();
  });

  it('should create valid session data structure', async () => {
    const result = await recordAndAnalyzeSession(
      'test-user-session',
      mockProcessingConfig,
      '/mock/output/session.mp4'
    );

    expect(result.success).toBe(true);
    expect(result.session).toBeDefined();
    
    if (result.session) {
      expect(result.session.id).toBeDefined();
      expect(result.session.userId).toBe('test-user-session');
      expect(result.session.timestamp).toBeInstanceOf(Date);
      expect(result.session.videoPath).toBeDefined();
      expect(result.session.formScore).toMatch(/^[A-F]$/);
      expect(result.session.syncStatus).toBe('local');
      expect(result.session.videoMetadata).toBeDefined();
    }
  });

  it('should detect and report form issues', async () => {
    const result = await recordAndAnalyzeSession(
      'test-user-issues',
      mockProcessingConfig,
      '/mock/output/issues.mp4'
    );

    expect(result.success).toBe(true);
    expect(result.session?.detectedIssues).toBeInstanceOf(Array);
    
    // Each issue should have required properties
    result.session?.detectedIssues.forEach(issue => {
      expect(issue.type).toBeDefined();
      expect(issue.severity).toMatch(/^(minor|moderate|major)$/);
      expect(issue.description).toBeDefined();
      expect(issue.recommendedDrills).toBeInstanceOf(Array);
    });
  });

  it('should complete processing within time limits', async () => {
    const startTime = Date.now();
    
    const result = await recordAndAnalyzeSession(
      'test-user-timing',
      mockProcessingConfig,
      '/mock/output/timing.mp4'
    );

    const processingTime = Date.now() - startTime;

    expect(result.success).toBe(true);
    // Basic analysis should complete within 2 seconds (2000ms)
    // Adding buffer for test overhead
    expect(processingTime).toBeLessThan(5000);
  });
});
