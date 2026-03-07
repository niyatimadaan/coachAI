/**
 * Progress Screen
 * Displays user progress tracking and analytics
 * Integrated with CoachAI system for real-time progress data
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
import { useCoachAI } from '../contexts/CoachAIContext';
import { UserProgress } from '../types/models';

type ProgressScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Progress'
>;
type ProgressScreenRouteProp = RouteProp<RootStackParamList, 'Progress'>;

interface ProgressScreenProps {
  navigation: ProgressScreenNavigationProp;
  route: ProgressScreenRouteProp;
}

export const ProgressScreen: React.FC<ProgressScreenProps> = ({ navigation, route }) => {
  const { getUserProgress } = useCoachAI();
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      setLoading(true);
      const data = await getUserProgress();
      setProgress(data);
    } catch (error) {
      console.error('Failed to load progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const getImprovementColor = (improvement: number): string => {
    if (improvement > 0) return '#10b981';
    if (improvement < 0) return '#ef4444';
    return '#6b7280';
  };

  const getImprovementIcon = (improvement: number): string => {
    if (improvement > 0) return '📈';
    if (improvement < 0) return '📉';
    return '➡️';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading progress...</Text>
      </View>
    );
  }

  if (!progress) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>🏀</Text>
        <Text style={styles.emptyText}>No practice data yet</Text>
        <Text style={styles.emptySubtext}>
          Start practicing to track your progress!
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('VideoCapture')}
        >
          <Text style={styles.buttonText}>Start Practice</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Performance Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          Performance
        </Text>

        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Average Score</Text>
            <Text
              style={styles.metricValue}
              accessibilityLabel={`Average score: ${progress.averageScore.toFixed(1)}`}
            >
              {progress.averageScore.toFixed(1)}
            </Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Improvement</Text>
            <View style={styles.improvementContainer}>
              <Text style={styles.improvementIcon}>
                {getImprovementIcon(progress.improvementTrend)}
              </Text>
              <Text
                style={[
                  styles.metricValue,
                  { color: getImprovementColor(progress.improvementTrend) },
                ]}
                accessibilityLabel={`Improvement: ${progress.improvementTrend > 0 ? '+' : ''}${progress.improvementTrend.toFixed(1)}%`}
              >
                {progress.improvementTrend > 0 ? '+' : ''}
                {progress.improvementTrend.toFixed(1)}%
              </Text>
            </View>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Sessions</Text>
            <Text
              style={styles.metricValue}
              accessibilityLabel={`Total sessions: ${progress.sessionsCompleted}`}
            >
              {progress.sessionsCompleted}
            </Text>
          </View>
        </View>
      </View>

      {/* Common Issues */}
      {progress.commonIssues && progress.commonIssues.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            Focus Areas
          </Text>
          <View style={styles.issuesCard}>
            {progress.commonIssues.map((issue, index) => (
              <Text key={index} style={styles.issueText}>
                • {issue}
              </Text>
            ))}
          </View>
        </View>
      )}

      {/* Action Button */}
      <TouchableOpacity
        style={styles.practiceButton}
        onPress={() => navigation.navigate('VideoCapture')}
        accessibilityLabel="Start new practice session"
        accessibilityRole="button"
      >
        <Text style={styles.practiceButtonText}>Continue Practicing</Text>
      </TouchableOpacity>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 20,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
  },
  timeframeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  timeframeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  timeframeButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  timeframeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  timeframeTextActive: {
    color: '#ffffff',
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
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  improvementContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  improvementIcon: {
    fontSize: 16,
  },
  engagementCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  engagementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  engagementIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  engagementContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  engagementLabel: {
    fontSize: 14,
    color: '#4b5563',
  },
  engagementValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  issuesCard: {
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
  issuesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  issueText: {
    fontSize: 14,
    color: '#4b5563',
    marginVertical: 4,
  },
  practiceButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  practiceButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginTop: 16,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});
