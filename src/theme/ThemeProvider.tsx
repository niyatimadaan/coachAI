/**
 * Theme Provider
 * Provides theme context with accessibility support
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { ColorScheme, getColorScheme } from './colors';
import { TypographyScale, getTypographyScale, MIN_TOUCH_TARGET_SIZE } from './typography';

interface Theme {
  colors: ColorScheme;
  typography: TypographyScale;
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  touchTarget: {
    minSize: number;
  };
}

interface ThemeContextType {
  theme: Theme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { settings } = useAccessibility();

  const theme: Theme = {
    colors: getColorScheme(settings.highContrastMode),
    typography: getTypographyScale(settings.largeText),
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },
    borderRadius: {
      sm: 4,
      md: 8,
      lg: 12,
      xl: 16,
    },
    touchTarget: {
      minSize: MIN_TOUCH_TARGET_SIZE,
    },
  };

  return (
    <ThemeContext.Provider value={{ theme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
