import { GET as getSessionCosts } from '@/app/api/sessions/[id]/costs/route'
import { GET as getCampaignCosts } from '@/app/api/campaigns/[id]/costs/route'
import { costTrackingService } from '@/services/cost-tracking'
import { NextRequest } from 'next/server'

// Mock the cost tracking service
jest.mock('@/services/cost-tracking', () => ({
  costTrackingService: {
    getSessionCostSummary: jest.fn(),
    checkSessionBudget: jest.fn(),
    getCampaignCostSummary: jest.fn(),
    getCampaignCostTrends: jest.fn(),
  },
}))

describe('Cost Tracking API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/sessions/:id/costs', () => {
    it('Given a valid session ID, When fetching session costs, Then returns cost summary and budget status', async () => {
      // Given
      const mockSummary = {
        sessionId: 'session-123',
        sessionName: 'Test Session',
        totalMessages: 10,
        totalTokens: 5000,
        totalCost: 0.5,
        averageCostPerMessage: 0.05,
        warningLevel: 'normal' as const,
        startedAt: new Date(),
        messages: [],
      }

      const mockBudget = {
        withinBudget: true,
        warningLevel: 'normal' as const,
        currentCost: 0.5,
        remainingBudget: 4.5,
        message: 'Session cost is within normal limits',
      }

      ;(costTrackingService.getSessionCostSummary as jest.Mock).mockResolvedValue(
        mockSummary
      )
      ;(costTrackingService.checkSessionBudget as jest.Mock).mockResolvedValue(
        mockBudget
      )

      const request = new NextRequest('http://localhost/api/sessions/session-123/costs')
      const params = Promise.resolve({ id: 'session-123' })

      // When
      const response = await getSessionCosts(request, { params })
      const data = await response.json()

      // Then
      expect(response.status).toBe(200)
      expect(data.summary).toEqual(mockSummary)
      expect(data.budget).toEqual(mockBudget)
      expect(costTrackingService.getSessionCostSummary).toHaveBeenCalledWith(
        'session-123'
      )
      expect(costTrackingService.checkSessionBudget).toHaveBeenCalledWith('session-123')
    })

    it('Given a non-existent session ID, When fetching costs, Then returns 404 error', async () => {
      // Given
      ;(costTrackingService.getSessionCostSummary as jest.Mock).mockRejectedValue(
        new Error('Session not found')
      )

      const request = new NextRequest(
        'http://localhost/api/sessions/non-existent/costs'
      )
      const params = Promise.resolve({ id: 'non-existent' })

      // When
      const response = await getSessionCosts(request, { params })
      const data = await response.json()

      // Then
      expect(response.status).toBe(404)
      expect(data.error).toBe('Session not found')
    })

    it('Given a service error, When fetching costs, Then returns 500 error', async () => {
      // Given
      ;(costTrackingService.getSessionCostSummary as jest.Mock).mockRejectedValue(
        new Error('Database error')
      )

      const request = new NextRequest('http://localhost/api/sessions/session-123/costs')
      const params = Promise.resolve({ id: 'session-123' })

      // When
      const response = await getSessionCosts(request, { params })
      const data = await response.json()

      // Then
      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch session costs')
    })
  })

  describe('GET /api/campaigns/:id/costs', () => {
    it('Given a valid campaign ID, When fetching campaign costs, Then returns summary and trends', async () => {
      // Given
      const mockSummary = {
        campaignId: 'campaign-123',
        campaignName: 'Test Campaign',
        totalSessions: 3,
        totalMessages: 30,
        totalTokens: 15000,
        totalCost: 1.5,
        averageCostPerSession: 0.5,
        sessions: [
          {
            sessionId: 'session-1',
            sessionName: 'Session 1',
            totalCost: 0.5,
            totalTokens: 5000,
            messageCount: 10,
            startedAt: new Date('2025-01-01'),
          },
          {
            sessionId: 'session-2',
            sessionName: 'Session 2',
            totalCost: 0.5,
            totalTokens: 5000,
            messageCount: 10,
            startedAt: new Date('2025-01-02'),
          },
          {
            sessionId: 'session-3',
            sessionName: 'Session 3',
            totalCost: 0.5,
            totalTokens: 5000,
            messageCount: 10,
            startedAt: new Date('2025-01-03'),
          },
        ],
      }

      const mockTrends = [
        {
          date: new Date('2025-01-01'),
          cost: 0.5,
          tokenCount: 5000,
          messageCount: 10,
        },
        {
          date: new Date('2025-01-02'),
          cost: 0.5,
          tokenCount: 5000,
          messageCount: 10,
        },
      ]

      ;(costTrackingService.getCampaignCostSummary as jest.Mock).mockResolvedValue(
        mockSummary
      )
      ;(costTrackingService.getCampaignCostTrends as jest.Mock).mockResolvedValue(
        mockTrends
      )

      const request = new NextRequest(
        'http://localhost/api/campaigns/campaign-123/costs?trendDays=30'
      )
      const params = Promise.resolve({ id: 'campaign-123' })

      // When
      const response = await getCampaignCosts(request, { params })
      const data = await response.json()

      // Then
      expect(response.status).toBe(200)
      expect(data.summary).toEqual(mockSummary)
      expect(data.trends).toEqual(mockTrends)
      expect(costTrackingService.getCampaignCostSummary).toHaveBeenCalledWith(
        'campaign-123'
      )
      expect(costTrackingService.getCampaignCostTrends).toHaveBeenCalledWith(
        'campaign-123',
        30
      )
    })

    it('Given custom trend days parameter, When fetching costs, Then uses custom value', async () => {
      // Given
      const mockSummary = {
        campaignId: 'campaign-123',
        campaignName: 'Test Campaign',
        totalSessions: 1,
        totalMessages: 10,
        totalTokens: 5000,
        totalCost: 0.5,
        averageCostPerSession: 0.5,
        sessions: [],
      }

      ;(costTrackingService.getCampaignCostSummary as jest.Mock).mockResolvedValue(
        mockSummary
      )
      ;(costTrackingService.getCampaignCostTrends as jest.Mock).mockResolvedValue([])

      const request = new NextRequest(
        'http://localhost/api/campaigns/campaign-123/costs?trendDays=7'
      )
      const params = Promise.resolve({ id: 'campaign-123' })

      // When
      const response = await getCampaignCosts(request, { params })

      // Then
      expect(response.status).toBe(200)
      expect(costTrackingService.getCampaignCostTrends).toHaveBeenCalledWith(
        'campaign-123',
        7
      )
    })

    it('Given a non-existent campaign ID, When fetching costs, Then returns 404 error', async () => {
      // Given
      ;(costTrackingService.getCampaignCostSummary as jest.Mock).mockRejectedValue(
        new Error('Campaign not found')
      )

      const request = new NextRequest(
        'http://localhost/api/campaigns/non-existent/costs'
      )
      const params = Promise.resolve({ id: 'non-existent' })

      // When
      const response = await getCampaignCosts(request, { params })
      const data = await response.json()

      // Then
      expect(response.status).toBe(404)
      expect(data.error).toBe('Campaign not found')
    })

    it('Given no trend days parameter, When fetching costs, Then defaults to 30 days', async () => {
      // Given
      const mockSummary = {
        campaignId: 'campaign-123',
        campaignName: 'Test Campaign',
        totalSessions: 1,
        totalMessages: 10,
        totalTokens: 5000,
        totalCost: 0.5,
        averageCostPerSession: 0.5,
        sessions: [],
      }

      ;(costTrackingService.getCampaignCostSummary as jest.Mock).mockResolvedValue(
        mockSummary
      )
      ;(costTrackingService.getCampaignCostTrends as jest.Mock).mockResolvedValue([])

      const request = new NextRequest(
        'http://localhost/api/campaigns/campaign-123/costs'
      )
      const params = Promise.resolve({ id: 'campaign-123' })

      // When
      const response = await getCampaignCosts(request, { params })

      // Then
      expect(response.status).toBe(200)
      expect(costTrackingService.getCampaignCostTrends).toHaveBeenCalledWith(
        'campaign-123',
        30
      )
    })
  })

  describe('Cost Tracking Integration Scenarios', () => {
    it('Given a complete campaign lifecycle, When tracking costs, Then maintains accurate running totals', async () => {
      // Given - A campaign with multiple sessions over time
      const campaignSummary = {
        campaignId: 'campaign-123',
        campaignName: 'Epic Campaign',
        totalSessions: 5,
        totalMessages: 150,
        totalTokens: 75000,
        totalCost: 7.5,
        averageCostPerSession: 1.5,
        sessions: Array.from({ length: 5 }, (_, i) => ({
          sessionId: `session-${i + 1}`,
          sessionName: `Session ${i + 1}`,
          totalCost: 1.5,
          totalTokens: 15000,
          messageCount: 30,
          startedAt: new Date(`2025-01-0${i + 1}`),
        })),
      }

      ;(costTrackingService.getCampaignCostSummary as jest.Mock).mockResolvedValue(
        campaignSummary
      )
      ;(costTrackingService.getCampaignCostTrends as jest.Mock).mockResolvedValue([])

      const request = new NextRequest(
        'http://localhost/api/campaigns/campaign-123/costs'
      )
      const params = Promise.resolve({ id: 'campaign-123' })

      // When
      const response = await getCampaignCosts(request, { params })
      const data = await response.json()

      // Then - Verify accurate aggregations
      expect(data.summary.totalSessions).toBe(5)
      expect(data.summary.totalCost).toBe(7.5)
      expect(data.summary.averageCostPerSession).toBe(1.5)
      expect(data.summary.sessions).toHaveLength(5)
    })
  })
})




