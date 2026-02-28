/**
 * Core data models for CoachAI MVP
 * Defines TypeScript interfaces for all data entities
 */

// User and Student Models
export interface Student {
  id: string;
  name: string;
  age: number;
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  coachId?: string;
  createdAt: Date;
  preferences: StudentPreferences;
}

export interface StudentPreferences {
  reminderFrequency: number;
  difficultyLevel: string;
}

// Form Analysis Models
export type FormScore = 'A' | 'B' | 'C' | 'D' | 'F';

export type FormIssueType = 'elbow_flare' | 'wrist_angle' | 'stance' | 'follow_through';

export type FormIssueSeverity = 'minor' | 'moderate' | 'major';

export interface FormIssue {
  type: FormIssueType;
  severity: FormIssueSeverity;
  description: string;
  recommendedDrills: string[];
}

export interface BiomechanicalMetrics {
  elbowAlignment: number;
  wristAngle: number;
  shoulderSquare: number;
  followThrough: number;
}

export interface FormAnalysisResult {
  overallScore: FormScore;
  detectedIssues: FormIssue[];
  biomechanicalMetrics: BiomechanicalMetrics;
}

// Pose Estimation Models
export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface PoseEstimationResult {
  landmarks: PoseLandmark[];
  timestamp: number;
}

// Shooting Session Models
export type SyncStatus = 'local' | 'synced' | 'pending';

export type LightingQuality = 'good' | 'fair' | 'poor';

export interface VideoMetadata {
  resolution: string;
  frameRate: number;
  lighting: LightingQuality;
}

export interface ShootingSession {
  id: string;
  userId: string;
  timestamp: Date;
  duration: number;
  shotAttempts: number;
  videoPath: string;
  formScore: FormScore;
  detectedIssues: FormIssue[];
  practiceTime: number;
  shotCount: number;
  formAnalysis: FormAnalysisResult;
  videoMetadata: VideoMetadata;
  syncStatus: SyncStatus;
  lastModified: Date;
}

// Progress Tracking Models
export type Timeframe = '7d' | '30d' | '90d';

export interface UserProgress {
  userId: string;
  sessionsCompleted: number;
  averageScore: number;
  improvementTrend: number;
  lastActiveDate: Date;
  commonIssues: string[];
}

export interface ProgressMetrics {
  userId: string;
  timeframe: Timeframe;
  
  // Performance Metrics
  averageScore: number;
  scoreImprovement: number;
  consistencyRating: number;
  
  // Engagement Metrics
  sessionsPerWeek: number;
  totalPracticeTime: number;
  streakDays: number;
  
  // Issue Tracking
  resolvedIssues: string[];
  persistentIssues: string[];
  newIssues: string[];
}

// Device Capability Models
export type DeviceTier = 'low' | 'mid' | 'high';

export type AnalysisTier = 'basic' | 'lightweight_ml' | 'full_ml' | 'cloud';

export interface DeviceCapabilities {
  tier: DeviceTier;
  availableRAM: number;
  cpuCores: number;
  hasGPU: boolean;
  mlFrameworkSupported: boolean;
  benchmarkScore: number;
}

export interface ProcessingConfig {
  selectedTier: AnalysisTier;
  deviceCapabilities: DeviceCapabilities;
  hasConnectivity: boolean;
  userConsent: {
    cloudProcessing: boolean;
    dataSharing: boolean;
  };
}
