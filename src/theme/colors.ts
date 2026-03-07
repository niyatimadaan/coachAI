/**
 * Color Theme System
 * Provides standard and high contrast color schemes
 */

export interface ColorScheme {
  // Primary colors
  primary: string;
  primaryDark: string;
  primaryLight: string;
  
  // Background colors
  background: string;
  surface: string;
  surfaceVariant: string;
  
  // Text colors
  textPrimary: string;
  textSecondary: string;
  textOnPrimary: string;
  
  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Border colors
  border: string;
  borderLight: string;
  
  // Interactive colors
  buttonPrimary: string;
  buttonSecondary: string;
  buttonDisabled: string;
}

export const standardColors: ColorScheme = {
  // Primary colors
  primary: '#2563eb',
  primaryDark: '#1e40af',
  primaryLight: '#3b82f6',
  
  // Background colors
  background: '#f3f4f6',
  surface: '#ffffff',
  surfaceVariant: '#f9fafb',
  
  // Text colors
  textPrimary: '#1f2937',
  textSecondary: '#6b7280',
  textOnPrimary: '#ffffff',
  
  // Status colors
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  
  // Border colors
  border: '#e5e7eb',
  borderLight: '#f3f4f6',
  
  // Interactive colors
  buttonPrimary: '#2563eb',
  buttonSecondary: '#ffffff',
  buttonDisabled: '#d1d5db',
};

export const highContrastColors: ColorScheme = {
  // Primary colors - higher contrast
  primary: '#0000ff',
  primaryDark: '#000080',
  primaryLight: '#4169e1',
  
  // Background colors - pure black and white
  background: '#ffffff',
  surface: '#ffffff',
  surfaceVariant: '#f0f0f0',
  
  // Text colors - pure black
  textPrimary: '#000000',
  textSecondary: '#000000',
  textOnPrimary: '#ffffff',
  
  // Status colors - high contrast
  success: '#008000',
  warning: '#ff8c00',
  error: '#ff0000',
  info: '#0000ff',
  
  // Border colors - strong borders
  border: '#000000',
  borderLight: '#666666',
  
  // Interactive colors
  buttonPrimary: '#0000ff',
  buttonSecondary: '#ffffff',
  buttonDisabled: '#808080',
};

export const getColorScheme = (highContrast: boolean): ColorScheme => {
  return highContrast ? highContrastColors : standardColors;
};
