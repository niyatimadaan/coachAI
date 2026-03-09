'use client'

import { useState, useEffect } from 'react'
import type { Session } from '@/lib/types/models'

interface FormIssue {
  id: string
  sessionId: string
  issueType: string
  severity: 'low' | 'medium' | 'high'
  description: string
  recommendation: string
  timestamp: Date
}

interface BiomechanicalMetric {
  sessionId: string
  elbowAlignment: number
  wristAngle: number
  shoulderSquare: number
  followThrough: number
  bodyBalance: number
}

interface SessionAnalytics {
  biomechanicalMetrics: BiomechanicalMetric | null
  formIssues: FormIssue[]
}

interface StudentSessionDetailModalProps {
  session: Session
  isOpen: boolean
  onClose: () => void
}

export default function StudentSessionDetailModal({ 
  session, 
  isOpen, 
  onClose
}: StudentSessionDetailModalProps) {
  const [analytics, setAnalytics] = useState<SessionAnalytics | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false)
  const [isLoadingVideo, setIsLoadingVideo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      if (!isOpen || !session) return

      try {
        // Load analytics
        setIsLoadingAnalytics(true)
        setError(null)
        const analyticsResponse = await fetch(
          `http://localhost:3000/api/student/sessions/${session.id}/analytics`,
          { credentials: 'include' }
        )
        
        if (!analyticsResponse.ok) {
          throw new Error('Failed to fetch analytics')
        }

        const analyticsData = await analyticsResponse.json()
        if (analyticsData.success) {
          setAnalytics(analyticsData.data)
        }

        // Load video URL if video exists
        if (session.videoPath) {
          setIsLoadingVideo(true)
          try {
            const videoResponse = await fetch(
              `http://localhost:3000/api/video/video/${session.id}/url`,
              { credentials: 'include' }
            )
            
            if (videoResponse.ok) {
              const videoData = await videoResponse.json()
              if (videoData.success && videoData.data?.url) {
                setVideoUrl(videoData.data.url)
              }
            }
          } catch (videoError) {
            console.error('Failed to load video:', videoError)
          } finally {
            setIsLoadingVideo(false)
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load session details')
      } finally {
        setIsLoadingAnalytics(false)
      }
    }

    if (isOpen) {
      loadData()
    } else {
      setVideoUrl(null)
      setAnalytics(null)
    }
  }, [isOpen, session])

  const formatDate = (timestamp: string | Date | number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'low':
        return 'bg-yellow-100 text-yellow-800'
      case 'medium':
        return 'bg-orange-100 text-orange-800'
      case 'high':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatIssueType = (issueType: string) => {
    return issueType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          aria-hidden="true"
          onClick={onClose}
        ></div>

        {/* Center modal */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900" id="modal-title">
                Session Details
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white px-6 py-4 max-h-[70vh] overflow-y-auto">
            {isLoadingAnalytics ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">{error}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Session Overview */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                    Overview
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Date</p>
                      <p className="text-base font-medium text-gray-900">{formatDate(session.timestamp)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Duration</p>
                      <p className="text-base font-medium text-gray-900">{session.practiceTime} min</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Form Score</p>
                      <p className="text-base font-medium text-blue-600 text-xl">{Number(session.formScore || 0).toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Shots</p>
                      <p className="text-base font-medium text-gray-900">{session.shotCount}</p>
                    </div>
                  </div>
                </div>

                {/* Video Playback */}
                {session.videoPath && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                      Video Recording
                    </h4>
                    {isLoadingVideo ? (
                      <div className="bg-gray-100 rounded-lg aspect-video flex items-center justify-center">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                          <p className="text-sm text-gray-600">Loading video...</p>
                        </div>
                      </div>
                    ) : videoUrl ? (
                      <div className="bg-black rounded-lg overflow-hidden">
                        <video 
                          src={videoUrl} 
                          controls 
                          className="w-full aspect-video"
                          preload="metadata"
                        >
                          Your browser does not support the video tag.
                        </video>
                      </div>
                    ) : (
                      <div className="bg-gray-100 rounded-lg aspect-video flex items-center justify-center">
                        <div className="text-center text-gray-500">
                          <svg className="mx-auto h-12 w-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <p className="text-sm">Video unavailable</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Biomechanical Metrics */}
                {analytics?.biomechanicalMetrics && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                      Biomechanical Metrics
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h5 className="text-sm font-medium text-gray-900 mb-2">Elbow Alignment</h5>
                        <p className="text-2xl font-bold text-gray-900">{analytics.biomechanicalMetrics.elbowAlignment.toFixed(1)}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h5 className="text-sm font-medium text-gray-900 mb-2">Wrist Angle</h5>
                        <p className="text-2xl font-bold text-gray-900">{analytics.biomechanicalMetrics.wristAngle.toFixed(1)}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h5 className="text-sm font-medium text-gray-900 mb-2">Shoulder Square</h5>
                        <p className="text-2xl font-bold text-gray-900">{analytics.biomechanicalMetrics.shoulderSquare.toFixed(1)}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h5 className="text-sm font-medium text-gray-900 mb-2">Follow Through</h5>
                        <p className="text-2xl font-bold text-gray-900">{analytics.biomechanicalMetrics.followThrough.toFixed(1)}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h5 className="text-sm font-medium text-gray-900 mb-2">Body Balance</h5>
                        <p className="text-2xl font-bold text-gray-900">{analytics.biomechanicalMetrics.bodyBalance.toFixed(1)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Form Issues */}
                {analytics?.formIssues && analytics.formIssues.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                      Form Issues ({analytics.formIssues.length})
                    </h4>
                    <div className="space-y-3">
                      {analytics.formIssues.map((issue, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="text-sm font-medium text-gray-900">
                              {formatIssueType(issue.issueType)}
                            </h5>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(issue.severity)}`}>
                              {issue.severity}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{issue.description}</p>
                          {issue.recommendation && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <p className="text-xs text-gray-500 font-medium mb-1">💡 Recommendation:</p>
                              <p className="text-sm text-blue-600">{issue.recommendation}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {!analytics?.biomechanicalMetrics && (!analytics?.formIssues || analytics.formIssues.length === 0) && (
                  <div className="text-center py-12 text-gray-500">
                    <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-lg font-medium">Great session!</p>
                    <p className="text-sm mt-2">No significant issues detected in this session.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
