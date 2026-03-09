'use client'

import { useState, useEffect } from 'react'
import { sessionsClient } from '@/lib/api/sessions'
import type { SessionDetail } from '@/lib/types/models'

interface SessionDetailModalProps {
  sessionId: string
  isOpen: boolean
  onClose: () => void
}

export default function SessionDetailModal({ sessionId, isOpen, onClose }: SessionDetailModalProps) {
  const [session, setSession] = useState<SessionDetail | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingVideo, setIsLoadingVideo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadSessionDetails = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const data = await sessionsClient.getSessionDetails(sessionId)
        setSession(data)

        // Fetch video URL if videoPath exists
        if (data.videoPath) {
          setIsLoadingVideo(true)
          try {
            const videoResponse = await fetch(`http://localhost:3000/api/video/video/${sessionId}/url`, {
              credentials: 'include',
            })
            
            if (!videoResponse.ok) {
              throw new Error(`Failed to fetch video URL: ${videoResponse.status}`)
            }
            
            const videoData = await videoResponse.json()
            console.log('Video URL response:', videoData)
            
            if (videoData.success && videoData.data?.url) {
              console.log('Setting video URL:', videoData.data.url.substring(0, 100) + '...')
              setVideoUrl(videoData.data.url)
            } else {
              console.error('No video URL in response:', videoData)
            }
          } catch (videoError) {
            console.error('Failed to load video URL:', videoError)
            // Don't show error to user, just skip video
          } finally {
            setIsLoadingVideo(false)
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load session details')
      } finally {
        setIsLoading(false)
      }
    }

    if (isOpen && sessionId) {
      loadSessionDetails()
    } else {
      // Clear video URL when modal closes
      setVideoUrl(null)
    }
  }, [isOpen, sessionId])

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getSeverityColor = (severity: 'minor' | 'moderate' | 'major') => {
    switch (severity) {
      case 'minor':
        return 'bg-yellow-100 text-yellow-800'
      case 'moderate':
        return 'bg-orange-100 text-orange-800'
      case 'major':
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

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
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
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">{error}</p>
              </div>
            ) : session ? (
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
                      <p className="text-base font-medium text-gray-900">{formatDuration(session.practiceTime)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Form Score</p>
                      <p className="text-base font-medium text-gray-900">{session.formScore}</p>
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
                          onError={(e) => {
                            console.error('Video playback error:', e)
                            const videoElement = e.target as HTMLVideoElement
                            console.error('Error code:', videoElement.error?.code)
                            console.error('Error message:', videoElement.error?.message)
                          }}
                          onLoadStart={() => console.log('Video loading started')}
                          onCanPlay={() => console.log('Video can play')}
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

                {/* Form Issues */}
                {session.formIssues && session.formIssues.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                      Form Issues ({session.formIssues.length})
                    </h4>
                    <div className="space-y-3">
                      {session.formIssues.map((issue, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="text-sm font-medium text-gray-900">
                              {formatIssueType(issue.issueType)}
                            </h5>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(issue.severity)}`}>
                              {issue.severity}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{issue.description}</p>
                          <p className="text-xs text-gray-400 mt-2">
                            Timestamp: {formatDuration(issue.timestamp)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Feedback */}
                {session.feedback && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                      Feedback
                    </h4>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-gray-700">{session.feedback}</p>
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {session.recommendations && session.recommendations.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                      Recommendations
                    </h4>
                    <ul className="space-y-2">
                      {session.recommendations.map((recommendation, index) => (
                        <li key={index} className="flex items-start">
                          <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm text-gray-700">{recommendation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : null}
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
