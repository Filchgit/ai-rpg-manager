import { prisma } from '@/lib/db'
import { Decimal } from '@prisma/client/runtime/library'

// OpenAI pricing for gpt-4o-mini (as of the current date)
// These should be configurable via environment variables
const PRICE_PER_1K_PROMPT_TOKENS = parseFloat(
  process.env.OPENAI_PRICE_PER_1K_PROMPT_TOKENS || '0.00015'
)
const PRICE_PER_1K_COMPLETION_TOKENS = parseFloat(
  process.env.OPENAI_PRICE_PER_1K_COMPLETION_TOKENS || '0.0006'
)
const COST_WARNING_THRESHOLD_USD = parseFloat(
  process.env.COST_WARNING_THRESHOLD_USD || '1.00'
)
const COST_LIMIT_THRESHOLD_USD = parseFloat(
  process.env.COST_LIMIT_THRESHOLD_USD || '5.00'
)

export interface MessageCost {
  messageId: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  promptCost: number
  completionCost: number
  totalCost: number
  createdAt: Date
}

export interface SessionCostSummary {
  sessionId: string
  sessionName: string
  totalMessages: number
  totalTokens: number
  totalCost: number
  averageCostPerMessage: number
  startedAt: Date
  endedAt?: Date
  durationMinutes?: number
  costPerHour?: number
  warningLevel: 'normal' | 'warning' | 'critical'
  messages: MessageCost[]
}

export interface CampaignCostSummary {
  campaignId: string
  campaignName: string
  totalSessions: number
  totalMessages: number
  totalTokens: number
  totalCost: number
  averageCostPerSession: number
  sessions: {
    sessionId: string
    sessionName: string
    totalCost: number
    totalTokens: number
    messageCount: number
    startedAt: Date
  }[]
}

export interface CostTrend {
  date: Date
  cost: number
  tokenCount: number
  messageCount: number
}

export class CostTrackingService {
  /**
   * Calculate cost from token counts
   */
  calculateCost(promptTokens: number, completionTokens: number): number {
    const promptCost = (promptTokens / 1000) * PRICE_PER_1K_PROMPT_TOKENS
    const completionCost =
      (completionTokens / 1000) * PRICE_PER_1K_COMPLETION_TOKENS
    return promptCost + completionCost
  }

  /**
   * Get detailed cost breakdown for a single message
   */
  getMessageCost(message: {
    id: string
    tokenCount: number | null
    metadata: any
    createdAt: Date
  }): MessageCost {
    const promptTokens = message.metadata?.promptTokens || 0
    const completionTokens = message.metadata?.completionTokens || 0
    const totalTokens = message.tokenCount || promptTokens + completionTokens

    const promptCost = (promptTokens / 1000) * PRICE_PER_1K_PROMPT_TOKENS
    const completionCost =
      (completionTokens / 1000) * PRICE_PER_1K_COMPLETION_TOKENS

    return {
      messageId: message.id,
      promptTokens,
      completionTokens,
      totalTokens,
      promptCost,
      completionCost,
      totalCost: promptCost + completionCost,
      createdAt: message.createdAt,
    }
  }

  /**
   * Get comprehensive cost summary for a session
   */
  async getSessionCostSummary(sessionId: string): Promise<SessionCostSummary> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          where: {
            role: 'ASSISTANT', // Only count AI responses for cost
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!session) {
      throw new Error('Session not found')
    }

    const messageCosts = session.messages.map((msg) => this.getMessageCost(msg))
    const totalTokens = messageCosts.reduce(
      (sum, mc) => sum + mc.totalTokens,
      0
    )
    const totalCost = messageCosts.reduce((sum, mc) => sum + mc.totalCost, 0)
    const averageCostPerMessage =
      messageCosts.length > 0 ? totalCost / messageCosts.length : 0

    // Calculate duration and cost per hour
    let durationMinutes: number | undefined
    let costPerHour: number | undefined
    if (session.endedAt) {
      durationMinutes =
        (session.endedAt.getTime() - session.startedAt.getTime()) / 1000 / 60
      if (durationMinutes > 0) {
        costPerHour = (totalCost / durationMinutes) * 60
      }
    }

    // Determine warning level
    let warningLevel: 'normal' | 'warning' | 'critical' = 'normal'
    if (totalCost >= COST_LIMIT_THRESHOLD_USD) {
      warningLevel = 'critical'
    } else if (totalCost >= COST_WARNING_THRESHOLD_USD) {
      warningLevel = 'warning'
    }

    return {
      sessionId: session.id,
      sessionName: session.name,
      totalMessages: messageCosts.length,
      totalTokens,
      totalCost,
      averageCostPerMessage,
      startedAt: session.startedAt,
      endedAt: session.endedAt || undefined,
      durationMinutes,
      costPerHour,
      warningLevel,
      messages: messageCosts,
    }
  }

  /**
   * Get cost summary for all sessions in a campaign
   */
  async getCampaignCostSummary(
    campaignId: string
  ): Promise<CampaignCostSummary> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        sessions: {
          include: {
            messages: {
              where: {
                role: 'ASSISTANT',
              },
            },
          },
          orderBy: { startedAt: 'desc' },
        },
      },
    })

    if (!campaign) {
      throw new Error('Campaign not found')
    }

    const sessionSummaries = campaign.sessions.map((session) => {
      const messageCosts = session.messages.map((msg) =>
        this.getMessageCost(msg)
      )
      const totalTokens = messageCosts.reduce(
        (sum, mc) => sum + mc.totalTokens,
        0
      )
      const totalCost = messageCosts.reduce((sum, mc) => sum + mc.totalCost, 0)

      return {
        sessionId: session.id,
        sessionName: session.name,
        totalCost,
        totalTokens,
        messageCount: messageCosts.length,
        startedAt: session.startedAt,
      }
    })

    const totalTokens = sessionSummaries.reduce(
      (sum, s) => sum + s.totalTokens,
      0
    )
    const totalCost = sessionSummaries.reduce((sum, s) => sum + s.totalCost, 0)
    const totalMessages = sessionSummaries.reduce(
      (sum, s) => sum + s.messageCount,
      0
    )
    const averageCostPerSession =
      sessionSummaries.length > 0 ? totalCost / sessionSummaries.length : 0

    return {
      campaignId: campaign.id,
      campaignName: campaign.name,
      totalSessions: sessionSummaries.length,
      totalMessages,
      totalTokens,
      totalCost,
      averageCostPerSession,
      sessions: sessionSummaries,
    }
  }

  /**
   * Get cost trends over time for a campaign
   */
  async getCampaignCostTrends(
    campaignId: string,
    days: number = 30
  ): Promise<CostTrend[]> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const sessions = await prisma.session.findMany({
      where: {
        campaignId,
        startedAt: {
          gte: startDate,
        },
      },
      include: {
        messages: {
          where: {
            role: 'ASSISTANT',
          },
        },
      },
    })

    // Group by date
    const trendMap = new Map<string, CostTrend>()

    sessions.forEach((session) => {
      session.messages.forEach((message) => {
        const dateKey = message.createdAt.toISOString().split('T')[0]
        const cost = this.getMessageCost(message)

        if (!trendMap.has(dateKey)) {
          trendMap.set(dateKey, {
            date: new Date(dateKey),
            cost: 0,
            tokenCount: 0,
            messageCount: 0,
          })
        }

        const trend = trendMap.get(dateKey)!
        trend.cost += cost.totalCost
        trend.tokenCount += cost.totalTokens
        trend.messageCount += 1
      })
    })

    return Array.from(trendMap.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    )
  }

  /**
   * Check if session is approaching cost limits
   */
  async checkSessionBudget(sessionId: string): Promise<{
    withinBudget: boolean
    warningLevel: 'normal' | 'warning' | 'critical'
    currentCost: number
    remainingBudget: number
    message: string
  }> {
    const summary = await this.getSessionCostSummary(sessionId)

    let message = 'Session cost is within normal limits'
    if (summary.warningLevel === 'critical') {
      message = `Session has exceeded cost limit ($${summary.totalCost.toFixed(4)} / $${COST_LIMIT_THRESHOLD_USD})`
    } else if (summary.warningLevel === 'warning') {
      message = `Session is approaching cost limit ($${summary.totalCost.toFixed(4)} / $${COST_LIMIT_THRESHOLD_USD})`
    }

    return {
      withinBudget: summary.totalCost < COST_LIMIT_THRESHOLD_USD,
      warningLevel: summary.warningLevel,
      currentCost: summary.totalCost,
      remainingBudget: Math.max(
        0,
        COST_LIMIT_THRESHOLD_USD - summary.totalCost
      ),
      message,
    }
  }

  /**
   * Get aggregate statistics
   */
  async getGlobalStatistics(): Promise<{
    totalCampaigns: number
    totalSessions: number
    totalMessages: number
    totalCost: number
    averageCostPerSession: number
  }> {
    const [campaigns, sessions, messages] = await Promise.all([
      prisma.campaign.count(),
      prisma.session.count(),
      prisma.message.count({
        where: { role: 'ASSISTANT' },
      }),
    ])

    const allMessages = await prisma.message.findMany({
      where: { role: 'ASSISTANT' },
      select: {
        tokenCount: true,
        metadata: true,
      },
    })

    const totalCost = allMessages.reduce((sum, msg) => {
      const cost = this.getMessageCost({
        id: '',
        tokenCount: msg.tokenCount,
        metadata: msg.metadata,
        createdAt: new Date(),
      })
      return sum + cost.totalCost
    }, 0)

    return {
      totalCampaigns: campaigns,
      totalSessions: sessions,
      totalMessages: messages,
      totalCost,
      averageCostPerSession: sessions > 0 ? totalCost / sessions : 0,
    }
  }

  /**
   * Update persistent cost snapshot for a session
   * Call this after each AI message to keep costs saved
   */
  async updateSessionCostSnapshot(sessionId: string): Promise<void> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          where: { role: 'ASSISTANT' },
        },
      },
    })

    if (!session) {
      throw new Error('Session not found')
    }

    // Calculate current costs
    const messageCosts = session.messages.map((msg) => this.getMessageCost(msg))
    const totalTokens = messageCosts.reduce((sum, mc) => sum + mc.totalTokens, 0)
    const promptTokens = messageCosts.reduce((sum, mc) => sum + mc.promptTokens, 0)
    const completionTokens = messageCosts.reduce((sum, mc) => sum + mc.completionTokens, 0)
    const totalCost = messageCosts.reduce((sum, mc) => sum + mc.totalCost, 0)

    // Upsert snapshot (create or update)
    await prisma.sessionCostSnapshot.upsert({
      where: {
        sessionId: sessionId,
      },
      create: {
        sessionId: sessionId,
        campaignId: session.campaignId,
        sessionName: session.name,
        totalMessages: messageCosts.length,
        totalTokens,
        promptTokens,
        completionTokens,
        totalCost: new Decimal(totalCost),
        sessionStartedAt: session.startedAt,
        sessionEndedAt: session.endedAt,
        lastUpdated: new Date(),
      },
      update: {
        totalMessages: messageCosts.length,
        totalTokens,
        promptTokens,
        completionTokens,
        totalCost: new Decimal(totalCost),
        sessionEndedAt: session.endedAt,
        lastUpdated: new Date(),
      },
    })

    // Update campaign aggregate
    await this.updateCampaignCostAggregate(session.campaignId)
  }

  /**
   * Update campaign cost aggregate from all snapshots
   */
  async updateCampaignCostAggregate(campaignId: string): Promise<void> {
    const snapshots = await prisma.sessionCostSnapshot.findMany({
      where: { campaignId },
    })

    const totalSessions = snapshots.length
    const totalMessages = snapshots.reduce((sum, s) => sum + s.totalMessages, 0)
    const totalTokens = snapshots.reduce((sum, s) => sum + s.totalTokens, 0)
    const totalCost = snapshots.reduce(
      (sum, s) => sum + parseFloat(s.totalCost.toString()),
      0
    )

    await prisma.campaignCostAggregate.upsert({
      where: { campaignId },
      create: {
        campaignId,
        totalSessions,
        totalMessages,
        totalTokens,
        totalCost: new Decimal(totalCost),
        lastUpdated: new Date(),
      },
      update: {
        totalSessions,
        totalMessages,
        totalTokens,
        totalCost: new Decimal(totalCost),
        lastUpdated: new Date(),
      },
    })
  }

  /**
   * Get campaign cost summary including deleted sessions
   */
  async getCampaignCostSummaryWithHistory(
    campaignId: string
  ): Promise<CampaignCostSummary> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        costSnapshots: {
          orderBy: { sessionStartedAt: 'desc' },
        },
      },
    })

    if (!campaign) {
      throw new Error('Campaign not found')
    }

    const sessionSummaries = campaign.costSnapshots.map((snapshot) => ({
      sessionId: snapshot.sessionId || snapshot.id,
      sessionName: snapshot.sessionName,
      totalCost: parseFloat(snapshot.totalCost.toString()),
      totalTokens: snapshot.totalTokens,
      messageCount: snapshot.totalMessages,
      startedAt: snapshot.sessionStartedAt,
    }))

    const totalTokens = sessionSummaries.reduce((sum, s) => sum + s.totalTokens, 0)
    const totalCost = sessionSummaries.reduce((sum, s) => sum + s.totalCost, 0)
    const totalMessages = sessionSummaries.reduce((sum, s) => sum + s.messageCount, 0)
    const averageCostPerSession =
      sessionSummaries.length > 0 ? totalCost / sessionSummaries.length : 0

    return {
      campaignId: campaign.id,
      campaignName: campaign.name,
      totalSessions: sessionSummaries.length,
      totalMessages,
      totalTokens,
      totalCost,
      averageCostPerSession,
      sessions: sessionSummaries,
    }
  }
}

export const costTrackingService = new CostTrackingService()


