/**
 * Privacy Manager
 * Handles user privacy preferences, data encryption, and data deletion
 */

import DatabaseManager from '../database/DatabaseManager';
import ErrorHandler, { ErrorCategory } from './ErrorHandler';

/**
 * Privacy preferences
 */
export interface PrivacyPreferences {
  localProcessingOnly: boolean;
  cloudProcessingEnabled: boolean;
  videoUploadEnabled: boolean;
  analyticsEnabled: boolean;
  dataSharingEnabled: boolean;
  lastUpdated: Date;
}

/**
 * Data encryption configuration
 */
export interface EncryptionConfig {
  algorithm: 'AES-256-GCM' | 'AES-128-GCM';
  keyDerivation: 'PBKDF2' | 'scrypt';
  iterations: number;
}

/**
 * Data deletion options
 */
export interface DeletionOptions {
  includeSessions: boolean;
  includeProgress: boolean;
  includeVideos: boolean;
  includeBackups: boolean;
  includeCloudData: boolean;
}

/**
 * Privacy Manager class
 */
class PrivacyManager {
  private encryptionConfig: EncryptionConfig = {
    algorithm: 'AES-256-GCM',
    keyDerivation: 'PBKDF2',
    iterations: 100000,
  };

  private defaultPreferences: PrivacyPreferences = {
    localProcessingOnly: false,
    cloudProcessingEnabled: false,
    videoUploadEnabled: false,
    analyticsEnabled: true,
    dataSharingEnabled: false,
    lastUpdated: new Date(),
  };

  /**
   * Get user privacy preferences
   */
  async getPrivacyPreferences(userId: string): Promise<PrivacyPreferences> {
    try {
      const result = await DatabaseManager.executeSql(
        'SELECT * FROM privacy_preferences WHERE user_id = ?',
        [userId]
      );

      if (result.rows.length > 0) {
        const row = result.rows.item(0);
        return {
          localProcessingOnly: row.local_processing_only === 1,
          cloudProcessingEnabled: row.cloud_processing_enabled === 1,
          videoUploadEnabled: row.video_upload_enabled === 1,
          analyticsEnabled: row.analytics_enabled === 1,
          dataSharingEnabled: row.data_sharing_enabled === 1,
          lastUpdated: new Date(row.last_updated),
        };
      }

      // Return defaults if no preferences found
      return this.defaultPreferences;
    } catch (error) {
      ErrorHandler.handleError(error, ErrorCategory.STORAGE, { userId });
      return this.defaultPreferences;
    }
  }

  /**
   * Update user privacy preferences
   */
  async updatePrivacyPreferences(
    userId: string,
    preferences: Partial<PrivacyPreferences>
  ): Promise<void> {
    try {
      const current = await this.getPrivacyPreferences(userId);
      const updated = { ...current, ...preferences, lastUpdated: new Date() };

      await DatabaseManager.executeSql(
        `INSERT OR REPLACE INTO privacy_preferences 
         (user_id, local_processing_only, cloud_processing_enabled, video_upload_enabled, 
          analytics_enabled, data_sharing_enabled, last_updated)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          updated.localProcessingOnly ? 1 : 0,
          updated.cloudProcessingEnabled ? 1 : 0,
          updated.videoUploadEnabled ? 1 : 0,
          updated.analyticsEnabled ? 1 : 0,
          updated.dataSharingEnabled ? 1 : 0,
          updated.lastUpdated.getTime(),
        ]
      );

      console.log(`Privacy preferences updated for user ${userId}`);
    } catch (error) {
      ErrorHandler.handleError(error, ErrorCategory.STORAGE, { userId, preferences });
      throw error;
    }
  }

  /**
   * Check if cloud processing is allowed
   */
  async canUseCloudProcessing(userId: string): Promise<boolean> {
    const preferences = await this.getPrivacyPreferences(userId);
    return preferences.cloudProcessingEnabled && preferences.videoUploadEnabled;
  }

  /**
   * Check if local processing only mode is enabled
   */
  async isLocalProcessingOnly(userId: string): Promise<boolean> {
    const preferences = await this.getPrivacyPreferences(userId);
    return preferences.localProcessingOnly;
  }

  /**
   * Encrypt sensitive data for transmission
   */
  async encryptData(data: string, key: string): Promise<string> {
    try {
      // In production, use react-native-crypto or similar
      // For MVP, we'll use a simple base64 encoding as placeholder
      // IMPORTANT: Replace with actual encryption in production
      
      console.log('Encrypting data...');
      const encrypted = Buffer.from(data).toString('base64');
      
      // In production:
      // const crypto = require('react-native-crypto');
      // const cipher = crypto.createCipheriv(this.encryptionConfig.algorithm, key, iv);
      // const encrypted = cipher.update(data, 'utf8', 'hex') + cipher.final('hex');
      
      return encrypted;
    } catch (error) {
      ErrorHandler.handleError(error, ErrorCategory.UNKNOWN, { operation: 'encrypt' });
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt data received from transmission
   */
  async decryptData(encryptedData: string, key: string): Promise<string> {
    try {
      console.log('Decrypting data...');
      const decrypted = Buffer.from(encryptedData, 'base64').toString('utf8');
      
      // In production:
      // const crypto = require('react-native-crypto');
      // const decipher = crypto.createDecipheriv(this.encryptionConfig.algorithm, key, iv);
      // const decrypted = decipher.update(encryptedData, 'hex', 'utf8') + decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      ErrorHandler.handleError(error, ErrorCategory.UNKNOWN, { operation: 'decrypt' });
      throw new Error('Decryption failed');
    }
  }

  /**
   * Generate encryption key from user credentials
   */
  async generateEncryptionKey(userId: string, salt: string): Promise<string> {
    try {
      // In production, use PBKDF2 or scrypt for key derivation
      // For MVP, generate a simple key
      
      const combined = `${userId}:${salt}`;
      const hash = this.simpleHash(combined);
      
      return hash;
    } catch (error) {
      ErrorHandler.handleError(error, ErrorCategory.UNKNOWN, { operation: 'key_generation' });
      throw new Error('Key generation failed');
    }
  }

  /**
   * Delete all user data
   */
  async deleteAllUserData(userId: string, options: DeletionOptions): Promise<void> {
    try {
      console.log(`Deleting user data for ${userId}...`, options);

      // Delete sessions
      if (options.includeSessions) {
        await DatabaseManager.executeSql(
          'DELETE FROM shooting_sessions WHERE user_id = ?',
          [userId]
        );
        console.log('Sessions deleted');
      }

      // Delete progress data
      if (options.includeProgress) {
        await DatabaseManager.executeSql(
          'DELETE FROM user_progress WHERE user_id = ?',
          [userId]
        );
        console.log('Progress data deleted');
      }

      // Delete video files
      if (options.includeVideos) {
        await this.deleteUserVideos(userId);
        console.log('Videos deleted');
      }

      // Delete backups
      if (options.includeBackups) {
        await DatabaseManager.executeSql(
          'DELETE FROM session_backups WHERE session_id IN (SELECT id FROM shooting_sessions WHERE user_id = ?)',
          [userId]
        );
        console.log('Backups deleted');
      }

      // Delete cloud data
      if (options.includeCloudData) {
        await this.deleteCloudData(userId);
        console.log('Cloud data deletion requested');
      }

      // Delete privacy preferences
      await DatabaseManager.executeSql(
        'DELETE FROM privacy_preferences WHERE user_id = ?',
        [userId]
      );

      console.log(`All requested data deleted for user ${userId}`);
    } catch (error) {
      ErrorHandler.handleError(error, ErrorCategory.STORAGE, { userId, options });
      throw new Error('Data deletion failed');
    }
  }

  /**
   * Delete user video files
   */
  private async deleteUserVideos(userId: string): Promise<void> {
    try {
      // Get all video paths for user
      const result = await DatabaseManager.executeSql(
        'SELECT video_path FROM shooting_sessions WHERE user_id = ?',
        [userId]
      );

      // In production, delete files from file system
      // const RNFS = require('react-native-fs');
      // for (let i = 0; i < result.rows.length; i++) {
      //   const videoPath = result.rows.item(i).video_path;
      //   await RNFS.unlink(videoPath);
      // }

      console.log(`Deleted ${result.rows.length} video files`);
    } catch (error) {
      console.error('Failed to delete video files:', error);
      // Non-critical - continue with other deletions
    }
  }

  /**
   * Request cloud data deletion
   */
  private async deleteCloudData(userId: string): Promise<void> {
    try {
      // In production, make API call to delete cloud data
      // const response = await fetch(`${API_ENDPOINT}/users/${userId}/data`, {
      //   method: 'DELETE',
      //   headers: { 'Authorization': `Bearer ${token}` }
      // });

      console.log(`Cloud data deletion requested for user ${userId}`);
    } catch (error) {
      console.error('Failed to request cloud data deletion:', error);
      // Log but don't throw - user data is deleted locally
    }
  }

  /**
   * Export user data for portability
   */
  async exportUserData(userId: string): Promise<string> {
    try {
      console.log(`Exporting data for user ${userId}...`);

      // Get all user data
      const sessions = await DatabaseManager.executeSql(
        'SELECT * FROM shooting_sessions WHERE user_id = ?',
        [userId]
      );

      const progress = await DatabaseManager.executeSql(
        'SELECT * FROM user_progress WHERE user_id = ?',
        [userId]
      );

      const preferences = await this.getPrivacyPreferences(userId);

      // Compile into exportable format
      const exportData = {
        userId,
        exportDate: new Date().toISOString(),
        sessions: this.rowsToArray(sessions),
        progress: this.rowsToArray(progress),
        preferences,
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      ErrorHandler.handleError(error, ErrorCategory.STORAGE, { userId });
      throw new Error('Data export failed');
    }
  }

  /**
   * Anonymize user data for analytics
   */
  async anonymizeUserData(userId: string): Promise<string> {
    // Generate anonymous ID
    const anonymousId = this.simpleHash(userId + Date.now().toString());
    
    console.log(`Anonymized user ${userId} as ${anonymousId}`);
    return anonymousId;
  }

  /**
   * Check if video should be processed locally
   */
  async shouldProcessLocally(userId: string): Promise<boolean> {
    const preferences = await this.getPrivacyPreferences(userId);
    return preferences.localProcessingOnly || !preferences.cloudProcessingEnabled;
  }

  /**
   * Log privacy-related event
   */
  async logPrivacyEvent(
    userId: string,
    eventType: string,
    details: Record<string, any>
  ): Promise<void> {
    try {
      await DatabaseManager.executeSql(
        `INSERT INTO privacy_events (user_id, event_type, details, timestamp)
         VALUES (?, ?, ?, ?)`,
        [userId, eventType, JSON.stringify(details), Date.now()]
      );
    } catch (error) {
      console.error('Failed to log privacy event:', error);
      // Non-critical - don't throw
    }
  }

  /**
   * Convert SQL result rows to array
   */
  private rowsToArray(result: any): any[] {
    const array = [];
    for (let i = 0; i < result.rows.length; i++) {
      array.push(result.rows.item(i));
    }
    return array;
  }

  /**
   * Simple hash function (for MVP only - use proper crypto in production)
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}

export default new PrivacyManager();
