import { aiDungeonMasterService } from '@/services/ai-dungeon-master'
import { openaiService } from '@/lib/openai'
import { rateLimitService } from '@/lib/rate-limit'
import { prisma } from '@/lib/db'

jest.mock('@/lib/openai')
jest.mock('@/lib/rate-limit')
jest.mock('@/lib/db', () => ({
  prisma: {
    session: {
      findUnique: jest.fn(),
    },
    message: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
}))

describe('AIDungeonMasterService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('generateResponse', () => {
    it('should generate an AI response when given valid input', async () => {
      // Given
      const sessionId = 'session-1'
      const userInput = 'I open the door'
      const mockRateLimitStatus = {
        allowed: true,
        requestCount: 5,
        tokenCount: 1000,
        remainingRequests: 15,
        remainingTokens: 9000,
        resetAt: new Date(),
      }
      const mockSession = {
        id: sessionId,
        status: 'ACTIVE',
        campaign: {
          name: 'Test Campaign',
          description: 'A test',
          worldSettings: null,
          aiGuidelines: null,
          characters: [{ name: 'Hero' }],
        },
        messages: [
          { role: 'USER', content: 'Previous message' },
          { role: 'ASSISTANT', content: 'Previous response' },
        ],
      }
      const mockAIResponse = {
        content: 'You open the door and see a dragon!',
        tokenCount: 20,
        metadata: { model: 'gpt-4o-mini', promptTokens: 10, completionTokens: 10 },
      }

      ;(rateLimitService.checkRateLimit as jest.Mock).mockResolvedValue(mockRateLimitStatus)
      ;(prisma.session.findUnique as jest.Mock).mockResolvedValue(mockSession)
      ;(openaiService.generateStoryResponse as jest.Mock).mockResolvedValue(mockAIResponse)
      ;(prisma.message.create as jest.Mock).mockResolvedValue({})
      ;(rateLimitService.incrementRateLimit as jest.Mock).mockResolvedValue(undefined)

      // When
      const result = await aiDungeonMasterService.generateResponse(sessionId, userInput)

      // Then
      expect(rateLimitService.checkRateLimit).toHaveBeenCalledWith(sessionId)
      expect(prisma.session.findUnique).toHaveBeenCalled()
      expect(openaiService.generateStoryResponse).toHaveBeenCalledWith(
        userInput,
        expect.objectContaining({
          campaignName: 'Test Campaign',
          characterNames: ['Hero'],
        })
      )
      expect(prisma.message.create).toHaveBeenCalledTimes(2) // User message and AI response
      expect(rateLimitService.incrementRateLimit).toHaveBeenCalledWith(sessionId, 20)
      expect(result).toEqual(mockAIResponse)
    })

    it('should throw an error when rate limit is exceeded', async () => {
      // Given
      const sessionId = 'session-1'
      const userInput = 'I attack'
      const mockRateLimitStatus = {
        allowed: false,
        requestCount: 20,
        tokenCount: 10000,
        remainingRequests: 0,
        remainingTokens: 0,
        resetAt: new Date('2025-12-01'),
      }

      ;(rateLimitService.checkRateLimit as jest.Mock).mockResolvedValue(mockRateLimitStatus)

      // When / Then
      await expect(
        aiDungeonMasterService.generateResponse(sessionId, userInput)
      ).rejects.toThrow(/Rate limit exceeded/)
    })

    it('should throw an error when session is not found', async () => {
      // Given
      const sessionId = 'non-existent'
      const userInput = 'Test'
      const mockRateLimitStatus = { allowed: true }

      ;(rateLimitService.checkRateLimit as jest.Mock).mockResolvedValue(mockRateLimitStatus)
      ;(prisma.session.findUnique as jest.Mock).mockResolvedValue(null)

      // When / Then
      await expect(
        aiDungeonMasterService.generateResponse(sessionId, userInput)
      ).rejects.toThrow('Session not found')
    })

    it('should throw an error when session is not active', async () => {
      // Given
      const sessionId = 'session-1'
      const userInput = 'Test'
      const mockRateLimitStatus = { allowed: true }
      const mockSession = { id: sessionId, status: 'COMPLETED', campaign: {}, messages: [] }

      ;(rateLimitService.checkRateLimit as jest.Mock).mockResolvedValue(mockRateLimitStatus)
      ;(prisma.session.findUnique as jest.Mock).mockResolvedValue(mockSession)

      // When / Then
      await expect(
        aiDungeonMasterService.generateResponse(sessionId, userInput)
      ).rejects.toThrow('Session is not active')
    })
  })

  describe('getSessionHistory', () => {
    it('should return session messages when given a valid session id', async () => {
      // Given
      const sessionId = 'session-1'
      const mockMessages = [
        { id: '1', role: 'USER', content: 'Hello' },
        { id: '2', role: 'ASSISTANT', content: 'Hi there!' },
      ]
      ;(prisma.message.findMany as jest.Mock).mockResolvedValue(mockMessages)

      // When
      const result = await aiDungeonMasterService.getSessionHistory(sessionId)

      // Then
      expect(prisma.message.findMany).toHaveBeenCalledWith({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
        take: 50,
      })
      expect(result).toEqual(mockMessages)
    })
  })
})

