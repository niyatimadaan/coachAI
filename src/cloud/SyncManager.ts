/**
 * Sync Manager
 * Handles data synchronization between local storage and cloud backend
 */

import DatabaseManager from '../database/DatabaseManager';
import SessionOperations from '../database/SessionOperations';
import { ShootingSession, SyncStatus } from '../types/models';
import { checkConnectivity, ConnectivityStatus } from '../utils/AdaptiveProcessingRouter';

/**
 * Sync operation types
 */
export type SyncOperation = 'create' | 'update' | 'delete';

/**
 * Sync queue item
 */
export interface SyncQueueItem {
  id: number;
  sessionId: string;
  operation: SyncOperation;
  retryCount: number;
  createdAt: Date;
  lastAttempt?: Date;
}

/**
 * Sync result
 */
export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: Array<{ sessionId: string; error: string }>;
}

/**
 * Bandwidth configuration
 */
export interface BandwidthConfig {
  maxConcurrentUploads: number;
  maxUploadSize: number;
  preferWifiOnly: boolean;
}

/**
 * Conflict resolution strategy
 */
export type ConflictResolution = 'local_wins' | 'remote_wins' | 'newest_wins';

class SyncManager {
  private syncInProgress: boolean = false;
  private maxRetries: number = 3;
  private bandwidthConfig: BandwidthConfig = {
    maxConcurrentUploads: 2,
    maxUploadSize: 50 * 1024 * 1024, // 50MB
    preferWifiOnly: true
  };

  /**
   * Add session to sync queue
   */
  async queueForSync(sessionId: string, operation: SyncOperation): Promise<void> {
    await DatabaseManager.executeSql(
      `INSERT INTO sync_queue (session_id, operation, retry_count, created_at)
       VALUES (?, ?, 0, ?)`,
      [sessionId, operation, Date.now()]
    );

    // Update session sync status
    await SessionOperations.updateSyncStatus(sessionId, 'pending');

    console.log(`Session ${sessionId} queued for sync (${operation})`);
  }

  /**
   * Get pending sync operations
   */
  async getPendingSyncOperations(): Promise<SyncQueueItem[]> {
    const result = await DatabaseManager.executeSql(
      `SELECT * FROM sync_queue 
       WHERE retry_count < ?
       ORDER BY created_at ASC`,
      [this.maxRetries]
    );

    const items: SyncQueueItem[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      items.push({
        id: row.id,
        sessionId: row.session_id,
        operation: row.operation,
        retryCount: row.retry_count,
        createdAt: new Date(row.created_at),
        lastAttempt: row.last_attempt ? new Date(row.last_attempt) : undefined
      });
    }

    return items;
  }

  /**
   * Synchronize pending data with cloud
   */
  async synchronize(): Promise<SyncResult> {
    if (this.syncInProgress) {
      console.log('Sync already in progress, skipping');
      return {
        success: false,
        syncedCount: 0,
        failedCount: 0,
        errors: [{ sessionId: '', error: 'Sync already in progress' }]
      };
    }

    this.syncInProgress = true;

    try {
      // Check connectivity
      const connectivity = await checkConnectivity();
      if (!connectivity.isConnected) {
        console.log('No connectivity, skipping sync');
        return {
          success: false,
          syncedCount: 0,
          failedCount: 0,
          errors: [{ sessionId: '', error: 'No network connectivity' }]
        };
      }

      // Check bandwidth constraints
      if (!this.shouldSync(connectivity)) {
        console.log('Bandwidth constraints not met, skipping sync');
        return {
          success: false,
          syncedCount: 0,
          failedCount: 0,
          errors: [{ sessionId: '', error: 'Bandwidth constraints not met' }]
        };
      }

      // Get pending operations
      const pendingOps = await this.getPendingSyncOperations();
      console.log(`Found ${pendingOps.length} pending sync operations`);

      if (pendingOps.length === 0) {
        return {
          success: true,
          syncedCount: 0,
          failedCount: 0,
          errors: []
        };
      }

      // Process operations in batches
      const batchSize = this.bandwidthConfig.maxConcurrentUploads;
      let syncedCount = 0;
      let failedCount = 0;
      const errors: Array<{ sessionId: string; error: string }> = [];

      for (let i = 0; i < pendingOps.length; i += batchSize) {
        const batch = pendingOps.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map(op => this.processSyncOperation(op))
        );

        results.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            syncedCount++;
          } else {
            failedCount++;
            const op = batch[index];
            errors.push({
              sessionId: op.sessionId,
              error: result.status === 'rejected' ? result.reason : 'Unknown error'
            });
          }
        });
      }

      console.log(`Sync completed: ${syncedCount} synced, ${failedCount} failed`);

      return {
        success: failedCount === 0,
        syncedCount,
        failedCount,
        errors
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Process a single sync operation
   */
  private async processSyncOperation(item: SyncQueueItem): Promise<boolean> {
    try {
      console.log(`Processing sync operation: ${item.operation} for session ${item.sessionId}`);

      // Update retry count and last attempt
      await DatabaseManager.executeSql(
        `UPDATE sync_queue 
         SET retry_count = retry_count + 1, last_attempt = ?
         WHERE id = ?`,
        [Date.now(), item.id]
      );

      // Get session data
      const session = await SessionOperations.getSession(item.sessionId);
      if (!session) {
        console.error(`Session ${item.sessionId} not found`);
        await this.removeSyncOperation(item.id);
        return false;
      }

      // Perform sync operation based on type
      let success = false;
      switch (item.operation) {
        case 'create':
          success = await this.syncCreateSession(session);
          break;
        case 'update':
          success = await this.syncUpdateSession(session);
          break;
        case 'delete':
          success = await this.syncDeleteSession(session.id);
          break;
      }

      if (success) {
        // Update session sync status
        await SessionOperations.updateSyncStatus(item.sessionId, 'synced');
        
        // Remove from sync queue
        await this.removeSyncOperation(item.id);
        
        console.log(`Successfully synced session ${item.sessionId}`);
        return true;
      } else {
        console.error(`Failed to sync session ${item.sessionId}`);
        return false;
      }
    } catch (error) {
      console.error(`Error processing sync operation:`, error);
      return false;
    }
  }

  /**
   * Sync create operation
   */
  private async syncCreateSession(session: ShootingSession): Promise<boolean> {
    // In production, make API call to create session on server
    console.log(`Syncing create for session ${session.id}`);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check for conflicts
    const conflict = await this.checkForConflict(session.id);
    if (conflict) {
      return await this.resolveConflict(session, 'newest_wins');
    }
    
    return true;
  }

  /**
   * Sync update operation
   */
  private async syncUpdateSession(session: ShootingSession): Promise<boolean> {
    // In production, make API call to update session on server
    console.log(`Syncing update for session ${session.id}`);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check for conflicts
    const conflict = await this.checkForConflict(session.id);
    if (conflict) {
      return await this.resolveConflict(session, 'newest_wins');
    }
    
    return true;
  }

  /**
   * Sync delete operation
   */
  private async syncDeleteSession(sessionId: string): Promise<boolean> {
    // In production, make API call to delete session on server
    console.log(`Syncing delete for session ${sessionId}`);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return true;
  }

  /**
   * Check for sync conflicts
   */
  private async checkForConflict(sessionId: string): Promise<boolean> {
    // In production, check if remote version is newer than local
    // For MVP, we'll assume no conflicts
    return false;
  }

  /**
   * Resolve sync conflict
   */
  private async resolveConflict(
    localSession: ShootingSession,
    strategy: ConflictResolution
  ): Promise<boolean> {
    console.log(`Resolving conflict for session ${localSession.id} using strategy: ${strategy}`);

    switch (strategy) {
      case 'local_wins':
        // Keep local version, overwrite remote
        return true;
      
      case 'remote_wins':
        // Fetch remote version and overwrite local
        // In production, fetch from API and update local database
        return true;
      
      case 'newest_wins':
        // Compare timestamps and keep newest
        // In production, fetch remote timestamp and compare
        return true;
      
      default:
        return false;
    }
  }

  /**
   * Remove sync operation from queue
   */
  private async removeSyncOperation(id: number): Promise<void> {
    await DatabaseManager.executeSql(
      'DELETE FROM sync_queue WHERE id = ?',
      [id]
    );
  }

  /**
   * Check if sync should proceed based on bandwidth constraints
   */
  private shouldSync(connectivity: ConnectivityStatus): boolean {
    // If WiFi-only preference is set, only sync on WiFi
    if (this.bandwidthConfig.preferWifiOnly && connectivity.connectionType !== 'wifi') {
      return false;
    }

    // Don't sync on metered connections
    if (connectivity.isMetered) {
      return false;
    }

    return true;
  }

  /**
   * Update bandwidth configuration
   */
  updateBandwidthConfig(config: Partial<BandwidthConfig>): void {
    this.bandwidthConfig = {
      ...this.bandwidthConfig,
      ...config
    };
    console.log('Bandwidth config updated:', this.bandwidthConfig);
  }

  /**
   * Clear sync queue (for testing/reset)
   */
  async clearSyncQueue(): Promise<void> {
    await DatabaseManager.executeSql('DELETE FROM sync_queue');
    console.log('Sync queue cleared');
  }

  /**
   * Get sync queue status
   */
  async getSyncQueueStatus(): Promise<{
    pendingCount: number;
    failedCount: number;
    oldestPending?: Date;
  }> {
    const result = await DatabaseManager.executeSql(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN retry_count >= ? THEN 1 ELSE 0 END) as failed,
        MIN(created_at) as oldest
       FROM sync_queue`,
      [this.maxRetries]
    );

    const row = result.rows.item(0);
    return {
      pendingCount: row.total - row.failed,
      failedCount: row.failed,
      oldestPending: row.oldest ? new Date(row.oldest) : undefined
    };
  }
}

export default new SyncManager();
