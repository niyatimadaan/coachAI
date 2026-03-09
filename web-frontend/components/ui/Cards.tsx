import React from 'react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: {
    value: number
    isPositive: boolean
  }
  icon?: React.ReactNode
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'gray'
}

export function StatCard({ title, value, subtitle, trend, icon, color = 'primary' }: StatCardProps) {
  const colorClasses = {
    primary: 'bg-blue-50 text-blue-700 border-blue-200',
    success: 'bg-green-50 text-green-700 border-green-200',
    warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
    gray: 'bg-gray-50 text-gray-700 border-gray-200',
  }

  const iconBgColor = {
    primary: 'bg-blue-100',
    success: 'bg-green-100',
    warning: 'bg-yellow-100',
    danger: 'bg-red-100',
    gray: 'bg-gray-100',
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {trend && (
              <span
                className={`text-sm font-medium ${
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
            )}
          </div>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {icon && (
          <div className={`p-3 rounded-full ${iconBgColor[color]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

interface AlertCardProps {
  title: string
  message: string
  severity: 'high' | 'medium' | 'low'
  actionLabel?: string
  onAction?: () => void
}

export function AlertCard({ title, message, severity, actionLabel, onAction }: AlertCardProps) {
  const severityStyles = {
    high: 'bg-red-50 border-red-200 text-red-800',
    medium: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    low: 'bg-blue-50 border-blue-200 text-blue-800',
  }

  const severityIcons = {
    high: '⚠️',
    medium: '⚡',
    low: 'ℹ️',
  }

  return (
    <div className={`rounded-lg border p-4 ${severityStyles[severity]}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <span className="text-2xl">{severityIcons[severity]}</span>
          <div className="flex-1">
            <h4 className="font-semibold mb-1">{title}</h4>
            <p className="text-sm opacity-90">{message}</p>
          </div>
        </div>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="ml-4 px-3 py-1 text-sm font-medium rounded-md bg-white/50 hover:bg-white transition-colors"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  )
}

interface BadgeProps {
  children: React.ReactNode
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'gray'
  size?: 'sm' | 'md' | 'lg'
}

export function Badge({ children, variant = 'gray', size = 'md' }: BadgeProps) {
  const variantClasses = {
    primary: 'bg-blue-100 text-blue-800 border-blue-200',
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    danger: 'bg-red-100 text-red-800 border-red-200',
    gray: 'bg-gray-100 text-gray-800 border-gray-200',
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  }

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${variantClasses[variant]} ${sizeClasses[size]}`}
    >
      {children}
    </span>
  )
}

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && <div className="mb-4 text-6xl opacity-50">{icon}</div>}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      {description && <p className="text-gray-600 max-w-md mb-6">{description}</p>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  message?: string
}

export function LoadingSpinner({ size = 'md', message }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  }

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className={`animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 ${sizeClasses[size]}`}></div>
      {message && <p className="mt-4 text-gray-600">{message}</p>}
    </div>
  )
}
