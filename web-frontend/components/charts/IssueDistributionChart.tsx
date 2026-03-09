'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { CommonFormIssue } from '@/lib/types/models'

interface IssueDistributionChartProps {
  issues: CommonFormIssue[]
}

// Color palette for different issue types
const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
]

// Format issue type for display
function formatIssueType(issueType: string): string {
  return issueType
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function IssueDistributionChart({ issues }: IssueDistributionChartProps) {
  // Transform data for the chart
  const chartData = issues.map((issue) => ({
    name: formatIssueType(issue.issueType),
    occurrences: issue.occurrenceCount,
    students: issue.affectedStudents,
    severity: issue.averageSeverity,
  }))

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900 mb-2">{data.name}</p>
          <div className="space-y-1 text-sm">
            <p className="text-gray-700">
              <span className="font-medium">Occurrences:</span> {data.occurrences}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Affected Students:</span> {data.students}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Avg Severity:</span> {data.severity.toFixed(1)}
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  if (issues.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
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
          <p className="mt-2">No form issues data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full" style={{ height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="name"
            stroke="#6b7280"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickLine={{ stroke: '#6b7280' }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            stroke="#6b7280"
            tick={{ fill: '#6b7280' }}
            tickLine={{ stroke: '#6b7280' }}
            label={{
              value: 'Occurrences',
              angle: -90,
              position: 'insideLeft',
              fill: '#6b7280',
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
          />
          <Bar
            dataKey="occurrences"
            name="Occurrences"
            radius={[8, 8, 0, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Summary Stats */}
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div className="bg-gray-50 rounded p-3">
          <p className="text-gray-600">Total Issues</p>
          <p className="text-lg font-semibold text-gray-900">
            {issues.reduce((sum, issue) => sum + issue.occurrenceCount, 0)}
          </p>
        </div>
        <div className="bg-gray-50 rounded p-3">
          <p className="text-gray-600">Students Affected</p>
          <p className="text-lg font-semibold text-gray-900">
            {Math.max(...issues.map((issue) => issue.affectedStudents))}
          </p>
        </div>
      </div>
    </div>
  )
}
