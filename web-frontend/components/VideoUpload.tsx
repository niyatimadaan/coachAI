'use client'

import { useState, useRef } from 'react'
import { videoClient, type VideoUploadResponse } from '@/lib/api/video'

interface VideoUploadProps {
  studentId: string
  onUploadComplete?: (result: VideoUploadResponse) => void
  onError?: (error: string) => void
}

export default function VideoUpload({ studentId, onUploadComplete, onError }: VideoUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [duration, setDuration] = useState<number>(60)
  const [shotAttempts, setShotAttempts] = useState<number>(1)
  const [analysisResult, setAnalysisResult] = useState<VideoUploadResponse | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']
      if (!validTypes.includes(file.type)) {
        onError?.('Invalid file type. Please upload MP4, MOV, AVI, or WEBM')
        return
      }

      // Validate file size (100MB max)
      const maxSize = 100 * 1024 * 1024 // 100MB in bytes
      if (file.size > maxSize) {
        onError?.('File too large. Maximum size is 100MB')
        return
      }

      setSelectedFile(file)
      setAnalysisResult(null)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      onError?.('Please select a video file')
      return
    }

    try {
      setIsUploading(true)
      setUploadProgress(0)
      setAnalysisResult(null)

      const result = await videoClient.uploadVideo(
        selectedFile,
        studentId,
        { duration, shotAttempts },
        (progress) => {
          setUploadProgress(progress)
        }
      )

      setAnalysisResult(result)
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      onUploadComplete?.(result)
    } catch (error: any) {
      console.error('Upload error:', error)
      onError?.(error.message || 'Upload failed')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleCancel = () => {
    setSelectedFile(null)
    setAnalysisResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      {/* File Selection */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
          onChange={handleFileSelect}
          className="hidden"
          id="video-upload"
          disabled={isUploading}
        />
        <label
          htmlFor="video-upload"
          className={`cursor-pointer ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex flex-col items-center space-y-2">
            <svg
              className="h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {selectedFile ? selectedFile.name : 'Click to upload video'}
              </p>
              <p className="text-xs text-gray-500">
                MP4, MOV, AVI, WEBM up to 100MB
              </p>
            </div>
          </div>
        </label>
      </div>

      {/* Video Details */}
      {selectedFile && !isUploading && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (seconds)
            </label>
            <input
              type="number"
              min="1"
              max="300"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shot Attempts
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={shotAttempts}
              onChange={(e) => setShotAttempts(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Uploading and analyzing...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {selectedFile && !isUploading && (
        <div className="flex gap-2">
          <button
            onClick={handleUpload}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Upload & Analyze
          </button>
          <button
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Analysis Results */}
      {analysisResult && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-green-900">
              Analysis Complete!
            </h3>
            <div className="text-3xl font-bold text-green-600">
              {analysisResult.formScore.toFixed(1)}
            </div>
          </div>

          {/* Biomechanical Metrics */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs text-gray-600">Elbow Alignment</p>
              <p className="text-lg font-semibold text-gray-900">
                {analysisResult.analysis.biomechanicalMetrics.elbowAlignment.toFixed(1)}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs text-gray-600">Wrist Angle</p>
              <p className="text-lg font-semibold text-gray-900">
                {analysisResult.analysis.biomechanicalMetrics.wristAngle.toFixed(1)}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs text-gray-600">Shoulder Square</p>
              <p className="text-lg font-semibold text-gray-900">
                {analysisResult.analysis.biomechanicalMetrics.shoulderSquare.toFixed(1)}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs text-gray-600">Follow Through</p>
              <p className="text-lg font-semibold text-gray-900">
                {analysisResult.analysis.biomechanicalMetrics.followThrough.toFixed(1)}
              </p>
            </div>
          </div>

          {/* Form Issues */}
          {analysisResult.analysis.detectedIssues.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Detected Issues:</h4>
              {analysisResult.analysis.detectedIssues.map((issue, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg ${
                    issue.severity === 'high'
                      ? 'bg-red-50 border border-red-200'
                      : issue.severity === 'medium'
                      ? 'bg-yellow-50 border border-yellow-200'
                      : 'bg-blue-50 border border-blue-200'
                  }`}
                >
                  <p className="text-sm font-medium">{issue.description}</p>
                  <p className="text-xs text-gray-600 mt-1">{issue.recommendation}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
