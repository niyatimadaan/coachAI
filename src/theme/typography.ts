/**
 * Typography System
 * Provides standard and large text size scales
 */

export interface TypographyScale {
  // Display sizes
  displayLarge: number;
  displayMedium: number;
  displaySmall: number;
  
  // Heading sizes
  headingLarge: number;
  headingMedium: number;
  headingSmall: number;
  
  // Body sizes
  bodyLarge: number;
  bodyMedium: number;
  bodySmall: number;
  
  // Label sizes
  labelLarge: number;
  labelMedium: number;
  labelSmall: number;
  
  // Button sizes
  buttonLarge: number;
  buttonMedium: number;
  buttonSmall: number;
}

export const standardTypography: TypographyScale = {
  // Display sizes
  displayLarge: 32,
  displayMedium: 28,
  displaySmall: 24,
  
  // Heading sizes
  headingLarge: 20,
  headingMedium: 18,
  headingSmall: 16,
  
  // Body sizes
  bodyLarge: 16,
  bodyMedium: 14,
  bodySmall: 12,
  
  // Label sizes
  labelLarge: 14,
  labelMedium: 12,
  labelSmall: 10,
  
  // Button sizes
  buttonLarge: 18,
  buttonMedium: 16,
  buttonSmall: 14,
};

export const largeTypography: TypographyScale = {
  // Display sizes - 25% larger
  displayLarge: 40,
  displayMedium: 35,
  displaySmall: 30,
  
  // Heading sizes - 25% larger
  headingLarge: 25,
  headingMedium: 22,
  headingSmall: 20,
  
  // Body sizes - 25% larger
  bodyLarge: 20,
  bodyMedium: 18,
  bodySmall: 15,
  
  // Label sizes - 25% larger
  labelLarge: 18,
  labelMedium: 15,
  labelSmall: 13,
  
  // Button sizes - 25% larger
  buttonLarge: 22,
  buttonMedium: 20,
  buttonSmall: 18,
};

export const getTypographyScale = (largeText: boolean): TypographyScale => {
  return largeText ? largeTypography : standardTypography;
};

// Minimum touch target size for accessibility (WCAG 2.1 AA)
export const MIN_TOUCH_TARGET_SIZE = 44;

// Recommended touch target size for better accessibility
export const RECOMMENDED_TOUCH_TARGET_SIZE = 48;
