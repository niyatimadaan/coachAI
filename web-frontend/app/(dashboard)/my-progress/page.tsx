'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState } from 'react'
import { studentClient } from '@/lib/api/student'
import type { StudentStats } from '@/lib/api/student'
import { LoadingSpinner } from '@/components/ui/Cards'

export default function MyProgressPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<StudentStats | null>(null)
  const [trends, setTrends] = useState<{ dates: string[]; scores: number[]; shotAttempts: number[] } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<30 | 60 | 90>(30)

  useEffect(() => {
    if (user?.id) {
      fetchProgress()
    }
  }, [user, timeRange])

  const fetchProgress = async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      const [statsData, trendsData] = await Promise.all([
        studentClient.getMyStats(user.id),
        studentClient.getProgressTrends(user.id, timeRange),
      ])
      setStats(statsData)
      setTrends(trendsData)
    } catch (err: any) {
      console.error('Error loading progress:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <LoadingSpinner size="lg" message="Loading your progress..." />
  }

  if (!stats) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">Unable to load progress data</p>
      </div>
    )
  }

  const getImprovementMessage = () => {
    if (stats.improvementRate > 10) return { text: 'Excellent progress!', color: 'text-green-600', icon: '🚀' }
    if (stats.improvementRate > 5) return { text: 'Great improvement!', color: 'text-blue-600', icon: '📈' }
    if (stats.improvementRate > 0) return { text: 'Steady progress', color: 'text-yellow-600', icon: '👍' }
    if (stats.improvementRate > -5) return { text: 'Keep practicing', color: 'text-orange-600', icon: '💪' }
    return { text: 'Focus on fundamentals', color: 'text-red-600', icon: '🎯' }
  }

  const improvement = getImprovementMessage()

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          My Progress
        </h1>
        <p className="text-gray-600">
          Track your improvement over time and identify areas for growth
        </p>
      </div>

      {/* Time Range Selector */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setTimeRange(30)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            timeRange === 30
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Last 30 Days
        </button>
        <button
          onClick={() => setTimeRange(60)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            timeRange === 60
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Last 60 Days
        </button>
        <button
          onClick={() => setTimeRange(90)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            timeRange === 90
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Last 90 Days
        </button>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Sessions</p>
            <span className="text-2xl">📹</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalSessions}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Average Score</p>
            <span className="text-2xl">⭐</span>
          </div>
          <p className="text-3xl font-bold text-blue-600">{stats.averageScore.toFixed(1)}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Best Score</p>
            <span className="text-2xl">🏆</span>
          </div>
          <p className="text-3xl font-bold text-green-600">{stats.bestScore.toFixed(1)}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Shots</p>
            <span className="text-2xl">🎯</span>
          </div>
          <p className="text-3xl font-bold text-orange-600">{stats.totalShotAttempts}</p>
        </div>
      </div>

      {/* Improvement Tracker */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-md p-8 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Your Progress</h3>
            <p className={`text-4xl font-bold ${improvement.color} mb-2`}>
              {stats.improvementRate >= 0 ? '+' : ''}{stats.improvementRate.toFixed(1)}%
            </p>
            <p className={`text-lg ${improvement.color} font-medium`}>
              {improvement.icon} {improvement.text}
            </p>
          </div>
          <div className="text-6xl">
            {improvement.icon}
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-4">
          Comparing your first 5 sessions to your last 5 sessions
        </p>
      </div>

      {/* Progress Chart */}
      {trends && trends.dates.length > 0 ? (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Score Progression</h3>
          <div className="space-y-4">
            {trends.dates.map((date, index) => {
              const score = trends.scores[index]
              const percentage = (score / 100) * 100
              const scoreColor = score >= 85 ? 'bg-green-500' : score >= 70 ? 'bg-blue-500' : 'bg-yellow-500'
              
              return (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{date}</span>
                    <span className="text-sm font-bold text-gray-900">{score.toFixed(1)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${scoreColor} transition-all`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500 mb-8">
          <p className="text-2xl mb-2">📊</p>
          <p>No progress data available for the selected time range</p>
          <p className="text-sm mt-2">Upload more videos to see your progress trends</p>
        </div>
      )}

      {/* Shot Attempts Chart */}
      {trends && trends.dates.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Practice Volume</h3>
          <div className="space-y-4">
            {trends.dates.map((date, index) => {
              const shots = trends.shotAttempts[index]
              const maxShots = Math.max(...trends.shotAttempts)
              const percentage = (shots / maxShots) * 100
              
              return (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{date}</span>
                    <span className="text-sm font-bold text-gray-900">{shots} shots</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="h-3 rounded-full bg-purple-500 transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tips Section */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
          <svg className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Tips for Improvement
        </h3>
        <ul className="space-y-2 text-sm text-blue-900">
          <li className="flex items-start">
            <span className="mr-2">✓</span>
            <span>Practice consistently - aim for at least 3 sessions per week</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">✓</span>
            <span>Review your video analysis to identify and correct form issues</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">✓</span>
            <span>Focus on quality over quantity - proper form leads to better scores</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">✓</span>
            <span>Track your improvement over time and celebrate small wins</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
