/**
 * Root Navigator
 * Main navigation structure for the app
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';

// Placeholder screens - will be implemented in later tasks
const HomeScreen = () => null;
const VideoCaptureScreen = () => null;
const AnalysisScreen = () => null;
const ProgressScreen = () => null;
const SettingsScreen = () => null;
const OnboardingScreen = () => null;

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: '#2563eb',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 18,
          },
        }}
      >
        <Stack.Screen 
          name="Onboarding" 
          component={OnboardingScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Home" 
          component={HomeScreen}
          options={{ title: 'CoachAI' }}
        />
        <Stack.Screen 
          name="VideoCapture" 
          component={VideoCaptureScreen}
          options={{ title: 'Record Practice' }}
        />
        <Stack.Screen 
          name="Analysis" 
          component={AnalysisScreen}
          options={{ title: 'Form Analysis' }}
        />
        <Stack.Screen 
          name="Progress" 
          component={ProgressScreen}
          options={{ title: 'My Progress' }}
        />
        <Stack.Screen 
          name="Settings" 
          component={SettingsScreen}
          options={{ title: 'Settings' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
