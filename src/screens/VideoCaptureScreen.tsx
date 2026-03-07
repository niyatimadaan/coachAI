/**
 * Video Capture Screen
 * Interface for recording basketball shooting practice
 * Integrated with CoachAI system for seamless session management
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useCoachAI } from '../contexts/CoachAIContext';

type VideoCaptureScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'VideoCapture'
>;

interface VideoCaptureScreenProps {
  navigation: VideoCaptureScreenNavigationProp;
}

export const VideoCaptureScreen: React.FC<VideoCaptureScreenProps> = ({ navigation }) => {
  const { startSession, stopAndAnalyzeSession, isRecording, error } = useCoachAI();
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      await startSession();
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      Alert.alert(
        'Recording Error',
        'Unable to start recording. Please check camera permissions.',
        [{ text: 'OK' }]
      );
    }
  };

  const stopRecording = async () => {
    try {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      setIsProcessing(true);

      const session = await stopAndAnalyzeSession();
      
      setIsProcessing(false);
      
      // Navigate to analysis screen with results
      navigation.navigate('Analysis', { sessionId: session.id });
    } catch (error) {
      setIsProcessing(false);
      Alert.alert(
        'Processing Error',
        'Unable to process video. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isProcessing) {
    return (
      <View style={styles.processingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.processingText}>Analyzing your form...</Text>
        <Text style={styles.processingSubtext}>This may take a few seconds</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cameraContainer}>
        <View style={styles.cameraPlaceholder}>
          <Text style={styles.cameraPlaceholderText}>
            {isRecording ? '🎥 Recording...' : '📹 Camera View'}
          </Text>
          {isRecording && (
            <Text style={styles.recordingTime}>{formatTime(recordingTime)}</Text>
          )}
        </View>
      </View>

      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsTitle}>Recording Tips:</Text>
        <Text style={styles.instructionText}>• Position camera 10-15 feet away</Text>
        <Text style={styles.instructionText}>• Ensure full body is visible</Text>
        <Text style={styles.instructionText}>• Record 3-5 shots in one session</Text>
        <Text style={styles.instructionText}>• Use good lighting</Text>
      </View>

      <View style={styles.controlsContainer}>
        {!isRecording ? (
          <TouchableOpacity
            style={[styles.button, styles.recordButton]}
            onPress={startRecording}
            accessibilityLabel="Start recording"
            accessibilityHint="Begins recording your shooting practice"
            accessibilityRole="button"
          >
            <Text style={styles.recordButtonIcon}>⏺</Text>
            <Text style={styles.recordButtonText}>Start Recording</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.stopButton]}
            onPress={stopRecording}
            accessibilityLabel="Stop recording"
            accessibilityHint="Stops recording and analyzes your form"
            accessibilityRole="button"
          >
            <Text style={styles.stopButtonIcon}>⏹</Text>
            <Text style={styles.stopButtonText}>Stop & Analyze</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1f2937',
  },
  cameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraPlaceholder: {
    width: '90%',
    aspectRatio: 9 / 16,
    backgroundColor: '#374151',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4b5563',
  },
  cameraPlaceholderText: {
    fontSize: 24,
    color: '#9ca3af',
  },
  recordingTime: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ef4444',
    marginTop: 16,
  },
  instructionsContainer: {
    backgroundColor: '#374151',
    padding: 16,
    margin: 16,
    borderRadius: 8,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f3f4f6',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    color: '#d1d5db',
    marginVertical: 4,
  },
  controlsContainer: {
    padding: 20,
    paddingBottom: 32,
  },
  button: {
    minHeight: 70,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  recordButton: {
    backgroundColor: '#ef4444',
  },
  stopButton: {
    backgroundColor: '#f59e0b',
  },
  recordButtonIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  stopButtonIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  recordButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  stopButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  processingText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
  },
  processingSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
});
