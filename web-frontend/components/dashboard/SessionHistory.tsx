'use client'

import { useState } from 'react'
import { SessionSummary } from '@/lib/types/models'

interface SessionHistoryProps {
  sessions: SessionSummary[]
}

export function SessionHistory({ sessions }: SessionHistoryProps) {
  const [expandedSession, setExpandedSession] = useState<string | null>(null)

  const toggleSession = (sessionId: string) => {
    setExpandedSession(expandedSession === sessionId ? null : sessionId)
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50'
    if (score >= 60) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getScoreBadge = (score: number) => {
    if (score >= 80) return 'Excellent'
    if (score >= 60) return 'Good'
    return 'Needs Work'
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => (
        <div
          key={session.id}
          className="border border-gray-200 rounded-lg overflow-hidden transition-shadow hover:shadow-md"
        >
          {/* Session Header */}
          <button
            onClick={() => toggleSession(session.id)}
            className="w-full px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
            aria-expanded={expandedSession === session.id}
            aria-controls={`session-details-${session.id}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-900">
                    {formatDate(session.timestamp)}
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${getScoreColor(
                      session.formScore
                    )}`}
                  >
                    {session.formScore}% - {getScoreBadge(session.formScore)}
                  </span>
                </div>
                <div className="mt-1 flex items-center space-x-4 text-xs text-gray-600">
                  <span>Duration: {formatDuration(session.practiceTime)}</span>
                  <span>•</span>
                  <span>Shots: {session.shotCount}</span>
                </div>
              </div>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${
                  expandedSession === session.id ? 'transform rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </button>

          {/* Session Details (Expandable) */}
          {expandedSession === session.id && (
            <div
              id={`session-details-${session.id}`}
              className="px-4 py-3 bg-gray-50 border-t border-gray-200"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Form Score
                  </p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {session.formScore}%
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Practice Time
                  </p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {formatDuration(session.practiceTime)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Shot Count
                  </p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {session.shotCount}
                  </p>
                </div>
              </div>

              {/* Performance Indicator */}
              <div className="mt-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Performance
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      session.formScore >= 80
                        ? 'bg-green-500'
                        : session.formScore >= 60
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${session.formScore}%` }}
                    role="progressbar"
                    aria-valuenow={session.formScore}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {sessions.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No sessions recorded yet.</p>
        </div>
      )}
    </div>
  )
}
