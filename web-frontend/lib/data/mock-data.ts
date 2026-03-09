// Mock data for development
// TODO: Replace with real database queries

import type { Student, Session, SessionDetail, StudentProgressSummary, CommonFormIssue, FormIssue } from '../types/models'

// In-memory data stores
const students = new Map<string, Student>()
const sessions = new Map<string, SessionDetail>()

// Initialize with some mock data
export function initializeMockData() {
  // Add mock students
  const mockStudents: Student[] = [
    {
      id: 'student_1',
      name: 'John Doe',
      age: 16,
      skillLevel: 'Intermediate',
      coachId: 'coach_1',
      createdAt: new Date('2024-01-15')
    },
    {
      id: 'student_2',
      name: 'Jane Smith',
      age: 14,
      skillLevel: 'Beginner',
      coachId: 'coach_1',
      createdAt: new Date('2024-02-01')
    }
  ]

  mockStudents.forEach(student => students.set(student.id, student))

  // Add mock sessions
  const mockSessions: SessionDetail[] = [
    {
      id: 'session_1',
      userId: 'student_1',
      timestamp: Date.now() - 86400000, // 1 day ago
      formScore: 85,
      practiceTime: 45,
      shotCount: 120,
      videoUrl: 'https://example.com/video1.mp4',
      formIssues: [
        {
          issueType: 'elbow_alignment',
          severity: 'minor',
          description: 'Elbow slightly out of alignment',
          timestamp: 15
        }
      ],
      feedback: 'Great improvement on follow-through!',
      recommendations: ['Focus on elbow alignment', 'Practice free throws']
    },
    {
      id: 'session_2',
      userId: 'student_2',
      timestamp: Date.now() - 172800000, // 2 days ago
      formScore: 72,
      practiceTime: 30,
      shotCount: 80,
      formIssues: [
        {
          issueType: 'follow_through',
          severity: 'moderate',
          description: 'Inconsistent follow-through',
          timestamp: 20
        }
      ],
      feedback: 'Good effort, keep working on consistency',
      recommendations: ['Practice follow-through drills', 'Work on balance']
    }
  ]

  mockSessions.forEach(session => sessions.set(session.id, session))
}

// Initialize on module load
initializeMockData()

export function getStudentsByCoachId(coachId: string): Student[] {
  return Array.from(students.values()).filter(s => s.coachId === coachId)
}

export function getSessionsByUserId(userId: string): SessionDetail[] {
  return Array.from(sessions.values()).filter(s => s.userId === userId)
}

export function getSessionById(sessionId: string): SessionDetail | undefined {
  return sessions.get(sessionId)
}

export function getStudentProgressSummaries(coachId: string): StudentProgressSummary[] {
  const coachStudents = getStudentsByCoachId(coachId)
  
  return coachStudents.map(student => {
    const studentSessions = getSessionsByUserId(student.id)
    const avgScore = studentSessions.length > 0
      ? studentSessions.reduce((sum, s) => sum + s.formScore, 0) / studentSessions.length
      : 0
    
    return {
      studentId: student.id,
      studentName: student.name,
      sessionsCompleted: studentSessions.length,
      averageScore: Math.round(avgScore),
      improvementTrend: 5, // Mock improvement
      lastActiveDate: studentSessions.length > 0
        ? new Date(Math.max(...studentSessions.map(s => s.timestamp)))
        : student.createdAt,
      engagementLevel: studentSessions.length > 5 ? 'high' : studentSessions.length > 2 ? 'medium' : 'low',
      needsIntervention: avgScore < 60
    }
  })
}

export function getCommonFormIssues(coachId: string): CommonFormIssue[] {
  const coachStudents = getStudentsByCoachId(coachId)
  const allSessions = coachStudents.flatMap(s => getSessionsByUserId(s.id))
  
  // Aggregate form issues
  const issueMap = new Map<string, { count: number; students: Set<string>; severities: number[] }>()
  
  allSessions.forEach(session => {
    session.formIssues.forEach(issue => {
      const key = issue.issueType
      if (!issueMap.has(key)) {
        issueMap.set(key, { count: 0, students: new Set(), severities: [] })
      }
      const data = issueMap.get(key)!
      data.count++
      data.students.add(session.userId)
      data.severities.push(issue.severity === 'major' ? 3 : issue.severity === 'moderate' ? 2 : 1)
    })
  })
  
  return Array.from(issueMap.entries()).map(([issueType, data]) => ({
    issueType: issueType as any,
    occurrenceCount: data.count,
    affectedStudents: data.students.size,
    averageSeverity: data.severities.reduce((a, b) => a + b, 0) / data.severities.length
  }))
}
