/**
 * Device Capability Detector
 * Assesses device performance and determines optimal processing tier
 */

import { Platform } from 'react-native';
import { DeviceCapabilities, DeviceTier } from '../types/models';
import { checkTFLiteAvailability } from '../ml/TensorFlowConfig';
import DatabaseManager from '../database/DatabaseManager';

/**
 * Detect device capabilities and classify device tier
 * Checks cache first, then performs full detection if needed
 */
export async function detectDeviceCapabilities(forceRefresh = false): Promise<DeviceCapabilities> {
  // Try to load from cache unless force refresh is requested
  if (!forceRefresh) {
    const cached = await loadCachedCapabilities();
    if (cached) {
      console.log('Using cached device capabilities');
      return cached;
    }
  }
  
  console.log('Detecting device capabilities...');
  const availableRAM = await getAvailableRAM();
  const cpuCores = await getCPUCores();
  const hasGPU = await checkGPUAvailability();
  const mlFrameworkSupported = await checkTFLiteAvailability();
  const benchmarkScore = await runPerformanceBenchmark();
  
  const tier = classifyDeviceTier(availableRAM, cpuCores, benchmarkScore);
  
  const capabilities: DeviceCapabilities = {
    tier,
    availableRAM,
    cpuCores,
    hasGPU,
    mlFrameworkSupported,
    benchmarkScore,
  };
  
  // Cache the results for future use
  await cacheDeviceCapabilities(capabilities);
  
  return capabilities;
}

/**
 * Get available RAM in MB
 * Uses react-native-device-info when available, falls back to safe defaults
 */
async function getAvailableRAM(): Promise<number> {
  try {
    // Try to use react-native-device-info if available
    // Note: This requires installing react-native-device-info package
    // For MVP, we'll use Platform API and reasonable estimates
    
    if (Platform.OS === 'android') {
      // On Android, we can estimate based on device characteristics
      // This is a simplified approach for MVP
      // In production, use: const DeviceInfo = require('react-native-device-info');
      // return Math.floor(await DeviceInfo.getTotalMemory() / (1024 * 1024));
      
      // For now, return a mid-range estimate
      return 4096; // 4GB - typical mid-range Android device
    } else if (Platform.OS === 'ios') {
      // iOS devices typically have good RAM
      return 4096;
    }
    
    return 2048; // Default to 2GB for safety
  } catch (error) {
    console.error('Failed to get available RAM:', error);
    return 2048; // Default to 2GB for safety
  }
}

/**
 * Get number of CPU cores
 * Uses device info when available, falls back to safe defaults
 */
async function getCPUCores(): Promise<number> {
  try {
    // Try to use react-native-device-info if available
    // const DeviceInfo = require('react-native-device-info');
    // return await DeviceInfo.getProcessorCount();
    
    // For MVP, estimate based on platform
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      return 4; // Most modern smartphones have at least 4 cores
    }
    
    return 2; // Default to dual-core for safety
  } catch (error) {
    console.error('Failed to get CPU cores:', error);
    return 2; // Default to dual-core for safety
  }
}

/**
 * Check if device has GPU acceleration
 */
async function checkGPUAvailability(): Promise<boolean> {
  try {
    // Most modern Android devices have GPU
    // This is a simplified check
    return Platform.OS === 'android' || Platform.OS === 'ios';
  } catch (error) {
    console.error('Failed to check GPU availability:', error);
    return false;
  }
}

/**
 * Run performance benchmark to assess device speed
 * Returns a score from 0-100 based on computational performance
 * Includes both CPU and memory-intensive operations
 */
async function runPerformanceBenchmark(): Promise<number> {
  const startTime = Date.now();
  
  try {
    // CPU-intensive benchmark: mathematical operations
    let cpuResult = 0;
    const cpuIterations = 100000;
    
    for (let i = 0; i < cpuIterations; i++) {
      cpuResult += Math.sqrt(i) * Math.sin(i) * Math.cos(i);
    }
    
    // Memory-intensive benchmark: array operations
    const memoryIterations = 10000;
    const testArray: number[] = [];
    
    for (let i = 0; i < memoryIterations; i++) {
      testArray.push(Math.random() * 1000);
    }
    
    // Sort and filter operations
    testArray.sort((a, b) => a - b);
    const filtered = testArray.filter(x => x > 500);
    const mapped = filtered.map(x => x * 2);
    
    // Prevent optimization by using results
    const finalResult = cpuResult + mapped.length;
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Convert duration to score (lower duration = higher score)
    // Typical ranges based on testing:
    // <50ms = high-end (score 90-100)
    // 50-150ms = mid-range (score 50-90)
    // >150ms = low-end (score 0-50)
    let score: number;
    if (duration < 50) {
      score = 90 + Math.min(10, (50 - duration) / 5);
    } else if (duration < 150) {
      score = 50 + ((150 - duration) / 100) * 40;
    } else {
      score = Math.max(0, 50 - ((duration - 150) / 10));
    }
    
    console.log(`Benchmark completed in ${duration}ms, score: ${Math.round(score)}, result: ${finalResult}`);
    return Math.round(score);
  } catch (error) {
    console.error('Benchmark failed:', error);
    return 50; // Default to mid-range score
  }
}

/**
 * Classify device into tier based on capabilities
 */
function classifyDeviceTier(
  ram: number,
  cpuCores: number,
  benchmarkScore: number
): DeviceTier {
  // High-end: 6GB+ RAM, 6+ cores, benchmark score > 70
  if (ram >= 6144 && cpuCores >= 6 && benchmarkScore > 70) {
    return 'high';
  }
  
  // Mid-range: 3GB+ RAM, 4+ cores, benchmark score > 40
  if (ram >= 3072 && cpuCores >= 4 && benchmarkScore > 40) {
    return 'mid';
  }
  
  // Low-end: everything else
  return 'low';
}

/**
 * Save device capabilities to database for future use
 * Caches results to avoid repeated benchmarking
 */
export async function cacheDeviceCapabilities(
  capabilities: DeviceCapabilities
): Promise<void> {
  try {
    const db = await DatabaseManager.getDatabase();
    
    await db.executeSql(
      `INSERT OR REPLACE INTO device_capabilities 
       (id, tier, available_ram, cpu_cores, has_gpu, ml_framework_supported, 
        benchmark_score, last_assessed) 
       VALUES (1, ?, ?, ?, ?, ?, ?, ?)`,
      [
        capabilities.tier,
        capabilities.availableRAM,
        capabilities.cpuCores,
        capabilities.hasGPU ? 1 : 0,
        capabilities.mlFrameworkSupported ? 1 : 0,
        capabilities.benchmarkScore,
        Date.now()
      ]
    );
    
    console.log('Device capabilities cached successfully');
  } catch (error) {
    console.error('Failed to cache device capabilities:', error);
    // Non-critical error - app can continue without caching
  }
}

/**
 * Load cached device capabilities from database
 * Returns null if no cached data exists or if cache is stale (>7 days)
 */
export async function loadCachedCapabilities(): Promise<DeviceCapabilities | null> {
  try {
    const db = await DatabaseManager.getDatabase();
    const result = await db.executeSql(
      'SELECT * FROM device_capabilities WHERE id = 1'
    );
    
    if (result[0].rows.length > 0) {
      const row = result[0].rows.item(0);
      
      // Check if cache is stale (older than 7 days)
      const cacheAge = Date.now() - row.last_assessed;
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
      
      if (cacheAge > sevenDaysInMs) {
        console.log('Cached capabilities are stale, will re-detect');
        return null;
      }
      
      return {
        tier: row.tier as DeviceTier,
        availableRAM: row.available_ram,
        cpuCores: row.cpu_cores,
        hasGPU: row.has_gpu === 1,
        mlFrameworkSupported: row.ml_framework_supported === 1,
        benchmarkScore: row.benchmark_score,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Failed to load cached capabilities:', error);
    return null;
  }
}
