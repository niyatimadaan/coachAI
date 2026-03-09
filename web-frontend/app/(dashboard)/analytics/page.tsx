import { Suspense } from 'react'
import { AnalyticsDashboard } from './AnalyticsDashboard'

export const metadata = {
  title: 'Analytics | CoachAI',
  description: 'View aggregate analytics and insights across all students',
}

export default function AnalyticsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="mt-2 text-gray-600">
          View aggregate metrics, trends, and insights across all your students
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        }
      >
        <AnalyticsDashboard />
      </Suspense>
    </div>
  )
}
