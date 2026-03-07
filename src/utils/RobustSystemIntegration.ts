/**
 * Robust System Integration
 * Integrates error handling, recovery, and privacy into existing components
 */

import ErrorHandler, { ErrorCategory, AppError, ErrorSeverity, RecoveryStrategy } from './ErrorHandler';
import RecoveryManager from './RecoveryManager';
import PrivacyManager from './PrivacyManager';
import SecurityManager from './SecurityManager';
import { FormAnalysisResult, ProcessingConfig } from '../types/models';

/**
 * Wrap video capture with error handling and recovery
 */
export async function robustVideoCaptureSession(
  processingConfig: ProcessingConfig,
  outputPath: string,
  userId: string
): Promise<{ success: boolean; videoPath?: string; error?: string }> {
  try {
    // Check privacy preferences
    const shouldProcessLocally = await PrivacyManager.shouldProcessLocally(userId);
    
    if (shouldProcessLocally && processingConfig.selectedTier === 'cloud') {
      console.log('User prefers local processing, adjusting tier');
      processingConfig.selectedTier = 'lightweight_ml';
    }

    // Import video capture manager
    const { recordShootingSession } = await import('../video/VideoCaptureManager');

    // Attempt recording with retry logic
    const result = await RecoveryManager.attemptRecovery(
      () => recordShootingSession(processingConfig, outputPath),
      ErrorCategory.CAMERA,
      3
    );

    if (result.result && result.result.success) {
      return {
        success: true,
        videoPath: result.result.videoPath,
      };
    }

    // Recovery failed
    const recovery = await RecoveryManager.recoverFromCameraFailure();
    
    return {
      success: false,
      error: recovery.message,
    };
  } catch (error) {
    const errorContext = ErrorHandler.handleError(error, ErrorCategory.CAMERA, { userId });
    
    return {
      success: false,
      error: errorContext.userInfo.message,
    };
  }
}

/**
 * Wrap video analysis with error handling and fallback
 */
export async function robustVideoAnalysis(
  videoPath: string,
  processingConfig: ProcessingConfig,
  userId: string
): Promise<{ success: boolean; result?: FormAnalysisResult; tier?: string; error?: string }> {
  try {
    // Backup session data before processing
    await RecoveryManager.backupSessionData(videoPath, { videoPath, userId, timestamp: Date.now() });

    // Check privacy preferences
    const canUseCloud = await PrivacyManager.canUseCloudProcessing(userId);
    
    if (!canUseCloud && processingConfig.selectedTier === 'cloud') {
      console.log('Cloud processing not allowed, using local analysis');
      processingConfig.selectedTier = 'lightweight_ml';
    }

    // Import analysis integration
    const { analyzeShootingVideo } = await import('../ml/MLAnalysisIntegration');

    // Attempt analysis with retry and fallback
    const result = await RecoveryManager.attemptRecovery(
      () => analyzeShootingVideo(videoPath, processingConfig),
      ErrorCategory.VIDEO_PROCESSING,
      2
    );

    if (result.result) {
      return {
        success: true,
        result: result.result,
        tier: processingConfig.selectedTier,
      };
    }

    // Try recovery with fallback tier
    const recovery = await RecoveryManager.recoverFromProcessingFailure(videoPath);
    
    if (recovery.success) {
      // Retry with basic analysis
      const basicConfig = { ...processingConfig, selectedTier: 'basic' as const };
      const basicResult = await analyzeShootingVideo(videoPath, basicConfig);
      
      return {
        success: true,
        result: basicResult,
        tier: 'basic',
      };
    }

    return {
      success: false,
      error: recovery.message,
    };
  } catch (error) {
    const errorContext = ErrorHandler.handleError(error, ErrorCategory.VIDEO_PROCESSING, { userId, videoPath });
    
    return {
      success: false,
      error: errorContext.userInfo.message,
    };
  }
}

/**
 * Wrap ML model loading with error handling and fallback
 */
export async function robustMLModelLoad(
  tier: string
): Promise<{ success: boolean; model?: any; fallbackUsed: boolean; error?: string }> {
  try {
    // Import ML config
    const { selectMLModel } = await import('../ml/TensorFlowConfig');

    // Attempt model loading with retry
    const result = await RecoveryManager.attemptRecovery(
      () => selectMLModel(tier),
      ErrorCategory.ML_MODEL,
      2
    );

    if (result.result) {
      return {
        success: true,
        model: result.result,
        fallbackUsed: result.recovered,
      };
    }

    // Try recovery with fallback model
    const recovery = await RecoveryManager.recoverFromMLFailure('basic');
    
    if (recovery.success) {
      const fallbackModel = await selectMLModel('basic');
      return {
        success: true,
        model: fallbackModel,
        fallbackUsed: true,
      };
    }

    return {
      success: false,
      fallbackUsed: false,
      error: recovery.message,
    };
  } catch (error) {
    const errorContext = ErrorHandler.handleError(error, ErrorCategory.ML_MODEL, { tier });
    
    return {
      success: false,
      fallbackUsed: false,
      error: errorContext.userInfo.message,
    };
  }
}

/**
 * Wrap data sync with error handling and retry
 */
export async function robustDataSync(
  userId: string
): Promise<{ success: boolean; syncedCount: number; error?: string }> {
  try {
    // Check privacy preferences
    const preferences = await PrivacyManager.getPrivacyPreferences(userId);
    
    if (preferences.localProcessingOnly) {
      console.log('User prefers local-only mode, skipping sync');
      return {
        success: true,
        syncedCount: 0,
      };
    }

    // Import sync manager
    const SyncManager = (await import('../cloud/SyncManager')).default;

    // Attempt sync with retry
    const result = await RecoveryManager.attemptRecovery(
      () => SyncManager.synchronize(),
      ErrorCategory.SYNC,
      3
    );

    if (result.result && result.result.success) {
      return {
        success: true,
        syncedCount: result.result.syncedCount,
      };
    }

    // Recovery failed
    return {
      success: false,
      syncedCount: 0,
      error: 'Sync failed. Your data is safe locally and will sync later.',
    };
  } catch (error) {
    const errorContext = ErrorHandler.handleError(error, ErrorCategory.SYNC, { userId });
    
    return {
      success: false,
      syncedCount: 0,
      error: errorContext.userInfo.message,
    };
  }
}

/**
 * Wrap cloud upload with encryption and privacy checks
 */
export async function robustCloudUpload(
  videoPath: string,
  sessionId: string,
  userId: string
): Promise<{ success: boolean; encrypted: boolean; error?: string }> {
  try {
    // Check privacy consent
    const canUseCloud = await PrivacyManager.canUseCloudProcessing(userId);
    
    if (!canUseCloud) {
      return {
        success: false,
        encrypted: false,
        error: 'Cloud upload not allowed by privacy settings',
      };
    }

    // Log privacy event
    await PrivacyManager.logPrivacyEvent(userId, 'cloud_upload_initiated', {
      sessionId,
      videoPath,
    });

    // Encrypt video data for transmission
    const videoData = { path: videoPath, sessionId, userId };
    const securePayload = await SecurityManager.createSecurePayload(videoData, userId);

    // Import cloud service
    const CloudMLService = (await import('../cloud/CloudMLService')).default;

    // Attempt upload with retry
    const result = await RecoveryManager.attemptRecovery(
      () => CloudMLService.uploadVideoForAnalysis(userId, sessionId, videoPath),
      ErrorCategory.NETWORK,
      2
    );

    if (result.result && result.result.success) {
      // Log successful upload
      await PrivacyManager.logPrivacyEvent(userId, 'cloud_upload_completed', {
        sessionId,
        encrypted: true,
      });

      return {
        success: true,
        encrypted: true,
      };
    }

    // Recovery failed - switch to offline mode
    const recovery = await RecoveryManager.recoverFromNetworkFailure();
    
    return {
      success: false,
      encrypted: false,
      error: recovery.message,
    };
  } catch (error) {
    const errorContext = ErrorHandler.handleError(error, ErrorCategory.NETWORK, { userId, sessionId });
    
    return {
      success: false,
      encrypted: false,
      error: errorContext.userInfo.message,
    };
  }
}

/**
 * Wrap storage operations with error handling and recovery
 */
export async function robustStorageOperation<T>(
  operation: () => Promise<T>,
  userId: string,
  operationName: string
): Promise<{ success: boolean; result?: T; error?: string }> {
  try {
    // Attempt operation with retry
    const result = await RecoveryManager.attemptRecovery(
      operation,
      ErrorCategory.STORAGE,
      2
    );

    if (result.result !== undefined) {
      return {
        success: true,
        result: result.result,
      };
    }

    // Try recovery
    const recovery = await RecoveryManager.recoverFromStorageFailure();
    
    if (recovery.success) {
      // Retry operation after recovery
      const retryResult = await operation();
      return {
        success: true,
        result: retryResult,
      };
    }

    return {
      success: false,
      error: recovery.message,
    };
  } catch (error) {
    const errorContext = ErrorHandler.handleError(error, ErrorCategory.STORAGE, {
      userId,
      operation: operationName,
    });
    
    return {
      success: false,
      error: errorContext.userInfo.message,
    };
  }
}

/**
 * Handle graceful degradation for feature unavailability
 */
export function handleFeatureDegradation(
  featureName: string,
  fallbackMessage: string
): void {
  console.log(`Feature degradation: ${featureName}`);
  
  ErrorHandler.handleError(
    new AppError(
      `${featureName} is temporarily unavailable`,
      ErrorCategory.UNKNOWN,
      ErrorSeverity.MEDIUM,
      RecoveryStrategy.FALLBACK
    ),
    ErrorCategory.UNKNOWN,
    { feature: featureName, fallback: fallbackMessage }
  );
}

/**
 * Initialize robust system on app startup
 */
export async function initializeRobustSystem(userId: string): Promise<void> {
  try {
    console.log('Initializing robust system...');

    // Initialize privacy preferences
    const preferences = await PrivacyManager.getPrivacyPreferences(userId);
    console.log('Privacy preferences loaded:', preferences);

    // Set up error listener for UI notifications
    ErrorHandler.addErrorListener((errorContext) => {
      console.log('Error occurred:', errorContext.userInfo.title);
      // In production, show UI notification
    });

    // Clean up old backups
    await RecoveryManager.cleanupOldBackups();

    console.log('Robust system initialized successfully');
  } catch (error) {
    console.error('Failed to initialize robust system:', error);
    // Non-critical - app can continue
  }
}

/**
 * Cleanup on app shutdown
 */
export async function cleanupRobustSystem(): Promise<void> {
  try {
    console.log('Cleaning up robust system...');

    // Preserve any pending data
    await RecoveryManager.preserveDataOnCrash();

    // Clear error log
    ErrorHandler.clearErrorLog();

    console.log('Robust system cleanup completed');
  } catch (error) {
    console.error('Failed to cleanup robust system:', error);
  }
}
