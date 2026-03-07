/**
 * CoachAI System Integration
 * 
 * Main integration module that wires all components together into a cohesive system.
 * This module provides the primary interface for the CoachAI application, coordinating
 * video capture, analysis, feedback generation, and progress tracking.
 */

import { VideoCaptureManager } from '../video/VideoCaptureManager';
import { VideoAnalysisIntegration } from '../video/VideoAnalysisIntegration';
import { AdaptiveProcessingRouter } from '../utils/AdaptiveProcessingRouter';
import { DeviceCapabilityDetector } from '../utils/DeviceCapabilityDetector';
import { FeedbackIntegration } from '../feedback/FeedbackIntegration';
import { DatabaseManager } from '../database/DatabaseManager';
import { SessionOperations } from '../database/SessionOperations';
import { ProgressAnalytics } from '../database/ProgressAnalytics';
import { SyncManager } from '../cloud/SyncManager';
import { ErrorHandler } from '../utils/ErrorHandler';
import { RecoveryManager } from '../utils/RecoveryManager';
import { PrivacyManager } from '../utils/PrivacyManager';
import { SecurityManager } from '../utils/SecurityManager';
import type { 
  ShootingSession, 
  FormAnalysisResult, 
  DeviceCapabilities,
  UserProgress 
} from '../types/models';

export interface CoachAIConfig {
  userId: string;
  enableCloudSync?: boolean;
  enableCloudProcessing?: boolean;
  privacyMode?: 'strict' | 'balanced' | 'permissive';
}

export class CoachAISystem {
  private videoCaptureManager: VideoCaptureManager;
  private videoAnalysisIntegration: VideoAnalysisIntegration;
  private adaptiveRouter: AdaptiveProcessingRouter;
  private capabilityDetector: DeviceCapabilityDetector;
  private feedbackIntegration: FeedbackIntegration;
  private databaseManager: DatabaseManager;
  private sessionOps: SessionOperations;
  private progressAnalytics: ProgressAnalytics;
  private syncManager: SyncManager;
  private errorHandler: ErrorHandler;
  private recoveryManager: RecoveryManager;
  private privacyManager: PrivacyManager;
  private securityManager: SecurityManager;
  
  private config: CoachAIConfig;
  private deviceCapabilities: DeviceCapabilities | null = null;
  private initialized: boolean = false;

  constructor(config: CoachAIConfig) {
    this.config = config;
    
    // Initialize core components
    this.capabilityDetector = new DeviceCapabilityDetector();
    this.errorHandler = new ErrorHandler();
    this.recoveryManager = new RecoveryManager();
    this.privacyManager = new PrivacyManager();
    this.securityManager = new SecurityManager();
    
    // Initialize database
    this.databaseManager = new DatabaseManager();
    this.sessionOps = new SessionOperations(this.databaseManager);
    this.progressAnalytics = new ProgressAnalytics(this.databaseManager);
    
    // Initialize video and analysis components
    this.videoCaptureManager = new VideoCaptureManager();
    this.adaptiveRouter = new AdaptiveProcessingRouter(this.capabilityDetector);
    this.videoAnalysisIntegration = new VideoAnalysisIntegration(this.adaptiveRouter);
    
    // Initialize feedback system
    this.feedbackIntegration = new FeedbackIntegration();
    
    // Initialize sync manager
    this.syncManager = new SyncManager(
      this.databaseManager,
      this.privacyManager,
      this.securityManager
    );
  }

  /**
   * Initialize the CoachAI system
   * Detects device capabilities and sets up all components
   */
  async initialize(): Promise<void> {
    try {
      // Detect device capabilities
      this.deviceCapabilities = await this.capabilityDetector.detectCapabilities();
      
      // Initialize database
      await this.databaseManager.initialize();
      
      // Initialize video capture with device-appropriate settings
      await this.videoCaptureManager.initialize();
      
      // Set up sync manager if cloud sync is enabled
      if (this.config.enableCloudSync) {
        await this.syncManager.initialize();
      }
      
      this.initialized = true;
    } catch (error) {
      await this.errorHandler.handleError(error as Error, {
        context: 'CoachAISystem.initialize',
        severity: 'critical'
      });
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
      // Check privacy settings
      const canRecord = await this.privacyManager.checkPermission('camera');
      if (!canRecord) {
        throw new Error('Camera permission not granted');
      }
      
      // Start video capture
      const sessionId = await this.videoCaptureManager.startRecording();
      
      return sessionId;
    } catch (error) {
      await this.errorHandler.handleError(error as Error, {
        context: 'CoachAISystem.startSession',
        severity: 'high'
      });
      throw error;
    }
  }

  /**
   * Stop recording and analyze the shooting session
   * Processes video, generates feedback, and stores results
   */
  async stopAndAnalyzeSession(sessionId: string): Promise<ShootingSession> {
    this.ensureInitialized();
    
    try {
      // Stop video recording
      const videoPath = await this.videoCaptureManager.stopRecording();
      
      // Analyze video using adaptive processing
      const analysisResult = await this.videoAnalysisIntegration.analyzeVideo(videoPath);
      
      // Generate personalized feedback
      const userHistory = await this.sessionOps.getUserSessions(this.config.userId);
      const feedback = await this.feedbackIntegration.generateFeedback(
        analysisResult,
        userHistory
      );
      
      // Create session record
      const session: ShootingSession = {
        id: sessionId,
        userId: this.config.userId,
        timestamp: new Date(),
        videoPath,
        formScore: analysisResult.overallScore,
        detectedIssues: analysisResult.detectedIssues,
        recommendations: feedback.recommendations,
        practiceTime: analysisResult.duration || 0,
        shotCount: analysisResult.shotCount || 1,
        syncStatus: 'local',
        lastModified: new Date()
      };
      
      // Store session in database
      await this.sessionOps.createSession(session);
      
      // Trigger sync if enabled and connected
      if (this.config.enableCloudSync) {
        await this.syncManager.syncSession(session);
      }
      
      return session;
    } catch (error) {
      // Attempt recovery
      const recovered = await this.recoveryManager.recoverSession(sessionId);
      if (recovered) {
        return recovered;
      }
      
      await this.errorHandler.handleError(error as Error, {
        context: 'CoachAISystem.stopAndAnalyzeSession',
        severity: 'high',
        metadata: { sessionId }
      });
      throw error;
    }
  }

  /**
   * Get user progress and analytics
   */
  async getUserProgress(): Promise<UserProgress> {
    this.ensureInitialized();
    
    try {
      const progress = await this.progressAnalytics.getUserProgress(this.config.userId);
      return progress;
    } catch (error) {
      await this.errorHandler.handleError(error as Error, {
        context: 'CoachAISystem.getUserProgress',
        severity: 'medium'
      });
      throw error;
    }
  }

  /**
   * Get session history for the user
   */
  async getSessionHistory(limit?: number): Promise<ShootingSession[]> {
    this.ensureInitialized();
    
    try {
      const sessions = await this.sessionOps.getUserSessions(this.config.userId, limit);
      return sessions;
    } catch (error) {
      await this.errorHandler.handleError(error as Error, {
        context: 'CoachAISystem.getSessionHistory',
        severity: 'low'
      });
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
      await this.syncManager.syncAll();
    } catch (error) {
      await this.errorHandler.handleError(error as Error, {
        context: 'CoachAISystem.syncData',
        severity: 'medium'
      });
      throw error;
    }
  }

  /**
   * Request cloud processing consent
   */
  async requestCloudProcessingConsent(): Promise<boolean> {
    try {
      const granted = await this.privacyManager.requestPermission('cloudProcessing');
      if (granted) {
        this.config.enableCloudProcessing = true;
      }
      return granted;
    } catch (error) {
      await this.errorHandler.handleError(error as Error, {
        context: 'CoachAISystem.requestCloudProcessingConsent',
        severity: 'low'
      });
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
      await this.videoCaptureManager.cleanup();
      await this.databaseManager.close();
      if (this.config.enableCloudSync) {
        await this.syncManager.cleanup();
      }
    } catch (error) {
      await this.errorHandler.handleError(error as Error, {
        context: 'CoachAISystem.cleanup',
        severity: 'low'
      });
    }
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('CoachAI system not initialized. Call initialize() first.');
    }
  }
}
