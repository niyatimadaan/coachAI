/**
 * Accessibility Context
 * Manages accessibility settings across the app
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AccessibilityInfo } from 'react-native';

interface AccessibilitySettings {
  highContrastMode: boolean;
  largeText: boolean;
  screenReaderEnabled: boolean;
  reducedMotion: boolean;
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSettings: (updates: Partial<AccessibilitySettings>) => void;
  isScreenReaderEnabled: boolean;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

interface AccessibilityProviderProps {
  children: ReactNode;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    highContrastMode: false,
    largeText: false,
    screenReaderEnabled: false,
    reducedMotion: false,
  });

  useEffect(() => {
    // Check if screen reader is enabled
    AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
      setSettings((prev) => ({ ...prev, screenReaderEnabled: enabled }));
    });

    // Listen for screen reader changes
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      (enabled) => {
        setSettings((prev) => ({ ...prev, screenReaderEnabled: enabled }));
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);

  const updateSettings = (updates: Partial<AccessibilitySettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  };

  const value: AccessibilityContextType = {
    settings,
    updateSettings,
    isScreenReaderEnabled: settings.screenReaderEnabled,
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = (): AccessibilityContextType => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
};
