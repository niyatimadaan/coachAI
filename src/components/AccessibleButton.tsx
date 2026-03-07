/**
 * Accessible Button Component
 * Button with proper touch targets and accessibility support
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  AccessibilityRole,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

interface AccessibleButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  icon?: string;
  style?: ViewStyle;
}

export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  onPress,
  title,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  icon,
  style,
}) => {
  const { theme } = useTheme();

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      minHeight: theme.touchTarget.minSize,
      borderRadius: theme.borderRadius.lg,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
    };

    if (disabled) {
      return {
        ...baseStyle,
        backgroundColor: theme.colors.buttonDisabled,
      };
    }

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          backgroundColor: theme.colors.buttonPrimary,
        };
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: theme.colors.buttonSecondary,
          borderWidth: 2,
          borderColor: theme.colors.border,
        };
      case 'danger':
        return {
          ...baseStyle,
          backgroundColor: theme.colors.error,
        };
      default:
        return baseStyle;
    }
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontWeight: 'bold',
    };

    switch (size) {
      case 'small':
        baseStyle.fontSize = theme.typography.buttonSmall;
        break;
      case 'medium':
        baseStyle.fontSize = theme.typography.buttonMedium;
        break;
      case 'large':
        baseStyle.fontSize = theme.typography.buttonLarge;
        break;
    }

    if (disabled) {
      baseStyle.color = theme.colors.textSecondary;
    } else if (variant === 'secondary') {
      baseStyle.color = theme.colors.textPrimary;
    } else {
      baseStyle.color = theme.colors.textOnPrimary;
    }

    return baseStyle;
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
    >
      {icon && <Text style={styles.icon}>{icon}</Text>}
      <Text style={getTextStyle()}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
});
