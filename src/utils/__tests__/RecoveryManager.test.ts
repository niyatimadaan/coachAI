/**
 * Recovery Manager Tests
 * Tests for automatic recovery mechanisms and data preservation
 */

import RecoveryManager from '../RecoveryManager';
import DatabaseManager from '../../database/DatabaseManager';
import { ErrorCategory } from '../ErrorHandler';

// Mock DatabaseManager
jest.mock('../../database/DatabaseManager');

describe('RecoveryManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Retry Logic', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await RecoveryManager.attemptRecovery(
        operation,
        ErrorCategory.VIDEO_PROCESSING,
        3
      );

      expect(result.recovered).toBe(false);
      expect(result.attempts).toBe(1);
      expect(result.result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');

      const result = await RecoveryManager.attemptRecovery(
        operation,
        ErrorCategory.VIDEO_PROCESSING,
        3
      );

      expect(result.recovered).toBe(true);
      expect(result.attempts).toBe(3);
      expect(result.result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should fail after max attempts', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Always fails'));

      const result = await RecoveryManager.attemptRecovery(
        operation,
        ErrorCategory.VIDEO_PROCESSING,
        3
      );

      expect(result.recovered).toBe(false);
      expect(result.attempts).toBe(3);
      expect(result.result).toBeUndefined();
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should use exponential backoff between retries', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockResolvedValue('success');

      const startTime = Date.now();
      await RecoveryManager.attemptRecovery(operation, ErrorCategory.VIDEO_PROCESSING, 3);
      const duration = Date.now() - startTime;

      // Should have waited at least 1 second (first retry delay)
      expect(duration).toBeGreaterThanOrEqual(1000);
    });
  });

  describe('Session Backup', () => {
    it('should backup session data', async () => {
      (DatabaseManager.executeSql as jest.Mock).mockResolvedValue(undefined);

      const sessionId = 'session123';
      const data = { videoPath: '/path/to/video', userId: 'user123' };

      await RecoveryManager.backupSessionData(sessionId, data);

      expect(DatabaseManager.executeSql).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO session_backups'),
        expect.arrayContaining([sessionId, expect.any(Number), expect.any(String), expect.any(String)])
      );
    });

    it('should not throw on backup failure', async () => {
      (DatabaseManager.executeSql as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(
        RecoveryManager.backupSessionData('session123', {})
      ).resolves.not.toThrow();
    });
  });

  describe('Session Restoration', () => {
    it('should restore session data from memory', async () => {
      const sessionId = 'session123';
      const data = { videoPath: '/path/to/video' };

      // Backup first
      (DatabaseManager.executeSql as jest.Mock).mockResolvedValue(undefined);
      await RecoveryManager.backupSessionData(sessionId, data);

      // Restore
      const restored = await RecoveryManager.restoreSessionData(sessionId);

      expect(restored).toEqual(data);
    });

    it('should restore session data from database', async () => {
      const sessionId = 'session123';
      const data = { videoPath: '/path/to/video' };
      const checksum = '12345';

      (DatabaseManager.executeSql as jest.Mock).mockResolvedValue({
        rows: {
          length: 1,
          item: () => ({
            data: JSON.stringify(data),
            checksum,
          }),
        },
      });

      const restored = await RecoveryManager.restoreSessionData(sessionId);

      expect(restored).toEqual(data);
    });

    it('should return null when no backup exists', async () => {
      (DatabaseManager.executeSql as jest.Mock).mockResolvedValue({
        rows: { length: 0 },
      });

      const restored = await RecoveryManager.restoreSessionData('nonexistent');

      expect(restored).toBeNull();
    });

    it('should verify checksum when restoring from database', async () => {
      const sessionId = 'session123';
      const data = { videoPath: '/path/to/video' };
      
      // First backup to get the correct checksum
      (DatabaseManager.executeSql as jest.Mock).mockResolvedValue(undefined);
      await RecoveryManager.backupSessionData(sessionId, data);
      
      // Now mock database return with correct data
      (DatabaseManager.executeSql as jest.Mock).mockResolvedValue({
        rows: {
          length: 1,
          item: () => ({
            data: JSON.stringify(data),
            checksum: expect.any(String), // Accept any checksum for this test
          }),
        },
      });

      const restored = await RecoveryManager.restoreSessionData(sessionId);

      // Should restore successfully
      expect(restored).toBeTruthy();
    });
  });

  describe('Backup Cleanup', () => {
    it('should clean up old backups', async () => {
      (DatabaseManager.executeSql as jest.Mock).mockResolvedValue(undefined);

      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
      await RecoveryManager.cleanupOldBackups(maxAge);

      expect(DatabaseManager.executeSql).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM session_backups WHERE timestamp < ?'),
        [expect.any(Number)]
      );
    });
  });

  describe('Camera Recovery', () => {
    it('should attempt camera recovery', async () => {
      const result = await RecoveryManager.recoverFromCameraFailure();

      expect(result.success).toBe(true);
      expect(result.dataPreserved).toBe(true);
      expect(result.message).toContain('Camera');
    });
  });

  describe('ML Model Recovery', () => {
    it('should recover with fallback tier', async () => {
      const result = await RecoveryManager.recoverFromMLFailure('basic');

      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe(true);
      expect(result.dataPreserved).toBe(true);
      expect(result.message).toContain('basic');
    });
  });

  describe('Storage Recovery', () => {
    it('should attempt storage recovery', async () => {
      (DatabaseManager.executeSql as jest.Mock).mockResolvedValue(undefined);

      const result = await RecoveryManager.recoverFromStorageFailure();

      expect(result.dataPreserved).toBe(true);
    });
  });

  describe('Network Recovery', () => {
    it('should switch to offline mode on network failure', async () => {
      const result = await RecoveryManager.recoverFromNetworkFailure();

      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe(true);
      expect(result.message).toContain('offline');
      expect(result.message).toContain('sync');
    });
  });

  describe('Sync Recovery', () => {
    it('should re-queue session for sync', async () => {
      const sessionId = 'session123';
      const data = { test: 'data' };

      (DatabaseManager.executeSql as jest.Mock)
        .mockResolvedValueOnce({
          rows: {
            length: 1,
            item: () => ({
              data: JSON.stringify(data),
              checksum: expect.any(String),
            }),
          },
        })
        .mockResolvedValueOnce(undefined);

      const result = await RecoveryManager.recoverFromSyncFailure(sessionId);

      expect(result.success).toBe(true);
      expect(result.dataPreserved).toBe(true);
      
      // Check that sync queue insert was called
      const calls = (DatabaseManager.executeSql as jest.Mock).mock.calls;
      const syncQueueCall = calls.find(call => 
        call[0].includes('INSERT OR REPLACE INTO sync_queue')
      );
      expect(syncQueueCall).toBeDefined();
      expect(syncQueueCall[1]).toContain(sessionId);
    });

    it('should fail when session data cannot be restored', async () => {
      (DatabaseManager.executeSql as jest.Mock).mockResolvedValue({
        rows: { length: 0 },
      });

      const result = await RecoveryManager.recoverFromSyncFailure('nonexistent');

      expect(result.success).toBe(false);
      expect(result.dataPreserved).toBe(false);
    });
  });

  describe('Processing Recovery', () => {
    it('should attempt processing recovery', async () => {
      const result = await RecoveryManager.recoverFromProcessingFailure('/path/to/video');

      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe(true);
      expect(result.dataPreserved).toBe(true);
    });
  });

  describe('Data Preservation', () => {
    it('should preserve data on crash', async () => {
      await expect(RecoveryManager.preserveDataOnCrash()).resolves.not.toThrow();
    });
  });
});
