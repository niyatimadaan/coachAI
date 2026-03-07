/**
 * Accessible Text Component
 * Text with proper sizing and accessibility support
 */

import React from 'react';
import { Text as RNText, TextProps, TextStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

interface AccessibleTextProps extends TextProps {
  variant?:
    | 'displayLarge'
    | 'displayMedium'
    | 'displaySmall'
    | 'headingLarge'
    | 'headingMedium'
    | 'headingSmall'
    | 'bodyLarge'
    | 'bodyMedium'
    | 'bodySmall'
    | 'labelLarge'
    | 'labelMedium'
    | 'labelSmall';
  color?: 'primary' | 'secondary' | 'onPrimary' | 'success' | 'warning' | 'error';
  bold?: boolean;
  accessibilityLabel?: string;
}

export const AccessibleText: React.FC<AccessibleTextProps> = ({
  variant = 'bodyMedium',
  color = 'primary',
  bold = false,
  style,
  children,
  accessibilityLabel,
  ...props
}) => {
  const { theme } = useTheme();

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {};

    // Set font size based on variant
    switch (variant) {
      case 'displayLarge':
        baseStyle.fontSize = theme.typography.displayLarge;
        break;
      case 'displayMedium':
        baseStyle.fontSize = theme.typography.displayMedium;
        break;
      case 'displaySmall':
        baseStyle.fontSize = theme.typography.displaySmall;
        break;
      case 'headingLarge':
        baseStyle.fontSize = theme.typography.headingLarge;
        break;
      case 'headingMedium':
        baseStyle.fontSize = theme.typography.headingMedium;
        break;
      case 'headingSmall':
        baseStyle.fontSize = theme.typography.headingSmall;
        break;
      case 'bodyLarge':
        baseStyle.fontSize = theme.typography.bodyLarge;
        break;
      case 'bodyMedium':
        baseStyle.fontSize = theme.typography.bodyMedium;
        break;
      case 'bodySmall':
        baseStyle.fontSize = theme.typography.bodySmall;
        break;
      case 'labelLarge':
        baseStyle.fontSize = theme.typography.labelLarge;
        break;
      case 'labelMedium':
        baseStyle.fontSize = theme.typography.labelMedium;
        break;
      case 'labelSmall':
        baseStyle.fontSize = theme.typography.labelSmall;
        break;
    }

    // Set color
    switch (color) {
      case 'primary':
        baseStyle.color = theme.colors.textPrimary;
        break;
      case 'secondary':
        baseStyle.color = theme.colors.textSecondary;
        break;
      case 'onPrimary':
        baseStyle.color = theme.colors.textOnPrimary;
        break;
      case 'success':
        baseStyle.color = theme.colors.success;
        break;
      case 'warning':
        baseStyle.color = theme.colors.warning;
        break;
      case 'error':
        baseStyle.color = theme.colors.error;
        break;
    }

    // Set font weight
    if (bold) {
      baseStyle.fontWeight = 'bold';
    }

    return baseStyle;
  };

  return (
    <RNText
      style={[getTextStyle(), style]}
      accessibilityLabel={accessibilityLabel}
      {...props}
    >
      {children}
    </RNText>
  );
};
