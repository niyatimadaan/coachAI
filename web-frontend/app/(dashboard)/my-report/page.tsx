'use client'

import { useAuth } from '@/contexts/AuthContext'
import { EmptyState, LoadingSpinner } from '@/components/ui/Cards'
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

interface StudentReport {
  summary: {
    totalSessions: number
    averageScore: number
    bestScore: number
    totalPracticeTime: number
    totalShots: number
  }
  scoreDistribution: {
    excellent: number
    good: number
    average: number
    needsWork: number
  }
  progressOverTime: Array<{
    date: string
    score: number
    shots: number
  }>
  formIssues: Array<{
    type: string
    severity: string
    count: number
    percentage: number
  }>
  biomechanics: {
    elbowAlignment: number
    wristAngle: number
    shoulderSquare: number
    followThrough: number
    bodyBalance: number
  } | null
  recommendedDrills: Array<{
    drillName: string
    description: string
    instructions: string[]
    sets: string
    focusPoints: string[]
    difficulty: string
    targetIssue: string
    videoUrl?: string | null
  }>
}

const COLORS = {
  excellent: '#10b981',
  good: '#3b82f6',
  average: '#f59e0b',
  needsWork: '#ef4444',
}

// Simple function to extract YouTube video ID from URL
function getYouTubeVideoId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
  const match = url.match(regExp)
  return (match && match[2].length === 11) ? match[2] : null
}

export default function MyReportPage() {
  const { user } = useAuth()
  const [report, setReport] = useState<StudentReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user?.id) {
      fetchStudentReport()
    }
  }, [user])

  const fetchStudentReport = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`http://localhost:3000/api/student/report?userId=${user?.id}`, {
        credentials: 'include',
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch report')
      }

      const data = await response.json()
      if (data.success) {
        setReport(data.data)
      } else {
        throw new Error(data.error || 'Failed to load report')
      }
    } catch (err: any) {
      console.error('Error fetching student report:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingSpinner size="lg" message="Loading your performance report..." />
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
    percentage: issue.percentage,
  }))

  const biomechanicsData = report.biomechanics ? [
    { metric: 'Elbow', value: Math.round(report.biomechanics.elbowAlignment) },
    { metric: 'Wrist', value: Math.round(report.biomechanics.wristAngle) },
    { metric: 'Shoulder', value: Math.round(report.biomechanics.shoulderSquare) },
    { metric: 'Follow Through', value: Math.round(report.biomechanics.followThrough) },
    { metric: 'Body Balance', value: Math.round(report.biomechanics.bodyBalance) },
  ] : []

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          My Performance Report 📊
        </h1>
        <p className="text-gray-600">
          Your shooting analysis and progress for the last 30 days
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Sessions</div>
          <div className="text-3xl font-bold text-gray-900">{report.summary.totalSessions}</div>
          <div className="text-xs text-gray-500 mt-1">Completed</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Average Score</div>
          <div className="text-3xl font-bold text-blue-600">{report.summary.averageScore}</div>
          <div className="text-xs text-gray-500 mt-1">Out of 100</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Best Score</div>
          <div className="text-3xl font-bold text-green-600">{report.summary.bestScore}</div>
          <div className="text-xs text-gray-500 mt-1">Personal best</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Practice Time</div>
          <div className="text-3xl font-bold text-gray-900">{report.summary.totalPracticeTime}</div>
          <div className="text-xs text-gray-500 mt-1">Minutes</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Total Shots</div>
          <div className="text-3xl font-bold text-gray-900">{report.summary.totalShots}</div>
          <div className="text-xs text-gray-500 mt-1">Attempts</div>
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

        {/* Progress Over Time Line Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Progress Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={report.progressOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} name="Form Score" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Form Issues Bar Chart */}
      {topIssuesData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Areas to Improve</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topIssuesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#ef4444" name="Occurrences" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Biomechanics Radar Chart */}
      {report.biomechanics && biomechanicsData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">My Biomechanics Profile</h2>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={biomechanicsData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar
                name="Your Average"
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

      {/* Recommended Drills Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          🏀 Your Personalized Training Drills
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          AI-generated drill recommendations based on your form analysis
        </p>
        
        {report.recommendedDrills.length > 0 ? (
          <div className="space-y-8">
            {report.recommendedDrills.map((drill, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                {/* Drill Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {drill.drillName}
                    </h3>
                    <div className="flex items-center gap-3 text-sm flex-wrap">
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

                {/* YouTube Video Embed */}
                {drill.videoUrl && getYouTubeVideoId(drill.videoUrl) && (
                  <div className="mb-4 rounded-lg overflow-hidden">
                    <div className="relative pb-[56.25%]">
                      <iframe
                        className="absolute top-0 left-0 w-full h-full"
                        src={`https://www.youtube.com/embed/${getYouTubeVideoId(drill.videoUrl)}`}
                        title={drill.drillName}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    </div>
                  </div>
                )}

                {/* Description */}
                <p className="text-gray-700 mb-4">{drill.description}</p>

                {/* Instructions */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">📋 Instructions:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700 ml-2">
                    {drill.instructions.map((instruction, idx) => (
                      <li key={idx} className="pl-2">{instruction}</li>
                    ))}
                  </ol>
                </div>

                {/* Focus Points */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">🎯 Focus Points:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-2">
                    {drill.focusPoints.map((point, idx) => (
                      <li key={idx} className="pl-2">{point}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
            <p className="text-lg">🎉 Great job! No major issues detected.</p>
            <p className="text-sm mt-2">Keep practicing to maintain your excellent form!</p>
          </div>
        )}
      </div>
    </div>
  )
}
