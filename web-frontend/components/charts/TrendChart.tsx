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
  Area,
  AreaChart,
} from 'recharts'

export interface TrendDataPoint {
  date: string
  value: number
  label: string
}

interface TrendChartProps {
  data: TrendDataPoint[]
  metric: 'engagement' | 'performance' | 'consistency'
}

// Metric configurations
const METRIC_CONFIG = {
  engagement: {
    name: 'Engagement',
    color: '#3b82f6',
    unit: '%',
  },
  performance: {
    name: 'Performance',
    color: '#10b981',
    unit: '%',
  },
  consistency: {
    name: 'Consistency',
    color: '#8b5cf6',
    unit: '%',
  },
}

export function TrendChart({ data, metric }: TrendChartProps) {
  const [chartType, setChartType] = useState<'line' | 'area'>('line')
  const config = METRIC_CONFIG[metric]

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900">{data.label}</p>
          <p className="text-sm text-gray-700 mt-1">
            <span className="font-medium">{config.name}:</span> {data.value.toFixed(1)}
            {config.unit}
          </p>
          <p className="text-xs text-gray-500 mt-1">{data.date}</p>
        </div>
      )
    }
    return null
  }

  if (data.length === 0) {
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
              d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
            />
          </svg>
          <p className="mt-2">No trend data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Chart Type Toggle */}
      <div className="flex justify-end space-x-2">
        <button
          onClick={() => setChartType('line')}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            chartType === 'line'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          aria-label="Show line chart"
        >
          Line
        </button>
        <button
          onClick={() => setChartType('area')}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            chartType === 'area'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          aria-label="Show area chart"
        >
          Area
        </button>
      </div>

      {/* Chart */}
      <div className="w-full" style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'line' ? (
            <LineChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="label"
                stroke="#6b7280"
                tick={{ fill: '#6b7280', fontSize: 12 }}
                tickLine={{ stroke: '#6b7280' }}
              />
              <YAxis
                stroke="#6b7280"
                tick={{ fill: '#6b7280' }}
                tickLine={{ stroke: '#6b7280' }}
                label={{
                  value: config.name,
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#6b7280',
                }}
                domain={[0, 100]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="circle"
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={config.color}
                strokeWidth={3}
                dot={{ fill: config.color, r: 5 }}
                activeDot={{ r: 7 }}
                name={config.name}
              />
            </LineChart>
          ) : (
            <AreaChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <defs>
                <linearGradient id={`color${metric}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={config.color} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={config.color} stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="label"
                stroke="#6b7280"
                tick={{ fill: '#6b7280', fontSize: 12 }}
                tickLine={{ stroke: '#6b7280' }}
              />
              <YAxis
                stroke="#6b7280"
                tick={{ fill: '#6b7280' }}
                tickLine={{ stroke: '#6b7280' }}
                label={{
                  value: config.name,
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#6b7280',
                }}
                domain={[0, 100]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="circle"
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={config.color}
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#color${metric})`}
                name={config.name}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Trend Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Current</p>
            <p className="text-lg font-semibold text-gray-900">
              {data[data.length - 1]?.value.toFixed(1)}
              {config.unit}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Average</p>
            <p className="text-lg font-semibold text-gray-900">
              {(data.reduce((sum, d) => sum + d.value, 0) / data.length).toFixed(1)}
              {config.unit}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Change</p>
            <p
              className={`text-lg font-semibold ${
                data[data.length - 1]?.value >= data[0]?.value
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              {data[data.length - 1]?.value >= data[0]?.value ? '+' : ''}
              {(data[data.length - 1]?.value - data[0]?.value).toFixed(1)}
              {config.unit}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
