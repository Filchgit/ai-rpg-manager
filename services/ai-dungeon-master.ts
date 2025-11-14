import { openaiService } from '@/lib/openai'
import { rateLimitService } from '@/lib/rate-limit'
import { prisma } from '@/lib/db'
import { AIResponse, AIPromptContext } from '@/types'

export class AIDungeonMasterService {
  async generateResponse(sessionId: string, userInput: string): Promise<AIResponse> {
    // Check rate limit
    const rateLimitStatus = await rateLimitService.checkRateLimit(sessionId)
    if (!rateLimitStatus.allowed) {
      throw new Error(
        `Rate limit exceeded. Resets at ${rateLimitStatus.resetAt.toISOString()}`
      )
    }

    // Get session with campaign and recent messages
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        campaign: {
          include: {
            characters: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!session) {
      throw new Error('Session not found')
    }

    if (session.status !== 'ACTIVE') {
      throw new Error('Session is not active')
    }

    // Build context for AI
    const context: AIPromptContext = {
      campaignName: session.campaign.name,
      campaignDescription: session.campaign.description || undefined,
      worldSettings: session.campaign.worldSettings || undefined,
      aiGuidelines: session.campaign.aiGuidelines || undefined,
      recentHistory: session.messages
        .reverse()
        .filter(m => m.role !== 'SYSTEM')
        .map(m => ({
          role: m.role as 'USER' | 'ASSISTANT',
          content: m.content,
        })),
      characterNames: session.campaign.characters.map(c => c.name),
    }

    // Generate AI response
    const aiResponse = await openaiService.generateStoryResponse(userInput, context)

    // Save user message
    await prisma.message.create({
      data: {
        sessionId,
        role: 'USER',
        content: userInput,
      },
    })

    // Save assistant message
    await prisma.message.create({
      data: {
        sessionId,
        role: 'ASSISTANT',
        content: aiResponse.content,
        tokenCount: aiResponse.tokenCount,
        metadata: aiResponse.metadata,
      },
    })

    // Update rate limit
    await rateLimitService.incrementRateLimit(sessionId, aiResponse.tokenCount)

    return aiResponse
  }

  async getSessionHistory(sessionId: string, limit: number = 50) {
    return prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: limit,
    })
  }

  async getRateLimitStatus(sessionId: string) {
    return rateLimitService.getRateLimitStatus(sessionId)
  }
}

export const aiDungeonMasterService = new AIDungeonMasterService()

