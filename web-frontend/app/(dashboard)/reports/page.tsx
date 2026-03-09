'use client'

import { useAuth } from '@/contexts/AuthContext'
import { EmptyState } from '@/components/ui/Cards'

export default function ReportsPage() {
  const { user } = useAuth()

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Reports
        </h1>
        <p className="text-gray-600">
          View detailed analytics and generate reports
        </p>
      </div>

      {/* Coming Soon */}
      <EmptyState
        icon="📊"
        title="Reports Coming Soon"
        description="Advanced analytics and reporting features are currently in development. Check back soon!"
      />
    </div>
  )
}
