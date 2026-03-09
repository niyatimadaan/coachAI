import { apiClient } from './client'
import type { APIResponse } from '../types/models'

export interface VideoUploadResponse {
  sessionId: string
  videoId: string
  formScore: number
  annotatedFrames?: string[] // URLs to annotated visualization frames
  analysis: {
    overallScore: number
    biomechanicalMetrics: {
      elbowAlignment: number
      wristAngle: number
      shoulderSquare: number
      followThrough: number
    }
    detectedIssues: Array<{
      issueType: string
      severity: string
      description: string
      recommendation: string
    }>
  }
  message: string
}

export interface VideoUrlResponse {
  url: string
  expiresIn: number
}

export class VideoClient {
  async uploadVideo(
    file: File,
    studentId: string,
    options: {
      duration?: number
      shotAttempts?: number
    } = {},
    onProgress?: (progress: number) => void
  ): Promise<VideoUploadResponse> {
    const formData = new FormData()
    formData.append('video', file)
    formData.append('studentId', studentId)
    
    if (options.duration) {
      formData.append('duration', options.duration.toString())
    }
    if (options.shotAttempts) {
      formData.append('shotAttempts', options.shotAttempts.toString())
    }

    // Use XMLHttpRequest for upload progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const progress = Math.round((e.loaded / e.total) * 100)
          onProgress(progress)
        }
      })

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText)
            if (response.success && response.data) {
              resolve(response.data)
            } else {
              reject(new Error(response.error || 'Upload failed'))
            }
          } catch (error) {
            reject(new Error('Failed to parse response'))
          }
        } else {
          try {
            const response = JSON.parse(xhr.responseText)
            reject(new Error(response.error || `Upload failed with status ${xhr.status}`))
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`))
          }
        }
      })

      // Handle errors
      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'))
      })

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelled'))
      })

      // Get the base URL from window.location or environment
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
      
      xhr.open('POST', `${baseUrl}/api/video/upload`)
      
      // Add auth token if available
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth_token='))
        ?.split('=')[1]
      
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      }

      xhr.send(formData)
    })
  }

  async getVideoUrl(sessionId: string): Promise<string> {
    const response = await apiClient.get<APIResponse<VideoUrlResponse>>(
      `/api/video/video/${sessionId}/url`
    )
    return response.data?.url || ''
  }

  async deleteVideo(sessionId: string): Promise<void> {
    await apiClient.delete(`/api/video/video/${sessionId}`)
  }
}

export const videoClient = new VideoClient()
