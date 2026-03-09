import { analyticsClient } from '@/lib/api/analytics'
import { IssueDistributionChart } from '@/components/charts/IssueDistributionChart'
import { TrendChart } from '@/components/charts/TrendChart'
import { AnalyticsFilters } from '@/components/dashboard/AnalyticsFilters'

// Mock coachId - in a real app, this would come from auth context
const MOCK_COACH_ID = 'coach-1'

export async function AnalyticsDashboard() {
  // Fetch analytics data from the backend
  const [progressData, issuesData] = await Promise.all([
    analyticsClient.getCoachProgress(MOCK_COACH_ID),
    analyticsClient.getCommonIssues(MOCK_COACH_ID),
  ])

  return (
    <div className="space-y-8">
      {/* Aggregate Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Sessions</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {progressData.totalSessions}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Improvement</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {progressData.averageImprovement >= 0 ? '+' : ''}
                {progressData.averageImprovement.toFixed(1)}%
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Common Form Issues</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {issuesData.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Filters */}
      <AnalyticsFilters />

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Issue Distribution Chart */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Common Form Issues
          </h2>
          <IssueDistributionChart issues={issuesData} />
        </div>

        {/* Trend Chart */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Performance Trends
          </h2>
          <TrendChart
            data={[
              { date: '2024-01-01', value: 75, label: 'Week 1' },
              { date: '2024-01-08', value: 78, label: 'Week 2' },
              { date: '2024-01-15', value: 82, label: 'Week 3' },
              { date: '2024-01-22', value: 85, label: 'Week 4' },
            ]}
            metric="performance"
          />
        </div>
      </div>
    </div>
  )
}
