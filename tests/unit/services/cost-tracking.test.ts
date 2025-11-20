import { CostTrackingService } from '@/services/cost-tracking'
import { prisma } from '@/lib/db'

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    session: {
      findUnique: jest.fn(),
    },
    campaign: {
      findUnique: jest.fn(),
    },
    message: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}))

describe('CostTrackingService', () => {
  let costTrackingService: CostTrackingService

  beforeEach(() => {
    costTrackingService = new CostTrackingService()
    jest.clearAllMocks()
  })

  describe('calculateCost', () => {
    it('Given prompt and completion tokens, When calculating cost, Then returns correct total cost', () => {
      // Given
      const promptTokens = 1000
      const completionTokens = 500

      // When
      const cost = costTrackingService.calculateCost(promptTokens, completionTokens)

      // Then
      // 1000/1000 * 0.00015 + 500/1000 * 0.0006 = 0.00015 + 0.0003 = 0.00045
      expect(cost).toBeCloseTo(0.00045, 6)
    })

    it('Given zero tokens, When calculating cost, Then returns zero', () => {
      // Given
      const promptTokens = 0
      const completionTokens = 0

      // When
      const cost = costTrackingService.calculateCost(promptTokens, completionTokens)

      // Then
      expect(cost).toBe(0)
    })
  })

  describe('getMessageCost', () => {
    it('Given a message with metadata, When getting message cost, Then returns detailed cost breakdown', () => {
      // Given
      const message = {
        id: 'msg-1',
        tokenCount: 1500,
        metadata: {
          promptTokens: 1000,
          completionTokens: 500,
        },
        createdAt: new Date('2025-01-01'),
      }

      // When
      const messageCost = costTrackingService.getMessageCost(message)

      // Then
      expect(messageCost.messageId).toBe('msg-1')
      expect(messageCost.promptTokens).toBe(1000)
      expect(messageCost.completionTokens).toBe(500)
      expect(messageCost.totalTokens).toBe(1500)
      expect(messageCost.totalCost).toBeCloseTo(0.00045, 6)
    })

    it('Given a message without metadata, When getting message cost, Then uses tokenCount as fallback', () => {
      // Given
      const message = {
        id: 'msg-2',
        tokenCount: 1000,
        metadata: null,
        createdAt: new Date('2025-01-01'),
      }

      // When
      const messageCost = costTrackingService.getMessageCost(message)

      // Then
      expect(messageCost.totalTokens).toBe(1000)
      expect(messageCost.promptTokens).toBe(0)
      expect(messageCost.completionTokens).toBe(0)
    })
  })

  describe('getSessionCostSummary', () => {
    it('Given a session with messages, When getting cost summary, Then returns complete summary', async () => {
      // Given
      const mockSession = {
        id: 'session-1',
        name: 'Test Session',
        startedAt: new Date('2025-01-01T10:00:00'),
        endedAt: new Date('2025-01-01T11:00:00'),
        messages: [
          {
            id: 'msg-1',
            tokenCount: 1000,
            metadata: { promptTokens: 600, completionTokens: 400 },
            createdAt: new Date('2025-01-01T10:10:00'),
          },
          {
            id: 'msg-2',
            tokenCount: 1500,
            metadata: { promptTokens: 900, completionTokens: 600 },
            createdAt: new Date('2025-01-01T10:20:00'),
          },
        ],
      }

      ;(prisma.session.findUnique as jest.Mock).mockResolvedValue(mockSession)

      // When
      const summary = await costTrackingService.getSessionCostSummary('session-1')

      // Then
      expect(summary.sessionId).toBe('session-1')
      expect(summary.sessionName).toBe('Test Session')
      expect(summary.totalMessages).toBe(2)
      expect(summary.totalTokens).toBe(2500)
      expect(summary.durationMinutes).toBe(60)
      expect(summary.totalCost).toBeGreaterThan(0)
      expect(summary.messages).toHaveLength(2)
    })

    it('Given a session exceeding cost limit, When getting summary, Then warning level is critical', async () => {
      // Given
      const mockSession = {
        id: 'session-2',
        name: 'Expensive Session',
        startedAt: new Date('2025-01-01T10:00:00'),
        endedAt: null,
        messages: [
          {
            id: 'msg-1',
            tokenCount: 1000000, // Very high token count
            metadata: { promptTokens: 500000, completionTokens: 500000 },
            createdAt: new Date('2025-01-01T10:10:00'),
          },
        ],
      }

      ;(prisma.session.findUnique as jest.Mock).mockResolvedValue(mockSession)

      // When
      const summary = await costTrackingService.getSessionCostSummary('session-2')

      // Then
      expect(summary.warningLevel).toBe('critical')
      expect(summary.totalCost).toBeGreaterThan(5.0) // Above default limit
    })

    it('Given a non-existent session, When getting summary, Then throws error', async () => {
      // Given
      ;(prisma.session.findUnique as jest.Mock).mockResolvedValue(null)

      // When/Then
      await expect(
        costTrackingService.getSessionCostSummary('non-existent')
      ).rejects.toThrow('Session not found')
    })
  })

  describe('getCampaignCostSummary', () => {
    it('Given a campaign with multiple sessions, When getting cost summary, Then returns aggregated data', async () => {
      // Given
      const mockCampaign = {
        id: 'campaign-1',
        name: 'Test Campaign',
        sessions: [
          {
            id: 'session-1',
            name: 'Session 1',
            startedAt: new Date('2025-01-01'),
            messages: [
              {
                id: 'msg-1',
                tokenCount: 1000,
                metadata: { promptTokens: 600, completionTokens: 400 },
                createdAt: new Date(),
              },
            ],
          },
          {
            id: 'session-2',
            name: 'Session 2',
            startedAt: new Date('2025-01-02'),
            messages: [
              {
                id: 'msg-2',
                tokenCount: 1500,
                metadata: { promptTokens: 900, completionTokens: 600 },
                createdAt: new Date(),
              },
            ],
          },
        ],
      }

      ;(prisma.campaign.findUnique as jest.Mock).mockResolvedValue(mockCampaign)

      // When
      const summary = await costTrackingService.getCampaignCostSummary('campaign-1')

      // Then
      expect(summary.campaignId).toBe('campaign-1')
      expect(summary.campaignName).toBe('Test Campaign')
      expect(summary.totalSessions).toBe(2)
      expect(summary.totalMessages).toBe(2)
      expect(summary.totalTokens).toBe(2500)
      expect(summary.sessions).toHaveLength(2)
      expect(summary.averageCostPerSession).toBeGreaterThan(0)
    })

    it('Given a campaign with no sessions, When getting summary, Then returns zero values', async () => {
      // Given
      const mockCampaign = {
        id: 'campaign-2',
        name: 'Empty Campaign',
        sessions: [],
      }

      ;(prisma.campaign.findUnique as jest.Mock).mockResolvedValue(mockCampaign)

      // When
      const summary = await costTrackingService.getCampaignCostSummary('campaign-2')

      // Then
      expect(summary.totalSessions).toBe(0)
      expect(summary.totalMessages).toBe(0)
      expect(summary.totalTokens).toBe(0)
      expect(summary.totalCost).toBe(0)
      expect(summary.averageCostPerSession).toBe(0)
    })
  })

  describe('checkSessionBudget', () => {
    it('Given a session within budget, When checking budget, Then returns within budget status', async () => {
      // Given
      const mockSession = {
        id: 'session-1',
        name: 'Cheap Session',
        startedAt: new Date(),
        endedAt: null,
        messages: [
          {
            id: 'msg-1',
            tokenCount: 100,
            metadata: { promptTokens: 60, completionTokens: 40 },
            createdAt: new Date(),
          },
        ],
      }

      ;(prisma.session.findUnique as jest.Mock).mockResolvedValue(mockSession)

      // When
      const budgetStatus = await costTrackingService.checkSessionBudget('session-1')

      // Then
      expect(budgetStatus.withinBudget).toBe(true)
      expect(budgetStatus.warningLevel).toBe('normal')
      expect(budgetStatus.remainingBudget).toBeGreaterThan(0)
    })

    it('Given a session exceeding budget, When checking budget, Then returns critical warning', async () => {
      // Given
      const mockSession = {
        id: 'session-2',
        name: 'Expensive Session',
        startedAt: new Date(),
        endedAt: null,
        messages: [
          {
            id: 'msg-1',
            tokenCount: 1000000,
            metadata: { promptTokens: 500000, completionTokens: 500000 },
            createdAt: new Date(),
          },
        ],
      }

      ;(prisma.session.findUnique as jest.Mock).mockResolvedValue(mockSession)

      // When
      const budgetStatus = await costTrackingService.checkSessionBudget('session-2')

      // Then
      expect(budgetStatus.withinBudget).toBe(false)
      expect(budgetStatus.warningLevel).toBe('critical')
      expect(budgetStatus.message).toContain('exceeded')
    })
  })
})


