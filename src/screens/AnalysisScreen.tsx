/**
 * Analysis Screen
 * Displays shooting form analysis results and feedback
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { SessionOperations } from '../database/SessionOperations';
import { ShootingSession, FormIssue } from '../types/models';

type AnalysisScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Analysis'
>;
type AnalysisScreenRouteProp = RouteProp<RootStackParamList, 'Analysis'>;

interface AnalysisScreenProps {
  navigation: AnalysisScreenNavigationProp;
  route: AnalysisScreenRouteProp;
}

export const AnalysisScreen: React.FC<AnalysisScreenProps> = ({ navigation, route }) => {
  const [session, setSession] = useState<ShootingSession | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionOps = new SessionOperations();

  useEffect(() => {
    loadSession();
  }, [route.params.sessionId]);

  const loadSession = async () => {
    try {
      const sessionData = await sessionOps.getSession(route.params.sessionId);
      setSession(sessionData);
    } catch (error) {
      console.error('Failed to load session:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: string): string => {
    switch (score) {
      case 'A': return '#10b981';
      case 'B': return '#3b82f6';
      case 'C': return '#f59e0b';
      case 'D': return '#f97316';
      case 'F': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getScoreEmoji = (score: string): string => {
    switch (score) {
      case 'A': return '🌟';
      case 'B': return '👍';
      case 'C': return '👌';
      case 'D': return '💪';
      case 'F': return '🎯';
      default: return '📊';
    }
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'major': return '#ef4444';
      case 'moderate': return '#f59e0b';
      case 'minor': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getSeverityLabel = (severity: string): string => {
    switch (severity) {
      case 'major': return 'High Priority';
      case 'moderate': return 'Medium Priority';
      case 'minor': return 'Low Priority';
      default: return 'Info';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading analysis...</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Session not found</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.buttonText}>Go Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Score Card */}
      <View style={styles.scoreCard}>
        <Text style={styles.scoreLabel}>Your Form Score</Text>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreEmoji}>{getScoreEmoji(session.formScore)}</Text>
          <Text
            style={[styles.scoreText, { color: getScoreColor(session.formScore) }]}
            accessibilityLabel={`Form score: ${session.formScore}`}
            accessibilityRole="text"
          >
            {session.formScore}
          </Text>
        </View>
        <Text style={styles.scoreDescription}>
          {session.formScore === 'A' && 'Excellent form! Keep it up!'}
          {session.formScore === 'B' && 'Good form with minor improvements needed'}
          {session.formScore === 'C' && 'Decent form, focus on key areas'}
          {session.formScore === 'D' && 'Form needs improvement, practice recommended drills'}
          {session.formScore === 'F' && 'Significant form issues detected, focus on fundamentals'}
        </Text>
      </View>

      {/* Form Issues */}
      {session.detectedIssues && session.detectedIssues.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            Areas to Improve
          </Text>
          {session.detectedIssues.map((issue: FormIssue, index: number) => (
            <View
              key={index}
              style={styles.issueCard}
              accessibilityLabel={`Issue ${index + 1}: ${issue.description}`}
            >
              <View style={styles.issueHeader}>
                <View
                  style={[
                    styles.severityBadge,
                    { backgroundColor: getSeverityColor(issue.severity) },
                  ]}
                >
                  <Text style={styles.severityText}>
                    {getSeverityLabel(issue.severity)}
                  </Text>
                </View>
              </View>
              <Text style={styles.issueDescription}>{issue.description}</Text>
              
              {/* Recommended Drills */}
              {issue.recommendedDrills && issue.recommendedDrills.length > 0 && (
                <View style={styles.drillsContainer}>
                  <Text style={styles.drillsTitle}>Recommended Drills:</Text>
                  {issue.recommendedDrills.map((drill: string, drillIndex: number) => (
                    <Text key={drillIndex} style={styles.drillText}>
                      • {drill}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* No Issues */}
      {(!session.detectedIssues || session.detectedIssues.length === 0) && (
        <View style={styles.noIssuesCard}>
          <Text style={styles.noIssuesEmoji}>✨</Text>
          <Text style={styles.noIssuesText}>
            Great job! No major form issues detected.
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={() => navigation.navigate('VideoCapture')}
          accessibilityLabel="Practice again"
          accessibilityHint="Start a new practice session"
          accessibilityRole="button"
        >
          <Text style={styles.primaryButtonText}>Practice Again</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => navigation.navigate('Progress', { userId: 'current-user' })}
          accessibilityLabel="View progress"
          accessibilityHint="See your improvement over time"
          accessibilityRole="button"
        >
          <Text style={styles.secondaryButtonText}>View Progress</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  contentContainer: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
    marginBottom: 20,
  },
  scoreCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreLabel: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 12,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreEmoji: {
    fontSize: 48,
    marginRight: 16,
  },
  scoreText: {
    fontSize: 72,
    fontWeight: 'bold',
  },
  scoreDescription: {
    fontSize: 14,
    color: '#4b5563',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  issueCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  issueHeader: {
    marginBottom: 12,
  },
  severityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  severityText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  issueDescription: {
    fontSize: 16,
    color: '#1f2937',
    lineHeight: 24,
    marginBottom: 12,
  },
  drillsContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
  },
  drillsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  drillText: {
    fontSize: 14,
    color: '#4b5563',
    marginVertical: 4,
  },
  noIssuesCard: {
    backgroundColor: '#d1fae5',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  noIssuesEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  noIssuesText: {
    fontSize: 16,
    color: '#065f46',
    textAlign: 'center',
  },
  actionsContainer: {
    gap: 12,
    marginTop: 8,
  },
  button: {
    minHeight: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});
