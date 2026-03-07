/**
 * Robust System Example
 * Demonstrates error handling, recovery, privacy, and security features
 */

import {
  initializeRobustSystem,
  robustVideoCaptureSession,
  robustVideoAnalysis,
  robustDataSync,
  robustCloudUpload,
  robustStorageOperation,
} from '../utils/RobustSystemIntegration';
import PrivacyManager from '../utils/PrivacyManager';
import SecurityManager from '../utils/SecurityManager';
import ErrorHandler, { ErrorCategory } from '../utils/ErrorHandler';
import RecoveryManager from '../utils/RecoveryManager';
import { ProcessingConfig } from '../types/models';

/**
 * Example 1: Initialize robust system on app startup
 */
export async function exampleInitializeSystem() {
  console.log('=== Example 1: Initialize Robust System ===');

  const userId = 'user123';

  try {
    // Initialize the robust system
    await initializeRobustSystem(userId);

    // Set up error listener for UI notifications
    ErrorHandler.addErrorListener((errorContext) => {
      console.log('Error notification:', errorContext.userInfo.title);
      console.log('Message:', errorContext.userInfo.message);
      
      // In production, show UI notification
      // showNotification(errorContext.userInfo);
    });

    console.log('System initialized successfully');
  } catch (error) {
    console.error('Failed to initialize system:', error);
  }
}

/**
 * Example 2: Configure privacy preferences
 */
export async function exampleConfigurePrivacy() {
  console.log('\n=== Example 2: Configure Privacy Preferences ===');

  const userId = 'user123';

  try {
    // Get current preferences
    const currentPrefs = await PrivacyManager.getPrivacyPreferences(userId);
    console.log('Current preferences:', currentPrefs);

    // Update preferences - user wants local processing only
    await PrivacyManager.updatePrivacyPreferences(userId, {
      localProcessingOnly: true,
      cloudProcessingEnabled: false,
      videoUploadEnabled: false,
    });

    console.log('Privacy preferences updated');

    // Check if cloud processing is allowed
    const canUseCloud = await PrivacyManager.canUseCloudProcessing(userId);
    console.log('Can use cloud processing:', canUseCloud);

    // Check if should process locally
    const shouldProcessLocally = await PrivacyManager.shouldProcessLocally(userId);
    console.log('Should process locally:', shouldProcessLocally);
  } catch (error) {
    console.error('Failed to configure privacy:', error);
  }
}

/**
 * Example 3: Robust video capture with error handling
 */
export async function exampleRobustVideoCapture() {
  console.log('\n=== Example 3: Robust Video Capture ===');

  const userId = 'user123';
  const processingConfig: ProcessingConfig = {
    selectedTier: 'lightweight_ml',
    deviceCapabilities: {
      tier: 'mid',
      availableRAM: 4096,
      cpuCores: 8,
      hasGPU: true,
      mlFrameworkSupported: true,
      benchmarkScore: 75,
      lastAssessed: new Date(),
    },
    hasConnectivity: false,
    userConsent: {
      cloudProcessing: false,
      dataSharing: false,
    },
  };

  try {
    // Attempt video capture with automatic error handling
    const result = await robustVideoCaptureSession(
      processingConfig,
      '/path/to/output.mp4',
      userId
    );

    if (result.success) {
      console.log('Video captured successfully:', result.videoPath);
    } else {
      console.log('Video capture failed:', result.error);
      // Error message is user-friendly and can be shown directly
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

/**
 * Example 4: Robust video analysis with fallback
 */
export async function exampleRobustVideoAnalysis() {
  console.log('\n=== Example 4: Robust Video Analysis ===');

  const userId = 'user123';
  const videoPath = '/path/to/video.mp4';
  const processingConfig: ProcessingConfig = {
    selectedTier: 'lightweight_ml',
    deviceCapabilities: {
      tier: 'mid',
      availableRAM: 4096,
      cpuCores: 8,
      hasGPU: true,
      mlFrameworkSupported: true,
      benchmarkScore: 75,
      lastAssessed: new Date(),
    },
    hasConnectivity: false,
    userConsent: {
      cloudProcessing: false,
      dataSharing: false,
    },
  };

  try {
    // Backup session data before analysis
    await RecoveryManager.backupSessionData(videoPath, {
      videoPath,
      userId,
      timestamp: Date.now(),
    });

    // Attempt analysis with automatic fallback
    const result = await robustVideoAnalysis(videoPath, processingConfig, userId);

    if (result.success && result.result) {
      console.log('Analysis successful');
      console.log('Tier used:', result.tier);
      console.log('Form score:', result.result.overallScore);
      console.log('Issues detected:', result.result.detectedIssues.length);
    } else {
      console.log('Analysis failed:', result.error);
      
      // Try to restore from backup
      const backup = await RecoveryManager.restoreSessionData(videoPath);
      if (backup) {
        console.log('Session data restored from backup');
      }
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

/**
 * Example 5: Secure cloud upload with encryption
 */
export async function exampleSecureCloudUpload() {
  console.log('\n=== Example 5: Secure Cloud Upload ===');

  const userId = 'user123';
  const sessionId = 'session123';
  const videoPath = '/path/to/video.mp4';

  try {
    // First, check privacy consent
    const canUseCloud = await PrivacyManager.canUseCloudProcessing(userId);
    
    if (!canUseCloud) {
      console.log('Cloud upload not allowed by privacy settings');
      return;
    }

    // Attempt secure upload with encryption
    const result = await robustCloudUpload(videoPath, sessionId, userId);

    if (result.success) {
      console.log('Video uploaded securely');
      console.log('Data was encrypted:', result.encrypted);
    } else {
      console.log('Upload failed:', result.error);
      // System automatically switches to offline mode
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

/**
 * Example 6: Data encryption and decryption
 */
export async function exampleDataEncryption() {
  console.log('\n=== Example 6: Data Encryption ===');

  const userId = 'user123';
  const sensitiveData = {
    sessionId: 'session123',
    formScore: 'B',
    personalNotes: 'Working on elbow alignment',
  };

  try {
    // Encrypt data for transmission
    const encrypted = await SecurityManager.encryptForTransmission(sensitiveData, userId);
    console.log('Data encrypted for transmission');
    console.log('Encrypted data length:', encrypted.encryptedData.length);

    // Create secure payload with signature
    const securePayload = await SecurityManager.createSecurePayload(sensitiveData, userId);
    console.log('Secure payload created with signature');

    // Verify and decrypt payload
    const verification = await SecurityManager.verifySecurePayload(securePayload);
    if (verification.valid) {
      console.log('Payload verified successfully');
      console.log('Decrypted data:', verification.data);
    } else {
      console.log('Payload verification failed');
    }

    // Encrypt for local storage
    const storageEncrypted = await SecurityManager.encryptForStorage(sensitiveData, userId);
    console.log('Data encrypted for local storage');

    // Decrypt from storage
    const decrypted = await SecurityManager.decryptFromStorage(storageEncrypted, userId);
    console.log('Data decrypted from storage:', decrypted);
  } catch (error) {
    console.error('Encryption error:', error);
  }
}

/**
 * Example 7: Robust data sync with retry
 */
export async function exampleRobustDataSync() {
  console.log('\n=== Example 7: Robust Data Sync ===');

  const userId = 'user123';

  try {
    // Attempt sync with automatic retry
    const result = await robustDataSync(userId);

    if (result.success) {
      console.log('Sync successful');
      console.log('Sessions synced:', result.syncedCount);
    } else {
      console.log('Sync failed:', result.error);
      // Data is preserved locally and will sync later
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

/**
 * Example 8: Robust storage operations
 */
export async function exampleRobustStorage() {
  console.log('\n=== Example 8: Robust Storage Operations ===');

  const userId = 'user123';

  try {
    // Perform storage operation with automatic recovery
    const result = await robustStorageOperation(
      async () => {
        // Simulate storage operation
        return { saved: true, id: 'session123' };
      },
      userId,
      'save_session'
    );

    if (result.success) {
      console.log('Storage operation successful:', result.result);
    } else {
      console.log('Storage operation failed:', result.error);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

/**
 * Example 9: Complete user data deletion
 */
export async function exampleDataDeletion() {
  console.log('\n=== Example 9: Complete Data Deletion ===');

  const userId = 'user123';

  try {
    // Export data before deletion (for user to keep)
    const exportedData = await PrivacyManager.exportUserData(userId);
    console.log('Data exported for user');
    console.log('Export size:', exportedData.length, 'bytes');

    // Delete all user data
    await PrivacyManager.deleteAllUserData(userId, {
      includeSessions: true,
      includeProgress: true,
      includeVideos: true,
      includeBackups: true,
      includeCloudData: true,
    });

    console.log('All user data deleted successfully');
  } catch (error) {
    console.error('Data deletion error:', error);
  }
}

/**
 * Example 10: Error monitoring and reporting
 */
export async function exampleErrorMonitoring() {
  console.log('\n=== Example 10: Error Monitoring ===');

  try {
    // Simulate some errors
    ErrorHandler.handleError(new Error('Camera error'), ErrorCategory.CAMERA);
    ErrorHandler.handleError(new Error('Network error'), ErrorCategory.NETWORK);
    ErrorHandler.handleError(new Error('Storage error'), ErrorCategory.STORAGE);

    // Get error log
    const errorLog = ErrorHandler.getErrorLog();
    console.log('Total errors logged:', errorLog.length);

    // Get errors by category
    const cameraErrors = ErrorHandler.getErrorsByCategory(ErrorCategory.CAMERA);
    console.log('Camera errors:', cameraErrors.length);

    // Get critical errors
    const criticalErrors = ErrorHandler.getErrorsBySeverity('critical' as any);
    console.log('Critical errors:', criticalErrors.length);

    // Clear error log
    ErrorHandler.clearErrorLog();
    console.log('Error log cleared');
  } catch (error) {
    console.error('Monitoring error:', error);
  }
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('========================================');
  console.log('Robust System Examples');
  console.log('========================================');

  await exampleInitializeSystem();
  await exampleConfigurePrivacy();
  await exampleRobustVideoCapture();
  await exampleRobustVideoAnalysis();
  await exampleSecureCloudUpload();
  await exampleDataEncryption();
  await exampleRobustDataSync();
  await exampleRobustStorage();
  await exampleDataDeletion();
  await exampleErrorMonitoring();

  console.log('\n========================================');
  console.log('All examples completed');
  console.log('========================================');
}

// Run examples if executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}
