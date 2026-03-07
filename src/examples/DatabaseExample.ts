/**
 * Database Usage Example
 * Demonstrates how to use the database operations for sessions and progress tracking
 */

import DatabaseManager from '../database/DatabaseManager';
import SessionOperations from '../database/SessionOperations';
import ProgressOperations from '../database/ProgressOperations';
import ProgressAnalytics from '../database/ProgressAnalytics';
import { ShootingSession, FormScore } from '../types/models';

/**
 * Example: Initialize database and create a shooting session
 */
export async function exampleCreateSession() {
  // Initialize database
  await DatabaseManager.initialize();
  await DatabaseManager.checkAndMigrate();

  // Create a sample shooting session
  const session: ShootingSession = {
    id: 'session-001',
    userId: 'user-123',
    timestamp: new Date(),
    duration: 1800, // 30 minutes in seconds
    shotAttempts: 50,
    videoPath: '/storage/videos/session-001.mp4',
    formScore: 'B' as FormScore,
    detectedIssues: [
      {
        type: 'elbow_flare',
        severity: 'moderate',
        description: 'Elbow is flaring out during shot release',
        recommendedDrills: [
          'Wall shooting drill',
          'Close-range form shooting'
        ]
      },
      {
        type: 'follow_through',
        severity: 'minor',
        description: 'Follow-through could be held longer',
        recommendedDrills: [
          'Freeze follow-through drill'
        ]
      }
    ],
    practiceTime: 30,
    shotCount: 50,
    formAnalysis: {
      overallScore: 'B' as FormScore,
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
  };

  // Save session to database
  await SessionOperations.createSession(session);
  console.log('Session created successfully');

  // Update user progress
  await ProgressOperations.updateUserProgress(
    session.userId,
    session.formScore,
    session.detectedIssues.map(i => i.type)
  );
  console.log('User progress updated');
}

/**
 * Example: Retrieve and display user sessions
 */
export async function exampleGetUserSessions() {
  const userId = 'user-123';

  // Get all sessions for user
  const allSessions = await SessionOperations.getUserSessions(userId);
  console.log(`Total sessions: ${allSessions.length}`);

  // Get recent 10 sessions
  const recentSessions = await SessionOperations.getUserSessions(userId, 10);
  console.log(`Recent sessions: ${recentSessions.length}`);

  // Display session details
  recentSessions.forEach(session => {
    console.log(`Session ${session.id}:`);
    console.log(`  Score: ${session.formScore}`);
    console.log(`  Date: ${session.timestamp.toLocaleDateString()}`);
    console.log(`  Issues: ${session.detectedIssues.length}`);
    console.log(`  Practice time: ${session.practiceTime} minutes`);
  });
}

/**
 * Example: Get sessions within a date range
 */
export async function exampleGetSessionsInRange() {
  const userId = 'user-123';
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // Last 30 days

  const sessions = await SessionOperations.getSessionsInRange(userId, startDate, endDate);
  console.log(`Sessions in last 30 days: ${sessions.length}`);

  // Calculate average score
  if (sessions.length > 0) {
    const scoreMap: { [key: string]: number } = { 'A': 4, 'B': 3, 'C': 2, 'D': 1, 'F': 0 };
    const avgScore = sessions.reduce((sum, s) => sum + scoreMap[s.formScore], 0) / sessions.length;
    console.log(`Average score: ${avgScore.toFixed(2)}`);
  }
}

/**
 * Example: Calculate and display progress metrics
 */
export async function exampleCalculateProgressMetrics() {
  const userId = 'user-123';

  // Calculate 30-day metrics
  const metrics = await ProgressAnalytics.calculateMetrics(userId, '30d');

  console.log('30-Day Progress Metrics:');
  console.log(`  Average Score: ${metrics.averageScore.toFixed(2)}`);
  console.log(`  Score Improvement: ${metrics.scoreImprovement > 0 ? '+' : ''}${metrics.scoreImprovement.toFixed(2)}`);
  console.log(`  Consistency Rating: ${(metrics.consistencyRating * 100).toFixed(1)}%`);
  console.log(`  Sessions per Week: ${metrics.sessionsPerWeek.toFixed(1)}`);
  console.log(`  Total Practice Time: ${metrics.totalPracticeTime} minutes`);
  console.log(`  Current Streak: ${metrics.streakDays} days`);
  console.log(`  Resolved Issues: ${metrics.resolvedIssues.join(', ') || 'None'}`);
  console.log(`  Persistent Issues: ${metrics.persistentIssues.join(', ') || 'None'}`);
  console.log(`  New Issues: ${metrics.newIssues.join(', ') || 'None'}`);
}

/**
 * Example: Calculate metrics for all timeframes
 */
export async function exampleCalculateAllTimeframes() {
  const userId = 'user-123';

  const allMetrics = await ProgressAnalytics.calculateAllTimeframes(userId);

  console.log('Progress Metrics Summary:');
  console.log('\n7-Day Metrics:');
  console.log(`  Average Score: ${allMetrics.sevenDay.averageScore.toFixed(2)}`);
  console.log(`  Sessions/Week: ${allMetrics.sevenDay.sessionsPerWeek.toFixed(1)}`);

  console.log('\n30-Day Metrics:');
  console.log(`  Average Score: ${allMetrics.thirtyDay.averageScore.toFixed(2)}`);
  console.log(`  Score Improvement: ${allMetrics.thirtyDay.scoreImprovement > 0 ? '+' : ''}${allMetrics.thirtyDay.scoreImprovement.toFixed(2)}`);
  console.log(`  Sessions/Week: ${allMetrics.thirtyDay.sessionsPerWeek.toFixed(1)}`);

  console.log('\n90-Day Metrics:');
  console.log(`  Average Score: ${allMetrics.ninetyDay.averageScore.toFixed(2)}`);
  console.log(`  Score Improvement: ${allMetrics.ninetyDay.scoreImprovement > 0 ? '+' : ''}${allMetrics.ninetyDay.scoreImprovement.toFixed(2)}`);
  console.log(`  Total Practice Time: ${allMetrics.ninetyDay.totalPracticeTime} minutes`);
}

/**
 * Example: Get user progress summary
 */
export async function exampleGetUserProgress() {
  const userId = 'user-123';

  const progress = await ProgressOperations.getUserProgress(userId);

  if (progress) {
    console.log('User Progress Summary:');
    console.log(`  Total Sessions: ${progress.sessionsCompleted}`);
    console.log(`  Average Score: ${progress.averageScore.toFixed(2)}`);
    console.log(`  Improvement Trend: ${progress.improvementTrend > 0 ? '+' : ''}${progress.improvementTrend.toFixed(3)}`);
    console.log(`  Last Active: ${progress.lastActiveDate.toLocaleDateString()}`);
    console.log(`  Common Issues: ${progress.commonIssues.join(', ')}`);
  } else {
    console.log('No progress data found for user');
  }
}

/**
 * Example: Calculate improvement trend
 */
export async function exampleCalculateImprovementTrend() {
  const userId = 'user-123';

  // Calculate 30-day trend
  const trend = await ProgressOperations.calculateImprovementTrend(userId, 30);

  console.log(`30-Day Improvement Trend: ${trend > 0 ? '+' : ''}${trend.toFixed(4)}`);
  
  if (trend > 0.01) {
    console.log('Status: Improving! 📈');
  } else if (trend < -0.01) {
    console.log('Status: Declining - may need additional support 📉');
  } else {
    console.log('Status: Stable performance ➡️');
  }
}

/**
 * Example: Manage storage by deleting old sessions
 */
export async function exampleManageStorage() {
  const userId = 'user-123';
  const keepCount = 50; // Keep only 50 most recent sessions

  // Get current session count
  const sessions = await SessionOperations.getUserSessions(userId);
  console.log(`Current sessions: ${sessions.length}`);

  if (sessions.length > keepCount) {
    await SessionOperations.deleteOldestSessions(userId, keepCount);
    console.log(`Deleted ${sessions.length - keepCount} old sessions`);
    console.log(`Remaining sessions: ${keepCount}`);
  } else {
    console.log('No cleanup needed');
  }
}

/**
 * Example: Update session sync status
 */
export async function exampleUpdateSyncStatus() {
  const sessionId = 'session-001';

  // Mark as pending sync
  await SessionOperations.updateSyncStatus(sessionId, 'pending');
  console.log('Session marked as pending sync');

  // After successful sync
  await SessionOperations.updateSyncStatus(sessionId, 'synced');
  console.log('Session marked as synced');
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  try {
    console.log('=== Database Operations Examples ===\n');

    await exampleCreateSession();
    console.log('\n---\n');

    await exampleGetUserSessions();
    console.log('\n---\n');

    await exampleGetSessionsInRange();
    console.log('\n---\n');

    await exampleCalculateProgressMetrics();
    console.log('\n---\n');

    await exampleCalculateAllTimeframes();
    console.log('\n---\n');

    await exampleGetUserProgress();
    console.log('\n---\n');

    await exampleCalculateImprovementTrend();
    console.log('\n---\n');

    await exampleManageStorage();
    console.log('\n---\n');

    await exampleUpdateSyncStatus();

    console.log('\n=== All examples completed successfully ===');
  } catch (error) {
    console.error('Error running examples:', error);
  } finally {
    await DatabaseManager.close();
  }
}
