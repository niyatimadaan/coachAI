'use client'

import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { ProgressMetrics } from '@/lib/types/models'

interface ProgressChartProps {
  metrics: {
    '7d': ProgressMetrics
    '30d': ProgressMetrics
    '90d': ProgressMetrics
  }
}

type Timeframe = '7d' | '30d' | '90d'

export function ProgressChart({ metrics }: ProgressChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>('30d')

  const currentMetrics = metrics[timeframe]

  // Transform metrics into chart data
  const chartData = [
    {
      name: 'Average Score',
      value: currentMetrics.averageScore,
      color: '#3b82f6',
    },
    {
      name: 'Score Improvement',
      value: currentMetrics.scoreImprovement,
      color: '#10b981',
    },
    {
      name: 'Sessions/Week',
      value: currentMetrics.sessionsPerWeek,
      color: '#f59e0b',
    },
    {
      name: 'Consistency',
      value: currentMetrics.consistencyRating,
      color: '#8b5cf6',
    },
  ]

  return (
    <div className="space-y-4">
      {/* Timeframe Selector */}
      <div className="flex space-x-2">
        {(['7d', '30d', '90d'] as Timeframe[]).map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              timeframe === tf
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            aria-label={`Show ${tf} timeframe`}
          >
            {tf === '7d' ? 'Last 7 Days' : tf === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
          </button>
        ))}
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {chartData.map((metric) => (
          <div
            key={metric.name}
            className="bg-gray-50 rounded-lg p-4 border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{metric.name}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {metric.value.toFixed(1)}
                  {metric.name.includes('Score') || metric.name.includes('Consistency') ? '%' : ''}
                </p>
              </div>
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: metric.color }}
                aria-hidden="true"
              ></div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="mt-6" style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              stroke="#6b7280"
              tick={{ fill: '#6b7280' }}
              tickLine={{ stroke: '#6b7280' }}
            />
            <YAxis
              stroke="#6b7280"
              tick={{ fill: '#6b7280' }}
              tickLine={{ stroke: '#6b7280' }}
              label={{ value: 'Value', angle: -90, position: 'insideLeft', fill: '#6b7280' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '0.375rem',
              }}
              labelStyle={{ color: '#111827', fontWeight: 600 }}
            />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="circle"
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 4 }}
              activeDot={{ r: 6 }}
              name="Metric Value"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-800">
          <div>
            <span className="font-medium">Average Score:</span> {currentMetrics.averageScore.toFixed(1)}%
          </div>
          <div>
            <span className="font-medium">Improvement:</span>{' '}
            <span className={currentMetrics.scoreImprovement >= 0 ? 'text-green-600' : 'text-red-600'}>
              {currentMetrics.scoreImprovement >= 0 ? '+' : ''}
              {currentMetrics.scoreImprovement.toFixed(1)}%
            </span>
          </div>
          <div>
            <span className="font-medium">Sessions per Week:</span> {currentMetrics.sessionsPerWeek.toFixed(1)}
          </div>
          <div>
            <span className="font-medium">Consistency:</span> {currentMetrics.consistencyRating.toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  )
}
