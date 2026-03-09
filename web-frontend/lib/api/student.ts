/**
 * Student API Client
 * Handles student-specific API calls for their dashboard and progress tracking
 */

import type { Session, StudentProgressSummary } from '../types/models'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

interface StudentStats {
  totalSessions: number
  averageScore: number
  bestScore: number
  totalShotAttempts: number
  improvementRate: number
  recentSessions: Session[]
}

interface BiomechanicalMetric {
  id: string
  sessionId: string
  metricName: string
  value: number
  status: 'good' | 'needs_improvement' | 'critical'
  timestamp: Date
}

interface FormIssue {
  id: string
  sessionId: string
  issueType: string
  severity: 'low' | 'medium' | 'high'
  description: string
  recommendation: string
  timestamp: Date
}

class StudentAPIClient {
  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null
    
    const cookies = document.cookie.split(';')
    const tokenCookie = cookies.find(c => c.trim().startsWith('auth_token='))
    return tokenCookie ? tokenCookie.split('=')[1] : null
  }

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getAuthToken()
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }))
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    const data = await response.json()
    return data.data || data
  }

  /**
   * Get student's own statistics and progress
   */
  async getMyStats(studentId: string): Promise<StudentStats> {
    try {
      const sessions = await this.fetch<Session[]>(`/api/student/sessions?userId=${studentId}`)
      
      if (!sessions || sessions.length === 0) {
        return {
          totalSessions: 0,
          averageScore: 0,
          bestScore: 0,
          totalShotAttempts: 0,
          improvementRate: 0,
          recentSessions: [],
        }
      }

      const scores = sessions.map(s => s.formScore || 0)
      const totalSessions = sessions.length
      const averageScore = scores.reduce((a, b) => a + b, 0) / totalSessions
      const bestScore = Math.max(...scores)
      const totalShotAttempts = sessions.reduce((sum, s) => sum + (s.shotCount || 0), 0)

      // Calculate improvement rate (compare first 5 vs last 5 sessions)
      let improvementRate = 0
      if (totalSessions >= 10) {
        const firstFive = scores.slice(0, 5).reduce((a, b) => a + b) / 5
        const lastFive = scores.slice(-5).reduce((a, b) => a + b) / 5
        improvementRate = ((lastFive - firstFive) / firstFive) * 100
      }

      return {
        totalSessions,
        averageScore,
        bestScore,
        totalShotAttempts,
        improvementRate,
        recentSessions: sessions.slice(0, 5),
      }
    } catch (error) {
      console.error('Error fetching student stats:', error)
      throw error
    }
  }

  /**
   * Get all sessions for a student
   */
  async getMySessions(studentId: string): Promise<Session[]> {
    return this.fetch<Session[]>(`/api/student/sessions?userId=${studentId}`)
  }

  /**
   * Get biomechanical metrics for a specific session
   */
  async getSessionMetrics(sessionId: string): Promise<BiomechanicalMetric[]> {
    try {
      const result = await this.fetch<any>(`/api/student/sessions/${sessionId}/analytics`)
      return result.biomechanicalMetrics || []
    } catch (error) {
      console.error('Error fetching session metrics:', error)
      return []
    }
  }

  /**
   * Get form issues for a specific session
   */
  async getSessionIssues(sessionId: string): Promise<FormIssue[]> {
    try {
      const result = await this.fetch<any>(`/api/student/sessions/${sessionId}/analytics`)
      return result.formIssues || []
    } catch (error) {
      console.error('Error fetching session issues:', error)
      return []
    }
  }

  /**
   * Get progress trends over time
   */
  async getProgressTrends(studentId: string, days: number = 30): Promise<{
    dates: string[]
    scores: number[]
    shotAttempts: number[]
  }> {
    try {
      const sessions = await this.getMySessions(studentId)
      
      // Filter sessions from last N days
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)
      
      const recentSessions = sessions
        .filter(s => new Date(s.timestamp) >= cutoffDate)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

      const dates = recentSessions.map(s => 
        new Date(s.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      )
      const scores = recentSessions.map(s => s.formScore || 0)
      const shotAttempts = recentSessions.map(s => s.shotCount || 0)

      return { dates, scores, shotAttempts }
    } catch (error) {
      console.error('Error fetching progress trends:', error)
      return { dates: [], scores: [], shotAttempts: [] }
    }
  }
}

export const studentClient = new StudentAPIClient()
export type { StudentStats, BiomechanicalMetric, FormIssue }
