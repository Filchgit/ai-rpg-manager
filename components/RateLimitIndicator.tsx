'use client'

import { useEffect, useState } from 'react'

type RateLimitStatus = {
  allowed: boolean
  requestCount: number
  tokenCount: number
  remainingRequests: number
  remainingTokens: number
  resetAt: string
}

type RateLimitIndicatorProps = {
  sessionId: string
  refreshInterval?: number
}

export default function RateLimitIndicator({
  sessionId,
  refreshInterval = 30000,
}: RateLimitIndicatorProps) {
  const [status, setStatus] = useState<RateLimitStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRateLimitStatus = async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/rate-limit`)
      if (!response.ok) {
        throw new Error('Failed to fetch rate limit status')
      }
      const data = await response.json()
      setStatus(data)
      setError(null)
    } catch (err) {
      setError('Failed to load rate limit status')
      console.error('Rate limit fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRateLimitStatus()
    const interval = setInterval(fetchRateLimitStatus, refreshInterval)
    return () => clearInterval(interval)
  }, [sessionId, refreshInterval])

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <p className="text-gray-400 text-sm">Loading rate limit status...</p>
      </div>
    )
  }

  if (error || !status) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <p className="text-red-400 text-sm">{error || 'Rate limit data unavailable'}</p>
      </div>
    )
  }

  const requestPercentage = (status.requestCount / (status.requestCount + status.remainingRequests)) * 100
  const tokenPercentage = (status.tokenCount / (status.tokenCount + status.remainingTokens)) * 100

  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getTextColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-400'
    if (percentage >= 70) return 'text-yellow-400'
    return 'text-green-400'
  }

  const resetTime = new Date(status.resetAt).toLocaleTimeString()

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-3">Rate Limit Status</h3>
      
      {!status.allowed && (
        <div className="mb-3 p-3 bg-red-900/30 border border-red-500 rounded-lg">
          <p className="text-red-400 text-sm font-semibold">⚠️ Rate Limit Exceeded</p>
          <p className="text-red-300 text-xs mt-1">Resets at {resetTime}</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-300">Requests</span>
            <span className={`text-sm font-semibold ${getTextColor(requestPercentage)}`}>
              {status.requestCount} / {status.requestCount + status.remainingRequests}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getStatusColor(requestPercentage)}`}
              style={{ width: `${requestPercentage}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {status.remainingRequests} request{status.remainingRequests !== 1 ? 's' : ''} remaining
          </p>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-300">Tokens</span>
            <span className={`text-sm font-semibold ${getTextColor(tokenPercentage)}`}>
              {status.tokenCount.toLocaleString()} / {(status.tokenCount + status.remainingTokens).toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getStatusColor(tokenPercentage)}`}
              style={{ width: `${tokenPercentage}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {status.remainingTokens.toLocaleString()} token{status.remainingTokens !== 1 ? 's' : ''} remaining
          </p>
        </div>

        <div className="pt-3 border-t border-gray-700">
          <p className="text-xs text-gray-400">
            Resets at: <span className="text-gray-300 font-medium">{resetTime}</span>
          </p>
        </div>
      </div>
    </div>
  )
}
