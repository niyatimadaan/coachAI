/**
 * Privacy Manager Tests
 * Tests for privacy preferences, data encryption, and data deletion
 */

import PrivacyManager from '../PrivacyManager';
import DatabaseManager from '../../database/DatabaseManager';

// Mock DatabaseManager
jest.mock('../../database/DatabaseManager');

describe('PrivacyManager', () => {
  const mockUserId = 'user123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Privacy Preferences', () => {
    it('should return default preferences when none exist', async () => {
      (DatabaseManager.executeSql as jest.Mock).mockResolvedValue({
        rows: { length: 0 },
      });

      const preferences = await PrivacyManager.getPrivacyPreferences(mockUserId);

      expect(preferences.localProcessingOnly).toBe(false);
      expect(preferences.cloudProcessingEnabled).toBe(false);
      expect(preferences.analyticsEnabled).toBe(true);
    });

    it('should retrieve stored preferences', async () => {
      (DatabaseManager.executeSql as jest.Mock).mockResolvedValue({
        rows: {
          length: 1,
          item: (index: number) => ({
            local_processing_only: 1,
            cloud_processing_enabled: 0,
            video_upload_enabled: 0,
            analytics_enabled: 1,
            data_sharing_enabled: 0,
            last_updated: Date.now(),
          }),
        },
      });

      const preferences = await PrivacyManager.getPrivacyPreferences(mockUserId);

      expect(preferences.localProcessingOnly).toBe(true);
      expect(preferences.cloudProcessingEnabled).toBe(false);
      expect(preferences.analyticsEnabled).toBe(true);
    });

    it('should update privacy preferences', async () => {
      (DatabaseManager.executeSql as jest.Mock)
        .mockResolvedValueOnce({
          rows: { length: 0 },
        })
        .mockResolvedValueOnce(undefined);

      await PrivacyManager.updatePrivacyPreferences(mockUserId, {
        cloudProcessingEnabled: true,
        videoUploadEnabled: true,
      });

      expect(DatabaseManager.executeSql).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO privacy_preferences'),
        expect.arrayContaining([mockUserId, 0, 1, 1, 1, 0, expect.any(Number)])
      );
    });
  });

  describe('Cloud Processing Consent', () => {
    it('should return true when both cloud processing and video upload are enabled', async () => {
      (DatabaseManager.executeSql as jest.Mock).mockResolvedValue({
        rows: {
          length: 1,
          item: () => ({
            cloud_processing_enabled: 1,
            video_upload_enabled: 1,
            local_processing_only: 0,
            analytics_enabled: 1,
            data_sharing_enabled: 0,
            last_updated: Date.now(),
          }),
        },
      });

      const canUseCloud = await PrivacyManager.canUseCloudProcessing(mockUserId);

      expect(canUseCloud).toBe(true);
    });

    it('should return false when cloud processing is disabled', async () => {
      (DatabaseManager.executeSql as jest.Mock).mockResolvedValue({
        rows: {
          length: 1,
          item: () => ({
            cloud_processing_enabled: 0,
            video_upload_enabled: 1,
            local_processing_only: 0,
            analytics_enabled: 1,
            data_sharing_enabled: 0,
            last_updated: Date.now(),
          }),
        },
      });

      const canUseCloud = await PrivacyManager.canUseCloudProcessing(mockUserId);

      expect(canUseCloud).toBe(false);
    });

    it('should return false when video upload is disabled', async () => {
      (DatabaseManager.executeSql as jest.Mock).mockResolvedValue({
        rows: {
          length: 1,
          item: () => ({
            cloud_processing_enabled: 1,
            video_upload_enabled: 0,
            local_processing_only: 0,
            analytics_enabled: 1,
            data_sharing_enabled: 0,
            last_updated: Date.now(),
          }),
        },
      });

      const canUseCloud = await PrivacyManager.canUseCloudProcessing(mockUserId);

      expect(canUseCloud).toBe(false);
    });
  });

  describe('Local Processing Preference', () => {
    it('should return true when local processing only is enabled', async () => {
      (DatabaseManager.executeSql as jest.Mock).mockResolvedValue({
        rows: {
          length: 1,
          item: () => ({
            local_processing_only: 1,
            cloud_processing_enabled: 0,
            video_upload_enabled: 0,
            analytics_enabled: 1,
            data_sharing_enabled: 0,
            last_updated: Date.now(),
          }),
        },
      });

      const isLocalOnly = await PrivacyManager.isLocalProcessingOnly(mockUserId);

      expect(isLocalOnly).toBe(true);
    });

    it('should determine if video should be processed locally', async () => {
      (DatabaseManager.executeSql as jest.Mock).mockResolvedValue({
        rows: {
          length: 1,
          item: () => ({
            local_processing_only: 1,
            cloud_processing_enabled: 0,
            video_upload_enabled: 0,
            analytics_enabled: 1,
            data_sharing_enabled: 0,
            last_updated: Date.now(),
          }),
        },
      });

      const shouldProcessLocally = await PrivacyManager.shouldProcessLocally(mockUserId);

      expect(shouldProcessLocally).toBe(true);
    });
  });

  describe('Data Encryption', () => {
    it('should encrypt data', async () => {
      const data = 'sensitive data';
      const key = 'encryption-key';

      const encrypted = await PrivacyManager.encryptData(data, key);

      expect(encrypted).not.toBe(data);
      expect(encrypted.length).toBeGreaterThan(0);
    });

    it('should decrypt data', async () => {
      const data = 'sensitive data';
      const key = 'encryption-key';

      const encrypted = await PrivacyManager.encryptData(data, key);
      const decrypted = await PrivacyManager.decryptData(encrypted, key);

      expect(decrypted).toBe(data);
    });

    it('should generate encryption key from user ID and salt', async () => {
      const key1 = await PrivacyManager.generateEncryptionKey(mockUserId, 'salt1');
      const key2 = await PrivacyManager.generateEncryptionKey(mockUserId, 'salt2');

      expect(key1).not.toBe(key2);
      expect(key1.length).toBeGreaterThan(0);
    });
  });

  describe('Data Deletion', () => {
    it('should delete all user data when all options are true', async () => {
      (DatabaseManager.executeSql as jest.Mock).mockResolvedValue({
        rows: { length: 0 },
      });

      await PrivacyManager.deleteAllUserData(mockUserId, {
        includeSessions: true,
        includeProgress: true,
        includeVideos: true,
        includeBackups: true,
        includeCloudData: true,
      });

      // Should delete from multiple tables
      expect(DatabaseManager.executeSql).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM shooting_sessions'),
        [mockUserId]
      );
      expect(DatabaseManager.executeSql).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM user_progress'),
        [mockUserId]
      );
      expect(DatabaseManager.executeSql).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM privacy_preferences'),
        [mockUserId]
      );
    });

    it('should selectively delete data based on options', async () => {
      (DatabaseManager.executeSql as jest.Mock).mockResolvedValue({
        rows: { length: 0 },
      });

      await PrivacyManager.deleteAllUserData(mockUserId, {
        includeSessions: true,
        includeProgress: false,
        includeVideos: false,
        includeBackups: false,
        includeCloudData: false,
      });

      // Should only delete sessions
      const calls = (DatabaseManager.executeSql as jest.Mock).mock.calls;
      const sessionDeleteCall = calls.find(call =>
        call[0].includes('DELETE FROM shooting_sessions')
      );
      const progressDeleteCall = calls.find(call =>
        call[0].includes('DELETE FROM user_progress')
      );

      expect(sessionDeleteCall).toBeDefined();
      expect(progressDeleteCall).toBeUndefined();
    });
  });

  describe('Data Export', () => {
    it('should export user data in JSON format', async () => {
      (DatabaseManager.executeSql as jest.Mock)
        .mockResolvedValueOnce({
          rows: {
            length: 1,
            item: () => ({ id: 'session1', user_id: mockUserId }),
          },
        })
        .mockResolvedValueOnce({
          rows: {
            length: 1,
            item: () => ({ user_id: mockUserId, sessions_completed: 10 }),
          },
        })
        .mockResolvedValueOnce({
          rows: {
            length: 1,
            item: () => ({
              local_processing_only: 0,
              cloud_processing_enabled: 1,
              video_upload_enabled: 1,
              analytics_enabled: 1,
              data_sharing_enabled: 0,
              last_updated: Date.now(),
            }),
          },
        });

      const exportData = await PrivacyManager.exportUserData(mockUserId);

      expect(exportData).toBeTruthy();
      const parsed = JSON.parse(exportData);
      expect(parsed.userId).toBe(mockUserId);
      expect(parsed.sessions).toBeDefined();
      expect(parsed.progress).toBeDefined();
      expect(parsed.preferences).toBeDefined();
    });
  });

  describe('Data Anonymization', () => {
    it('should generate anonymous ID from user ID', async () => {
      const anonymousId = await PrivacyManager.anonymizeUserData(mockUserId);

      expect(anonymousId).not.toBe(mockUserId);
      expect(anonymousId.length).toBeGreaterThan(0);
    });

    it('should generate different anonymous IDs for different users', async () => {
      const anonymousId1 = await PrivacyManager.anonymizeUserData('user1');
      const anonymousId2 = await PrivacyManager.anonymizeUserData('user2');

      expect(anonymousId1).not.toBe(anonymousId2);
    });
  });

  describe('Privacy Event Logging', () => {
    it('should log privacy events', async () => {
      (DatabaseManager.executeSql as jest.Mock).mockResolvedValue(undefined);

      await PrivacyManager.logPrivacyEvent(mockUserId, 'cloud_upload_initiated', {
        sessionId: 'session123',
        encrypted: true,
      });

      expect(DatabaseManager.executeSql).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO privacy_events'),
        expect.arrayContaining([
          mockUserId,
          'cloud_upload_initiated',
          expect.any(String),
          expect.any(Number),
        ])
      );
    });

    it('should not throw on logging failure', async () => {
      (DatabaseManager.executeSql as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await expect(
        PrivacyManager.logPrivacyEvent(mockUserId, 'test_event', {})
      ).resolves.not.toThrow();
    });
  });
});
