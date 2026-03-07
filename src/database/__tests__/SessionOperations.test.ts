/**
 * Unit tests for SessionOperations
 */

import DatabaseManager from '../DatabaseManager';
import SessionOperations from '../SessionOperations';
import { ShootingSession, FormScore } from '../../types/models';

describe('SessionOperations', () => {
  beforeAll(async () => {
    await DatabaseManager.initialize();
  });

  beforeEach(async () => {
    await DatabaseManager.clearAllData();
  });

  afterAll(async () => {
    await DatabaseManager.close();
  });

  const createMockSession = (id: string, userId: string, formScore: FormScore): ShootingSession => ({
    id,
    userId,
    timestamp: new Date(),
    duration: 1800,
    shotAttempts: 50,
    videoPath: `/storage/videos/${id}.mp4`,
    formScore,
    detectedIssues: [
      {
        type: 'elbow_flare',
        severity: 'moderate',
        description: 'Elbow flaring out',
        recommendedDrills: ['Wall drill', 'Form shooting']
      }
    ],
    practiceTime: 30,
    shotCount: 50,
    formAnalysis: {
      overallScore: formScore,
      detectedIssues: [],
      biomechanicalMetrics: {
        elbowAlignment: 85.5,
        wristAngle: 92.0,
        shoulderSquare: 88.0,
        followThrough: 78.5
      }
    },
    videoMetadata: {
      resolution: '1920x1080',
      frameRate: 30,
      lighting: 'good'
    },
    syncStatus: 'local',
    lastModified: new Date()
  });

  describe('createSession', () => {
    it('should create a new session with all related data', async () => {
      const session = createMockSession('session-001', 'user-123', 'B');
      
      await SessionOperations.createSession(session);
      
      const retrieved = await SessionOperations.getSession('session-001');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe('session-001');
      expect(retrieved?.userId).toBe('user-123');
      expect(retrieved?.formScore).toBe('B');
      expect(retrieved?.detectedIssues).toHaveLength(1);
      expect(retrieved?.detectedIssues[0].type).toBe('elbow_flare');
    });

    it('should store biomechanical metrics correctly', async () => {
      const session = createMockSession('session-002', 'user-123', 'A');
      
      await SessionOperations.createSession(session);
      
      const retrieved = await SessionOperations.getSession('session-002');
      expect(retrieved?.formAnalysis.biomechanicalMetrics.elbowAlignment).toBe(85.5);
      expect(retrieved?.formAnalysis.biomechanicalMetrics.wristAngle).toBe(92.0);
    });

    it('should store video metadata correctly', async () => {
      const session = createMockSession('session-003', 'user-123', 'C');
      
      await SessionOperations.createSession(session);
      
      const retrieved = await SessionOperations.getSession('session-003');
      expect(retrieved?.videoMetadata.resolution).toBe('1920x1080');
      expect(retrieved?.videoMetadata.frameRate).toBe(30);
      expect(retrieved?.videoMetadata.lighting).toBe('good');
    });
  });

  describe('getSession', () => {
    it('should return null for non-existent session', async () => {
      const retrieved = await SessionOperations.getSession('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should retrieve session with all related data', async () => {
      const session = createMockSession('session-004', 'user-123', 'B');
      await SessionOperations.createSession(session);
      
      const retrieved = await SessionOperations.getSession('session-004');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.detectedIssues).toHaveLength(1);
      expect(retrieved?.detectedIssues[0].recommendedDrills).toHaveLength(2);
    });
  });

  describe('getUserSessions', () => {
    it('should return empty array for user with no sessions', async () => {
      const sessions = await SessionOperations.getUserSessions('user-999');
      expect(sessions).toHaveLength(0);
    });

    it('should return all sessions for a user', async () => {
      await SessionOperations.createSession(createMockSession('s1', 'user-123', 'A'));
      await SessionOperations.createSession(createMockSession('s2', 'user-123', 'B'));
      await SessionOperations.createSession(createMockSession('s3', 'user-456', 'C'));
      
      const sessions = await SessionOperations.getUserSessions('user-123');
      expect(sessions).toHaveLength(2);
    });

    it('should respect limit parameter', async () => {
      await SessionOperations.createSession(createMockSession('s1', 'user-123', 'A'));
      await SessionOperations.createSession(createMockSession('s2', 'user-123', 'B'));
      await SessionOperations.createSession(createMockSession('s3', 'user-123', 'C'));
      
      const sessions = await SessionOperations.getUserSessions('user-123', 2);
      expect(sessions).toHaveLength(2);
    });

    it('should return sessions in descending order by timestamp', async () => {
      const session1 = createMockSession('s1', 'user-123', 'A');
      session1.timestamp = new Date('2024-01-01');
      
      const session2 = createMockSession('s2', 'user-123', 'B');
      session2.timestamp = new Date('2024-01-03');
      
      const session3 = createMockSession('s3', 'user-123', 'C');
      session3.timestamp = new Date('2024-01-02');
      
      await SessionOperations.createSession(session1);
      await SessionOperations.createSession(session2);
      await SessionOperations.createSession(session3);
      
      const sessions = await SessionOperations.getUserSessions('user-123');
      expect(sessions[0].id).toBe('s2'); // Most recent
      expect(sessions[1].id).toBe('s3');
      expect(sessions[2].id).toBe('s1'); // Oldest
    });
  });

  describe('getSessionsInRange', () => {
    it('should return sessions within date range', async () => {
      const session1 = createMockSession('s1', 'user-123', 'A');
      session1.timestamp = new Date('2024-01-05T00:00:00.000Z');
      
      const session2 = createMockSession('s2', 'user-123', 'B');
      session2.timestamp = new Date('2024-01-15T00:00:00.000Z');
      
      const session3 = createMockSession('s3', 'user-123', 'C');
      session3.timestamp = new Date('2024-01-25T00:00:00.000Z');
      
      await SessionOperations.createSession(session1);
      await SessionOperations.createSession(session2);
      await SessionOperations.createSession(session3);
      
      const startDate = new Date('2024-01-10T00:00:00.000Z');
      const endDate = new Date('2024-01-20T23:59:59.999Z');
      
      const sessions = await SessionOperations.getSessionsInRange('user-123', startDate, endDate);
      expect(sessions).toHaveLength(1);
      expect(sessions[0].id).toBe('s2');
    });

    it('should return empty array when no sessions in range', async () => {
      const session = createMockSession('s1', 'user-123', 'A');
      session.timestamp = new Date('2024-01-01');
      await SessionOperations.createSession(session);
      
      const startDate = new Date('2024-02-01');
      const endDate = new Date('2024-02-28');
      
      const sessions = await SessionOperations.getSessionsInRange('user-123', startDate, endDate);
      expect(sessions).toHaveLength(0);
    });
  });

  describe('updateSyncStatus', () => {
    it('should update session sync status', async () => {
      const session = createMockSession('session-005', 'user-123', 'B');
      await SessionOperations.createSession(session);
      
      await SessionOperations.updateSyncStatus('session-005', 'synced');
      
      const retrieved = await SessionOperations.getSession('session-005');
      expect(retrieved?.syncStatus).toBe('synced');
    });
  });

  describe('deleteSession', () => {
    it('should delete session and related data', async () => {
      const session = createMockSession('session-006', 'user-123', 'B');
      await SessionOperations.createSession(session);
      
      await SessionOperations.deleteSession('session-006');
      
      const retrieved = await SessionOperations.getSession('session-006');
      expect(retrieved).toBeNull();
    });
  });

  describe('deleteOldestSessions', () => {
    it('should keep only specified number of recent sessions', async () => {
      // Create 5 sessions
      for (let i = 1; i <= 5; i++) {
        const session = createMockSession(`s${i}`, 'user-123', 'B');
        session.timestamp = new Date(`2024-01-${i.toString().padStart(2, '0')}`);
        await SessionOperations.createSession(session);
      }
      
      // Keep only 3 most recent
      await SessionOperations.deleteOldestSessions('user-123', 3);
      
      const sessions = await SessionOperations.getUserSessions('user-123');
      expect(sessions).toHaveLength(3);
      expect(sessions[0].id).toBe('s5'); // Most recent
      expect(sessions[1].id).toBe('s4');
      expect(sessions[2].id).toBe('s3');
    });

    it('should not delete anything if session count is below limit', async () => {
      await SessionOperations.createSession(createMockSession('s1', 'user-123', 'A'));
      await SessionOperations.createSession(createMockSession('s2', 'user-123', 'B'));
      
      await SessionOperations.deleteOldestSessions('user-123', 5);
      
      const sessions = await SessionOperations.getUserSessions('user-123');
      expect(sessions).toHaveLength(2);
    });
  });
});
