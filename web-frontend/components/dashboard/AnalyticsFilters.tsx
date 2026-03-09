'use client'

import { useState, useEffect } from 'react'

interface DateRange {
  startDate: string
  endDate: string
}

export function AnalyticsFilters() {
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: '',
    endDate: '',
  })
  const [isApplying, setIsApplying] = useState(false)

  // Set default date range (last 30 days)
  useEffect(() => {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)

    setDateRange({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    })
  }, [])

  const handleApplyFilters = async () => {
    setIsApplying(true)

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    // In a real implementation, this would trigger a data refresh
    // with the new date range parameters
    console.log('Applying filters:', dateRange)

    setIsApplying(false)
  }

  const handleReset = () => {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)

    setDateRange({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    })
  }

  const handleQuickSelect = (days: number) => {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    setDateRange({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    })
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Filter Analytics</h2>

      <div className="space-y-4">
        {/* Quick Select Buttons */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quick Select
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleQuickSelect(7)}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              aria-label="Last 7 days"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => handleQuickSelect(30)}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              aria-label="Last 30 days"
            >
              Last 30 Days
            </button>
            <button
              onClick={() => handleQuickSelect(90)}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              aria-label="Last 90 days"
            >
              Last 90 Days
            </button>
          </div>
        </div>

        {/* Date Range Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="start-date"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Start Date
            </label>
            <input
              type="date"
              id="start-date"
              value={dateRange.startDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, startDate: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              aria-label="Start date"
            />
          </div>

          <div>
            <label
              htmlFor="end-date"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              End Date
            </label>
            <input
              type="date"
              id="end-date"
              value={dateRange.endDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, endDate: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              aria-label="End date"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-2">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            aria-label="Reset filters"
          >
            Reset
          </button>
          <button
            onClick={handleApplyFilters}
            disabled={isApplying}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            aria-label="Apply filters"
          >
            {isApplying ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Applying...
              </>
            ) : (
              'Apply Filters'
            )}
          </button>
        </div>

        {/* Info Message */}
        <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
          <p className="text-sm text-blue-800">
            <span className="font-medium">Note:</span> Visualizations will update within 1
            second of applying new filters.
          </p>
        </div>
      </div>
    </div>
  )
}
