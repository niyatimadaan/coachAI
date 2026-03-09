'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState } from 'react'
import { studentsClient } from '@/lib/api/students'
import type { StudentProgressSummary } from '@/lib/types/models'
import { LoadingSpinner, EmptyState, Badge } from '@/components/ui/Cards'
import Link from 'next/link'
import VideoUpload from '@/components/VideoUpload'
import type { VideoUploadResponse } from '@/lib/api/video'

export default function StudentsPage() {
  const { user } = useAuth()
  const [students, setStudents] = useState<StudentProgressSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploadingStudent, setUploadingStudent] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    const fetchStudents = async () => {
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

    fetchStudents()
  }, [user])

  const handleUploadComplete = async (result: VideoUploadResponse) => {
    setSuccessMessage(`Video analyzed! Form score: ${result.formScore.toFixed(1)}`)
    setUploadingStudent(null)
    
    // Refresh student data
    if (user?.coachId) {
      const data = await studentsClient.getStudentProgressSummaries(user.coachId)
      setStudents(data)
    }

    // Clear success message after 5 seconds
    setTimeout(() => setSuccessMessage(null), 5000)
  }

  const handleUploadError = (errorMsg: string) => {
    setError(errorMsg)
    setTimeout(() => setError(null), 5000)
  }

  if (isLoading) {
    return <LoadingSpinner size="lg" message="Loading students..." />
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Students
        </h1>
        <p className="text-gray-600">
          Manage and track your students&apos; progress
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="text-sm font-medium text-green-800">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Students List */}
      {students.length === 0 ? (
        <EmptyState
          icon="👥"
          title="No Students Yet"
          description="You haven't added any students yet. Add your first student to get started!"
        />
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {students.map((student) => (
              <li key={student.studentId}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1">
                      <div className="flex-shrink-0">
                        <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-xl font-semibold">
                          {student.studentName.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">
                              {student.studentName}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge
                                variant={
                                  student.engagementLevel === 'high'
                                    ? 'success'
                                    : student.engagementLevel === 'medium'
                                    ? 'warning'
                                    : 'gray'
                                }
                              >
                                {student.engagementLevel}
                              </Badge>
                              {student.needsIntervention && (
                                <Badge variant="danger">Needs Attention</Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right mr-4">
                            <p className="text-2xl font-bold text-primary-600">
                              {student.averageScore.toFixed(1)}
                            </p>
                            <p className="text-sm text-gray-500">
                              {student.sessionsCompleted} sessions
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Link
                              href={`/students/${student.studentId}`}
                              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              View Details
                            </Link>
                            <button
                              onClick={() => setUploadingStudent(
                                uploadingStudent === student.studentId ? null : student.studentId
                              )}
                              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                              {uploadingStudent === student.studentId ? 'Cancel' : 'Upload Video'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Video Upload Section */}
                  {uploadingStudent === student.studentId && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">
                        Upload Shooting Video for {student.studentName}
                      </h4>
                      <VideoUpload
                        studentId={student.studentId}
                        onUploadComplete={handleUploadComplete}
                        onError={handleUploadError}
                      />
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
