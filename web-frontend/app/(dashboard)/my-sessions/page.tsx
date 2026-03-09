'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState } from 'react'
import { studentClient } from '@/lib/api/student'
import type { Session } from '@/lib/types/models'
import { LoadingSpinner, EmptyState, Badge } from '@/components/ui/Cards'
import StudentSessionDetailModal from '@/components/student/StudentSessionDetailModal'

export default function MySessionsPage() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    if (user?.id) {
      fetchSessions()
    }
  }, [user])

  const fetchSessions = async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      const data = await studentClient.getMySessions(user.id)
      setSessions(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load sessions')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <LoadingSpinner size="lg" message="Loading your sessions..." />
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 80) return 'text-blue-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBadge = (score: number) => {
    if (score >= 90) return { label: 'Excellent', variant: 'success' as const }
    if (score >= 80) return { label: 'Good', variant: 'primary' as const }
    if (score >= 70) return { label: 'Fair', variant: 'warning' as const }
    return { label: 'Needs Work', variant: 'danger' as const }
  }

  const handleViewDetails = (session: Session, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedSession(session)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          My Training Sessions
        </h1>
        <p className="text-gray-600">
          View all your recorded shooting sessions and analysis results
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-1">Total Sessions</p>
          <p className="text-3xl font-bold text-gray-900">{sessions.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-1">Average Score</p>
          <p className={`text-3xl font-bold ${getScoreColor(
            sessions.length > 0 
              ? sessions.reduce((sum, s) => sum + (s.formScore || 0), 0) / sessions.length 
              : 0
          )}`}>
            {sessions.length > 0 
              ? (sessions.reduce((sum, s) => sum + (s.formScore || 0), 0) / sessions.length).toFixed(1)
              : '0.0'}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-1">Total Shots</p>
          <p className="text-3xl font-bold text-gray-900">
            {sessions.reduce((sum, s) => sum + (s.shotCount || 0), 0)}
          </p>
        </div>
      </div>

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <EmptyState
          icon="🏀"
          title="No Sessions Yet"
          description="Upload your first video to start tracking your shooting progress!"
        />
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">All Sessions</h3>
            <p className="mt-1 text-sm text-gray-600">
              Click on a session to view detailed analysis
            </p>
          </div>
          <ul className="divide-y divide-gray-200">
            {sessions
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .map((session) => {
                const scoreBadge = getScoreBadge(Number(session.formScore) || 0)
                return (
                  <li
                    key={session.id}
                    onClick={() => setSelectedSession(selectedSession?.id === session.id ? null : session)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-gray-900">
                              {new Date(session.timestamp).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </p>
                            <Badge variant={scoreBadge.variant}>
                              {scoreBadge.label}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span className="flex items-center">
                              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {session.practiceTime} min
                            </span>
                            <span className="flex items-center">
                              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {session.shotCount} shots
                            </span>
                            <span className="flex items-center">
                              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              Video
                            </span>
                          </div>
                        </div>
                        <div className="ml-6 flex items-center">
                          <div className="text-right mr-4">
                            <p className={`text-3xl font-bold ${getScoreColor(Number(session.formScore) || 0)}`}>
                              {Number(session.formScore || 0).toFixed(1)}
                            </p>
                            <p className="text-xs text-gray-500">Form Score</p>
                          </div>
                          <svg
                            className={`h-5 w-5 text-gray-400 transition-transform ${
                              selectedSession?.id === session.id ? 'rotate-180' : ''
                            }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {selectedSession?.id === session.id && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wide">Session ID</p>
                              <p className="text-sm font-mono text-gray-900 mt-1 truncate">
                                {session.id.slice(0, 8)}...
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wide">Duration</p>
                              <p className="text-sm text-gray-900 mt-1">{session.practiceTime} minutes</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wide">Shot Attempts</p>
                              <p className="text-sm text-gray-900 mt-1">{session.shotCount} shots</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wide">Time</p>
                              <p className="text-sm text-gray-900 mt-1">
                                {new Date(session.timestamp).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 flex gap-2">
                            <button 
                              onClick={(e) => handleViewDetails(session, e)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
          </ul>
        </div>
      )}

      {/* Session Detail Modal */}
      {selectedSession && (
        <StudentSessionDetailModal
          session={selectedSession}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}
