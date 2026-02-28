/**
 * Feedback Integration Module
 * Provides unified API for feedback generation with adaptive recommendations
 * Integrates FeedbackGenerator and AdaptiveRecommendationSystem
 */

import {
  FormAnalysisResult,
  AnalysisTier,
  ShootingSession,
} from '../types/models';
import {
  generateFeedback,
  SessionFeedback,
} from './FeedbackGenerator';
import {
  buildProgressSummary,
  generateProgressAwareFeedback,
  UserProgressSummary,
} from './AdaptiveRecommendationSystem';

/**
 * Complete feedback with progress context
 */
export interface CompleteFeedback {
  sessionFeedback: SessionFeedback;
  progressSummary?: UserProgressSummary;
  isAdaptive: boolean;
}

/**
 * Generate feedback for a single session (no history)
 * Used for first-time users or when history is not available
 */
export function generateSessionFeedback(
  analysisResult: FormAnalysisResult,
  analysisTier: AnalysisTier
): CompleteFeedback {
  const sessionFeedback = generateFeedback(analysisResult, analysisTier);

  return {
    sessionFeedback,
    isAdaptive: false,
  };
}

/**
 * Generate adaptive feedback using session history
 * Provides progress-aware recommendations based on user patterns
 */
export function generateAdaptiveFeedback(
  userId: string,
  currentAnalysis: FormAnalysisResult,
  analysisTier: AnalysisTier,
  sessionHistory: ShootingSession[]
): CompleteFeedback {
  // Generate base feedback from current analysis
  const baseFeedback = generateFeedback(currentAnalysis, analysisTier);

  // If no history, return basic feedback
  if (sessionHistory.length === 0) {
    return {
      sessionFeedback: baseFeedback,
      isAdaptive: false,
    };
  }

  // Build progress summary from history
  const progressSummary = buildProgressSummary(userId, sessionHistory);

  // Generate progress-aware feedback
  const adaptiveFeedback = generateProgressAwareFeedback(
    baseFeedback,
    progressSummary
  );

  return {
    sessionFeedback: adaptiveFeedback,
    progressSummary,
    isAdaptive: true,
  };
}

/**
 * Get feedback for display in UI
 * Automatically determines whether to use adaptive feedback based on history
 */
export async function getFeedbackForSession(
  userId: string,
  analysisResult: FormAnalysisResult,
  analysisTier: AnalysisTier,
  getSessionHistory: (userId: string) => Promise<ShootingSession[]>
): Promise<CompleteFeedback> {
  try {
    // Fetch user's session history
    const sessionHistory = await getSessionHistory(userId);

    // Use adaptive feedback if history is available
    if (sessionHistory.length > 0) {
      return generateAdaptiveFeedback(
        userId,
        analysisResult,
        analysisTier,
        sessionHistory
      );
    }

    // Otherwise use basic feedback
    return generateSessionFeedback(analysisResult, analysisTier);
  } catch (error) {
    console.error('Error generating feedback:', error);
    // Fallback to basic feedback on error
    return generateSessionFeedback(analysisResult, analysisTier);
  }
}

/**
 * Format complete feedback for display
 */
export function formatCompleteFeedback(feedback: CompleteFeedback): string {
  let output = '';

  // Add progress context if available
  if (feedback.isAdaptive && feedback.progressSummary) {
    const summary = feedback.progressSummary;
    output += `Session ${summary.totalSessions + 1}\n`;
    output += `Average Score: ${summary.averageScore.toFixed(1)}\n`;

    if (summary.scoreImprovement !== 0) {
      const direction = summary.scoreImprovement > 0 ? '↑' : '↓';
      output += `Recent Trend: ${direction} ${Math.abs(summary.scoreImprovement).toFixed(1)} points\n`;
    }

    output += '\n';
  }

  // Add session feedback
  output += `${feedback.sessionFeedback.overallMessage}\n\n`;
  output += `Form Score: ${feedback.sessionFeedback.formScore}\n\n`;

  // Add recommendations
  if (feedback.sessionFeedback.recommendations.length > 0) {
    output += 'Key Areas to Improve:\n';

    feedback.sessionFeedback.recommendations.forEach((rec) => {
      output += `\n${rec.priority}. ${rec.issue.type.replace('_', ' ').toUpperCase()}`;

      // Add progress note for adaptive recommendations
      if ('progressNote' in rec && rec.progressNote) {
        output += ` [${rec.progressNote}]`;
      }

      output += `\n   ${rec.explanation}\n`;
      output += `   Why it matters: ${rec.whyItMatters}\n`;
      output += `   Recommended drills:\n`;

      rec.drills.forEach((drill) => {
        output += `   - ${drill}\n`;
      });
    });
  }

  output += `\n${feedback.sessionFeedback.encouragement}\n\n`;
  output += 'Next Steps:\n';

  feedback.sessionFeedback.nextSteps.forEach((step, index) => {
    output += `${index + 1}. ${step}\n`;
  });

  return output;
}

/**
 * Get progress insights for user dashboard
 */
export function getProgressInsights(
  progressSummary: UserProgressSummary
): {
  totalSessions: number;
  averageScore: number;
  improvement: string;
  strengths: string[];
  areasToWork: string[];
} {
  const improvement =
    progressSummary.scoreImprovement > 5
      ? 'Improving'
      : progressSummary.scoreImprovement < -5
      ? 'Needs attention'
      : 'Stable';

  const strengths = progressSummary.resolvedIssues.map(
    (issue) => `${issue.issueType.replace('_', ' ')} (resolved)`
  );

  const areasToWork = [
    ...progressSummary.persistentIssues.map(
      (issue) => `${issue.issueType.replace('_', ' ')} (persistent)`
    ),
    ...progressSummary.newIssues.map(
      (issue) => `${issue.issueType.replace('_', ' ')} (new)`
    ),
  ];

  return {
    totalSessions: progressSummary.totalSessions,
    averageScore: progressSummary.averageScore,
    improvement,
    strengths,
    areasToWork,
  };
}
