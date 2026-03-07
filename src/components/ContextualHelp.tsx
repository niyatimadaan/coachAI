/**
 * Contextual Help Component
 * 
 * Displays contextual help tooltips throughout the app.
 * Automatically shows help on first visit to each screen.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
} from 'react-native';
import { OnboardingManager, ContextualHelp as HelpItem } from '../onboarding/OnboardingManager';

interface ContextualHelpProps {
  screen: string;
  onDismiss?: () => void;
}

export const ContextualHelp: React.FC<ContextualHelpProps> = ({ screen, onDismiss }) => {
  const [helpItems, setHelpItems] = useState<HelpItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const onboardingManager = OnboardingManager;

  useEffect(() => {
    loadContextualHelp();
  }, [screen]);

  const loadContextualHelp = async () => {
    const items = onboardingManager.getContextualHelp(screen);
    
    // Filter to only show items that haven't been shown yet
    const unshownItems: HelpItem[] = [];
    for (const item of items) {
      const shouldShow = await onboardingManager.shouldShowContextualHelp(item.id);
      if (shouldShow) {
        unshownItems.push(item);
      }
    }

    if (unshownItems.length > 0) {
      setHelpItems(unshownItems);
      setCurrentIndex(0);
      setVisible(true);
      
      // Fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleNext = async () => {
    const currentItem = helpItems[currentIndex];
    await onboardingManager.markContextualHelpShown(currentItem.id);

    if (currentIndex < helpItems.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleDismiss();
    }
  };

  const handleDismiss = async () => {
    // Mark all remaining items as shown
    for (let i = currentIndex; i < helpItems.length; i++) {
      await onboardingManager.markContextualHelpShown(helpItems[i].id);
    }

    // Fade out animation
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      onDismiss?.();
    });
  };

  if (!visible || helpItems.length === 0) {
    return null;
  }

  const currentItem = helpItems[currentIndex];
  const isLastItem = currentIndex === helpItems.length - 1;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
          <View style={styles.header}>
            <Text style={styles.title}>{currentItem.title}</Text>
            <TouchableOpacity
              onPress={handleDismiss}
              style={styles.closeButton}
              accessibilityLabel="Dismiss help"
              accessibilityRole="button"
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.message}>{currentItem.message}</Text>

          {helpItems.length > 1 && (
            <View style={styles.progressContainer}>
              {helpItems.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.progressDot,
                    index === currentIndex && styles.progressDotActive,
                  ]}
                />
              ))}
            </View>
          )}

          <View style={styles.buttonContainer}>
            {!isLastItem && (
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={handleDismiss}
                accessibilityLabel="Skip all tips"
                accessibilityRole="button"
              >
                <Text style={styles.secondaryButtonText}>Skip All</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleNext}
              accessibilityLabel={isLastItem ? 'Got it' : 'Next tip'}
              accessibilityRole="button"
            >
              <Text style={styles.primaryButtonText}>
                {isLastItem ? 'Got It' : 'Next'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6b7280',
  },
  message: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 24,
    marginBottom: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 20,
  },
  progressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e5e7eb',
  },
  progressDotActive: {
    width: 20,
    backgroundColor: '#2563eb',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    minHeight: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
});
