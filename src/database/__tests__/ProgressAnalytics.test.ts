/**
 * Unit tests for ProgressAnalytics
 */

import DatabaseManager from '../DatabaseManager';
import SessionOperations from '../SessionOperations';
import ProgressAnalytics from '../ProgressAnalytics';
import { ShootingSession, FormScore } from '../../types/models';

describe('ProgressAnalytics', () => {
  beforeAll(async () => {
    await DatabaseManager.initialize();
  });

  beforeEach(async () => {
    await DatabaseManager.clearAllData();
  });

  afterAll(async () => {
    await DatabaseManager.close();
  });

  const createMockSession = (
    id: string,
    userId: string,
    formScore: FormScore,
    timestamp: Date,
    practiceTime: number = 30
  ): ShootingSession => ({
    id,
    userId,
    timestamp,
    duration: 1800,
    shotAttempts: 50,
    videoPath: `/storage/videos/${id}.mp4`,
    formScore,
    detectedIssues: [
      {
        type: 'elbow_flare',
        severity: 'moderate',
        description: 'Elbow flaring out',
        recommendedDrills: ['Wall drill']
      }
    ],
    practiceTime,
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

  describe('calculateMetrics', () => {
    it('should return empty metrics when no sessions exist', async () => {
      const metrics = await ProgressAnalytics.calculateMetrics('user-123', '30d');
      
      expect(metrics.averageScore).toBe(0);
      expect(metrics.scoreImprovement).toBe(0);
      expect(metrics.consistencyRating).toBe(0);
      expect(metrics.sessionsPerWeek).toBe(0);
      expect(metrics.totalPracticeTime).toBe(0);
      expect(metrics.streakDays).toBe(0);
    });

    it('should calculate average score correctly', async () => {
      const now = new Date();
      await SessionOperations.createSession(createMockSession('s1', 'user-123', 'A', new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)));
      await SessionOperations.createSession(createMockSession('s2', 'user-123', 'B', new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)));
      await SessionOperations.createSession(createMockSession('s3', 'user-123', 'C', new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)));
      
      const metrics = await ProgressAnalytics.calculateMetrics('user-123', '7d');
      
      // A=4, B=3, C=2, average = 3.0
      expect(metrics.averageScore).toBeCloseTo(3.0, 1);
    });

    it('should calculate score improvement correctly', async () => {
      const now = new Date();
      // Older sessions with lower scores
      await SessionOperations.createSession(createMockSession('s1', 'user-123', 'C', new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000)));
      await SessionOperations.createSession(createMockSession('s2', 'user-123', 'D', new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000)));
      
      // Recent sessions with higher scores
      await SessionOperations.createSession(createMockSession('s3', 'user-123', 'B', new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)));
      await SessionOperations.createSession(createMockSession('s4', 'user-123', 'A', new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)));
      
      const metrics = await ProgressAnalytics.calculateMetrics('user-123', '30d');
      
      // Should show positive improvement
      expect(metrics.scoreImprovement).toBeGreaterThan(0);
    });

    it('should calculate sessions per week correctly', async () => {
      const now = new Date();
      // Create 4 sessions over 14 days = 2 sessions per week
      await SessionOperations.createSession(createMockSession('s1', 'user-123', 'B', new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)));
      await SessionOperations.createSession(createMockSession('s2', 'user-123', 'B', new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)));
      await SessionOperations.createSession(createMockSession('s3', 'user-123', 'B', new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)));
      await SessionOperations.createSession(createMockSession('s4', 'user-123', 'B', new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)));
      
      const metrics = await ProgressAnalytics.calculateMetrics('user-123', '30d');
      
      // 4 sessions in 30 days ≈ 0.93 sessions per week
      expect(metrics.sessionsPerWeek).toBeCloseTo(0.93, 1);
    });

    it('should calculate total practice time correctly', async () => {
      const now = new Date();
      await SessionOperations.createSession(createMockSession('s1', 'user-123', 'B', new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), 30));
      await SessionOperations.createSession(createMockSession('s2', 'user-123', 'B', new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), 45));
      await SessionOperations.createSession(createMockSession('s3', 'user-123', 'B', new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), 25));
      
      const metrics = await ProgressAnalytics.calculateMetrics('user-123', '7d');
      
      expect(metrics.totalPracticeTime).toBe(100); // 30 + 45 + 25
    });

    it('should calculate consistency rating based on practice regularity', async () => {
      const now = new Date();
      // Regular practice every 2 days
      await SessionOperations.createSession(createMockSession('s1', 'user-123', 'B', new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000)));
      await SessionOperations.createSession(createMockSession('s2', 'user-123', 'B', new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)));
      await SessionOperations.createSession(createMockSession('s3', 'user-123', 'B', new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000)));
      await SessionOperations.createSession(createMockSession('s4', 'user-123', 'B', new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)));
      
      const metrics = await ProgressAnalytics.calculateMetrics('user-123', '30d');
      
      // Regular practice should have high consistency
      expect(metrics.consistencyRating).toBeGreaterThan(0.5);
    });
  });

  describe('calculateStreakDays', () => {
    it('should return 0 when no sessions exist', async () => {
      const streak = await ProgressAnalytics.calculateStreakDays('user-123');
      expect(streak).toBe(0);
    });

    it('should return 0 when last session was more than 1 day ago', async () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      await SessionOperations.createSession(createMockSession('s1', 'user-123', 'B', twoDaysAgo));
      
      const streak = await ProgressAnalytics.calculateStreakDays('user-123');
      expect(streak).toBe(0);
    });

    it('should calculate consecutive day streak correctly', async () => {
      const today = new Date();
      today.setHours(12, 0, 0, 0);
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      
      await SessionOperations.createSession(createMockSession('s1', 'user-123', 'B', twoDaysAgo));
      await SessionOperations.createSession(createMockSession('s2', 'user-123', 'B', yesterday));
      await SessionOperations.createSession(createMockSession('s3', 'user-123', 'B', today));
      
      const streak = await ProgressAnalytics.calculateStreakDays('user-123');
      expect(streak).toBe(3);
    });

    it('should handle multiple sessions on same day', async () => {
      const today = new Date();
      today.setHours(10, 0, 0, 0);
      
      const todayLater = new Date(today);
      todayLater.setHours(15, 0, 0, 0);
      
      await SessionOperations.createSession(createMockSession('s1', 'user-123', 'B', today));
      await SessionOperations.createSession(createMockSession('s2', 'user-123', 'B', todayLater));
      
      const streak = await ProgressAnalytics.calculateStreakDays('user-123');
      expect(streak).toBe(1); // Should count as 1 day, not 2
    });
  });

  describe('calculateAllTimeframes', () => {
    it('should calculate metrics for all timeframes', async () => {
      const now = new Date();
      // Create sessions across different timeframes
      await SessionOperations.createSession(createMockSession('s1', 'user-123', 'C', new Date(now.getTime() - 80 * 24 * 60 * 60 * 1000)));
      await SessionOperations.createSession(createMockSession('s2', 'user-123', 'B', new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000)));
      await SessionOperations.createSession(createMockSession('s3', 'user-123', 'A', new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)));
      
      const allMetrics = await ProgressAnalytics.calculateAllTimeframes('user-123');
      
      expect(allMetrics.sevenDay).toBeDefined();
      expect(allMetrics.thirtyDay).toBeDefined();
      expect(allMetrics.ninetyDay).toBeDefined();
      
      // 7-day should only have 1 session
      expect(allMetrics.sevenDay.averageScore).toBeCloseTo(4.0, 1); // Only 'A' session
      
      // 30-day should have 2 sessions
      expect(allMetrics.thirtyDay.averageScore).toBeCloseTo(3.5, 1); // 'B' and 'A'
      
      // 90-day should have all 3 sessions
      expect(allMetrics.ninetyDay.averageScore).toBeCloseTo(3.0, 1); // 'C', 'B', 'A'
    });
  });

  describe('getStoredMetrics', () => {
    it('should return null when no metrics are stored', async () => {
      const metrics = await ProgressAnalytics.getStoredMetrics('user-123', '30d');
      expect(metrics).toBeNull();
    });

    it('should retrieve stored metrics', async () => {
      const now = new Date();
      await SessionOperations.createSession(createMockSession('s1', 'user-123', 'B', new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)));
      
      // Calculate and store metrics
      await ProgressAnalytics.calculateMetrics('user-123', '30d');
      
      // Retrieve stored metrics
      const metrics = await ProgressAnalytics.getStoredMetrics('user-123', '30d');
      expect(metrics).not.toBeNull();
      expect(metrics?.timeframe).toBe('30d');
      expect(metrics?.userId).toBe('user-123');
    });
  });

  describe('issue tracking', () => {
    it('should identify resolved issues', async () => {
      const now = new Date();
      
      // Older session with elbow_flare issue
      const oldSession = createMockSession('s1', 'user-123', 'C', new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000));
      oldSession.detectedIssues = [
        { type: 'elbow_flare', severity: 'major', description: 'Elbow issue', recommendedDrills: [] }
      ];
      
      // Recent session without elbow_flare (resolved)
      const newSession = createMockSession('s2', 'user-123', 'B', new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000));
      newSession.detectedIssues = [
        { type: 'wrist_angle', severity: 'minor', description: 'Wrist issue', recommendedDrills: [] }
      ];
      
      await SessionOperations.createSession(oldSession);
      await SessionOperations.createSession(newSession);
      
      const metrics = await ProgressAnalytics.calculateMetrics('user-123', '30d');
      
      expect(metrics.resolvedIssues).toContain('elbow_flare');
    });

    it('should identify persistent issues', async () => {
      const now = new Date();
      
      // Both old and new sessions have same issue
      const oldSession = createMockSession('s1', 'user-123', 'C', new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000));
      oldSession.detectedIssues = [
        { type: 'follow_through', severity: 'moderate', description: 'Follow through issue', recommendedDrills: [] }
      ];
      
      const newSession = createMockSession('s2', 'user-123', 'C', new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000));
      newSession.detectedIssues = [
        { type: 'follow_through', severity: 'moderate', description: 'Follow through issue', recommendedDrills: [] }
      ];
      
      await SessionOperations.createSession(oldSession);
      await SessionOperations.createSession(newSession);
      
      const metrics = await ProgressAnalytics.calculateMetrics('user-123', '30d');
      
      expect(metrics.persistentIssues).toContain('follow_through');
    });

    it('should identify new issues', async () => {
      const now = new Date();
      
      // Old session without stance issue
      const oldSession = createMockSession('s1', 'user-123', 'B', new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000));
      oldSession.detectedIssues = [
        { type: 'elbow_flare', severity: 'minor', description: 'Elbow issue', recommendedDrills: [] }
      ];
      
      // New session with stance issue (new)
      const newSession = createMockSession('s2', 'user-123', 'C', new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000));
      newSession.detectedIssues = [
        { type: 'stance', severity: 'major', description: 'Stance issue', recommendedDrills: [] }
      ];
      
      await SessionOperations.createSession(oldSession);
      await SessionOperations.createSession(newSession);
      
      const metrics = await ProgressAnalytics.calculateMetrics('user-123', '30d');
      
      expect(metrics.newIssues).toContain('stance');
    });
  });
});
