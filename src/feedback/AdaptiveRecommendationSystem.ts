/**
 * Adaptive Recommendation System
 * Tracks user progress patterns over multiple sessions
 * Adapts recommendations based on improvement trends
 * Handles recommendation evolution as issues are resolved
 */

import {
  FormIssue,
  FormIssueType,
  FormScore,
  ShootingSession,
} from '../types/models';
import { FeedbackRecommendation, SessionFeedback } from './FeedbackGenerator';

/**
 * Progress pattern for a specific issue type
 */
export interface IssueProgressPattern {
  issueType: FormIssueType;
  firstDetected: Date;
  lastDetected: Date;
  occurrenceCount: number;
  severityTrend: 'improving' | 'stable' | 'worsening';
  averageSeverityScore: number; // 0-100 (major=0, moderate=50, minor=75)
  resolved: boolean;
}

/**
 * User's overall progress summary
 */
export interface UserProgressSummary {
  userId: string;
  totalSessions: number;
  averageScore: number;
  scoreImprovement: number; // Change over last 5 sessions
  persistentIssues: IssueProgressPattern[];
  resolvedIssues: IssueProgressPattern[];
  newIssues: IssueProgressPattern[];
  recommendationHistory: string[]; // Track what was recommended
}

/**
 * Adaptive recommendation with context
 */
export interface AdaptiveRecommendation extends FeedbackRecommendation {
  isNew: boolean; // First time seeing this issue
  isPersistent: boolean; // Issue seen in multiple sessions
  progressNote?: string; // Note about progress on this issue
}

/**
 * Calculate severity score for trend analysis
 */
export function calculateSeverityScore(severity: FormIssue['severity']): number {
  const scores = {
    major: 0,
    moderate: 50,
    minor: 75,
  };
  return scores[severity];
}

/**
 * Analyze issue progress pattern from session history
 */
export function analyzeIssueProgress(
  issueType: FormIssueType,
  sessions: ShootingSession[]
): IssueProgressPattern | null {
  // Find all sessions where this issue was detected
  const sessionsWithIssue = sessions.filter(session =>
    session.detectedIssues.some(issue => issue.type === issueType)
  );

  if (sessionsWithIssue.length === 0) {
    return null;
  }

  // Get severity scores over time
  const severityScores = sessionsWithIssue.map(session => {
    const issue = session.detectedIssues.find(i => i.type === issueType);
    return issue ? calculateSeverityScore(issue.severity) : 0;
  });

  // Calculate average severity
  const averageSeverityScore =
    severityScores.reduce((sum, score) => sum + score, 0) / severityScores.length;

  // Determine trend (compare first half to second half)
  const midpoint = Math.floor(severityScores.length / 2);
  const firstHalfAvg =
    severityScores.slice(0, midpoint).reduce((sum, s) => sum + s, 0) /
    Math.max(1, midpoint);
  const secondHalfAvg =
    severityScores.slice(midpoint).reduce((sum, s) => sum + s, 0) /
    Math.max(1, severityScores.length - midpoint);

  let severityTrend: 'improving' | 'stable' | 'worsening';
  const improvement = secondHalfAvg - firstHalfAvg;

  if (improvement > 15) {
    severityTrend = 'improving';
  } else if (improvement < -15) {
    severityTrend = 'worsening';
  } else {
    severityTrend = 'stable';
  }

  // Check if resolved (not in last 2 sessions)
  const recentSessions = sessions.slice(-2);
  const resolved = !recentSessions.some(session =>
    session.detectedIssues.some(issue => issue.type === issueType)
  );

  return {
    issueType,
    firstDetected: sessionsWithIssue[0].timestamp,
    lastDetected: sessionsWithIssue[sessionsWithIssue.length - 1].timestamp,
    occurrenceCount: sessionsWithIssue.length,
    severityTrend,
    averageSeverityScore,
    resolved,
  };
}

/**
 * Build user progress summary from session history
 */
export function buildProgressSummary(
  userId: string,
  sessions: ShootingSession[]
): UserProgressSummary {
  if (sessions.length === 0) {
    return {
      userId,
      totalSessions: 0,
      averageScore: 0,
      scoreImprovement: 0,
      persistentIssues: [],
      resolvedIssues: [],
      newIssues: [],
      recommendationHistory: [],
    };
  }

  // Calculate average score
  const scoreValues = { A: 95, B: 85, C: 75, D: 65, F: 50 };
  const scores = sessions.map(s => scoreValues[s.formScore]);
  const averageScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;

  // Calculate score improvement (last 5 vs previous)
  const recentScores = scores.slice(-5);
  const previousScores = scores.slice(0, -5);
  const recentAvg = recentScores.reduce((sum, s) => sum + s, 0) / recentScores.length;
  const previousAvg =
    previousScores.length > 0
      ? previousScores.reduce((sum, s) => sum + s, 0) / previousScores.length
      : recentAvg;
  const scoreImprovement = recentAvg - previousAvg;

  // Analyze all issue types
  const allIssueTypes: FormIssueType[] = [
    'elbow_flare',
    'wrist_angle',
    'stance',
    'follow_through',
  ];

  const issuePatterns = allIssueTypes
    .map(type => analyzeIssueProgress(type, sessions))
    .filter((pattern): pattern is IssueProgressPattern => pattern !== null);

  // Categorize issues
  const resolvedIssues = issuePatterns.filter(p => p.resolved);
  const activeIssues = issuePatterns.filter(p => !p.resolved);

  // Persistent issues: seen in 3+ sessions
  const persistentIssues = activeIssues.filter(p => p.occurrenceCount >= 3);

  // New issues: only in last 1-2 sessions
  const newIssues = activeIssues.filter(
    p => p.occurrenceCount <= 2 && !persistentIssues.includes(p)
  );

  return {
    userId,
    totalSessions: sessions.length,
    averageScore,
    scoreImprovement,
    persistentIssues,
    resolvedIssues,
    newIssues,
    recommendationHistory: [], // Would be populated from database
  };
}

/**
 * Generate adaptive recommendations based on progress patterns
 */
export function generateAdaptiveRecommendations(
  currentFeedback: SessionFeedback,
  progressSummary: UserProgressSummary
): AdaptiveRecommendation[] {
  const adaptiveRecs: AdaptiveRecommendation[] = [];

  for (const rec of currentFeedback.recommendations) {
    const issueType = rec.issue.type;

    // Check if this is a persistent issue
    const persistentPattern = progressSummary.persistentIssues.find(
      p => p.issueType === issueType
    );

    // Check if this is a new issue
    const newPattern = progressSummary.newIssues.find(p => p.issueType === issueType);

    // Check if this was previously resolved
    const resolvedPattern = progressSummary.resolvedIssues.find(
      p => p.issueType === issueType
    );

    let progressNote: string | undefined;

    if (resolvedPattern) {
      progressNote =
        'This issue has returned. Review the drills that helped you before.';
    } else if (persistentPattern) {
      if (persistentPattern.severityTrend === 'improving') {
        progressNote = `You're making progress on this! Keep practicing these drills.`;
      } else if (persistentPattern.severityTrend === 'worsening') {
        progressNote = `This issue needs more attention. Consider focusing extra time on these drills.`;
      } else {
        progressNote = `You've been working on this. Try varying your practice approach.`;
      }
    } else if (newPattern) {
      progressNote = 'This is a new area to work on. Start with the first drill.';
    }

    adaptiveRecs.push({
      ...rec,
      isNew: !!newPattern,
      isPersistent: !!persistentPattern,
      progressNote,
    });
  }

  return adaptiveRecs;
}

/**
 * Adapt drill recommendations based on progress
 */
export function adaptDrillRecommendations(
  originalDrills: string[],
  issuePattern: IssueProgressPattern | null
): string[] {
  if (!issuePattern) {
    return originalDrills;
  }

  // If improving, suggest progression
  if (issuePattern.severityTrend === 'improving' && issuePattern.occurrenceCount >= 3) {
    return [
      ...originalDrills,
      'Progress to game-speed practice',
      'Add movement to your drills',
    ];
  }

  // If persistent and stable/worsening, suggest alternative approaches
  if (
    issuePattern.occurrenceCount >= 4 &&
    issuePattern.severityTrend !== 'improving'
  ) {
    return [
      'Try a different approach - vary your practice routine',
      ...originalDrills,
      'Consider recording yourself to see the issue',
      'Practice in slow motion to build muscle memory',
    ];
  }

  return originalDrills;
}

/**
 * Generate progress-aware feedback message
 */
export function generateProgressAwareFeedback(
  currentFeedback: SessionFeedback,
  progressSummary: UserProgressSummary
): SessionFeedback {
  // Enhance overall message with progress context
  let enhancedMessage = currentFeedback.overallMessage;

  if (progressSummary.totalSessions >= 3) {
    if (progressSummary.scoreImprovement > 5) {
      enhancedMessage += ' Your form is improving nicely over recent sessions!';
    } else if (progressSummary.scoreImprovement < -5) {
      enhancedMessage +=
        ' Your recent sessions show some regression. Focus on fundamentals.';
    }
  }

  // Add resolved issues celebration
  if (progressSummary.resolvedIssues.length > 0) {
    const resolvedTypes = progressSummary.resolvedIssues
      .map(i => i.issueType.replace('_', ' '))
      .join(', ');
    enhancedMessage += ` Great job resolving: ${resolvedTypes}!`;
  }

  // Generate adaptive recommendations
  const adaptiveRecs = generateAdaptiveRecommendations(
    currentFeedback,
    progressSummary
  );

  // Enhance encouragement based on progress
  let enhancedEncouragement = currentFeedback.encouragement;

  if (progressSummary.persistentIssues.length > 0) {
    const improvingCount = progressSummary.persistentIssues.filter(
      p => p.severityTrend === 'improving'
    ).length;

    if (improvingCount > 0) {
      enhancedEncouragement +=
        ' Your consistent practice is paying off - keep it up!';
    }
  }

  return {
    ...currentFeedback,
    overallMessage: enhancedMessage,
    recommendations: adaptiveRecs,
    encouragement: enhancedEncouragement,
  };
}

/**
 * Determine if recommendation strategy should change
 */
export function shouldChangeStrategy(
  issuePattern: IssueProgressPattern
): boolean {
  // Change strategy if issue is persistent and not improving
  return (
    issuePattern.occurrenceCount >= 4 &&
    issuePattern.severityTrend !== 'improving'
  );
}

/**
 * Generate alternative drill suggestions for persistent issues
 */
export function generateAlternativeDrills(
  issueType: FormIssueType
): string[] {
  const alternatives: Record<FormIssueType, string[]> = {
    elbow_flare: [
      'Try the towel drill - hold towel under shooting arm',
      'Practice with a shooting sleeve for awareness',
      'Use a chair to restrict elbow movement',
      'Film yourself from the side to see the issue',
    ],
    wrist_angle: [
      'Practice lying on your back shooting upward',
      'Use a smaller/lighter ball to focus on wrist',
      'Exaggerate the follow-through motion',
      'Practice wrist snaps without the ball',
    ],
    stance: [
      'Use tape on floor to mark foot positions',
      'Practice stance in front of mirror',
      'Do balance exercises before shooting',
      'Start from a seated position to isolate upper body',
    ],
    follow_through: [
      'Count to 3 while holding follow-through',
      'Practice with eyes closed to feel the motion',
      'Use a target on the wall for form practice',
      'Record and compare your follow-through to pros',
    ],
  };

  return alternatives[issueType];
}

/**
 * Calculate recommendation priority based on progress patterns
 */
export function calculateAdaptivePriority(
  issue: FormIssue,
  pattern: IssueProgressPattern | null,
  progressSummary: UserProgressSummary
): number {
  let priority = 0;

  // Base priority on severity
  const severityPriority = { major: 3, moderate: 2, minor: 1 };
  priority += severityPriority[issue.severity];

  // Increase priority for worsening issues
  if (pattern && pattern.severityTrend === 'worsening') {
    priority += 2;
  }

  // Increase priority for very persistent issues
  if (pattern && pattern.occurrenceCount >= 5) {
    priority += 1;
  }

  // Decrease priority for improving issues
  if (pattern && pattern.severityTrend === 'improving') {
    priority -= 1;
  }

  return Math.max(1, priority);
}
