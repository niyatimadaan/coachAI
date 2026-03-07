/**
 * CoachAI Context Provider
 * 
 * React context that provides the CoachAI system to all components in the app.
 * Manages system initialization, session state, and provides hooks for UI integration.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { CoachAISystem, CoachAIConfig } from '../integration/CoachAISystem';
import type { ShootingSession, UserProgress, DeviceCapabilities } from '../types/models';

interface CoachAIContextValue {
  system: CoachAISystem | null;
  initialized: boolean;
  currentSession: string | null;
  deviceCapabilities: DeviceCapabilities | null;
  
  // Session management
  startSession: () => Promise<string>;
  stopAndAnalyzeSession: () => Promise<ShootingSession>;
  
  // Progress tracking
  getUserProgress: () => Promise<UserProgress>;
  getSessionHistory: (limit?: number) => Promise<ShootingSession[]>;
  
  // Sync and cloud
  syncData: () => Promise<void>;
  requestCloudProcessing: () => Promise<boolean>;
  
  // System state
  isRecording: boolean;
  error: Error | null;
}

const CoachAIContext = createContext<CoachAIContextValue | undefined>(undefined);

interface CoachAIProviderProps {
  children: React.ReactNode;
  config: CoachAIConfig;
}

export const CoachAIProvider: React.FC<CoachAIProviderProps> = ({ children, config }) => {
  const [system, setSystem] = useState<CoachAISystem | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [deviceCapabilities, setDeviceCapabilities] = useState<DeviceCapabilities | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Initialize the CoachAI system
  useEffect(() => {
    const initSystem = async () => {
      try {
        const coachAI = new CoachAISystem(config);
        await coachAI.initialize();
        
        setSystem(coachAI);
        setDeviceCapabilities(coachAI.getDeviceCapabilities());
        setInitialized(true);
      } catch (err) {
        setError(err as Error);
        console.error('Failed to initialize CoachAI system:', err);
      }
    };

    initSystem();

    // Cleanup on unmount
    return () => {
      if (system) {
        system.cleanup();
      }
    };
  }, [config]);

  const startSession = useCallback(async (): Promise<string> => {
    if (!system) throw new Error('System not initialized');
    
    try {
      setError(null);
      const sessionId = await system.startSession();
      setCurrentSession(sessionId);
      setIsRecording(true);
      return sessionId;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [system]);

  const stopAndAnalyzeSession = useCallback(async (): Promise<ShootingSession> => {
    if (!system || !currentSession) {
      throw new Error('No active session');
    }
    
    try {
      setError(null);
      const session = await system.stopAndAnalyzeSession(currentSession);
      setCurrentSession(null);
      setIsRecording(false);
      return session;
    } catch (err) {
      setError(err as Error);
      setIsRecording(false);
      throw err;
    }
  }, [system, currentSession]);

  const getUserProgress = useCallback(async (): Promise<UserProgress> => {
    if (!system) throw new Error('System not initialized');
    
    try {
      setError(null);
      return await system.getUserProgress();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [system]);

  const getSessionHistory = useCallback(async (limit?: number): Promise<ShootingSession[]> => {
    if (!system) throw new Error('System not initialized');
    
    try {
      setError(null);
      return await system.getSessionHistory(limit);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [system]);

  const syncData = useCallback(async (): Promise<void> => {
    if (!system) throw new Error('System not initialized');
    
    try {
      setError(null);
      await system.syncData();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [system]);

  const requestCloudProcessing = useCallback(async (): Promise<boolean> => {
    if (!system) throw new Error('System not initialized');
    
    try {
      setError(null);
      return await system.requestCloudProcessingConsent();
    } catch (err) {
      setError(err as Error);
      return false;
    }
  }, [system]);

  const value: CoachAIContextValue = {
    system,
    initialized,
    currentSession,
    deviceCapabilities,
    startSession,
    stopAndAnalyzeSession,
    getUserProgress,
    getSessionHistory,
    syncData,
    requestCloudProcessing,
    isRecording,
    error
  };

  return (
    <CoachAIContext.Provider value={value}>
      {children}
    </CoachAIContext.Provider>
  );
};

export const useCoachAI = (): CoachAIContextValue => {
  const context = useContext(CoachAIContext);
  if (!context) {
    throw new Error('useCoachAI must be used within a CoachAIProvider');
  }
  return context;
};
