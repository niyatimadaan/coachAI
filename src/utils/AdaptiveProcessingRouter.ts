/**
 * Adaptive Processing Router
 * Routes video analysis to appropriate processing tier based on device capabilities and connectivity
 */

import { AnalysisTier, DeviceCapabilities, ProcessingConfig } from '../types/models';
import { detectDeviceCapabilities } from './DeviceCapabilityDetector';
import { selectMLModel } from '../ml/TensorFlowConfig';

/**
 * Connectivity status interface
 */
export interface ConnectivityStatus {
  isConnected: boolean;
  connectionType: 'wifi' | 'cellular' | 'none';
  isMetered: boolean;
}

/**
 * Processing result with metadata about the method used
 */
export interface ProcessingResult<T> {
  data: T;
  tier: AnalysisTier;
  processingTime: number;
  fallbackUsed: boolean;
}

/**
 * Initialize processing configuration based on device and connectivity
 * Should be called at app startup
 */
export async function initializeProcessingConfig(
  userConsent: { cloudProcessing: boolean; dataSharing: boolean }
): Promise<ProcessingConfig> {
  const deviceCapabilities = await detectDeviceCapabilities();
  const connectivity = await checkConnectivity();
  
  const selectedTier = selectProcessingTier(
    deviceCapabilities,
    connectivity,
    userConsent
  );
  
  console.log(`Initialized processing config: tier=${selectedTier}, device=${deviceCapabilities.tier}`);
  
  return {
    selectedTier,
    deviceCapabilities,
    hasConnectivity: connectivity.isConnected,
    userConsent,
  };
}

/**
 * Select optimal processing tier based on device, connectivity, and user preferences
 */
export function selectProcessingTier(
  capabilities: DeviceCapabilities,
  connectivity: ConnectivityStatus,
  userConsent: { cloudProcessing: boolean; dataSharing: boolean }
): AnalysisTier {
  // Cloud processing: requires connectivity, user consent, and good connection
  if (
    connectivity.isConnected &&
    userConsent.cloudProcessing &&
    connectivity.connectionType === 'wifi' &&
    !connectivity.isMetered
  ) {
    console.log('Selected cloud processing tier');
    return 'cloud';
  }
  
  // High-end devices can run full ML locally
  if (capabilities.tier === 'high' && capabilities.mlFrameworkSupported) {
    console.log('Selected full ML tier (local)');
    return 'full_ml';
  }
  
  // Mid-range devices use lightweight ML
  if (capabilities.tier === 'mid' && capabilities.mlFrameworkSupported) {
    console.log('Selected lightweight ML tier');
    return 'lightweight_ml';
  }
  
  // Fallback to basic rule-based analysis
  console.log('Selected basic rule-based tier');
  return 'basic';
}

/**
 * Route video analysis to appropriate processing method
 * Implements fallback strategies if preferred method fails
 */
export async function routeVideoAnalysis<T>(
  videoPath: string,
  config: ProcessingConfig,
  analysisFunction: (videoPath: string, tier: AnalysisTier) => Promise<T>
): Promise<ProcessingResult<T>> {
  const startTime = Date.now();
  let currentTier = config.selectedTier;
  let fallbackUsed = false;
  
  // Validate processing tier before attempting
  if (!validateProcessingTier(currentTier, config)) {
    console.warn(`Selected tier ${currentTier} not valid for current config, selecting fallback`);
    currentTier = getRecommendedTier(config);
    fallbackUsed = true;
  }
  
  // Try primary processing method
  try {
    console.log(`Attempting analysis with tier: ${currentTier}`);
    const data = await analysisFunction(videoPath, currentTier);
    const processingTime = Date.now() - startTime;
    
    // Validate processing time meets requirements
    const maxTime = currentTier === 'basic' ? 2000 : 5000;
    if (processingTime > maxTime) {
      console.warn(`Processing time ${processingTime}ms exceeds limit ${maxTime}ms for tier ${currentTier}`);
    }
    
    return {
      data,
      tier: currentTier,
      processingTime,
      fallbackUsed,
    };
  } catch (error) {
    console.error(`Analysis failed with tier ${currentTier}:`, error);
    
    // Implement fallback strategy
    const fallbackTier = getFallbackTier(currentTier);
    
    if (fallbackTier) {
      console.log(`Falling back to tier: ${fallbackTier}`);
      fallbackUsed = true;
      
      try {
        const data = await analysisFunction(videoPath, fallbackTier);
        const processingTime = Date.now() - startTime;
        
        return {
          data,
          tier: fallbackTier,
          processingTime,
          fallbackUsed,
        };
      } catch (fallbackError) {
        console.error(`Fallback analysis failed with tier ${fallbackTier}:`, fallbackError);
        
        // Last resort: try basic analysis
        if (fallbackTier !== 'basic') {
          console.log('Last resort: falling back to basic analysis');
          const data = await analysisFunction(videoPath, 'basic');
          const processingTime = Date.now() - startTime;
          
          return {
            data,
            tier: 'basic',
            processingTime,
            fallbackUsed: true,
          };
        }
      }
    }
    
    // If all fallbacks fail, throw the original error
    throw new Error(`Video analysis failed: ${error}`);
  }
}

/**
 * Determine fallback tier when primary processing fails
 */
export function getFallbackTier(currentTier: AnalysisTier): AnalysisTier | null {
  const fallbackChain: Record<AnalysisTier, AnalysisTier | null> = {
    cloud: 'full_ml',
    full_ml: 'lightweight_ml',
    lightweight_ml: 'basic',
    basic: null, // No fallback for basic tier
  };
  
  return fallbackChain[currentTier];
}

/**
 * Check current network connectivity status
 */
export async function checkConnectivity(): Promise<ConnectivityStatus> {
  try {
    // This will be implemented with react-native-netinfo
    // For MVP, we'll use a simplified approach
    // const NetInfo = require('@react-native-community/netinfo');
    // const state = await NetInfo.fetch();
    
    // Placeholder: assume WiFi connection for development
    return {
      isConnected: true,
      connectionType: 'wifi',
      isMetered: false,
    };
  } catch (error) {
    console.error('Failed to check connectivity:', error);
    return {
      isConnected: false,
      connectionType: 'none',
      isMetered: false,
    };
  }
}

/**
 * Update processing configuration when connectivity changes
 */
export function updateConfigForConnectivity(
  config: ProcessingConfig,
  connectivity: ConnectivityStatus
): ProcessingConfig {
  const newTier = selectProcessingTier(
    config.deviceCapabilities,
    connectivity,
    config.userConsent
  );
  
  return {
    ...config,
    selectedTier: newTier,
    hasConnectivity: connectivity.isConnected,
  };
}

/**
 * Validate that selected tier is appropriate for current conditions
 */
export function validateProcessingTier(
  tier: AnalysisTier,
  config: ProcessingConfig
): boolean {
  // Cloud tier requires connectivity and consent
  if (tier === 'cloud') {
    return config.hasConnectivity && config.userConsent.cloudProcessing;
  }
  
  // ML tiers require framework support
  if (tier === 'full_ml' || tier === 'lightweight_ml') {
    return config.deviceCapabilities.mlFrameworkSupported;
  }
  
  // Basic tier always works
  return true;
}

/**
 * Get recommended tier for current conditions
 */
export function getRecommendedTier(config: ProcessingConfig): AnalysisTier {
  const connectivity = {
    isConnected: config.hasConnectivity,
    connectionType: config.hasConnectivity ? ('wifi' as const) : ('none' as const),
    isMetered: false,
  };
  
  return selectProcessingTier(
    config.deviceCapabilities,
    connectivity,
    config.userConsent
  );
}
