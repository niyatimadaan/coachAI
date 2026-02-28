/**
 * Unit tests for Adaptive Recommendation System
 */

import {
  calculateSeverityScore,
  analyzeIssueProgress,
  buildProgressSummary,
  generateAdaptiveRecommendations,
  adaptDrillRecommendations,
  generateProgressAwareFeedback,
  shouldChangeStrategy,
  generateAlternativeDrills,
  calculateAdaptivePriority,
} from '../AdaptiveRecommendationSystem';
import { ShootingSession, FormIssue } from '../../types/models';
import { SessionFeedback } from '../FeedbackGenerator';

describe('AdaptiveRecommendationSystem', () => {
  describe('calculateSeverityScore', () => {
    it('should return correct scores for each severity', () => {
      expect(calculateSeverityScore('major')).toBe(0);
      expect(calculateSeverityScore('moderate')).toBe(50);
      expect(calculateSeverityScore('minor')).toBe(75);
    });
  });

  describe('analyzeIssueProgress', () => {
    const createSession = (
      timestamp: Date,
      issues: FormIssue[]
    ): ShootingSession => ({
      id: `session-${timestamp.getTime()}`,
      userId: 'user1',
      timestamp,
      duration: 1800,
      shotAttempts: 20,
      videoPath: '/path/to/video',
      formScore: 'B',
      detectedIssues: issues,
      practiceTime: 1800,
      shotCount: 20,
      formAnalysis: {
        overallScore: 'B',
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
      lastModified: timestamp,
    });

    it('should return null for issue not in sessions', () => {
      const sessions = [
        createSession(new Date('2024-01-01'), [
          {
            type: 'wrist_angle',
            severity: 'moderate',
            description: 'Test',
            recommendedDrills: [],
          },
        ]),
      ];

      const pattern = analyzeIssueProgress('elbow_flare', sessions);
      expect(pattern).toBeNull();
    });

    it('should detect improving trend', () => {
      const sessions = [
        createSession(new Date('2024-01-01'), [
          {
            type: 'elbow_flare',
            severity: 'major',
            description: 'Test',
            recommendedDrills: [],
          },
        ]),
        createSession(new Date('2024-01-02'), [
          {
            type: 'elbow_flare',
            severity: 'major',
            description: 'Test',
            recommendedDrills: [],
          },
        ]),
        createSession(new Date('2024-01-03'), [
          {
            type: 'elbow_flare',
            severity: 'moderate',
            description: 'Test',
            recommendedDrills: [],
          },
        ]),
        createSession(new Date('2024-01-04'), [
          {
            type: 'elbow_flare',
            severity: 'minor',
            description: 'Test',
            recommendedDrills: [],
          },
        ]),
      ];

      const pattern = analyzeIssueProgress('elbow_flare', sessions);
      expect(pattern).not.toBeNull();
      expect(pattern!.severityTrend).toBe('improving');
    });

    it('should detect worsening trend', () => {
      const sessions = [
        createSession(new Date('2024-01-01'), [
          {
            type: 'elbow_flare',
            severity: 'minor',
            description: 'Test',
            recommendedDrills: [],
          },
        ]),
        createSession(new Date('2024-01-02'), [
          {
            type: 'elbow_flare',
            severity: 'minor',
            description: 'Test',
            recommendedDrills: [],
          },
        ]),
        createSession(new Date('2024-01-03'), [
          {
            type: 'elbow_flare',
            severity: 'moderate',
            description: 'Test',
            recommendedDrills: [],
          },
        ]),
        createSession(new Date('2024-01-04'), [
          {
            type: 'elbow_flare',
            severity: 'major',
            description: 'Test',
            recommendedDrills: [],
          },
        ]),
      ];

      const pattern = analyzeIssueProgress('elbow_flare', sessions);
      expect(pattern).not.toBeNull();
      expect(pattern!.severityTrend).toBe('worsening');
    });

    it('should detect resolved issues', () => {
      const sessions = [
        createSession(new Date('2024-01-01'), [
          {
            type: 'elbow_flare',
            severity: 'major',
            description: 'Test',
            recommendedDrills: [],
          },
        ]),
        createSession(new Date('2024-01-02'), [
          {
            type: 'elbow_flare',
            severity: 'moderate',
            description: 'Test',
            recommendedDrills: [],
          },
        ]),
        createSession(new Date('2024-01-03'), []),
        createSession(new Date('2024-01-04'), []),
      ];

      const pattern = analyzeIssueProgress('elbow_flare', sessions);
      expect(pattern).not.toBeNull();
      expect(pattern!.resolved).toBe(true);
    });

    it('should track occurrence count', () => {
      const sessions = [
        createSession(new Date('2024-01-01'), [
          {
            type: 'elbow_flare',
            severity: 'major',
            description: 'Test',
            recommendedDrills: [],
          },
        ]),
        createSession(new Date('2024-01-02'), [
          {
            type: 'elbow_flare',
            severity: 'moderate',
            description: 'Test',
            recommendedDrills: [],
          },
        ]),
        createSession(new Date('2024-01-03'), [
          {
            type: 'elbow_flare',
            severity: 'minor',
            description: 'Test',
            recommendedDrills: [],
          },
        ]),
      ];

      const pattern = analyzeIssueProgress('elbow_flare', sessions);
      expect(pattern).not.toBeNull();
      expect(pattern!.occurrenceCount).toBe(3);
    });
  });

  describe('buildProgressSummary', () => {
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

    it('should handle empty session history', () => {
      const summary = buildProgressSummary('user1', []);
      
      expect(summary.userId).toBe('user1');
      expect(summary.totalSessions).toBe(0);
      expect(summary.averageScore).toBe(0);
      expect(summary.persistentIssues).toHaveLength(0);
    });

    it('should calculate average score correctly', () => {
      const sessions = [
        createSession('A', []),
        createSession('B', []),
        createSession('C', []),
      ];

      const summary = buildProgressSummary('user1', sessions);
      
      // A=95, B=85, C=75, average = 85
      expect(summary.averageScore).toBeCloseTo(85, 0);
    });

    it('should identify persistent issues', () => {
      const persistentIssue: FormIssue = {
        type: 'elbow_flare',
        severity: 'moderate',
        description: 'Test',
        recommendedDrills: [],
      };

      const sessions = [
        createSession('B', [persistentIssue]),
        createSession('B', [persistentIssue]),
        createSession('B', [persistentIssue]),
        createSession('B', [persistentIssue]),
      ];

      const summary = buildProgressSummary('user1', sessions);
      
      expect(summary.persistentIssues.length).toBeGreaterThan(0);
      expect(summary.persistentIssues[0].issueType).toBe('elbow_flare');
    });

    it('should identify new issues', () => {
      const newIssue: FormIssue = {
        type: 'wrist_angle',
        severity: 'minor',
        description: 'Test',
        recommendedDrills: [],
      };

      const sessions = [
        createSession('B', []),
        createSession('B', []),
        createSession('B', [newIssue]),
      ];

      const summary = buildProgressSummary('user1', sessions);
      
      expect(summary.newIssues.length).toBeGreaterThan(0);
      expect(summary.newIssues[0].issueType).toBe('wrist_angle');
    });

    it('should identify resolved issues', () => {
      const resolvedIssue: FormIssue = {
        type: 'stance',
        severity: 'moderate',
        description: 'Test',
        recommendedDrills: [],
      };

      const sessions = [
        createSession('C', [resolvedIssue]),
        createSession('C', [resolvedIssue]),
        createSession('B', []),
        createSession('B', []),
      ];

      const summary = buildProgressSummary('user1', sessions);
      
      expect(summary.resolvedIssues.length).toBeGreaterThan(0);
      expect(summary.resolvedIssues[0].issueType).toBe('stance');
    });
  });

  describe('generateAdaptiveRecommendations', () => {
    const baseFeedback: SessionFeedback = {
      overallMessage: 'Good form',
      formScore: 'B',
      recommendations: [
        {
          priority: 1,
          issue: {
            type: 'elbow_flare',
            severity: 'moderate',
            description: 'Test',
            recommendedDrills: ['Wall drill'],
          },
          explanation: 'Test explanation',
          drills: ['Wall drill'],
          whyItMatters: 'Test why',
        },
      ],
      encouragement: 'Keep it up',
      nextSteps: ['Practice'],
    };

    it('should mark new issues', () => {
      const progressSummary = {
        userId: 'user1',
        totalSessions: 3,
        averageScore: 80,
        scoreImprovement: 0,
        persistentIssues: [],
        resolvedIssues: [],
        newIssues: [
          {
            issueType: 'elbow_flare' as const,
            firstDetected: new Date(),
            lastDetected: new Date(),
            occurrenceCount: 1,
            severityTrend: 'stable' as const,
            averageSeverityScore: 50,
            resolved: false,
          },
        ],
        recommendationHistory: [],
      };

      const adaptiveRecs = generateAdaptiveRecommendations(
        baseFeedback,
        progressSummary
      );

      expect(adaptiveRecs[0].isNew).toBe(true);
      expect(adaptiveRecs[0].progressNote).toContain('new');
    });

    it('should mark persistent issues', () => {
      const progressSummary = {
        userId: 'user1',
        totalSessions: 5,
        averageScore: 80,
        scoreImprovement: 0,
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
        resolvedIssues: [],
        newIssues: [],
        recommendationHistory: [],
      };

      const adaptiveRecs = generateAdaptiveRecommendations(
        baseFeedback,
        progressSummary
      );

      expect(adaptiveRecs[0].isPersistent).toBe(true);
      expect(adaptiveRecs[0].progressNote).toBeDefined();
    });

    it('should note improving issues', () => {
      const progressSummary = {
        userId: 'user1',
        totalSessions: 5,
        averageScore: 80,
        scoreImprovement: 0,
        persistentIssues: [
          {
            issueType: 'elbow_flare' as const,
            firstDetected: new Date(),
            lastDetected: new Date(),
            occurrenceCount: 4,
            severityTrend: 'improving' as const,
            averageSeverityScore: 50,
            resolved: false,
          },
        ],
        resolvedIssues: [],
        newIssues: [],
        recommendationHistory: [],
      };

      const adaptiveRecs = generateAdaptiveRecommendations(
        baseFeedback,
        progressSummary
      );

      expect(adaptiveRecs[0].progressNote).toContain('progress');
    });
  });

  describe('adaptDrillRecommendations', () => {
    const originalDrills = ['Wall drill', 'One-hand shooting'];

    it('should return original drills for null pattern', () => {
      const adapted = adaptDrillRecommendations(originalDrills, null);
      expect(adapted).toEqual(originalDrills);
    });

    it('should suggest progression for improving issues', () => {
      const pattern = {
        issueType: 'elbow_flare' as const,
        firstDetected: new Date(),
        lastDetected: new Date(),
        occurrenceCount: 4,
        severityTrend: 'improving' as const,
        averageSeverityScore: 60,
        resolved: false,
      };

      const adapted = adaptDrillRecommendations(originalDrills, pattern);
      expect(adapted.length).toBeGreaterThan(originalDrills.length);
      expect(adapted.some(d => d.includes('game-speed'))).toBe(true);
    });

    it('should suggest alternatives for persistent issues', () => {
      const pattern = {
        issueType: 'elbow_flare' as const,
        firstDetected: new Date(),
        lastDetected: new Date(),
        occurrenceCount: 5,
        severityTrend: 'stable' as const,
        averageSeverityScore: 50,
        resolved: false,
      };

      const adapted = adaptDrillRecommendations(originalDrills, pattern);
      expect(adapted.length).toBeGreaterThan(originalDrills.length);
      expect(adapted.some(d => d.includes('different approach'))).toBe(true);
    });
  });

  describe('generateProgressAwareFeedback', () => {
    const baseFeedback: SessionFeedback = {
      overallMessage: 'Good form',
      formScore: 'B',
      recommendations: [
        {
          priority: 1,
          issue: {
            type: 'elbow_flare',
            severity: 'moderate',
            description: 'Test',
            recommendedDrills: ['Wall drill'],
          },
          explanation: 'Test explanation',
          drills: ['Wall drill'],
          whyItMatters: 'Test why',
        },
      ],
      encouragement: 'Keep it up',
      nextSteps: ['Practice'],
    };

    it('should enhance message for improving users', () => {
      const progressSummary = {
        userId: 'user1',
        totalSessions: 5,
        averageScore: 85,
        scoreImprovement: 10,
        persistentIssues: [],
        resolvedIssues: [],
        newIssues: [],
        recommendationHistory: [],
      };

      const enhanced = generateProgressAwareFeedback(baseFeedback, progressSummary);
      expect(enhanced.overallMessage).toContain('improving');
    });

    it('should celebrate resolved issues', () => {
      const progressSummary = {
        userId: 'user1',
        totalSessions: 5,
        averageScore: 85,
        scoreImprovement: 0,
        persistentIssues: [],
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

      const enhanced = generateProgressAwareFeedback(baseFeedback, progressSummary);
      expect(enhanced.overallMessage).toContain('resolving');
    });
  });

  describe('shouldChangeStrategy', () => {
    it('should return true for persistent non-improving issues', () => {
      const pattern = {
        issueType: 'elbow_flare' as const,
        firstDetected: new Date(),
        lastDetected: new Date(),
        occurrenceCount: 5,
        severityTrend: 'stable' as const,
        averageSeverityScore: 50,
        resolved: false,
      };

      expect(shouldChangeStrategy(pattern)).toBe(true);
    });

    it('should return false for improving issues', () => {
      const pattern = {
        issueType: 'elbow_flare' as const,
        firstDetected: new Date(),
        lastDetected: new Date(),
        occurrenceCount: 5,
        severityTrend: 'improving' as const,
        averageSeverityScore: 60,
        resolved: false,
      };

      expect(shouldChangeStrategy(pattern)).toBe(false);
    });

    it('should return false for new issues', () => {
      const pattern = {
        issueType: 'elbow_flare' as const,
        firstDetected: new Date(),
        lastDetected: new Date(),
        occurrenceCount: 2,
        severityTrend: 'stable' as const,
        averageSeverityScore: 50,
        resolved: false,
      };

      expect(shouldChangeStrategy(pattern)).toBe(false);
    });
  });

  describe('generateAlternativeDrills', () => {
    it('should provide alternatives for all issue types', () => {
      const issueTypes: Array<'elbow_flare' | 'wrist_angle' | 'stance' | 'follow_through'> = [
        'elbow_flare',
        'wrist_angle',
        'stance',
        'follow_through',
      ];

      issueTypes.forEach(type => {
        const alternatives = generateAlternativeDrills(type);
        expect(alternatives.length).toBeGreaterThan(0);
        expect(alternatives.every(d => d.length > 0)).toBe(true);
      });
    });
  });

  describe('calculateAdaptivePriority', () => {
    const baseIssue: FormIssue = {
      type: 'elbow_flare',
      severity: 'moderate',
      description: 'Test',
      recommendedDrills: [],
    };

    const baseProgress = {
      userId: 'user1',
      totalSessions: 5,
      averageScore: 80,
      scoreImprovement: 0,
      persistentIssues: [],
      resolvedIssues: [],
      newIssues: [],
      recommendationHistory: [],
    };

    it('should prioritize major issues higher', () => {
      const majorIssue = { ...baseIssue, severity: 'major' as const };
      const minorIssue = { ...baseIssue, severity: 'minor' as const };

      const majorPriority = calculateAdaptivePriority(majorIssue, null, baseProgress);
      const minorPriority = calculateAdaptivePriority(minorIssue, null, baseProgress);

      expect(majorPriority).toBeGreaterThan(minorPriority);
    });

    it('should increase priority for worsening issues', () => {
      const worseningPattern = {
        issueType: 'elbow_flare' as const,
        firstDetected: new Date(),
        lastDetected: new Date(),
        occurrenceCount: 4,
        severityTrend: 'worsening' as const,
        averageSeverityScore: 40,
        resolved: false,
      };

      const withPattern = calculateAdaptivePriority(
        baseIssue,
        worseningPattern,
        baseProgress
      );
      const withoutPattern = calculateAdaptivePriority(baseIssue, null, baseProgress);

      expect(withPattern).toBeGreaterThan(withoutPattern);
    });

    it('should decrease priority for improving issues', () => {
      const improvingPattern = {
        issueType: 'elbow_flare' as const,
        firstDetected: new Date(),
        lastDetected: new Date(),
        occurrenceCount: 4,
        severityTrend: 'improving' as const,
        averageSeverityScore: 60,
        resolved: false,
      };

      const withPattern = calculateAdaptivePriority(
        baseIssue,
        improvingPattern,
        baseProgress
      );
      const withoutPattern = calculateAdaptivePriority(baseIssue, null, baseProgress);

      expect(withPattern).toBeLessThan(withoutPattern);
    });
  });
});
