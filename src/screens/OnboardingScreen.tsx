/**
 * Onboarding Screen
 * 
 * First-time user experience with tutorial and capability detection explanation.
 * Guides users through app features and setup.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { OnboardingManager, OnboardingStep } from '../onboarding/OnboardingManager';
import { useCoachAI } from '../contexts/CoachAIContext';

const { width } = Dimensions.get('window');

type OnboardingScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Onboarding'
>;

interface OnboardingScreenProps {
  navigation: OnboardingScreenNavigationProp;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  const { deviceCapabilities } = useCoachAI();
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const onboardingManager = OnboardingManager;

  useEffect(() => {
    loadOnboarding();
  }, []);

  const loadOnboarding = async () => {
    const onboardingSteps = onboardingManager.getOnboardingSteps();
    setSteps(onboardingSteps);
    
    const progress = await onboardingManager.getOnboardingProgress();
    setCurrentStep(progress.currentStep);
  };

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      
      await onboardingManager.updateOnboardingProgress({
        completed: false,
        currentStep: nextStep,
        stepsCompleted: steps.slice(0, nextStep).map(s => s.id),
        lastUpdated: new Date(),
      });
    } else {
      await handleComplete();
    }
  };

  const handleSkip = async () => {
    await handleComplete();
  };

  const handleComplete = async () => {
    await onboardingManager.completeOnboarding();
    navigation.replace('Home');
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (steps.length === 0) {
    return null;
  }

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  // Add capability explanation for device setup step
  const getStepDescription = (step: OnboardingStep): string => {
    if (step.id === 'device-setup' && deviceCapabilities) {
      return onboardingManager.getCapabilityExplanation(deviceCapabilities);
    }
    return step.description;
  };

  return (
    <View style={styles.container}>
      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        {steps.map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              index === currentStep && styles.progressDotActive,
              index < currentStep && styles.progressDotCompleted,
            ]}
          />
        ))}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.icon}>{step.icon}</Text>
        <Text style={styles.title}>{step.title}</Text>
        <Text style={styles.description}>{getStepDescription(step)}</Text>

        {/* Device Capabilities Detail (for device-setup step) */}
        {step.id === 'device-setup' && deviceCapabilities && (
          <View style={styles.capabilitiesContainer}>
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

        {/* Recording Tips (for recording-tips step) */}
        {step.id === 'recording-tips' && (
          <View style={styles.tipsContainer}>
            <TipItem icon="📏" text="Position camera 10-15 feet away" />
            <TipItem icon="👤" text="Ensure full body is visible" />
            <TipItem icon="🎬" text="Record 3-5 shots per session" />
            <TipItem icon="💡" text="Use good lighting" />
            <TipItem icon="📱" text="Hold phone steady or use a stand" />
          </View>
        )}
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.buttonContainer}>
        <View style={styles.buttonRow}>
          {!isFirstStep && (
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handlePrevious}
              accessibilityLabel="Go to previous step"
              accessibilityRole="button"
            >
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
          )}

          {!isLastStep && (
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handleSkip}
              accessibilityLabel="Skip onboarding"
              accessibilityRole="button"
            >
              <Text style={styles.secondaryButtonText}>Skip</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleNext}
          accessibilityLabel={isLastStep ? 'Complete onboarding' : 'Go to next step'}
          accessibilityRole="button"
        >
          <Text style={styles.primaryButtonText}>
            {isLastStep ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const TipItem: React.FC<{ icon: string; text: string }> = ({ icon, text }) => (
  <View style={styles.tipItem}>
    <Text style={styles.tipIcon}>{icon}</Text>
    <Text style={styles.tipText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e5e7eb',
  },
  progressDotActive: {
    width: 24,
    backgroundColor: '#2563eb',
  },
  progressDotCompleted: {
    backgroundColor: '#10b981',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 32,
    paddingBottom: 32,
    alignItems: 'center',
  },
  icon: {
    fontSize: 80,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  capabilitiesContainer: {
    width: '100%',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  capabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
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
  tipsContainer: {
    width: '100%',
    marginTop: 16,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    marginBottom: 8,
  },
  tipIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#4b5563',
    flex: 1,
  },
  buttonContainer: {
    padding: 20,
    paddingBottom: 32,
    gap: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
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
    flex: 1,
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    flex: 1,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
});
