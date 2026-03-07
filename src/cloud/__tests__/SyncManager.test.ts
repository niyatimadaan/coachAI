/**
 * Unit tests for SyncManager
 */

import SyncManager from '../SyncManager';
import DatabaseManager from '../../database/DatabaseManager';
import SessionOperations from '../../database/SessionOperations';
import { ShootingSession } from '../../types/models';

// Mock dependencies
jest.mock('../../database/DatabaseManager');
jest.mock('../../database/SessionOperations');
jest.mock('../../utils/AdaptiveProcessingRouter', () => ({
  checkConnectivity: jest.fn().mockResolvedValue({
    isConnected: true,
    connectionType: 'wifi',
    isMetered: false
  })
}));

describe('SyncManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (SyncManager as any).syncInProgress = false;
  });

  describe('Queue Management', () => {
    it('should queue session for sync', async () => {
      const mockExecuteSql = jest.fn().mockResolvedValue({ rows: { length: 0 } });
      (DatabaseManager.executeSql as jest.Mock) = mockExecuteSql;
      (SessionOperations.updateSyncStatus as jest.Mock) = jest.fn().mockResolvedValue(undefined);

      await SyncManager.queueForSync('session123', 'create');

      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sync_queue'),
        expect.arrayContaining(['session123', 'create'])
      );
      expect(SessionOperations.updateSyncStatus).toHaveBeenCalledWith('session123', 'pending');
    });

    it('should get pending sync operations', async () => {
      const mockRows = [
        {
          id: 1,
          session_id: 'session1',
          operation: 'create',
          retry_count: 0,
          created_at: Date.now(),
          last_attempt: null
        },
        {
          id: 2,
          session_id: 'session2',
          operation: 'update',
          retry_count: 1,
          created_at: Date.now(),
          last_attempt: Date.now()
        }
      ];

      (DatabaseManager.executeSql as jest.Mock) = jest.fn().mockResolvedValue({
        rows: {
          length: mockRows.length,
          item: (i: number) => mockRows[i]
        }
      });

      const operations = await SyncManager.getPendingSyncOperations();

      expect(operations).toHaveLength(2);
      expect(operations[0].sessionId).toBe('session1');
      expect(operations[1].sessionId).toBe('session2');
      expect(operations[1].lastAttempt).toBeInstanceOf(Date);
    });

    it('should clear sync queue', async () => {
      const mockExecuteSql = jest.fn().mockResolvedValue({ rows: { length: 0 } });
      (DatabaseManager.executeSql as jest.Mock) = mockExecuteSql;

      await SyncManager.clearSyncQueue();

      expect(mockExecuteSql).toHaveBeenCalledWith('DELETE FROM sync_queue');
    });
  });

  describe('Synchronization', () => {
    it('should skip sync when already in progress', async () => {
      (SyncManager as any).syncInProgress = true;

      const result = await SyncManager.synchronize();

      expect(result.success).toBe(false);
      expect(result.errors[0].error).toContain('already in progress');
    });

    it('should skip sync when no connectivity', async () => {
      const { checkConnectivity } = require('../../utils/AdaptiveProcessingRouter');
      checkConnectivity.mockResolvedValueOnce({
        isConnected: false,
        connectionType: 'none',
        isMetered: false
      });

      const result = await SyncManager.synchronize();

      expect(result.success).toBe(false);
      expect(result.errors[0].error).toContain('connectivity');
    });

    it('should skip sync on metered connection', async () => {
      const { checkConnectivity } = require('../../utils/AdaptiveProcessingRouter');
      checkConnectivity.mockResolvedValueOnce({
        isConnected: true,
        connectionType: 'cellular',
        isMetered: true
      });

      const result = await SyncManager.synchronize();

      expect(result.success).toBe(false);
      expect(result.errors[0].error).toContain('Bandwidth constraints');
    });

    it('should skip sync on cellular when WiFi-only is enabled', async () => {
      const { checkConnectivity } = require('../../utils/AdaptiveProcessingRouter');
      checkConnectivity.mockResolvedValueOnce({
        isConnected: true,
        connectionType: 'cellular',
        isMetered: false
      });

      SyncManager.updateBandwidthConfig({ preferWifiOnly: true });

      const result = await SyncManager.synchronize();

      expect(result.success).toBe(false);
    });

    it('should successfully sync pending operations', async () => {
      const mockSession: ShootingSession = {
        id: 'session123',
        userId: 'user123',
        timestamp: new Date(),
        duration: 5000,
        shotAttempts: 10,
        videoPath: '/path/to/video.mp4',
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
        syncStatus: 'pending',
        lastModified: new Date()
      };

      (DatabaseManager.executeSql as jest.Mock) = jest.fn()
        .mockResolvedValueOnce({
          rows: {
            length: 1,
            item: () => ({
              id: 1,
              session_id: 'session123',
              operation: 'create',
              retry_count: 0,
              created_at: Date.now(),
              last_attempt: null
            })
          }
        })
        .mockResolvedValue({ rows: { length: 0 } });

      (SessionOperations.getSession as jest.Mock) = jest.fn().mockResolvedValue(mockSession);
      (SessionOperations.updateSyncStatus as jest.Mock) = jest.fn().mockResolvedValue(undefined);

      const result = await SyncManager.synchronize();

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(1);
      expect(result.failedCount).toBe(0);
    });

    it('should handle sync failures and track errors', async () => {
      (DatabaseManager.executeSql as jest.Mock) = jest.fn()
        .mockResolvedValueOnce({
          rows: {
            length: 1,
            item: () => ({
              id: 1,
              session_id: 'session123',
              operation: 'create',
              retry_count: 0,
              created_at: Date.now(),
              last_attempt: null
            })
          }
        })
        .mockResolvedValue({ rows: { length: 0 } });

      (SessionOperations.getSession as jest.Mock) = jest.fn().mockResolvedValue(null);

      const result = await SyncManager.synchronize();

      expect(result.failedCount).toBe(1);
      expect(result.errors).toHaveLength(1);
    });

    it('should process operations in batches', async () => {
      const mockSessions = Array.from({ length: 5 }, (_, i) => ({
        id: `session${i}`,
        session_id: `session${i}`,
        operation: 'create',
        retry_count: 0,
        created_at: Date.now(),
        last_attempt: null
      }));

      (DatabaseManager.executeSql as jest.Mock) = jest.fn()
        .mockResolvedValueOnce({
          rows: {
            length: mockSessions.length,
            item: (i: number) => mockSessions[i]
          }
        })
        .mockResolvedValue({ rows: { length: 0 } });

      (SessionOperations.getSession as jest.Mock) = jest.fn().mockResolvedValue({
        id: 'session123',
        userId: 'user123',
        timestamp: new Date(),
        duration: 5000,
        shotAttempts: 10,
        videoPath: '/path/to/video.mp4',
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
        syncStatus: 'pending',
        lastModified: new Date()
      });

      (SessionOperations.updateSyncStatus as jest.Mock) = jest.fn().mockResolvedValue(undefined);

      SyncManager.updateBandwidthConfig({ maxConcurrentUploads: 2 });

      const result = await SyncManager.synchronize();

      expect(result.syncedCount).toBe(5);
    });
  });

  describe('Bandwidth Configuration', () => {
    it('should update bandwidth config', () => {
      SyncManager.updateBandwidthConfig({
        maxConcurrentUploads: 5,
        preferWifiOnly: false
      });

      const config = (SyncManager as any).bandwidthConfig;
      expect(config.maxConcurrentUploads).toBe(5);
      expect(config.preferWifiOnly).toBe(false);
    });

    it('should merge partial config updates', () => {
      SyncManager.updateBandwidthConfig({ maxConcurrentUploads: 3 });

      const config = (SyncManager as any).bandwidthConfig;
      expect(config.maxConcurrentUploads).toBe(3);
      expect(config.preferWifiOnly).toBeDefined();
    });
  });

  describe('Sync Queue Status', () => {
    it('should get sync queue status', async () => {
      (DatabaseManager.executeSql as jest.Mock) = jest.fn().mockResolvedValue({
        rows: {
          length: 1,
          item: () => ({
            total: 5,
            failed: 2,
            oldest: Date.now() - 3600000 // 1 hour ago
          })
        }
      });

      const status = await SyncManager.getSyncQueueStatus();

      expect(status.pendingCount).toBe(3);
      expect(status.failedCount).toBe(2);
      expect(status.oldestPending).toBeInstanceOf(Date);
    });

    it('should handle empty sync queue', async () => {
      (DatabaseManager.executeSql as jest.Mock) = jest.fn().mockResolvedValue({
        rows: {
          length: 1,
          item: () => ({
            total: 0,
            failed: 0,
            oldest: null
          })
        }
      });

      const status = await SyncManager.getSyncQueueStatus();

      expect(status.pendingCount).toBe(0);
      expect(status.failedCount).toBe(0);
      expect(status.oldestPending).toBeUndefined();
    });
  });

  describe('Retry Logic', () => {
    it('should increment retry count on failure', async () => {
      const mockExecuteSql = jest.fn().mockResolvedValue({ rows: { length: 0 } });
      (DatabaseManager.executeSql as jest.Mock) = mockExecuteSql;
      (SessionOperations.getSession as jest.Mock) = jest.fn().mockResolvedValue(null);

      const item = {
        id: 1,
        sessionId: 'session123',
        operation: 'create' as const,
        retryCount: 0,
        createdAt: new Date()
      };

      await (SyncManager as any).processSyncOperation(item);

      expect(mockExecuteSql).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE sync_queue'),
        expect.arrayContaining([expect.any(Number), 1])
      );
    });

    it('should not retry operations exceeding max retries', async () => {
      const mockRows = [
        {
          id: 1,
          session_id: 'session1',
          operation: 'create',
          retry_count: 3, // Exceeds max retries
          created_at: Date.now(),
          last_attempt: Date.now()
        }
      ];

      (DatabaseManager.executeSql as jest.Mock) = jest.fn().mockResolvedValue({
        rows: {
          length: 0, // Should be filtered out
          item: (i: number) => mockRows[i]
        }
      });

      const operations = await SyncManager.getPendingSyncOperations();

      expect(operations).toHaveLength(0);
    });
  });
});
