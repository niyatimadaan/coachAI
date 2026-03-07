/**
 * Settings Screen
 * User preferences and app configuration with device capability information
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { useCoachAI } from '../contexts/CoachAIContext';
import { OnboardingManager } from '../onboarding/OnboardingManager';
import { ContextualHelp } from '../components/ContextualHelp';

type SettingsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Settings'
>;

interface SettingsScreenProps {
  navigation: SettingsScreenNavigationProp;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const { settings, updateSettings } = useAccessibility();
  const { deviceCapabilities, requestCloudProcessing } = useCoachAI();
  const [cloudProcessing, setCloudProcessing] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const onboardingManager = OnboardingManager;

  const handleCloudProcessingToggle = async (value: boolean) => {
    if (value) {
      const granted = await requestCloudProcessing();
      setCloudProcessing(granted);
    } else {
      setCloudProcessing(false);
    }
  };

  const handleResetOnboarding = async () => {
    Alert.alert(
      'Reset Tutorial',
      'This will reset the onboarding tutorial and show it again on next app launch.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          onPress: async () => {
            await onboardingManager.resetOnboarding();
            Alert.alert('Success', 'Tutorial has been reset');
          },
        },
      ]
    );
  };

  const handleDeleteData = () => {
    Alert.alert(
      'Delete All Data',
      'This will permanently delete all your practice sessions and progress data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement data deletion
            Alert.alert('Success', 'All data has been deleted');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <ContextualHelp screen="settings" />
      
      {/* Device Capabilities */}
      {deviceCapabilities && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            Device Capabilities
          </Text>
          <Text style={styles.sectionDescription}>
            {onboardingManager.getCapabilityExplanation(deviceCapabilities)}
          </Text>
          
          {onboardingManager.getCapabilityDetails(deviceCapabilities).items.map((item, index) => (
            <View key={index} style={styles.capabilityRow}>
              <Text style={styles.capabilityIcon}>{item.icon}</Text>
              <View style={styles.capabilityContent}>
                <Text style={styles.capabilityLabel}>{item.label}</Text>
                <Text style={styles.capabilityValue}>{item.value}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Analysis Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          Analysis
        </Text>

        <View style={styles.settingRow}>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Cloud Processing</Text>
            <Text style={styles.settingDescription}>
              Upload videos for enhanced analysis (requires consent)
            </Text>
          </View>
          <Switch
            value={cloudProcessing}
            onValueChange={handleCloudProcessingToggle}
            accessibilityLabel="Toggle cloud processing"
            accessibilityHint="Enables or disables cloud-based video analysis"
          />
        </View>
      </View>

      {/* Accessibility Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          Accessibility
        </Text>

        <View style={styles.settingRow}>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>High Contrast Mode</Text>
            <Text style={styles.settingDescription}>
              Increase contrast for better visibility
            </Text>
          </View>
          <Switch
            value={settings.highContrastMode}
            onValueChange={(value) => updateSettings({ highContrastMode: value })}
            accessibilityLabel="Toggle high contrast mode"
            accessibilityHint="Increases contrast for users with visual impairments"
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Large Text</Text>
            <Text style={styles.settingDescription}>
              Increase text size throughout the app
            </Text>
          </View>
          <Switch
            value={settings.largeText}
            onValueChange={(value) => updateSettings({ largeText: value })}
            accessibilityLabel="Toggle large text"
            accessibilityHint="Increases text size for better readability"
          />
        </View>
      </View>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          Notifications
        </Text>

        <View style={styles.settingRow}>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Practice Reminders</Text>
            <Text style={styles.settingDescription}>
              Get reminded to practice regularly
            </Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            accessibilityLabel="Toggle practice reminders"
            accessibilityHint="Enables or disables practice reminder notifications"
          />
        </View>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          About
        </Text>

        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => Alert.alert('Privacy Policy', 'Privacy policy content here')}
          accessibilityLabel="View privacy policy"
          accessibilityRole="button"
        >
          <Text style={styles.linkText}>Privacy Policy</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => Alert.alert('Terms of Service', 'Terms of service content here')}
          accessibilityLabel="View terms of service"
          accessibilityRole="button"
        >
          <Text style={styles.linkText}>Terms of Service</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>

        <View style={styles.versionRow}>
          <Text style={styles.versionText}>Version 1.0.0 (MVP)</Text>
        </View>
      </View>

      {/* Data Management */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          Data Management
        </Text>

        <TouchableOpacity
          style={styles.linkRow}
          onPress={handleResetOnboarding}
          accessibilityLabel="Reset tutorial"
          accessibilityRole="button"
        >
          <Text style={styles.linkText}>Reset Tutorial</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dangerButton}
          onPress={handleDeleteData}
          accessibilityLabel="Delete all data"
          accessibilityHint="Permanently deletes all your practice data"
          accessibilityRole="button"
        >
          <Text style={styles.dangerButtonText}>Delete All Data</Text>
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
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 16,
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
  },
  capabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  capabilityIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  capabilityContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  capabilityLabel: {
    fontSize: 14,
    color: '#4b5563',
  },
  capabilityValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    minHeight: 70,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  settingContent: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    minHeight: 56,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  linkText: {
    fontSize: 16,
    color: '#1f2937',
  },
  linkArrow: {
    fontSize: 24,
    color: '#9ca3af',
  },
  versionRow: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 14,
    color: '#6b7280',
  },
  dangerButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ef4444',
    minHeight: 56,
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ef4444',
  },
});
