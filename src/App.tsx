/**
 * Main App Component
 * Entry point for CoachAI application
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { RootNavigator } from './navigation/RootNavigator';
import DatabaseManager from './database/DatabaseManager';
import { detectDeviceCapabilities, cacheDeviceCapabilities } from './utils/DeviceCapabilityDetector';

const App: React.FC = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      console.log('Initializing CoachAI...');
      
      // Initialize database
      await DatabaseManager.initialize();
      console.log('Database initialized');
      
      // Detect device capabilities
      const capabilities = await detectDeviceCapabilities();
      console.log('Device capabilities detected:', capabilities);
      
      // Cache capabilities for future use
      await cacheDeviceCapabilities(capabilities);
      console.log('Device capabilities cached');
      
      setIsInitializing(false);
      console.log('CoachAI initialized successfully');
    } catch (error) {
      console.error('App initialization failed:', error);
      setInitError(error instanceof Error ? error.message : 'Unknown error');
      setIsInitializing(false);
    }
  };

  if (isInitializing) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Initializing CoachAI...</Text>
      </View>
    );
  }

  if (initError) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Initialization Error</Text>
        <Text style={styles.errorMessage}>{initError}</Text>
      </View>
    );
  }

  return <RootNavigator />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4b5563',
  },
  errorText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default App;
