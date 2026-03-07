/**
 * Home Screen
 * Main landing screen with navigation to key features and contextual help
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  AccessibilityInfo,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { ContextualHelp } from '../components/ContextualHelp';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const handleStartPractice = () => {
    navigation.navigate('VideoCapture');
  };

  const handleViewProgress = () => {
    navigation.navigate('Progress', { userId: 'current-user' });
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <ContextualHelp screen="home" />
      
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Welcome to CoachAI
        </Text>
        <Text style={styles.subtitle}>
          Improve your basketball shooting form with AI-powered feedback
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleStartPractice}
          accessibilityLabel="Start practice session"
          accessibilityHint="Opens camera to record your shooting practice"
          accessibilityRole="button"
        >
          <Text style={styles.buttonIcon}>🏀</Text>
          <Text style={styles.primaryButtonText}>Start Practice</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handleViewProgress}
          accessibilityLabel="View your progress"
          accessibilityHint="Shows your improvement over time"
          accessibilityRole="button"
        >
          <Text style={styles.buttonIcon}>📊</Text>
          <Text style={styles.secondaryButtonText}>My Progress</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handleSettings}
          accessibilityLabel="Open settings"
          accessibilityHint="Configure app preferences"
          accessibilityRole="button"
        >
          <Text style={styles.buttonIcon}>⚙️</Text>
          <Text style={styles.secondaryButtonText}>Settings</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          Tap "Start Practice" to record your shooting form and get instant feedback
        </Text>
      </View>
    </ScrollView>
  );
};
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  contentContainer: {
    padding: 20,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    gap: 16,
  },
  button: {
    minHeight: 80,
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  buttonIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  primaryButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  secondaryButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  infoContainer: {
    marginTop: 32,
    padding: 16,
    backgroundColor: '#dbeafe',
    borderRadius: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1e40af',
    textAlign: 'center',
    lineHeight: 20,
  },
});
