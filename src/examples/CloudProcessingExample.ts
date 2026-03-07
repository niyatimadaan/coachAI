/**
 * Cloud Processing and Sync Example
 * Demonstrates how to use cloud ML service and sync manager
 */

import CloudMLService from '../cloud/CloudMLService';
import SyncManager from '../cloud/SyncManager';
import SessionOperations from '../database/SessionOperations';
import { initializeProcessingConfig, routeVideoAnalysis } from '../utils/AdaptiveProcessingRouter';
import { ShootingSession } from '../types/models';

/**
 * Example 1: Request and manage user consent for cloud processing
 */
async function exampleConsentManagement() {
  console.log('\n=== Example 1: Consent Management ===\n');

  const userId = 'user123';

  // Check if user has already consented
  const hasConsent = await CloudMLService.hasCloudConsent(userId);
  console.log(`User has consent: ${hasConsent}`);

  if (!hasConsent) {
    // Request consent from user
    console.log('Requesting user consent...');
    const consent = await CloudMLService.requestCloudConsent(userId);
    console.log('Initial consent:', consent);

    // User grants consent through UI
    await CloudMLService.updateConsent(userId, {
      cloudProcessing: true,
      videoUpload: true
    });
    console.log('Consent updated: User has granted cloud processing permission');
  }

  // Verify consent
  const updatedConsent = await CloudMLService.hasCloudConsent(userId);
  console.log(`User consent verified: ${updatedConsent}`);
}

/**
 * Example 2: Upload video for cloud analysis
 */
async function exampleCloudAnalysis() {
  console.log('\n=== Example 2: Cloud Analysis ===\n');

  const userId = 'user123';
  const sessionId = 'session456';
  const videoPath = '/path/to/shooting/video.mp4';

  // Ensure user has consented
  await CloudMLService.updateConsent(userId, {
    cloudProcessing: true,
    videoUpload: true
  });

  // Upload video for analysis
  console.log('Uploading video for cloud analysis...');
  const result = await CloudMLService.uploadVideoForAnalysis(
    userId,
    sessionId,
    videoPath
  );

  if (result.success && result.analysisResult) {
    console.log('Analysis completed successfully!');
    console.log(`Form Score: ${result.analysisResult.overallScore}`);
    console.log(`Processing Time: ${result.processingTime}ms`);
    console.log(`Detected Issues: ${result.analysisResult.detectedIssues.length}`);
    
    result.analysisResult.detectedIssues.forEach((issue, index) => {
      console.log(`\nIssue ${index + 1}:`);
      console.log(`  Type: ${issue.type}`);
      console.log(`  Severity: ${issue.severity}`);
      console.log(`  Description: ${issue.description}`);
      console.log(`  Recommended Drills: ${issue.recommendedDrills.join(', ')}`);
    });
  } else {
    console.error('Analysis failed:', result.error);
  }
}

/**
 * Example 3: Queue sessions for synchronization
 */
async function exampleQueueForSync() {
  console.log('\n=== Example 3: Queue for Sync ===\n');

  const sessionId = 'session789';

  // Queue a new session for sync
  console.log('Queueing session for sync...');
  await SyncManager.queueForSync(sessionId, 'create');
  console.log(`Session ${sessionId} queued for sync`);

  // Check sync queue status
  const status = await SyncManager.getSyncQueueStatus();
  console.log('\nSync Queue Status:');
  console.log(`  Pending: ${status.pendingCount}`);
  console.log(`  Failed: ${status.failedCount}`);
  if (status.oldestPending) {
    console.log(`  Oldest Pending: ${status.oldestPending.toISOString()}`);
  }
}

/**
 * Example 4: Synchronize data with cloud
 */
async function exampleSynchronization() {
  console.log('\n=== Example 4: Data Synchronization ===\n');

  // Configure bandwidth settings
  console.log('Configuring bandwidth settings...');
  SyncManager.updateBandwidthConfig({
    preferWifiOnly: true,
    maxConcurrentUploads: 2,
    maxUploadSize: 50 * 1024 * 1024 // 50MB
  });

  // Trigger synchronization
  console.log('Starting synchronization...');
  const result = await SyncManager.synchronize();

  console.log('\nSync Results:');
  console.log(`  Success: ${result.success}`);
  console.log(`  Synced: ${result.syncedCount}`);
  console.log(`  Failed: ${result.failedCount}`);

  if (result.errors.length > 0) {
    console.log('\nErrors:');
    result.errors.forEach(error => {
      console.log(`  Session ${error.sessionId}: ${error.error}`);
    });
  }
}

/**
 * Example 5: Adaptive processing with cloud fallback
 */
async function exampleAdaptiveProcessing() {
  console.log('\n=== Example 5: Adaptive Processing with Cloud ===\n');

  const userId = 'user123';
  const videoPath = '/path/to/video.mp4';

  // Initialize processing config
  const config = await initializeProcessingConfig({
    cloudProcessing: true,
    dataSharing: false
  });

  console.log(`Selected processing tier: ${config.selectedTier}`);
  console.log(`Device tier: ${config.deviceCapabilities.tier}`);
  console.log(`Has connectivity: ${config.hasConnectivity}`);

  // Route video analysis (automatically uses cloud if appropriate)
  const result = await routeVideoAnalysis(
    videoPath,
    config,
    async (path, tier) => {
      console.log(`Processing with tier: ${tier}`);
      
      if (tier === 'cloud') {
        // Use cloud processing
        const cloudResult = await CloudMLService.uploadVideoForAnalysis(
          userId,
          'session123',
          path
        );
        return cloudResult.analysisResult;
      }
      
      // Fallback to local processing
      return {
        overallScore: 'B' as const,
        detectedIssues: [],
        biomechanicalMetrics: {
          elbowAlignment: 85,
          wristAngle: 90,
          shoulderSquare: 88,
          followThrough: 90
        }
      };
    }
  );

  console.log('\nProcessing Result:');
  console.log(`  Tier Used: ${result.tier}`);
  console.log(`  Processing Time: ${result.processingTime}ms`);
  console.log(`  Fallback Used: ${result.fallbackUsed}`);
  if (result.data) {
    console.log(`  Form Score: ${result.data.overallScore}`);
  }
}

/**
 * Example 6: Complete workflow with offline queue
 */
async function exampleCompleteWorkflow() {
  console.log('\n=== Example 6: Complete Workflow ===\n');

  const userId = 'user123';
  const sessionId = 'session999';
  const videoPath = '/path/to/video.mp4';

  // Step 1: Create session locally
  console.log('Step 1: Creating session locally...');
  const session: ShootingSession = {
    id: sessionId,
    userId: userId,
    timestamp: new Date(),
    duration: 5000,
    shotAttempts: 10,
    videoPath: videoPath,
    formScore: 'B',
    detectedIssues: [],
    practiceTime: 5000,
    shotCount: 10,
    formAnalysis: {
      overallScore: 'B',
      detectedIssues: [],
      biomechanicalMetrics: {
        elbowAlignment: 85,
        wristAngle: 90,
        shoulderSquare: 88,
        followThrough: 90
      }
    },
    videoMetadata: {
      resolution: '1280x720',
      frameRate: 30,
      lighting: 'good'
    },
    syncStatus: 'local',
    lastModified: new Date()
  };

  await SessionOperations.createSession(session);
  console.log('Session created locally');

  // Step 2: Queue for sync
  console.log('\nStep 2: Queueing for sync...');
  await SyncManager.queueForSync(sessionId, 'create');
  console.log('Session queued for sync');

  // Step 3: Wait for connectivity and sync
  console.log('\nStep 3: Synchronizing when connectivity available...');
  const syncResult = await SyncManager.synchronize();
  
  if (syncResult.success) {
    console.log('Sync completed successfully!');
    
    // Step 4: Verify sync status
    const updatedSession = await SessionOperations.getSession(sessionId);
    console.log(`\nSession sync status: ${updatedSession?.syncStatus}`);
  } else {
    console.log('Sync failed, will retry later');
  }
}

/**
 * Example 7: Privacy-first data deletion
 */
async function exampleDataDeletion() {
  console.log('\n=== Example 7: Data Deletion ===\n');

  const userId = 'user123';

  // User requests data deletion
  console.log('User requested data deletion...');
  
  // Delete cloud data
  await CloudMLService.deleteUserCloudData(userId);
  console.log('Cloud data deleted');

  // Verify consent is cleared
  const hasConsent = await CloudMLService.hasCloudConsent(userId);
  console.log(`Consent cleared: ${!hasConsent}`);
}

/**
 * Run all examples
 */
export async function runCloudProcessingExamples() {
  console.log('='.repeat(60));
  console.log('Cloud Processing and Sync Examples');
  console.log('='.repeat(60));

  try {
    await exampleConsentManagement();
    await exampleCloudAnalysis();
    await exampleQueueForSync();
    await exampleSynchronization();
    await exampleAdaptiveProcessing();
    await exampleCompleteWorkflow();
    await exampleDataDeletion();

    console.log('\n' + '='.repeat(60));
    console.log('All examples completed successfully!');
    console.log('='.repeat(60) + '\n');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runCloudProcessingExamples();
}
