/**
 * Navigation type definitions
 * Defines navigation routes and parameters
 */

export type RootStackParamList = {
  Home: undefined;
  VideoCapture: undefined;
  Analysis: {
    sessionId: string;
  };
  Progress: {
    userId: string;
  };
  Settings: undefined;
  Onboarding: undefined;
};

export type BottomTabParamList = {
  HomeTab: undefined;
  ProgressTab: undefined;
  SettingsTab: undefined;
};
