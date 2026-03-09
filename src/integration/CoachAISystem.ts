/**
 * CoachAI System Integration
 * 
 * Main integration module that wires all components together into a cohesive system.
 * This module provides the primary interface for the CoachAI application, coordinating
 * video capture, analysis, feedback generation, and progress tracking.
 */

import * as VideoCaptureManager from '../video/VideoCaptureManager';
import { recordAndAnalyzeSession } from '../video/VideoAnalysisIntegration';
import { initializeProcessingConfig } from '../utils/AdaptiveProcessingRouter';
import { detectDeviceCapabilities } from '../utils/DeviceCapabilityDetector';
import DatabaseManager from '../database/DatabaseManager';
import SessionOperations from '../database/SessionOperations';
import ProgressAnalytics from '../database/ProgressAnalytics';
import SyncManager from '../cloud/SyncManager';
import ErrorHandler, { ErrorCategory } from '../utils/ErrorHandler';
import type { 
  ShootingSession, 
  DeviceCapabilities,
  UserProgress,
  ProcessingConfig
} from '../types/models';

export interface CoachAIConfig {
  userId: string;
  enableCloudSync?: boolean;
  enableCloudProcessing?: boolean;
  privacyMode?: 'strict' | 'balanced' | 'permissive';
  userConsent?: {
    cloudProcessing: boolean;
    dataSharing: boolean;
  };
}

export class CoachAISystem {
  private config: CoachAIConfig;
  private deviceCapabilities: DeviceCapabilities | null = null;
  private initialized: boolean = false;
  private processingConfig: ProcessingConfig | null = null;

  constructor(config: CoachAIConfig) {
    this.config = config;
  }

  /**
   * Initialize the CoachAI system
   * Detects device capabilities and sets up all components
   */
  async initialize(): Promise<void> {
    try {
      // Detect device capabilities
      this.deviceCapabilities = await detectDeviceCapabilities();
      
      // Initialize processing config
      this.processingConfig = await initializeProcessingConfig(this.config.userConsent || {
        cloudProcessing: this.config.enableCloudProcessing || false,
        dataSharing: false
      });
      
      // Initialize database
      await DatabaseManager.initialize();
      
      // Initialize video capture
      await VideoCaptureManager.initializeCamera();
      
      this.initialized = true;
    } catch (error) {
      ErrorHandler.handleError(error, ErrorCategory.UNKNOWN);
      throw error;
    }
  }

  /**
   * Start a new shooting session
   * Initiates video capture and prepares for analysis
   */
  async startSession(): Promise<string> {
    this.ensureInitialized();
    
    try {
      // Generate session ID
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      
      return sessionId;
    } catch (error) {
      ErrorHandler.handleError(error, ErrorCategory.CAMERA);
      throw error;
    }
  }

  /**
   * Stop recording and analyze the shooting session
   * Processes video, generates feedback, and stores results
   */
  async stopAndAnalyzeSession(sessionId: string): Promise<ShootingSession> {
    this.ensureInitialized();
    
    if (!this.processingConfig) {
      throw new Error('Processing config not initialized');
    }
    
    try {
      // Record and analyze session
      const result = await recordAndAnalyzeSession(
        this.config.userId,
        this.processingConfig,
        `./videos/${sessionId}.mp4`
      );
      
      if (!result.success || !result.session) {
        throw new Error(result.error || 'Session analysis failed');
      }
      
      const session = result.session;
      
      // Store session in database
      await SessionOperations.createSession(session);
      
      // Queue for sync if enabled
      if (this.config.enableCloudSync) {
        await SyncManager.queueForSync(session.id, 'create');
      }
      
      return session;
    } catch (error) {
      ErrorHandler.handleError(error, ErrorCategory.VIDEO_PROCESSING);
      throw error;
    }
  }

  /**
   * Get user progress and analytics
   */
  async getUserProgress(): Promise<UserProgress> {
    this.ensureInitialized();
    
    try {
      // Get user progress from database
      const result = await DatabaseManager.executeSql(
        'SELECT * FROM user_progress WHERE user_id = ?',
        [this.config.userId]
      );
      
      if (result.rows.length === 0) {
        // Return default progress if none exists
        return {
          userId: this.config.userId,
          sessionsCompleted: 0,
          averageScore: 0,
          improvementTrend: 0,
          lastActiveDate: new Date(),
          commonIssues: []
        };
      }
      
      const row = result.rows.item(0);
      return {
        userId: row.user_id,
        sessionsCompleted: row.sessions_completed,
        averageScore: row.average_form_score,
        improvementTrend: 0, // Calculate from metrics if needed
        lastActiveDate: new Date(row.last_active_date),
        commonIssues: []
      };
    } catch (error) {
      ErrorHandler.handleError(error, ErrorCategory.STORAGE);
      throw error;
    }
  }

  /**
   * Get session history for the user
   */
  async getSessionHistory(limit?: number): Promise<ShootingSession[]> {
    this.ensureInitialized();
    
    try {
      const sessions = await SessionOperations.getUserSessions(this.config.userId, limit);
      return sessions;
    } catch (error) {
      ErrorHandler.handleError(error, ErrorCategory.STORAGE);
      throw error;
    }
  }

  /**
   * Sync local data with cloud
   */
  async syncData(): Promise<void> {
    this.ensureInitialized();
    
    if (!this.config.enableCloudSync) {
      throw new Error('Cloud sync is not enabled');
    }
    
    try {
      await SyncManager.synchronize();
    } catch (error) {
      ErrorHandler.handleError(error, ErrorCategory.SYNC);
      throw error;
    }
  }

  /**
   * Request cloud processing consent
   */
  async requestCloudProcessingConsent(): Promise<boolean> {
    try {
      // In a real implementation, this would show a consent dialog
      // For now, just update the config
      this.config.enableCloudProcessing = true;
      return true;
    } catch (error) {
      ErrorHandler.handleError(error, ErrorCategory.PERMISSION);
      return false;
    }
  }

  /**
   * Get device capabilities
   */
  getDeviceCapabilities(): DeviceCapabilities | null {
    return this.deviceCapabilities;
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    try {
      await DatabaseManager.close();
    } catch (error) {
      ErrorHandler.handleError(error, ErrorCategory.UNKNOWN);
    }
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('CoachAI system not initialized. Call initialize() first.');
    }
  }
}
