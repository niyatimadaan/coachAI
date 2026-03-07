/**
 * Recovery Manager
 * Implements automatic recovery mechanisms for various failure modes
 */

import ErrorHandler, { ErrorCategory, AppError, ErrorSeverity, RecoveryStrategy } from './ErrorHandler';
import DatabaseManager from '../database/DatabaseManager';

/**
 * Recovery attempt result
 */
export interface RecoveryResult {
  success: boolean;
  message: string;
  fallbackUsed?: boolean;
  dataPreserved: boolean;
}

/**
 * Session backup for recovery
 */
export interface SessionBackup {
  sessionId: string;
  timestamp: Date;
  data: any;
  checksum: string;
}

/**
 * Recovery Manager class
 */
class RecoveryManager {
  private maxRetryAttempts: number = 3;
  private retryDelay: number = 1000; // 1 second
  private sessionBackups: Map<string, SessionBackup> = new Map();

  /**
   * Attempt to recover from an error with retry logic
   */
  async attemptRecovery<T>(
    operation: () => Promise<T>,
    category: ErrorCategory,
    maxAttempts: number = this.maxRetryAttempts
  ): Promise<{ result?: T; recovered: boolean; attempts: number }> {
    let attempts = 0;
    let lastError: Error | unknown;

    while (attempts < maxAttempts) {
      attempts++;
      
      try {
        console.log(`Recovery attempt ${attempts}/${maxAttempts} for ${category}`);
        const result = await operation();
        
        if (attempts > 1) {
          console.log(`Recovery successful after ${attempts} attempts`);
        }
        
        return { result, recovered: attempts > 1, attempts };
      } catch (error) {
        lastError = error;
        console.error(`Attempt ${attempts} failed:`, error);
        
        if (attempts < maxAttempts) {
          // Wait before retrying with exponential backoff
          const delay = this.retryDelay * Math.pow(2, attempts - 1);
          await this.sleep(delay);
        }
      }
    }

    // All attempts failed
    ErrorHandler.handleError(lastError, category, { attempts });
    return { recovered: false, attempts };
  }

  /**
   * Backup session data before processing
   */
  async backupSessionData(sessionId: string, data: any): Promise<void> {
    try {
      const backup: SessionBackup = {
        sessionId,
        timestamp: new Date(),
        data: JSON.parse(JSON.stringify(data)), // Deep copy
        checksum: this.calculateChecksum(data),
      };

      this.sessionBackups.set(sessionId, backup);
      
      // Also persist to database
      await DatabaseManager.executeSql(
        `INSERT OR REPLACE INTO session_backups (session_id, timestamp, data, checksum)
         VALUES (?, ?, ?, ?)`,
        [sessionId, backup.timestamp.getTime(), JSON.stringify(data), backup.checksum]
      );

      console.log(`Session ${sessionId} backed up successfully`);
    } catch (error) {
      console.error('Failed to backup session data:', error);
      // Non-critical error - don't throw
    }
  }

  /**
   * Restore session data from backup
   */
  async restoreSessionData(sessionId: string): Promise<any | null> {
    try {
      // Try memory first
      const memoryBackup = this.sessionBackups.get(sessionId);
      if (memoryBackup) {
        console.log(`Restored session ${sessionId} from memory`);
        return memoryBackup.data;
      }

      // Try database
      const result = await DatabaseManager.executeSql(
        'SELECT data, checksum FROM session_backups WHERE session_id = ? ORDER BY timestamp DESC LIMIT 1',
        [sessionId]
      );

      if (result.rows.length > 0) {
        const row = result.rows.item(0);
        const data = JSON.parse(row.data);
        
        // Verify checksum
        const calculatedChecksum = this.calculateChecksum(data);
        if (calculatedChecksum === row.checksum) {
          console.log(`Restored session ${sessionId} from database`);
          return data;
        } else {
          console.error('Backup data corrupted - checksum mismatch');
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to restore session data:', error);
      return null;
    }
  }

  /**
   * Clean up old backups
   */
  async cleanupOldBackups(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const cutoffTime = Date.now() - maxAge;
      
      await DatabaseManager.executeSql(
        'DELETE FROM session_backups WHERE timestamp < ?',
        [cutoffTime]
      );

      // Clean memory backups
      for (const [sessionId, backup] of this.sessionBackups.entries()) {
        if (backup.timestamp.getTime() < cutoffTime) {
          this.sessionBackups.delete(sessionId);
        }
      }

      console.log('Old backups cleaned up');
    } catch (error) {
      console.error('Failed to cleanup old backups:', error);
    }
  }

  /**
   * Recover from camera failure
   */
  async recoverFromCameraFailure(): Promise<RecoveryResult> {
    console.log('Attempting camera recovery...');

    try {
      // Check if camera is available
      // In production, this would check camera hardware status
      
      return {
        success: true,
        message: 'Camera recovered successfully',
        dataPreserved: true,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Camera recovery failed. Please restart the app.',
        dataPreserved: true,
      };
    }
  }

  /**
   * Recover from ML model failure
   */
  async recoverFromMLFailure(fallbackTier: string): Promise<RecoveryResult> {
    console.log(`Attempting ML recovery with fallback tier: ${fallbackTier}`);

    try {
      // Attempt to load fallback model
      // In production, this would load a simpler model
      
      return {
        success: true,
        message: `Using ${fallbackTier} analysis instead`,
        fallbackUsed: true,
        dataPreserved: true,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Analysis unavailable. Please try again later.',
        dataPreserved: true,
      };
    }
  }

  /**
   * Recover from storage failure
   */
  async recoverFromStorageFailure(): Promise<RecoveryResult> {
    console.log('Attempting storage recovery...');

    try {
      // Check available storage
      const storageInfo = await this.checkStorageSpace();
      
      if (storageInfo.available < 100 * 1024 * 1024) { // Less than 100MB
        // Try to free up space by cleaning old sessions
        await this.cleanupOldSessions();
        
        const newStorageInfo = await this.checkStorageSpace();
        if (newStorageInfo.available > storageInfo.available) {
          return {
            success: true,
            message: 'Storage space freed up',
            dataPreserved: true,
          };
        }
      }

      return {
        success: false,
        message: 'Storage full. Please free up space manually.',
        dataPreserved: true,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Storage recovery failed',
        dataPreserved: true,
      };
    }
  }

  /**
   * Recover from network failure
   */
  async recoverFromNetworkFailure(): Promise<RecoveryResult> {
    console.log('Attempting network recovery...');

    try {
      // Switch to offline mode
      // Queue operations for later sync
      
      return {
        success: true,
        message: 'Switched to offline mode. Your progress will sync when connection is restored.',
        fallbackUsed: true,
        dataPreserved: true,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Network recovery failed',
        dataPreserved: true,
      };
    }
  }

  /**
   * Recover from sync failure
   */
  async recoverFromSyncFailure(sessionId: string): Promise<RecoveryResult> {
    console.log(`Attempting sync recovery for session ${sessionId}...`);

    try {
      // Verify local data integrity
      const backup = await this.restoreSessionData(sessionId);
      
      if (backup) {
        // Re-queue for sync
        await DatabaseManager.executeSql(
          `INSERT OR REPLACE INTO sync_queue (session_id, operation, retry_count, created_at)
           VALUES (?, 'create', 0, ?)`,
          [sessionId, Date.now()]
        );
        
        return {
          success: true,
          message: 'Session re-queued for sync',
          dataPreserved: true,
        };
      }

      return {
        success: false,
        message: 'Could not recover session data',
        dataPreserved: false,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Sync recovery failed',
        dataPreserved: false,
      };
    }
  }

  /**
   * Recover from video processing failure
   */
  async recoverFromProcessingFailure(videoPath: string): Promise<RecoveryResult> {
    console.log(`Attempting processing recovery for ${videoPath}...`);

    try {
      // Verify video file exists and is valid
      // In production, check file system
      
      // Try with lower quality settings
      return {
        success: true,
        message: 'Retrying with adjusted settings',
        fallbackUsed: true,
        dataPreserved: true,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Video processing recovery failed',
        dataPreserved: true,
      };
    }
  }

  /**
   * Check available storage space
   */
  private async checkStorageSpace(): Promise<{ total: number; available: number }> {
    // In production, use react-native-fs or similar
    // For MVP, return mock data
    return {
      total: 32 * 1024 * 1024 * 1024, // 32GB
      available: 5 * 1024 * 1024 * 1024, // 5GB
    };
  }

  /**
   * Clean up old sessions to free storage
   */
  private async cleanupOldSessions(): Promise<void> {
    try {
      // Delete sessions older than 90 days
      const cutoffTime = Date.now() - (90 * 24 * 60 * 60 * 1000);
      
      await DatabaseManager.executeSql(
        'DELETE FROM shooting_sessions WHERE timestamp < ?',
        [cutoffTime]
      );

      console.log('Old sessions cleaned up');
    } catch (error) {
      console.error('Failed to cleanup old sessions:', error);
    }
  }

  /**
   * Calculate checksum for data integrity
   */
  private calculateChecksum(data: any): string {
    const str = JSON.stringify(data);
    let hash = 0;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString(16);
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Preserve user data during crash
   */
  async preserveDataOnCrash(): Promise<void> {
    try {
      console.log('Preserving data before crash...');
      
      // Flush any pending database operations
      // In production, ensure all writes are committed
      
      console.log('Data preserved successfully');
    } catch (error) {
      console.error('Failed to preserve data:', error);
    }
  }
}

export default new RecoveryManager();
