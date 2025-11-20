'use client'

import { useEffect, useState } from 'react'

interface SessionCostData {
  summary: {
    sessionId: string
    sessionName: string
    totalMessages: number
    totalTokens: number
    totalCost: number
    averageCostPerMessage: number
    warningLevel: 'normal' | 'warning' | 'critical'
    durationMinutes?: number
    costPerHour?: number
  }
  budget: {
    withinBudget: boolean
    warningLevel: 'normal' | 'warning' | 'critical'
    currentCost: number
    remainingBudget: number
    message: string
  }
}

interface SessionCostDashboardProps {
  sessionId: string
  refreshInterval?: number
}

export default function SessionCostDashboard({
  sessionId,
  refreshInterval = 30000, // Refresh every 30 seconds
}: SessionCostDashboardProps) {
  const [costData, setCostData] = useState<SessionCostData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCostData = async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/costs`)
      if (!response.ok) {
        throw new Error('Failed to fetch cost data')
      }
      const data = await response.json()
      setCostData(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCostData()
    const interval = setInterval(fetchCostData, refreshInterval)
    return () => clearInterval(interval)
  }, [sessionId, refreshInterval])

  if (loading) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-400">Loading cost data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
        <p className="text-sm text-red-600 dark:text-red-400">Error: {error}</p>
      </div>
    )
  }

  if (!costData) {
    return null
  }

  const { summary, budget } = costData

  const getWarningColor = (level: 'normal' | 'warning' | 'critical') => {
    switch (level) {
      case 'critical':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
      default:
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
    }
  }

  const getBudgetBarColor = (level: 'normal' | 'warning' | 'critical') => {
    switch (level) {
      case 'critical':
        return 'bg-red-500'
      case 'warning':
        return 'bg-yellow-500'
      default:
        return 'bg-green-500'
    }
  }

  const budgetPercentage = Math.min(
    100,
    (budget.currentCost / (budget.currentCost + budget.remainingBudget)) * 100
  )

  return (
    <div className="space-y-4">
      {/* Warning Banner */}
      {budget.warningLevel !== 'normal' && (
        <div className={`p-3 rounded-lg ${getWarningColor(budget.warningLevel)}`}>
          <p className="text-sm font-medium">{budget.message}</p>
        </div>
      )}

      {/* Cost Overview */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold mb-3 text-gray-900 dark:text-white">
          Session Cost Overview
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Cost</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              ${summary.totalCost.toFixed(4)}
            </p>
          </div>
          
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Messages</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {summary.totalMessages}
            </p>
          </div>
          
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Tokens</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {summary.totalTokens.toLocaleString()}
            </p>
          </div>
          
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Avg/Message</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              ${summary.averageCostPerMessage.toFixed(4)}
            </p>
          </div>
        </div>

        {summary.costPerHour !== undefined && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">Cost per Hour</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              ${summary.costPerHour.toFixed(4)}/hr
              <span className="text-xs text-gray-500 ml-2">
                ({summary.durationMinutes?.toFixed(0)} min session)
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Budget Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Budget Status
          </h3>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {budgetPercentage.toFixed(1)}% used
          </span>
        </div>
        
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2">
          <div
            className={`h-3 rounded-full transition-all duration-300 ${getBudgetBarColor(budget.warningLevel)}`}
            style={{ width: `${budgetPercentage}%` }}
          />
        </div>
        
        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
          <span>${budget.currentCost.toFixed(4)} spent</span>
          <span>${budget.remainingBudget.toFixed(4)} remaining</span>
        </div>
      </div>

      {/* Real-time indicator */}
      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
        Updates automatically every {refreshInterval / 1000}s
      </div>
    </div>
  )
}


