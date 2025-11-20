'use client'

import { useEffect, useState } from 'react'

interface CampaignCostData {
  summary: {
    campaignId: string
    campaignName: string
    totalSessions: number
    totalMessages: number
    totalTokens: number
    totalCost: number
    averageCostPerSession: number
    sessions: Array<{
      sessionId: string
      sessionName: string
      totalCost: number
      totalTokens: number
      messageCount: number
      startedAt: Date
    }>
  }
  trends: Array<{
    date: Date
    cost: number
    tokenCount: number
    messageCount: number
  }>
}

interface CampaignAnalyticsProps {
  campaignId: string
  trendDays?: number
}

export default function CampaignAnalytics({
  campaignId,
  trendDays = 30,
}: CampaignAnalyticsProps) {
  const [costData, setCostData] = useState<CampaignCostData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCostData = async () => {
      try {
        const response = await fetch(
          `/api/campaigns/${campaignId}/costs?trendDays=${trendDays}`
        )
        if (!response.ok) {
          throw new Error('Failed to fetch campaign cost data')
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

    fetchCostData()
  }, [campaignId, trendDays])

  if (loading) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Loading campaign analytics...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg border border-red-200 dark:border-red-800">
        <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">
          Cost Tracking Setup Required
        </h3>
        <p className="text-sm text-red-600 dark:text-red-400 mb-4">
          Error: {error}
        </p>
        <div className="bg-white dark:bg-gray-800 p-4 rounded border border-red-300 dark:border-red-700">
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
            The cost tracking database tables need to be created. Follow these steps:
          </p>
          <ol className="list-decimal list-inside text-sm text-gray-700 dark:text-gray-300 space-y-2">
            <li>Start the database: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">docker-compose up -d</code></li>
            <li>Apply migration: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">npx prisma migrate dev</code></li>
            <li>Restart the dev server: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">npm run dev</code></li>
          </ol>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-4">
            See <strong>COST_TRACKING_SETUP.md</strong> for detailed instructions.
          </p>
        </div>
      </div>
    )
  }

  if (!costData) {
    return null
  }

  const { summary, trends } = costData

  return (
    <div className="space-y-6">
      {/* Campaign Overview */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          Campaign Cost Analytics
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Cost</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ${summary.totalCost.toFixed(3)}
            </p>
          </div>
          
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Sessions</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {summary.totalSessions}
            </p>
          </div>
          
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Messages</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {summary.totalMessages}
            </p>
          </div>
          
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Tokens</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {(summary.totalTokens / 1000).toFixed(1)}K
            </p>
          </div>
          
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Avg/Session</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ${summary.averageCostPerSession.toFixed(3)}
            </p>
          </div>
        </div>
      </div>

      {/* Cost Trends */}
      {trends.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Cost Trends (Last {trendDays} Days)
          </h3>
          
          <div className="space-y-2">
            {trends.slice(-7).map((trend, index) => {
              const date = new Date(trend.date).toLocaleDateString()
              const maxCost = Math.max(...trends.map((t) => t.cost))
              const barWidth = maxCost > 0 ? (trend.cost / maxCost) * 100 : 0

              return (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-24 text-xs text-gray-600 dark:text-gray-400">
                    {date}
                  </div>
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-6 relative">
                      <div
                        className="bg-blue-500 h-6 rounded-full transition-all duration-300"
                        style={{ width: `${barWidth}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-end pr-2 text-xs font-medium text-gray-900 dark:text-white">
                        ${trend.cost.toFixed(4)}
                      </span>
                    </div>
                  </div>
                  <div className="w-20 text-xs text-gray-600 dark:text-gray-400 text-right">
                    {trend.messageCount} msgs
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Session Breakdown */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Session Breakdown
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 px-2 text-gray-700 dark:text-gray-300">Session</th>
                <th className="text-right py-2 px-2 text-gray-700 dark:text-gray-300">Messages</th>
                <th className="text-right py-2 px-2 text-gray-700 dark:text-gray-300">Tokens</th>
                <th className="text-right py-2 px-2 text-gray-700 dark:text-gray-300">Cost</th>
                <th className="text-right py-2 px-2 text-gray-700 dark:text-gray-300">Date</th>
              </tr>
            </thead>
            <tbody>
              {summary.sessions.map((session) => (
                <tr
                  key={session.sessionId}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td className="py-2 px-2 text-gray-900 dark:text-white">
                    {session.sessionName}
                  </td>
                  <td className="py-2 px-2 text-right text-gray-700 dark:text-gray-300">
                    {session.messageCount}
                  </td>
                  <td className="py-2 px-2 text-right text-gray-700 dark:text-gray-300">
                    {session.totalTokens.toLocaleString()}
                  </td>
                  <td className="py-2 px-2 text-right font-medium text-gray-900 dark:text-white">
                    ${session.totalCost.toFixed(4)}
                  </td>
                  <td className="py-2 px-2 text-right text-gray-600 dark:text-gray-400 text-xs">
                    {new Date(session.startedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold border-t-2 border-gray-300 dark:border-gray-600">
                <td className="py-2 px-2 text-gray-900 dark:text-white">Total</td>
                <td className="py-2 px-2 text-right text-gray-900 dark:text-white">
                  {summary.totalMessages}
                </td>
                <td className="py-2 px-2 text-right text-gray-900 dark:text-white">
                  {summary.totalTokens.toLocaleString()}
                </td>
                <td className="py-2 px-2 text-right text-gray-900 dark:text-white">
                  ${summary.totalCost.toFixed(4)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Export Options */}
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Cost estimates based on OpenAI GPT-4o-mini pricing. Actual costs may vary.
        </p>
      </div>
    </div>
  )
}


