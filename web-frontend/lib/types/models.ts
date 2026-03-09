// User and Authentication
export interface User {
  id: string
  email: string
  name: string
  role: 'coach' | 'admin' | 'student'
  coachId?: string
}

export interface AuthResponse {
  success: boolean
  token: string
  user: User
}

// Students
export interface Student {
  id: string
  name: string
  age: number
  skillLevel: string
  coachId: string
  createdAt: Date
}

export interface StudentProgressSummary {
  studentId: string
  studentName: string
  sessionsCompleted: number
  averageScore: number
  improvementTrend: number
  lastActiveDate: Date
  engagementLevel: 'high' | 'medium' | 'low'
  needsIntervention: boolean
}

// Sessions
export interface Session {
  id: string
  userId: string
  timestamp: number
  formScore: number
  practiceTime: number
  shotCount: number
}

export interface SessionSummary {
  id: string
  timestamp: number
  formScore: number
  practiceTime: number
  shotCount: number
}

export interface SessionDetail extends Session {
  videoUrl?: string
  formIssues: FormIssue[]
  feedback: string
  recommendations: string[]
}

export interface SessionFilters {
  studentId?: string
  startDate?: Date
  endDate?: Date
  minScore?: number
  maxScore?: number
}

// Form Issues
export type FormIssueType =
  | 'elbow_alignment'
  | 'follow_through'
  | 'knee_bend'
  | 'ball_position'
  | 'shooting_arc'
  | 'balance'

export interface FormIssue {
  issueType: FormIssueType
  severity: 'minor' | 'moderate' | 'major'
  description: string
  timestamp: number
}

// Progress Metrics
export interface ProgressMetrics {
  averageScore: number
  scoreImprovement: number
  sessionsPerWeek: number
  consistencyRating: number
  persistentIssues: string[]
}

// Student Analytics
export interface StudentAnalytics {
  student: Student
  metrics: {
    '7d': ProgressMetrics
    '30d': ProgressMetrics
    '90d': ProgressMetrics
  }
  recentSessions: SessionSummary[]
}

// Common Form Issues (for analytics)
export interface CommonFormIssue {
  issueType: FormIssueType
  occurrenceCount: number
  affectedStudents: number
  averageSeverity: number
}

// Analytics Data
export interface AnalyticsData {
  totalSessions: number
  averageImprovement: number
  commonIssues: CommonFormIssue[]
}

// API Response Types
export interface APIResponse<T> {
  success: boolean
  data?: T
  error?: string
}
