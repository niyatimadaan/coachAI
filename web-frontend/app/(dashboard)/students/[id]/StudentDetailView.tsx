import { StudentAnalytics } from '@/lib/types/models'
import { ProgressChart } from '@/components/charts/ProgressChart'
import { SessionHistory } from '@/components/dashboard/SessionHistory'

interface StudentDetailViewProps {
  studentId: string
}

async function fetchStudentAnalytics(studentId: string): Promise<StudentAnalytics | null> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/coach/student/${studentId}/analytics`,
      {
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      console.error('Failed to fetch student analytics:', response.statusText)
      return null
    }

    const data = await response.json()
    return data.success ? data : null
  } catch (error) {
    console.error('Error fetching student analytics:', error)
    return null
  }
}

export async function StudentDetailView({ studentId }: StudentDetailViewProps) {
  const analytics = await fetchStudentAnalytics(studentId)

  if (!analytics) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            No Data Available
          </h2>
          <p className="text-gray-600">
            Unable to load student analytics. Please try again later.
          </p>
        </div>
      </div>
    )
  }

  const { student, metrics, recentSessions } = analytics

  return (
    <div className="space-y-6">
      {/* Student Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{student.name}</h1>
            <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
              <span>Age: {student.age}</span>
              <span>•</span>
              <span>Skill Level: {student.skillLevel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Charts */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Progress Overview</h2>
        <ProgressChart metrics={metrics} />
      </div>

      {/* Session History */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Sessions</h2>
        {recentSessions.length > 0 ? (
          <SessionHistory sessions={recentSessions} />
        ) : (
          <p className="text-gray-600">No sessions recorded yet.</p>
        )}
      </div>

      {/* Persistent Issues */}
      {metrics['30d'].persistentIssues.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Areas for Improvement</h2>
          <ul className="space-y-2">
            {metrics['30d'].persistentIssues.map((issue, index) => (
              <li key={index} className="flex items-start">
                <span className="flex-shrink-0 h-5 w-5 text-yellow-500 mr-2">⚠</span>
                <span className="text-gray-700">{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
