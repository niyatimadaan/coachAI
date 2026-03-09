'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useState } from 'react'
import VideoUpload from '@/components/VideoUpload'
import type { VideoUploadResponse } from '@/lib/api/video'
import { useRouter } from 'next/navigation'

export default function UploadVideoPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [uploadSuccess, setUploadSuccess] = useState<VideoUploadResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleUploadComplete = (result: VideoUploadResponse) => {
    setUploadSuccess(result)
    setError(null)
    
    // Scroll to results
    setTimeout(() => {
      document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const handleUploadError = (errorMsg: string) => {
    setError(errorMsg)
    setUploadSuccess(null)
  }

  const handleUploadAnother = () => {
    setUploadSuccess(null)
    setError(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleViewSessions = () => {
    router.push('/my-sessions')
  }

  if (!user?.id) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <p className="text-gray-600">Please log in to upload videos</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Upload Training Video
        </h1>
        <p className="text-gray-600">
          Upload a video of your basketball shooting form for AI-powered analysis
        </p>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
          <svg className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Recording Tips
        </h3>
        <ul className="space-y-2 text-sm text-blue-900">
          <li className="flex items-start">
            <span className="mr-2 font-bold">📹</span>
            <span><strong>Camera Position:</strong> Place camera at a 45-degree angle, capturing your full body from feet to follow-through</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2 font-bold">💡</span>
            <span><strong>Lighting:</strong> Ensure good lighting - avoid backlighting or shadows on your shooting form</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2 font-bold">🎯</span>
            <span><strong>Distance:</strong> Position camera 10-15 feet away to capture entire shooting motion</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2 font-bold">📱</span>
            <span><strong>Format:</strong> Use landscape orientation, MP4 format recommended, max 100MB</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2 font-bold">🏀</span>
            <span><strong>Content:</strong> Focus on shooting form - include wind-up, release, and follow-through</span>
          </li>
        </ul>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Upload Component */}
      {!uploadSuccess && (
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <VideoUpload
            studentId={user.id}
            onUploadComplete={handleUploadComplete}
            onError={handleUploadError}
          />
        </div>
      )}

      {/* Success Results */}
      {uploadSuccess && (
        <div id="results" className="space-y-6">
          {/* Success Banner */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-start">
              <svg className="h-6 w-6 text-green-400 mr-3 mt-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-green-900 mb-2">
                  Video Uploaded & Analyzed Successfully! 🎉
                </h3>
                <p className="text-sm text-green-700">
                  Your shooting form has been analyzed using AI. Review your results below.
                </p>
              </div>
            </div>
          </div>

          {/* Overall Score */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow-lg p-8 text-center">
            <p className="text-sm uppercase tracking-wide mb-2 opacity-90">Overall Form Score</p>
            <p className="text-6xl font-bold mb-2">{uploadSuccess.formScore.toFixed(1)}</p>
            <p className="text-lg opacity-90">out of 100</p>
          </div>

          {/* Annotated Visualization Frames */}
          {uploadSuccess.annotatedFrames && uploadSuccess.annotatedFrames.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="h-6 w-6 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Visual Form Analysis
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                AI-generated visualizations showing your pose and detected form issues
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {uploadSuccess.annotatedFrames.map((frameUrl, index) => {
                  const phases = ['Preparation', 'Release', 'Follow-Through']
                  return (
                    <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="relative aspect-video bg-gray-100">
                        <img
                          src={frameUrl}
                          alt={`${phases[index]} phase analysis`}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="75" viewBox="0 0 100 75"%3E%3Crect fill="%23ddd" width="100" height="75"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3ENo Image%3C/text%3E%3C/svg%3E'
                          }}
                        />
                      </div>
                      <div className="p-3 bg-gray-50">
                        <p className="text-sm font-medium text-gray-900 text-center">
                          {phases[index] || `Frame ${index + 1}`}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-xs text-blue-800">
                  <strong>Legend:</strong> Green lines indicate good form, red lines highlight detected issues, and red circles mark problem joints
                </p>
              </div>
            </div>
          )}

          {/* Biomechanical Metrics */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Biomechanical Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(uploadSuccess.analysis.biomechanicalMetrics).map(([key, value], index) => {
                const percentage = value as number
                const bgColor = percentage >= 85 ? 'bg-green-500' : percentage >= 70 ? 'bg-blue-500' : 'bg-yellow-500'
                const textColor = percentage >= 85 ? 'text-green-600' : percentage >= 70 ? 'text-blue-600' : 'text-yellow-600'
                const metricName = key.replace(/([A-Z])/g, ' $1').trim()
                  .split(' ')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ')
                
                return (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-700">{metricName}</p>
                      <p className={`text-lg font-bold ${textColor}`}>{percentage.toFixed(1)}</p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${bgColor} transition-all`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {percentage >= 85 ? 'Good' : percentage >= 70 ? 'Needs Improvement' : 'Critical'}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Detected Issues */}
          {uploadSuccess.analysis.detectedIssues.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Areas for Improvement</h3>
              <div className="space-y-3">
                {uploadSuccess.analysis.detectedIssues.map((issue, index) => {
                  const severityColors: Record<string, string> = {
                    low: 'bg-blue-100 text-blue-800 border-blue-200',
                    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                    high: 'bg-red-100 text-red-800 border-red-200',
                  }
                  const severityIcons: Record<string, string> = {
                    low: 'ℹ️',
                    medium: '⚠️',
                    high: '🚨',
                  }
                  
                  return (
                    <div
                      key={index}
                      className={`border rounded-lg p-4 ${severityColors[issue.severity] || severityColors.medium}`}
                    >
                      <div className="flex items-start">
                        <span className="text-2xl mr-3">{severityIcons[issue.severity] || severityIcons.medium}</span>
                        <div className="flex-1">
                          <p className="font-medium mb-1">{issue.description}</p>
                          <p className="text-sm opacity-90">{issue.recommendation}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleUploadAnother}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Upload Another Video
            </button>
            <button
              onClick={handleViewSessions}
              className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              View All Sessions
            </button>
          </div>
        </div>
      )}

      {/* What Happens Next */}
      {!uploadSuccess && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">What happens after upload?</h3>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="flex items-start">
              <span className="font-bold mr-2 text-blue-600">1.</span>
              <span>Your video is securely uploaded to cloud storage</span>
            </div>
            <div className="flex items-start">
              <span className="font-bold mr-2 text-blue-600">2.</span>
              <span>AI analyzes your shooting form frame-by-frame</span>
            </div>
            <div className="flex items-start">
              <span className="font-bold mr-2 text-blue-600">3.</span>
              <span>Biomechanical metrics are calculated (elbow angle, wrist release, etc.)</span>
            </div>
            <div className="flex items-start">
              <span className="font-bold mr-2 text-blue-600">4.</span>
              <span>You receive an overall form score and specific recommendations</span>
            </div>
            <div className="flex items-start">
              <span className="font-bold mr-2 text-blue-600">5.</span>
              <span>Results are saved to your profile for progress tracking</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
