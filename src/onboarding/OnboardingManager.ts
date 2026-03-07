/**
 * Onboarding Manager
 * 
 * Manages first-time user experience, tutorials, and contextual help.
 * Tracks onboarding progress and provides capability detection explanations.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DeviceCapabilities } from '../types/models';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  action?: string;
}

export interface OnboardingProgress {
  completed: boolean;
  currentStep: number;
  stepsCompleted: string[];
  lastUpdated: Date;
}

export interface ContextualHelp {
  id: string;
  screen: string;
  title: string;
  message: string;
  shown: boolean;
}

const ONBOARDING_KEY = '@coachAI:onboarding';
const CONTEXTUAL_HELP_KEY = '@coachAI:contextualHelp';

export class OnboardingManager {
  private static instance: OnboardingManager;

  private constructor() {}

  static getInstance(): OnboardingManager {
    if (!OnboardingManager.instance) {
      OnboardingManager.instance = new OnboardingManager();
    }
    return OnboardingManager.instance;
  }

  /**
   * Get onboarding steps for first-time users
   */
  getOnboardingSteps(): OnboardingStep[] {
    return [
      {
        id: 'welcome',
        title: 'Welcome to CoachAI',
        description: 'Your personal basketball shooting coach powered by AI. Get instant feedback on your form and track your progress over time.',
        icon: '🏀',
      },
      {
        id: 'how-it-works',
        title: 'How It Works',
        description: 'Record your shooting practice with your phone camera. Our AI analyzes your form and provides personalized feedback to help you improve.',
        icon: '📹',
      },
      {
        id: 'device-setup',
        title: 'Device Setup',
        description: 'We\'ve detected your device capabilities and optimized the app for the best experience. You can practice offline anytime!',
        icon: '📱',
      },
      {
        id: 'recording-tips',
        title: 'Recording Tips',
        description: 'Position your camera 10-15 feet away, ensure your full body is visible, and use good lighting for best results.',
        icon: '💡',
      },
      {
        id: 'privacy',
        title: 'Your Privacy Matters',
        description: 'Videos are processed on your device by default. Cloud processing is optional and requires your consent.',
        icon: '🔒',
      },
      {
        id: 'ready',
        title: 'Ready to Start!',
        description: 'You\'re all set! Start your first practice session and begin improving your shooting form.',
        icon: '🎯',
        action: 'start-practice',
      },
    ];
  }

  /**
   * Get capability-specific explanation for users
   */
  getCapabilityExplanation(capabilities: DeviceCapabilities): string {
    const tier = capabilities.tier;
    
    switch (tier) {
      case 'high-end':
        return 'Your device supports advanced AI analysis with detailed biomechanical feedback. You\'ll get the most comprehensive form analysis available.';
      
      case 'mid-range':
        return 'Your device supports lightweight AI analysis with good quality feedback. You\'ll receive detailed form corrections and recommendations.';
      
      case 'low-end':
        return 'Your device will use basic analysis optimized for performance. You\'ll still get valuable feedback on your shooting form, just processed faster.';
      
      default:
        return 'Your device has been configured for optimal performance. The app will automatically adjust analysis quality based on your device capabilities.';
    }
  }

  /**
   * Get detailed capability breakdown for settings screen
   */
  getCapabilityDetails(capabilities: DeviceCapabilities): {
    title: string;
    items: Array<{ label: string; value: string; icon: string }>;
  } {
    return {
      title: 'Device Capabilities',
      items: [
        {
          label: 'Processing Tier',
          value: this.formatTier(capabilities.tier),
          icon: '⚡',
        },
        {
          label: 'Available RAM',
          value: `${capabilities.availableRAM}GB`,
          icon: '💾',
        },
        {
          label: 'ML Support',
          value: capabilities.supportsML ? 'Yes' : 'No',
          icon: '🤖',
        },
        {
          label: 'GPU Acceleration',
          value: capabilities.hasGPU ? 'Available' : 'Not Available',
          icon: '🎮',
        },
        {
          label: 'Analysis Method',
          value: this.getAnalysisMethod(capabilities),
          icon: '🔬',
        },
      ],
    };
  }

  /**
   * Check if user has completed onboarding
   */
  async hasCompletedOnboarding(): Promise<boolean> {
    try {
      const data = await AsyncStorage.getItem(ONBOARDING_KEY);
      if (!data) return false;
      
      const progress: OnboardingProgress = JSON.parse(data);
      return progress.completed;
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }
  }

  /**
   * Get current onboarding progress
   */
  async getOnboardingProgress(): Promise<OnboardingProgress> {
    try {
      const data = await AsyncStorage.getItem(ONBOARDING_KEY);
      if (!data) {
        return {
          completed: false,
          currentStep: 0,
          stepsCompleted: [],
          lastUpdated: new Date(),
        };
      }
      
      return JSON.parse(data);
    } catch (error) {
      console.error('Error getting onboarding progress:', error);
      return {
        completed: false,
        currentStep: 0,
        stepsCompleted: [],
        lastUpdated: new Date(),
      };
    }
  }

  /**
   * Update onboarding progress
   */
  async updateOnboardingProgress(progress: OnboardingProgress): Promise<void> {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, JSON.stringify(progress));
    } catch (error) {
      console.error('Error updating onboarding progress:', error);
    }
  }

  /**
   * Mark onboarding as completed
   */
  async completeOnboarding(): Promise<void> {
    const progress: OnboardingProgress = {
      completed: true,
      currentStep: this.getOnboardingSteps().length,
      stepsCompleted: this.getOnboardingSteps().map(step => step.id),
      lastUpdated: new Date(),
    };
    
    await this.updateOnboardingProgress(progress);
  }

  /**
   * Reset onboarding (for testing or user request)
   */
  async resetOnboarding(): Promise<void> {
    try {
      await AsyncStorage.removeItem(ONBOARDING_KEY);
      await AsyncStorage.removeItem(CONTEXTUAL_HELP_KEY);
    } catch (error) {
      console.error('Error resetting onboarding:', error);
    }
  }

  /**
   * Get contextual help for a specific screen
   */
  getContextualHelp(screen: string): ContextualHelp[] {
    const helpMap: Record<string, ContextualHelp[]> = {
      home: [
        {
          id: 'home-welcome',
          screen: 'home',
          title: 'Welcome!',
          message: 'Tap "Start Practice" to record your shooting session and get instant feedback.',
          shown: false,
        },
      ],
      videoCapture: [
        {
          id: 'capture-positioning',
          screen: 'videoCapture',
          title: 'Camera Positioning',
          message: 'Position your camera 10-15 feet away and ensure your full body is visible in the frame.',
          shown: false,
        },
        {
          id: 'capture-lighting',
          screen: 'videoCapture',
          title: 'Lighting Tips',
          message: 'Good lighting helps our AI analyze your form more accurately. Avoid backlighting.',
          shown: false,
        },
      ],
      analysis: [
        {
          id: 'analysis-score',
          screen: 'analysis',
          title: 'Understanding Your Score',
          message: 'Your form score (A-F) reflects overall shooting technique. Focus on the specific issues highlighted below.',
          shown: false,
        },
        {
          id: 'analysis-drills',
          screen: 'analysis',
          title: 'Practice Drills',
          message: 'Follow the recommended drills to address your form issues. Consistent practice leads to improvement!',
          shown: false,
        },
      ],
      progress: [
        {
          id: 'progress-tracking',
          screen: 'progress',
          title: 'Track Your Improvement',
          message: 'Your progress chart shows how your form has improved over time. Keep practicing regularly!',
          shown: false,
        },
      ],
      settings: [
        {
          id: 'settings-capabilities',
          screen: 'settings',
          title: 'Device Capabilities',
          message: 'Your device capabilities determine which analysis method is used. All methods provide valuable feedback!',
          shown: false,
        },
        {
          id: 'settings-cloud',
          screen: 'settings',
          title: 'Cloud Processing',
          message: 'Enable cloud processing for enhanced analysis when you have good internet connectivity.',
          shown: false,
        },
      ],
    };

    return helpMap[screen] || [];
  }

  /**
   * Check if contextual help should be shown
   */
  async shouldShowContextualHelp(helpId: string): Promise<boolean> {
    try {
      const data = await AsyncStorage.getItem(CONTEXTUAL_HELP_KEY);
      if (!data) return true;
      
      const shownHelp: string[] = JSON.parse(data);
      return !shownHelp.includes(helpId);
    } catch (error) {
      console.error('Error checking contextual help:', error);
      return true;
    }
  }

  /**
   * Mark contextual help as shown
   */
  async markContextualHelpShown(helpId: string): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(CONTEXTUAL_HELP_KEY);
      const shownHelp: string[] = data ? JSON.parse(data) : [];
      
      if (!shownHelp.includes(helpId)) {
        shownHelp.push(helpId);
        await AsyncStorage.setItem(CONTEXTUAL_HELP_KEY, JSON.stringify(shownHelp));
      }
    } catch (error) {
      console.error('Error marking contextual help shown:', error);
    }
  }

  private formatTier(tier: string): string {
    switch (tier) {
      case 'high-end':
        return 'High Performance';
      case 'mid-range':
        return 'Standard';
      case 'low-end':
        return 'Optimized';
      default:
        return 'Unknown';
    }
  }

  private getAnalysisMethod(capabilities: DeviceCapabilities): string {
    if (capabilities.tier === 'high-end') {
      return 'Advanced ML';
    } else if (capabilities.tier === 'mid-range' && capabilities.supportsML) {
      return 'Lightweight ML';
    } else {
      return 'Rule-Based';
    }
  }
}

export default OnboardingManager.getInstance();
