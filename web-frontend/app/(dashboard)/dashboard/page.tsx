'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState } from 'react'
import { studentsClient } from '@/lib/api/students'
import { studentClient } from '@/lib/api/student'
import type { StudentProgressSummary } from '@/lib/types/models'
import type { StudentStats } from '@/lib/api/student'
import { StatCard, AlertCard, Badge, EmptyState, LoadingSpinner } from '@/components/ui/Cards'
import Link from 'next/link'

export default function DashboardPage() {
  const { user } = useAuth()
  const [students, setStudents] = useState<StudentProgressSummary[]>([])
  const [studentStats, setStudentStats] = useState<StudentStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user?.role === 'coach') {
      fetchCoachDashboard()
    } else if (user?.role === 'student') {
      fetchStudentDashboard()
    }
  }, [user])

  const fetchCoachDashboard = async () => {
    if (!user?.coachId) return

    try {
      setIsLoading(true)
      const data = await studentsClient.getStudentProgressSummaries(user.coachId)
      setStudents(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load students')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStudentDashboard = async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      const stats = await studentClient.getMyStats(user.id)
      setStudentStats(stats)
    } catch (err: any) {
      setError(err.message || 'Failed to load your progress')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <LoadingSpinner size="lg" message="Loading dashboard..." />
  }

  if (error) {
    return (
      <AlertCard
        title="Error Loading Dashboard"
        message={error}
        severity="high"
        actionLabel="Retry"
        onAction={() => window.location.reload()}
      />
    )
  }

  // Student Dashboard
  if (user?.role === 'student' && studentStats) {
    const improvementColor = studentStats.improvementRate >= 0 ? 'success' : 'danger'
    
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.name}! 🏀
          </h1>
          <p className="text-gray-600">
            Track your basketball shooting progress and improvement
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatCard
            title="Total Sessions"
            value={studentStats.totalSessions}
            color="primary"
            icon={<span className="text-2xl">📹</span>}
          />
          
          <StatCard
            title="Average Score"
            value={studentStats.averageScore.toFixed(1)}
            subtitle="Out of 100"
            color="success"
            icon={<span className="text-2xl">⭐</span>}
          />
          
          <StatCard
            title="Best Score"
            value={studentStats.bestScore.toFixed(1)}
            color="warning"
            icon={<span className="text-2xl">🏆</span>}
          />
          
          <StatCard
            title="Improvement"
            value={`${studentStats.improvementRate >= 0 ? '+' : ''}${studentStats.improvementRate.toFixed(1)}%`}
            trend={{ value: Math.abs(studentStats.improvementRate), isPositive: studentStats.improvementRate >= 0 }}
            color={improvementColor}
            icon={<span className="text-2xl">📈</span>}
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link
            href="/upload-video"
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-6 rounded-lg shadow-md transition-all group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">Upload New Video</h3>
                <p className="text-blue-100 text-sm">Record and analyze your shooting form</p>
              </div>
              <svg className="h-8 w-8 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
          </Link>

          <Link
            href="/my-progress"
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white p-6 rounded-lg shadow-md transition-all group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">View Progress</h3>
                <p className="text-green-100 text-sm">See detailed charts and analytics</p>
              </div>
              <svg className="h-8 w-8 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </Link>
        </div>

        {/* Recent Sessions */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Sessions</h2>
          {studentStats.recentSessions.length === 0 ? (
            <EmptyState
              icon="🏀"
              title="No Sessions Yet"
              description="Upload your first video to start tracking your progress!"
            />
          ) : (
            <div className="space-y-3">
              {studentStats.recentSessions.map((session) => (
                <Link
                  key={session.id}
                  href={`/my-sessions?session=${session.id}`}
                  className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Session on {new Date(session.timestamp).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {session.shotCount} shots • {session.practiceTime} minutes
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">{Number(session.formScore).toFixed(1)}</p>
                      <p className="text-xs text-gray-500">Form Score</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Coach Dashboard (existing code)
  const totalSessions = students.reduce((sum, s) => sum + s.sessionsCompleted, 0)
  const avgScore = students.length > 0 
    ? students.reduce((sum, s) => sum + s.averageScore, 0) / students.length 
    : 0
  const needsAttention = students.filter(s => s.needsIntervention).length
  const highEngagement = students.filter(s => s.engagementLevel === 'high').length

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.name}! 👋
        </h1>
        <p className="text-gray-600">
          Here&apos;s an overview of your students&apos; progress
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Total Students"
          value={students.length}
          color="primary"
          icon={<span className="text-2xl">👥</span>}
        />
        
        <StatCard
          title="Total Sessions"
          value={totalSessions}
          subtitle="All time"
          color="success"
          icon={<span className="text-2xl">🏀</span>}
        />
        
        <StatCard
          title="Average Score"
          value={avgScore.toFixed(1)}
          trend={{ value: 5.2, isPositive: true }}
          color="warning"
          icon={<span className="text-2xl">📊</span>}
        />
        
        <StatCard
          title="Need Attention"
          value={needsAttention}
          subtitle={`${highEngagement} highly engaged`}
          color={needsAttention > 0 ? "danger" : "gray"}
          icon={<span className="text-2xl">⚠️</span>}
        />
      </div>

      {/* Students List */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Student Progress
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Track your students&apos; performance and engagement
          </p>
        </div>
        
        {students.length === 0 ? (
          <EmptyState
            icon="🎯"
            title="No students yet"
            description="Start by adding students to track their progress"
            actionLabel="Add Student"
            onAction={() => console.log('Add student')}
          />
        ) : (
          <ul className="divide-y divide-gray-200">
            {students.map((student) => (
              <li key={student.studentId} className="px-6 py-5 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                        {student.studentName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-base font-semibold text-gray-900">
                          {student.studentName}
                        </p>
                        <p className="text-sm text-gray-500">
                          Last active: {new Date(student.lastActiveDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <span className="font-medium">{student.sessionsCompleted}</span>
                        sessions
                      </span>
                      <span className="flex items-center gap-1">
                        Avg Score:
                        <span className={`font-semibold ${
                          student.averageScore >= 80 ? 'text-green-600' :
                          student.averageScore >= 60 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {student.averageScore.toFixed(1)}
                        </span>
                      </span>
                    </div>
                  </div>
                  
                  <div className="ml-6 flex items-center gap-2">
                    <Badge
                      variant={
                        student.engagementLevel === 'high' ? 'success' :
                        student.engagementLevel === 'medium' ? 'warning' :
                        'danger'
                      }
                      size="md"
                    >
                      {student.engagementLevel.charAt(0).toUpperCase() + student.engagementLevel.slice(1)} Engagement
                    </Badge>
                    
                    {student.needsIntervention && (
                      <Badge variant="danger" size="md">
                        ⚠️ Needs Attention
                      </Badge>
                    )}

                    <button
                      onClick={() => console.log('View details', student.studentId)}
                      className="ml-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      View Details →
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
