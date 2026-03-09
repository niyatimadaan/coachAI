'use client'

import { useAuth } from '@/contexts/AuthContext'
import { EmptyState } from '@/components/ui/Cards'
import { useEffect, useState } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts'

interface TeamReport {
  summary: {
    totalStudents: number
    totalSessions: number
    averageScore: number
    activePractitioners: number
  }
  scoreDistribution: {
    excellent: number
    good: number
    average: number
    needsWork: number
  }
  formIssues: Array<{
    type: string
    severity: string
    count: number
    affectedStudents: number
    percentage: number
  }>
  teamBiomechanics: {
    elbowAlignment: number
    wristAngle: number
    shoulderSquare: number
    followThrough: number
    bodyBalance: number
  } | null
  studentReports: Array<{
    studentId: string
    studentName: string
    age: number
    skillLevel: string
    sessionsCompleted: number
    averageScore: number
    topIssues: Array<{
      type: string
      count: number
    }>
  }>
  recommendedDrills: Array<{
    drillName: string
    description: string
    instructions: string[]
    sets: string
    focusPoints: string[]
    difficulty: string
    targetIssue: string
  }>
}

const COLORS = {
  excellent: '#10b981',
  good: '#3b82f6',
  average: '#f59e0b',
  needsWork: '#ef4444',
}

const ISSUE_COLORS = ['#ef4444', '#f59e0b', '#f97316', '#ec4899', '#8b5cf6', '#6366f1']

export default function ReportsPage() {
  const { user } = useAuth()
  const [report, setReport] = useState<TeamReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user?.id) {
      fetchTeamReport()
    }
  }, [user])

  const fetchTeamReport = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`http://localhost:3000/api/coach/reports/${user?.id}/team`, {
        credentials: 'include',
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch team report')
      }

      const data = await response.json()
      if (data.success) {
        setReport(data.data)
      } else {
        throw new Error(data.error || 'Failed to load report')
      }
    } catch (err: any) {
      console.error('Error fetching team report:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading team report...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <EmptyState
          icon="⚠️"
          title="Unable to Load Report"
          description={error || 'Please try again later'}
        />
      </div>
    )
  }

  const scoreDistributionData = [
    { name: 'Excellent (90+)', value: report.scoreDistribution.excellent, color: COLORS.excellent },
    { name: 'Good (75-89)', value: report.scoreDistribution.good, color: COLORS.good },
    { name: 'Average (60-74)', value: report.scoreDistribution.average, color: COLORS.average },
    { name: 'Needs Work (<60)', value: report.scoreDistribution.needsWork, color: COLORS.needsWork },
  ]

  const topIssuesData = report.formIssues.slice(0, 6).map(issue => ({
    name: issue.type.replace(/_/g, ' '),
    count: issue.count,
    students: issue.affectedStudents,
  }))

  const biomechanicsData = report.teamBiomechanics ? [
    { metric: 'Elbow', value: Math.round(report.teamBiomechanics.elbowAlignment) },
    { metric: 'Wrist', value: Math.round(report.teamBiomechanics.wristAngle) },
    { metric: 'Shoulder', value: Math.round(report.teamBiomechanics.shoulderSquare) },
    { metric: 'Follow Through', value: Math.round(report.teamBiomechanics.followThrough) },
    { metric: 'Body Balance', value: Math.round(report.teamBiomechanics.bodyBalance) },
  ] : []

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Team Performance Report
        </h1>
        <p className="text-gray-600">
          Comprehensive analytics for the last 30 days
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Total Students</div>
          <div className="text-3xl font-bold text-gray-900">{report.summary.totalStudents}</div>
          <div className="text-xs text-green-600 mt-1">
            {report.summary.activePractitioners} active
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Total Sessions</div>
          <div className="text-3xl font-bold text-gray-900">{report.summary.totalSessions}</div>
          <div className="text-xs text-gray-500 mt-1">
            {report.summary.totalStudents > 0 
              ? Math.round(report.summary.totalSessions / report.summary.totalStudents) 
              : 0} per student
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Team Average Score</div>
          <div className="text-3xl font-bold text-gray-900">{report.summary.averageScore}</div>
          <div className={`text-xs mt-1 ${
            report.summary.averageScore >= 80 ? 'text-green-600' :
            report.summary.averageScore >= 60 ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            {report.summary.averageScore >= 80 ? 'Excellent' :
             report.summary.averageScore >= 60 ? 'Good' :
             'Needs Improvement'}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Active Rate</div>
          <div className="text-3xl font-bold text-gray-900">
            {report.summary.totalStudents > 0 
              ? Math.round((report.summary.activePractitioners / report.summary.totalStudents) * 100)
              : 0}%
          </div>
          <div className="text-xs text-gray-500 mt-1">Last 30 days</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Score Distribution Pie Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Score Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={scoreDistributionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {scoreDistributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Form Issues Bar Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Most Common Issues</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topIssuesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#ef4444" name="Occurrences" />
              <Bar dataKey="students" fill="#f59e0b" name="Students Affected" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Biomechanics Radar Chart */}
      {report.teamBiomechanics && biomechanicsData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Team Biomechanics Profile</h2>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={biomechanicsData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar
                name="Team Average"
                dataKey="value"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.6}
              />
              <Tooltip />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Individual Student Reports */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Individual Student Performance</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sessions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Top Issues
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {report.studentReports.map((student) => (
                <tr key={student.studentId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{student.studentName}</div>
                    <div className="text-xs text-gray-500">Age {student.age}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {student.skillLevel}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {student.sessionsCompleted}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`text-sm font-semibold ${
                        student.averageScore >= 80 ? 'text-green-600' :
                        student.averageScore >= 60 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {student.averageScore.toFixed(1)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-gray-600">
                      {student.topIssues.length > 0 ? (
                        <ul className="list-disc list-inside">
                          {student.topIssues.slice(0, 2).map((issue, idx) => (
                            <li key={idx}>
                              {issue.type.replace(/_/g, ' ')} ({issue.count})
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-gray-400">No issues recorded</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommended Drills Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          🏀 Recommended Team Drills
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Based on the most common form issues across your team
        </p>
        
        {report.recommendedDrills.length > 0 ? (
          <div className="space-y-6">
            {report.recommendedDrills.map((drill, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                {/* Drill Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {drill.drillName}
                    </h3>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded-md font-medium">
                        Targets: {drill.targetIssue.replace(/_/g, ' ')}
                      </span>
                      <span className={`px-2 py-1 rounded-md font-medium ${
                        drill.difficulty === 'beginner' ? 'bg-green-100 text-green-800' :
                        drill.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {drill.difficulty}
                      </span>
                      <span className="text-gray-600">{drill.sets}</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-gray-700 mb-4">{drill.description}</p>

                {/* Instructions */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Instructions:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                    {drill.instructions.map((instruction, idx) => (
                      <li key={idx}>{instruction}</li>
                    ))}
                  </ol>
                </div>

                {/* Focus Points */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Focus Points:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                      {drill.focusPoints.map((point, idx) => (
                        <li key={idx}>{point}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No drill recommendations available yet.</p>
            <p className="text-sm mt-2">Complete more practice sessions to generate personalized recommendations.</p>
          </div>
        )}
      </div>
    </div>
  )
}
