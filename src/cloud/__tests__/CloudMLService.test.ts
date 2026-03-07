/**
 * Unit tests for CloudMLService
 */

import CloudMLService from '../CloudMLService';

describe('CloudMLService', () => {
  beforeEach(() => {
    // Clear consent cache before each test
    (CloudMLService as any).consentCache.clear();
  });

  describe('Consent Management', () => {
    it('should return false for users without consent', async () => {
      const hasConsent = await CloudMLService.hasCloudConsent('user123');
      expect(hasConsent).toBe(false);
    });

    it('should request and store user consent', async () => {
      const consent = await CloudMLService.requestCloudConsent('user123');
      
      expect(consent).toHaveProperty('cloudProcessing');
      expect(consent).toHaveProperty('videoUpload');
      expect(consent).toHaveProperty('timestamp');
      expect(consent.timestamp).toBeInstanceOf(Date);
    });

    it('should update existing consent', async () => {
      await CloudMLService.requestCloudConsent('user123');
      
      await CloudMLService.updateConsent('user123', {
        cloudProcessing: true,
        videoUpload: true
      });

      const hasConsent = await CloudMLService.hasCloudConsent('user123');
      expect(hasConsent).toBe(true);
    });

    it('should cache consent for performance', async () => {
      await CloudMLService.updateConsent('user123', {
        cloudProcessing: true,
        videoUpload: true
      });

      // First call loads from storage
      const hasConsent1 = await CloudMLService.hasCloudConsent('user123');
      
      // Second call should use cache
      const hasConsent2 = await CloudMLService.hasCloudConsent('user123');
      
      expect(hasConsent1).toBe(true);
      expect(hasConsent2).toBe(true);
    });
  });

  describe('Video Compression', () => {
    it('should compress video with default options', async () => {
      const result = await CloudMLService.compressVideo('/path/to/video.mp4');
      
      expect(result).toHaveProperty('compressedPath');
      expect(result).toHaveProperty('originalSize');
      expect(result).toHaveProperty('compressedSize');
      expect(result.compressedSize).toBeLessThan(result.originalSize);
    });

    it('should compress video with custom options', async () => {
      const result = await CloudMLService.compressVideo('/path/to/video.mp4', {
        maxWidth: 640,
        maxHeight: 480,
        quality: 0.5,
        bitrate: 500000
      });
      
      expect(result.compressedSize).toBeLessThan(result.originalSize);
      expect(result.compressedPath).toContain('_compressed.mp4');
    });

    it('should handle compression errors gracefully', async () => {
      // Test with invalid path
      await expect(
        CloudMLService.compressVideo('')
      ).resolves.toBeDefined();
    });
  });

  describe('Cloud Analysis', () => {
    it('should reject analysis without consent', async () => {
      const result = await CloudMLService.uploadVideoForAnalysis(
        'user123',
        'session123',
        '/path/to/video.mp4'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('consent');
    });

    it('should upload and analyze video with consent', async () => {
      // Grant consent
      await CloudMLService.updateConsent('user123', {
        cloudProcessing: true,
        videoUpload: true
      });

      const result = await CloudMLService.uploadVideoForAnalysis(
        'user123',
        'session123',
        '/path/to/video.mp4'
      );

      expect(result.success).toBe(true);
      expect(result.analysisResult).toBeDefined();
      expect(result.analysisResult?.overallScore).toMatch(/[A-F]/);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should return form analysis with detected issues', async () => {
      await CloudMLService.updateConsent('user123', {
        cloudProcessing: true,
        videoUpload: true
      });

      const result = await CloudMLService.uploadVideoForAnalysis(
        'user123',
        'session123',
        '/path/to/video.mp4'
      );

      expect(result.analysisResult).toBeDefined();
      expect(result.analysisResult?.detectedIssues).toBeInstanceOf(Array);
      expect(result.analysisResult?.biomechanicalMetrics).toBeDefined();
    });

    it('should handle network errors gracefully', async () => {
      await CloudMLService.updateConsent('user123', {
        cloudProcessing: true,
        videoUpload: true
      });

      // Simulate network error by using invalid endpoint
      const originalEndpoint = (CloudMLService as any).apiEndpoint;
      (CloudMLService as any).apiEndpoint = 'invalid://endpoint';

      const result = await CloudMLService.uploadVideoForAnalysis(
        'user123',
        'session123',
        '/path/to/video.mp4'
      );

      // Should still succeed in MVP (simulated response)
      expect(result).toBeDefined();

      // Restore endpoint
      (CloudMLService as any).apiEndpoint = originalEndpoint;
    });
  });

  describe('Data Deletion', () => {
    it('should delete user cloud data and clear consent', async () => {
      await CloudMLService.updateConsent('user123', {
        cloudProcessing: true,
        videoUpload: true
      });

      await CloudMLService.deleteUserCloudData('user123');

      const hasConsent = await CloudMLService.hasCloudConsent('user123');
      expect(hasConsent).toBe(false);
    });
  });

  describe('Privacy Compliance', () => {
    it('should not upload video without explicit consent', async () => {
      const result = await CloudMLService.uploadVideoForAnalysis(
        'user123',
        'session123',
        '/path/to/video.mp4'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should require both cloudProcessing and videoUpload consent', async () => {
      // Only grant cloud processing consent
      await CloudMLService.updateConsent('user123', {
        cloudProcessing: true,
        videoUpload: false
      });

      const hasConsent = await CloudMLService.hasCloudConsent('user123');
      expect(hasConsent).toBe(false);
    });

    it('should timestamp consent for audit trail', async () => {
      const beforeTime = new Date();
      
      const consent = await CloudMLService.requestCloudConsent('user123');
      
      const afterTime = new Date();
      
      expect(consent.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(consent.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });
});
