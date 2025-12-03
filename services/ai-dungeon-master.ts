import { openaiService } from '@/lib/openai'
import { rateLimitService } from '@/lib/rate-limit'
import { prisma } from '@/lib/db'
import { AIResponse, AIPromptContext } from '@/types'
import { contextBuilderService } from './context-builder'
import { sessionSummarizerService } from './session-summarizer'
import { costTrackingService } from './cost-tracking'

export class AIDungeonMasterService {
  /**
   * Generate AI response using OPTIMIZED context system
   * This is the new cost-optimized method
   */
  async generateResponse(sessionId: string, userInput: string): Promise<AIResponse> {
    // Check rate limit
    const rateLimitStatus = await rateLimitService.checkRateLimit(sessionId)
    if (!rateLimitStatus.allowed) {
      throw new Error(
        `Rate limit exceeded. Resets at ${rateLimitStatus.resetAt.toISOString()}`
      )
    }

    // Check session status
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { status: true },
    })

    if (!session) {
      throw new Error('Session not found')
    }

    if (session.status !== 'ACTIVE') {
      throw new Error('Session is not active')
    }

    // Check cost budget before proceeding
    const budgetCheck = await costTrackingService.checkSessionBudget(sessionId)
    if (budgetCheck.warningLevel === 'critical') {
      console.warn(`Session ${sessionId} has exceeded cost limit: ${budgetCheck.message}`)
      // Could optionally throw error or return warning to user
    }

    // Build optimized context using new context builder
    const enhancedContext = await contextBuilderService.buildContext(
      sessionId,
      userInput
    )

    // Generate AI response using enhanced context (uses less tokens)
    const aiResponse = await openaiService.generateEnhancedStoryResponse(
      userInput,
      enhancedContext
    )

    // Validate movement suggestion if present
    if (aiResponse.metadata?.movementSuggestion) {
      const suggestion = aiResponse.metadata.movementSuggestion
      const { spatialService } = await import('./spatial-service')

      // Validate the suggested movement
      const validation = await spatialService.validateMovement(
        suggestion.from,
        suggestion.to,
        suggestion.locationId
      )

      // Update the suggestion with validation results
      suggestion.isValid = validation.isValid
      suggestion.validationIssues = validation.warnings
      if (validation.blockedBy) {
        suggestion.validationIssues = [
          ...(suggestion.validationIssues || []),
          `Blocked by: ${validation.blockedBy.join(', ')}`
        ]
      }

      // Calculate turn-based movement info
      if (suggestion.characterId && suggestion.characterId !== 'player') {
        // Detect if "running" or "charging" from user input/action type
        const isRunning = suggestion.actionType === 'MELEE' && 
                         (suggestion.reason?.toLowerCase().includes('charge') || 
                          suggestion.reason?.toLowerCase().includes('rush'))
        const movementModifier = isRunning ? 2.0 : 1.0 // Running = 2x speed
        
        const turnMovement = await spatialService.calculateTurnMovement(
          suggestion.characterId,
          suggestion.distance,
          movementModifier
        )
        
        suggestion.baseMovementRate = turnMovement.baseMovementRate
        suggestion.canReachInOneTurn = turnMovement.canReachInOneTurn
        suggestion.turnsRequired = turnMovement.turnsRequired
        suggestion.movementModifier = turnMovement.movementModifier

        // Add turn-based warnings
        if (!turnMovement.canReachInOneTurn) {
          const effectiveSpeed = turnMovement.baseMovementRate * turnMovement.movementModifier
          const modifierText = turnMovement.movementModifier > 1.0 
            ? ` (${turnMovement.movementModifier}x speed = ${effectiveSpeed}m/turn)`
            : ''
          
          const turnWarning = `Cannot reach in one turn (requires ${turnMovement.turnsRequired} turns at ${turnMovement.baseMovementRate}m/turn${modifierText})`
          
          suggestion.validationIssues = [
            ...(suggestion.validationIssues || []),
            turnWarning
          ]
        }
      }
    }

    // Save user message
    await prisma.message.create({
      data: {
        sessionId,
        role: 'USER',
        content: userInput,
      },
    })

    // Save assistant message with detailed cost tracking
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

    // Update session state based on AI response
    await contextBuilderService.updateStateFromResponse(
      sessionId,
      userInput,
      aiResponse.content
    )

    // Auto-summarize if threshold is met (happens in background)
    sessionSummarizerService.autoSummarizeIfNeeded(sessionId).catch((err) => {
      console.error('Background summarization failed:', err)
    })

    return aiResponse
  }

  /**
   * Generate AI response using LEGACY context system
   * Kept for backward compatibility, but uses more tokens
   */
  async generateResponseLegacy(sessionId: string, userInput: string): Promise<AIResponse> {
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

    // Build context for AI (OLD WAY - sends more data)
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

    // Generate AI response (OLD WAY)
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

