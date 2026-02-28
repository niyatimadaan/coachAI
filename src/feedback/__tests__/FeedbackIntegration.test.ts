/**
 * Integration tests for Feedback system
 */

import {
  generateSessionFeedback,
  generateAdaptiveFeedback,
  getFeedbackForSession,
  formatCompleteFeedback,
  getProgressInsights,
} from '../FeedbackIntegration';
import {
  FormAnalysisResult,
  ShootingSession,
  FormIssue,
} from '../../types/models';

describe('FeedbackIntegration', () => {
  const sampleAnalysis: FormAnalysisResult = {
    overallScore: 'B',
    detectedIssues: [
      {
        type: 'elbow_flare',
        severity: 'moderate',
        description: 'Elbow alignment needs work',
        recommendedDrills: ['Wall drill', 'One-hand shooting'],
      },
    ],
    biomechanicalMetrics: {
      elbowAlignment: 75,
      wristAngle: 82,
      shoulderSquare: 88,
      followThrough: 80,
    },
  };

  describe('generateSessionFeedback', () => {
    it('should generate basic feedback without history', () => {
      const feedback = generateSessionFeedback(sampleAnalysis, 'basic');

      expect(feedback.sessionFeedback).toBeDefined();
      expect(feedback.isAdaptive).toBe(false);
      expect(feedback.progressSummary).toBeUndefined();
    });

    it('should respect tier limits on recommendations', () => {
      const basicFeedback = generateSessionFeedback(sampleAnalysis, 'basic');
      const advancedFeedback = generateSessionFeedback(
        sampleAnalysis,
        'lightweight_ml'
      );

      expect(basicFeedback.sessionFeedback.recommendations.length).toBeLessThanOrEqual(
        2
      );
      expect(
        advancedFeedback.sessionFeedback.recommendations.length
      ).toBeLessThanOrEqual(3);
    });
  });

  describe('generateAdaptiveFeedback', () => {
    const createSession = (
      formScore: 'A' | 'B' | 'C' | 'D' | 'F',
      issues: FormIssue[]
    ): ShootingSession => ({
      id: `session-${Math.random()}`,
      userId: 'user1',
      timestamp: new Date(),
      duration: 1800,
      shotAttempts: 20,
      videoPath: '/path/to/video',
      formScore,
      detectedIssues: issues,
      practiceTime: 1800,
      shotCount: 20,
      formAnalysis: {
        overallScore: formScore,
        detectedIssues: issues,
        biomechanicalMetrics: {
          elbowAlignment: 75,
          wristAngle: 80,
          shoulderSquare: 85,
          followThrough: 78,
        },
      },
      videoMetadata: {
        resolution: '1080p',
        frameRate: 30,
        lighting: 'good',
      },
      syncStatus: 'local',
      lastModified: new Date(),
    });

    it('should generate adaptive feedback with history', () => {
      const history = [
        createSession('C', [
          {
            type: 'elbow_flare',
            severity: 'major',
            description: 'Test',
            recommendedDrills: [],
          },
        ]),
        createSession('B', [
          {
            type: 'elbow_flare',
            severity: 'moderate',
            description: 'Test',
            recommendedDrills: [],
          },
        ]),
      ];

      const feedback = generateAdaptiveFeedback(
        'user1',
        sampleAnalysis,
        'lightweight_ml',
        history
      );

      expect(feedback.isAdaptive).toBe(true);
      expect(feedback.progressSummary).toBeDefined();
      expect(feedback.progressSummary!.totalSessions).toBe(2);
    });

    it('should return basic feedback with empty history', () => {
      const feedback = generateAdaptiveFeedback(
        'user1',
        sampleAnalysis,
        'basic',
        []
      );

      expect(feedback.isAdaptive).toBe(false);
      expect(feedback.progressSummary).toBeUndefined();
    });

    it('should include progress notes in recommendations', () => {
      const persistentIssue: FormIssue = {
        type: 'elbow_flare',
        severity: 'moderate',
        description: 'Test',
        recommendedDrills: ['Wall drill'],
      };

      const history = [
        createSession('C', [persistentIssue]),
        createSession('C', [persistentIssue]),
        createSession('B', [persistentIssue]),
      ];

      const feedback = generateAdaptiveFeedback(
        'user1',
        sampleAnalysis,
        'lightweight_ml',
        history
      );

      const recommendations = feedback.sessionFeedback.recommendations;
      expect(recommendations.length).toBeGreaterThan(0);

      // Check if any recommendation has progress note
      const hasProgressNote = recommendations.some(
        (rec) => 'progressNote' in rec && rec.progressNote
      );
      expect(hasProgressNote).toBe(true);
    });
  });

  describe('getFeedbackForSession', () => {
    it('should fetch history and generate adaptive feedback', async () => {
      const mockGetHistory = async (userId: string) => {
        return [
          {
            id: 'session1',
            userId,
            timestamp: new Date(),
            duration: 1800,
            shotAttempts: 20,
            videoPath: '/path',
            formScore: 'C' as const,
            detectedIssues: [],
            practiceTime: 1800,
            shotCount: 20,
            formAnalysis: {
              overallScore: 'C' as const,
              detectedIssues: [],
              biomechanicalMetrics: {
                elbowAlignment: 70,
                wristAngle: 75,
                shoulderSquare: 80,
                followThrough: 72,
              },
            },
            videoMetadata: {
              resolution: '1080p',
              frameRate: 30,
              lighting: 'good',
            },
            syncStatus: 'local' as const,
            lastModified: new Date(),
          },
        ];
      };

      const feedback = await getFeedbackForSession(
        'user1',
        sampleAnalysis,
        'basic',
        mockGetHistory
      );

      expect(feedback.isAdaptive).toBe(true);
      expect(feedback.progressSummary).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      const mockGetHistory = async () => {
        throw new Error('Database error');
      };

      const feedback = await getFeedbackForSession(
        'user1',
        sampleAnalysis,
        'basic',
        mockGetHistory
      );

      // Should fallback to basic feedback
      expect(feedback.isAdaptive).toBe(false);
      expect(feedback.sessionFeedback).toBeDefined();
    });
  });

  describe('formatCompleteFeedback', () => {
    it('should format basic feedback', () => {
      const feedback = generateSessionFeedback(sampleAnalysis, 'basic');
      const formatted = formatCompleteFeedback(feedback);

      expect(formatted).toContain('Form Score: B');
      expect(formatted).toContain('Key Areas to Improve');
      expect(formatted).toContain('Next Steps');
    });

    it('should include progress context for adaptive feedback', () => {
      const history = [
        {
          id: 'session1',
          userId: 'user1',
          timestamp: new Date(),
          duration: 1800,
          shotAttempts: 20,
          videoPath: '/path',
          formScore: 'C' as const,
          detectedIssues: [],
          practiceTime: 1800,
          shotCount: 20,
          formAnalysis: {
            overallScore: 'C' as const,
            detectedIssues: [],
            biomechanicalMetrics: {
              elbowAlignment: 70,
              wristAngle: 75,
              shoulderSquare: 80,
              followThrough: 72,
            },
          },
          videoMetadata: {
            resolution: '1080p',
            frameRate: 30,
            lighting: 'good',
          },
          syncStatus: 'local' as const,
          lastModified: new Date(),
        },
      ];

      const feedback = generateAdaptiveFeedback(
        'user1',
        sampleAnalysis,
        'lightweight_ml',
        history
      );
      const formatted = formatCompleteFeedback(feedback);

      expect(formatted).toContain('Session');
      expect(formatted).toContain('Average Score');
    });
  });

  describe('getProgressInsights', () => {
    it('should extract key insights from progress summary', () => {
      const progressSummary = {
        userId: 'user1',
        totalSessions: 5,
        averageScore: 82,
        scoreImprovement: 8,
        persistentIssues: [
          {
            issueType: 'elbow_flare' as const,
            firstDetected: new Date(),
            lastDetected: new Date(),
            occurrenceCount: 4,
            severityTrend: 'stable' as const,
            averageSeverityScore: 50,
            resolved: false,
          },
        ],
        resolvedIssues: [
          {
            issueType: 'stance' as const,
            firstDetected: new Date(),
            lastDetected: new Date(),
            occurrenceCount: 3,
            severityTrend: 'improving' as const,
            averageSeverityScore: 75,
            resolved: true,
          },
        ],
        newIssues: [],
        recommendationHistory: [],
      };

      const insights = getProgressInsights(progressSummary);

      expect(insights.totalSessions).toBe(5);
      expect(insights.averageScore).toBe(82);
      expect(insights.improvement).toBe('Improving');
      expect(insights.strengths.length).toBe(1);
      expect(insights.areasToWork.length).toBe(1);
    });

    it('should identify declining performance', () => {
      const progressSummary = {
        userId: 'user1',
        totalSessions: 5,
        averageScore: 70,
        scoreImprovement: -8,
        persistentIssues: [],
        resolvedIssues: [],
        newIssues: [],
        recommendationHistory: [],
      };

      const insights = getProgressInsights(progressSummary);
      expect(insights.improvement).toBe('Needs attention');
    });
  });
});
