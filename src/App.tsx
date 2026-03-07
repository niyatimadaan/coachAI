/**
 * Main App Component
 * Entry point for CoachAI application with full system integration
 */

import React, { useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { RootNavigator } from './navigation/RootNavigator';
import { AccessibilityProvider } from './contexts/AccessibilityContext';
import { ThemeProvider } from './theme/ThemeProvider';
import { CoachAIProvider } from './contexts/CoachAIContext';
import type { CoachAIConfig } from './integration/CoachAISystem';

const App: React.FC = () => {
  // TODO: In production, get userId from authentication system
  const [userId] = useState('demo-user-001');
  
  // CoachAI system configuration
  const coachAIConfig: CoachAIConfig = {
    userId,
    enableCloudSync: true,
    enableCloudProcessing: false, // User must explicitly consent
    privacyMode: 'balanced'
  };

  return (
    <AccessibilityProvider>
      <ThemeProvider>
        <CoachAIProvider config={coachAIConfig}>
          <AppContent />
        </CoachAIProvider>
      </ThemeProvider>
    </AccessibilityProvider>
  );
};

/**
 * App content that uses the CoachAI context
 * Separated to allow access to useCoachAI hook
 */
const AppContent: React.FC = () => {
  // The CoachAI context handles initialization internally
  // Screens can use useCoachAI() hook to access system functionality
  return <RootNavigator />;
};

export default App;
