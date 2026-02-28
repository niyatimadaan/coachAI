/**
 * Example usage of the Feedback Generation System
 * Demonstrates both basic and adaptive feedback scenarios
 */

import {
  generateSessionFeedback,
  generateAdaptiveFeedback,
  getFeedbackForSession,
  formatCompleteFeedback,
  getProgressInsights,
} from '../feedback/FeedbackIntegration';
import {
  FormAnalysisResult,
  ShootingSession,
  FormIssue,
} from '../types/models';

/**
 * Example 1: Basic Feedback for First-Time User
 */
export function exampleBasicFeedback() {
  console.log('=== Example 1: Basic Feedback (First Session) ===\n');

  // Simulated analysis result from BasicAnalysisEngine
  const analysisResult: FormAnalysisResult = {
    overallScore: 'C',
    detectedIssues: [
      {
        type: 'elbow_flare',
        severity: 'major',
        description: 'Your elbow is flaring out too much. Keep it aligned under the ball.',
        recommendedDrills: [
          'Wall shooting drill - Practice form against a wall',
          'One-hand form shooting - Focus on elbow alignment',
        ],
      },
      {
        type: 'follow_through',
        severity: 'moderate',
        description: 'Your follow-through is too short. Hold your form longer after release.',
        recommendedDrills: [
          'Freeze drill - Hold follow-through position for 2 seconds',
        ],
      },
    ],
    biomechanicalMetrics: {
      elbowAlignment: 65,
      wristAngle: 78,
      shoulderSquare: 82,
      followThrough: 58,
    },
  };

  // Generate basic feedback (no history)
  const feedback = generateSessionFeedback(analysisResult, 'basic');

  // Display feedback
  console.log('Overall:', feedback.sessionFeedback.overallMessage);
  console.log('Score:', feedback.sessionFeedback.formScore);
  console.log('\nRecommendations:');
  feedback.sessionFeedback.recommendations.forEach((rec) => {
    console.log(`\n${rec.priority}. ${rec.issue.type}`);
    console.log(`   ${rec.explanation}`);
    console.log(`   Drills: ${rec.drills.join(', ')}`);
  });
  console.log('\n' + feedback.sessionFeedback.encouragement);
  console.log('\nNext Steps:');
  feedback.sessionFeedback.nextSteps.forEach((step, i) => {
    console.log(`${i + 1}. ${step}`);
  });
}

/**
 * Example 2: Adaptive Feedback with Progress Tracking
 */
export function exampleAdaptiveFeedback() {
  console.log('\n\n=== Example 2: Adaptive Feedback (Multiple Sessions) ===\n');

  // Simulated session history
  const sessionHistory: ShootingSession[] = [
    {
      id: 'session1',
      userId: 'user123',
      timestamp: new Date('2024-01-01'),
      duration: 1800,
      shotAttempts: 20,
      videoPath: '/videos/session1.mp4',
      formScore: 'D',
      detectedIssues: [
        {
          type: 'elbow_flare',
          severity: 'major',
          description: 'Elbow flaring significantly',
          recommendedDrills: ['Wall drill'],
        },
        {
          type: 'wrist_angle',
          severity: 'moderate',
          description: 'Wrist angle needs work',
          recommendedDrills: ['Wrist flick drill'],
        },
      ],
      practiceTime: 1800,
      shotCount: 20,
      formAnalysis: {
        overallScore: 'D',
        detectedIssues: [],
        biomechanicalMetrics: {
          elbowAlignment: 55,
          wristAngle: 68,
          shoulderSquare: 75,
          followThrough: 60,
        },
      },
      videoMetadata: {
        resolution: '1080p',
        frameRate: 30,
        lighting: 'good',
      },
      syncStatus: 'local',
      lastModified: new Date('2024-01-01'),
    },
    {
      id: 'session2',
      userId: 'user123',
      timestamp: new Date('2024-01-03'),
      duration: 1800,
      shotAttempts: 20,
      videoPath: '/videos/session2.mp4',
      formScore: 'C',
      detectedIssues: [
        {
          type: 'elbow_flare',
          severity: 'moderate',
          description: 'Elbow improving but still needs work',
          recommendedDrills: ['Wall drill'],
        },
      ],
      practiceTime: 1800,
      shotCount: 20,
      formAnalysis: {
        overallScore: 'C',
        detectedIssues: [],
        biomechanicalMetrics: {
          elbowAlignment: 68,
          wristAngle: 75,
          shoulderSquare: 78,
          followThrough: 65,
        },
      },
      videoMetadata: {
        resolution: '1080p',
        frameRate: 30,
        lighting: 'good',
      },
      syncStatus: 'local',
      lastModified: new Date('2024-01-03'),
    },
    {
      id: 'session3',
      userId: 'user123',
      timestamp: new Date('2024-01-05'),
      duration: 1800,
      shotAttempts: 20,
      videoPath: '/videos/session3.mp4',
      formScore: 'B',
      detectedIssues: [
        {
          type: 'elbow_flare',
          severity: 'minor',
          description: 'Elbow much better, minor adjustments needed',
          recommendedDrills: ['One-hand shooting'],
        },
      ],
      practiceTime: 1800,
      shotCount: 20,
      formAnalysis: {
        overallScore: 'B',
        detectedIssues: [],
        biomechanicalMetrics: {
          elbowAlignment: 78,
          wristAngle: 82,
          shoulderSquare: 85,
          followThrough: 75,
        },
      },
      videoMetadata: {
        resolution: '1080p',
        frameRate: 30,
        lighting: 'good',
      },
      syncStatus: 'local',
      lastModified: new Date('2024-01-05'),
    },
  ];

  // Current session analysis
  const currentAnalysis: FormAnalysisResult = {
    overallScore: 'B',
    detectedIssues: [
      {
        type: 'elbow_flare',
        severity: 'minor',
        description: 'Minor elbow alignment adjustment needed',
        recommendedDrills: ['Mirror practice', 'Game-speed shooting'],
      },
    ],
    biomechanicalMetrics: {
      elbowAlignment: 82,
      wristAngle: 85,
      shoulderSquare: 88,
      followThrough: 80,
    },
  };

  // Generate adaptive feedback
  const feedback = generateAdaptiveFeedback(
    'user123',
    currentAnalysis,
    'lightweight_ml',
    sessionHistory
  );

  // Display progress summary
  if (feedback.progressSummary) {
    console.log('Progress Summary:');
    console.log(`Total Sessions: ${feedback.progressSummary.totalSessions}`);
    console.log(`Average Score: ${feedback.progressSummary.averageScore.toFixed(1)}`);
    console.log(
      `Recent Improvement: ${feedback.progressSummary.scoreImprovement > 0 ? '+' : ''}${feedback.progressSummary.scoreImprovement.toFixed(1)} points`
    );

    if (feedback.progressSummary.resolvedIssues.length > 0) {
      console.log('\nResolved Issues:');
      feedback.progressSummary.resolvedIssues.forEach((issue) => {
        console.log(`  ✓ ${issue.issueType.replace('_', ' ')}`);
      });
    }

    if (feedback.progressSummary.persistentIssues.length > 0) {
      console.log('\nPersistent Issues:');
      feedback.progressSummary.persistentIssues.forEach((issue) => {
        console.log(
          `  • ${issue.issueType.replace('_', ' ')} (${issue.severityTrend})`
        );
      });
    }
  }

  // Display adaptive recommendations
  console.log('\n' + feedback.sessionFeedback.overallMessage);
  console.log('\nAdaptive Recommendations:');
  feedback.sessionFeedback.recommendations.forEach((rec) => {
    console.log(`\n${rec.priority}. ${rec.issue.type.replace('_', ' ').toUpperCase()}`);
    console.log(`   ${rec.explanation}`);

    if ('progressNote' in rec && rec.progressNote) {
      console.log(`   📊 Progress: ${rec.progressNote}`);
    }

    console.log(`   Drills: ${rec.drills.join(', ')}`);
  });
}

/**
 * Example 3: Complete Workflow with Database Integration
 */
export async function exampleCompleteWorkflow() {
  console.log('\n\n=== Example 3: Complete Workflow ===\n');

  // Mock database function
  const getSessionHistoryFromDB = async (userId: string): Promise<ShootingSession[]> => {
    console.log(`Fetching session history for user: ${userId}`);
    // In real app, this would query the database
    return [];
  };

  // Current analysis result
  const analysisResult: FormAnalysisResult = {
    overallScore: 'B',
    detectedIssues: [
      {
        type: 'stance',
        severity: 'minor',
        description: 'Stance width could be better',
        recommendedDrills: ['Balance drills', 'Stance practice'],
      },
    ],
    biomechanicalMetrics: {
      elbowAlignment: 85,
      wristAngle: 88,
      shoulderSquare: 90,
      followThrough: 82,
    },
  };

  // Get feedback with automatic history integration
  const feedback = await getFeedbackForSession(
    'user456',
    analysisResult,
    'lightweight_ml',
    getSessionHistoryFromDB
  );

  // Format for display
  const displayText = formatCompleteFeedback(feedback);
  console.log(displayText);

  // Get insights for dashboard
  if (feedback.progressSummary) {
    const insights = getProgressInsights(feedback.progressSummary);
    console.log('\nDashboard Insights:');
    console.log(`Sessions: ${insights.totalSessions}`);
    console.log(`Average: ${insights.averageScore.toFixed(1)}`);
    console.log(`Trend: ${insights.improvement}`);
    console.log(`Strengths: ${insights.strengths.join(', ') || 'Building foundation'}`);
    console.log(`Focus Areas: ${insights.areasToWork.join(', ') || 'None'}`);
  }
}

/**
 * Example 4: Handling Different Analysis Tiers
 */
export function exampleTierComparison() {
  console.log('\n\n=== Example 4: Tier Comparison ===\n');

  const analysisResult: FormAnalysisResult = {
    overallScore: 'C',
    detectedIssues: [
      {
        type: 'elbow_flare',
        severity: 'moderate',
        description: 'Elbow alignment needs work',
        recommendedDrills: ['Wall drill', 'One-hand shooting'],
      },
      {
        type: 'wrist_angle',
        severity: 'minor',
        description: 'Wrist angle could be better',
        recommendedDrills: ['Wrist flick drill'],
      },
      {
        type: 'follow_through',
        severity: 'moderate',
        description: 'Follow-through needs extension',
        recommendedDrills: ['Freeze drill'],
      },
    ],
    biomechanicalMetrics: {
      elbowAlignment: 72,
      wristAngle: 78,
      shoulderSquare: 80,
      followThrough: 68,
    },
  };

  // Basic tier feedback
  console.log('BASIC TIER (Rule-based analysis):');
  const basicFeedback = generateSessionFeedback(analysisResult, 'basic');
  console.log(`Recommendations: ${basicFeedback.sessionFeedback.recommendations.length}`);
  console.log('Message:', basicFeedback.sessionFeedback.overallMessage);

  // Advanced tier feedback
  console.log('\n\nADVANCED TIER (ML-based analysis):');
  const advancedFeedback = generateSessionFeedback(analysisResult, 'lightweight_ml');
  console.log(
    `Recommendations: ${advancedFeedback.sessionFeedback.recommendations.length}`
  );
  console.log('Message:', advancedFeedback.sessionFeedback.overallMessage);
  console.log('\nDetailed explanation:');
  console.log(advancedFeedback.sessionFeedback.recommendations[0].explanation);
}

/**
 * Run all examples
 */
export function runAllExamples() {
  exampleBasicFeedback();
  exampleAdaptiveFeedback();
  exampleCompleteWorkflow();
  exampleTierComparison();
}

// Run examples if executed directly
if (require.main === module) {
  runAllExamples();
}
