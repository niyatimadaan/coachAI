/**
 * Tests for Adaptive Processing Router
 */

import {
  selectProcessingTier,
  getFallbackTier,
  validateProcessingTier,
  updateConfigForConnectivity,
} from '../AdaptiveProcessingRouter';
import { DeviceCapabilities, ProcessingConfig, AnalysisTier } from '../../types/models';

describe('AdaptiveProcessingRouter', () => {
  const mockHighEndCapabilities: DeviceCapabilities = {
    tier: 'high',
    availableRAM: 8192,
    cpuCores: 8,
    hasGPU: true,
    mlFrameworkSupported: true,
    benchmarkScore: 95,
  };

  const mockMidRangeCapabilities: DeviceCapabilities = {
    tier: 'mid',
    availableRAM: 4096,
    cpuCores: 4,
    hasGPU: true,
    mlFrameworkSupported: true,
    benchmarkScore: 65,
  };

  const mockLowEndCapabilities: DeviceCapabilities = {
    tier: 'low',
    availableRAM: 2048,
    cpuCores: 2,
    hasGPU: false,
    mlFrameworkSupported: false,
    benchmarkScore: 30,
  };

  describe('selectProcessingTier', () => {
    it('should select cloud tier when connected via WiFi with consent', () => {
      const tier = selectProcessingTier(
        mockMidRangeCapabilities,
        { isConnected: true, connectionType: 'wifi', isMetered: false },
        { cloudProcessing: true, dataSharing: false }
      );
      expect(tier).toBe('cloud');
    });

    it('should not select cloud tier without user consent', () => {
      const tier = selectProcessingTier(
        mockMidRangeCapabilities,
        { isConnected: true, connectionType: 'wifi', isMetered: false },
        { cloudProcessing: false, dataSharing: false }
      );
      expect(tier).not.toBe('cloud');
    });

    it('should select full ML for high-end devices offline', () => {
      const tier = selectProcessingTier(
        mockHighEndCapabilities,
        { isConnected: false, connectionType: 'none', isMetered: false },
        { cloudProcessing: false, dataSharing: false }
      );
      expect(tier).toBe('full_ml');
    });

    it('should select lightweight ML for mid-range devices offline', () => {
      const tier = selectProcessingTier(
        mockMidRangeCapabilities,
        { isConnected: false, connectionType: 'none', isMetered: false },
        { cloudProcessing: false, dataSharing: false }
      );
      expect(tier).toBe('lightweight_ml');
    });

    it('should select basic tier for low-end devices', () => {
      const tier = selectProcessingTier(
        mockLowEndCapabilities,
        { isConnected: false, connectionType: 'none', isMetered: false },
        { cloudProcessing: false, dataSharing: false }
      );
      expect(tier).toBe('basic');
    });

    it('should not use cloud on metered connections', () => {
      const tier = selectProcessingTier(
        mockMidRangeCapabilities,
        { isConnected: true, connectionType: 'cellular', isMetered: true },
        { cloudProcessing: true, dataSharing: false }
      );
      expect(tier).not.toBe('cloud');
    });
  });

  describe('validateProcessingTier', () => {
    const mockConfig: ProcessingConfig = {
      selectedTier: 'basic',
      deviceCapabilities: mockMidRangeCapabilities,
      hasConnectivity: true,
      userConsent: { cloudProcessing: true, dataSharing: false },
    };

    it('should validate cloud tier with connectivity and consent', () => {
      const isValid = validateProcessingTier('cloud', mockConfig);
      expect(isValid).toBe(true);
    });

    it('should invalidate cloud tier without connectivity', () => {
      const configNoConnectivity = { ...mockConfig, hasConnectivity: false };
      const isValid = validateProcessingTier('cloud', configNoConnectivity);
      expect(isValid).toBe(false);
    });

    it('should invalidate ML tiers without framework support', () => {
      const configNoML = {
        ...mockConfig,
        deviceCapabilities: mockLowEndCapabilities,
      };
      const isValid = validateProcessingTier('full_ml', configNoML);
      expect(isValid).toBe(false);
    });

    it('should always validate basic tier', () => {
      const isValid = validateProcessingTier('basic', mockConfig);
      expect(isValid).toBe(true);
    });
  });

  describe('updateConfigForConnectivity', () => {
    it('should upgrade to cloud when WiFi becomes available', () => {
      const config: ProcessingConfig = {
        selectedTier: 'lightweight_ml',
        deviceCapabilities: mockMidRangeCapabilities,
        hasConnectivity: false,
        userConsent: { cloudProcessing: true, dataSharing: false },
      };

      const updated = updateConfigForConnectivity(config, {
        isConnected: true,
        connectionType: 'wifi',
        isMetered: false,
      });

      expect(updated.selectedTier).toBe('cloud');
      expect(updated.hasConnectivity).toBe(true);
    });

    it('should downgrade from cloud when connectivity is lost', () => {
      const config: ProcessingConfig = {
        selectedTier: 'cloud',
        deviceCapabilities: mockHighEndCapabilities,
        hasConnectivity: true,
        userConsent: { cloudProcessing: true, dataSharing: false },
      };

      const updated = updateConfigForConnectivity(config, {
        isConnected: false,
        connectionType: 'none',
        isMetered: false,
      });

      expect(updated.selectedTier).not.toBe('cloud');
      expect(updated.hasConnectivity).toBe(false);
    });
  });
});
