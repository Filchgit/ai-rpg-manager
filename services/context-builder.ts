import { prisma } from '@/lib/db'
import { EnhancedAIContext, SessionStateContext, SpatialAIContext } from '@/types'
import { spatialService } from './spatial-service'

// Keywords that suggest mechanics are needed
const MECHANICS_KEYWORDS = {
  COMBAT: ['attack', 'damage', 'hit', 'fight', 'combat', 'weapon', 'armor', 'ac'],
  SKILL_CHECK: ['roll', 'check', 'save', 'saving throw', 'ability', 'skill'],
  MAGIC: ['spell', 'cast', 'magic', 'enchant', 'ritual', 'arcane'],
  SOCIAL: ['persuade', 'intimidate', 'deceive', 'insight', 'performance'],
  EXPLORATION: ['search', 'investigate', 'perception', 'navigate', 'track'],
  REST: ['rest', 'sleep', 'recover', 'heal', 'long rest', 'short rest'],
}

export class ContextBuilderService {
  /**
   * Build optimized context for AI request
   * This is the main entry point that orchestrates all context gathering
   */
  async buildContext(
    sessionId: string,
    userInput: string
  ): Promise<EnhancedAIContext> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        campaign: {
          include: {
            characters: true,
            knowledge: true,
            toneProfiles: {
              orderBy: { priority: 'desc' },
            },
            mechanicsRules: true,
          },
        },
        state: true,
        summaries: {
          orderBy: { messageRangeEnd: 'desc' },
          take: 1,
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 5, // Only last 5 messages instead of 10
          where: {
            role: { not: 'SYSTEM' },
          },
        },
      },
    })

    if (!session) {
      throw new Error('Session not found')
    }

    // 1. Get current state
    const currentState = this.buildStateContext(session.state)

    // 2. Get recent summary
    const recentSummary = session.summaries[0]?.summary

    // 3. Get recent messages (already limited to 5)
    const recentMessages = session.messages
      .reverse()
      .map((m) => ({
        role: m.role as 'USER' | 'ASSISTANT',
        content: m.content,
      }))

    // 4. Get relevant knowledge based on user input and current state
    const relevantKnowledge = this.findRelevantKnowledge(
      session.campaign.knowledge,
      userInput,
      currentState
    )

    // 5. Apply tone profiles
    const toneGuidelines = this.buildToneGuidelines(
      session.campaign.toneProfiles,
      currentState
    )

    // 6. Get relevant mechanics rules if needed
    const mechanicsRules = this.findRelevantMechanics(
      session.campaign.mechanicsRules,
      userInput
    )

    // 7. Get spatial context if applicable
    let spatialContext: SpatialAIContext | undefined
    try {
      spatialContext = await this.buildSpatialContext(sessionId)
    } catch (error) {
      // Spatial context is optional, continue without it
      console.log('Could not build spatial context:', error)
    }

    return {
      campaignName: session.campaign.name,
      currentState,
      spatialContext,
      recentSummary,
      recentMessages,
      relevantKnowledge,
      toneGuidelines,
      mechanicsRules: mechanicsRules.length > 0 ? mechanicsRules : undefined,
    }
  }

  /**
   * Build state context from session state
   */
  private buildStateContext(
    state: any | null
  ): SessionStateContext | undefined {
    if (!state) return undefined

    return {
      currentLocation: state.currentLocation || undefined,
      locationId: state.locationId || undefined,
      activeNPCs: Array.isArray(state.activeNPCs) ? state.activeNPCs : undefined,
      ongoingQuests: Array.isArray(state.ongoingQuests)
        ? state.ongoingQuests
        : undefined,
      partyConditions: state.partyConditions || undefined,
      recentEvents: Array.isArray(state.recentEvents)
        ? state.recentEvents
        : undefined,
    }
  }

  /**
   * Build spatial context for a character in the session
   */
  async buildSpatialContext(
    sessionId: string,
    characterId?: string
  ): Promise<SpatialAIContext | undefined> {
    // If no character specified, try to find the first player character
    if (!characterId) {
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          campaign: {
            include: {
              characters: {
                take: 1,
                orderBy: { createdAt: 'asc' },
              },
            },
          },
        },
      })

      if (!session?.campaign.characters[0]) {
        return undefined
      }

      characterId = session.campaign.characters[0].id
    }

    // Get character position
    const position = await prisma.characterPosition.findUnique({
      where: { characterId },
      include: {
        character: true,
        location: true,
      },
    })

    if (!position || !position.locationId) {
      return undefined
    }

    // Get full spatial context
    const spatialContext = await spatialService.buildSpatialContext(
      characterId,
      sessionId
    )

    if (!spatialContext) {
      return undefined
    }

    return {
      locationName: position.location?.name,
      characterPosition: {
        x: position.x,
        y: position.y,
        z: position.z,
      },
      nearbyCharacters: spatialContext.characterPositions.map((char) => ({
        name: char.name,
        position: char.position,
        distance: char.distance,
        canSee: char.canSee,
        coverLevel: char.coverLevel,
      })),
      nearbyFeatures: spatialContext.nearbyFeatures.map((feature) => ({
        name: feature.name,
        type: feature.type,
        position: feature.position,
        distance: feature.distance,
      })),
      availableActions: spatialContext.availableActions.map((action) => ({
        action: action.action,
        targetName: action.targetName,
        requiresMovement: action.requiresMovement,
      })),
    }
  }

  /**
   * Find relevant knowledge entries based on keywords
   */
  private findRelevantKnowledge(
    knowledge: any[],
    userInput: string,
    currentState?: SessionStateContext
  ): Array<{ title: string; content: string }> {
    const userInputLower = userInput.toLowerCase()
    const scored: Array<{ item: any; score: number }> = []

    knowledge.forEach((item) => {
      let score = 0

      // Check if title matches
      if (userInputLower.includes(item.title.toLowerCase())) {
        score += 10
      }

      // Check if keywords match
      if (item.keywords && Array.isArray(item.keywords)) {
        item.keywords.forEach((keyword: string) => {
          if (userInputLower.includes(keyword.toLowerCase())) {
            score += 5
          }
        })
      }

      // Check if it matches current location
      if (
        currentState?.currentLocation &&
        item.category === 'LOCATION' &&
        item.title.toLowerCase() === currentState.currentLocation.toLowerCase()
      ) {
        score += 15
      }

      // Check if it matches active NPCs
      if (currentState?.activeNPCs && item.category === 'NPC') {
        currentState.activeNPCs.forEach((npc) => {
          if (item.title.toLowerCase().includes(npc.toLowerCase())) {
            score += 12
          }
        })
      }

      if (score > 0) {
        scored.push({ item, score })
      }
    })

    // Sort by score and take top 5
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((s) => ({
        title: s.item.title,
        content: s.item.content,
      }))
  }

  /**
   * Build tone guidelines from tone profiles
   */
  private buildToneGuidelines(
    toneProfiles: any[],
    currentState?: SessionStateContext
  ): string | undefined {
    if (toneProfiles.length === 0) return undefined

    // Find the highest priority profile that matches current conditions
    for (const profile of toneProfiles) {
      // If no conditions, always apply
      if (!profile.conditions) {
        return profile.toneRules
      }

      // Check conditions
      const conditions = profile.conditions as Record<string, any>
      let matches = true

      if (conditions.location && currentState?.currentLocation) {
        matches =
          matches &&
          currentState.currentLocation.toLowerCase() ===
            conditions.location.toLowerCase()
      }

      if (conditions.npcPresent && currentState?.activeNPCs) {
        matches =
          matches &&
          currentState.activeNPCs.some(
            (npc) => npc.toLowerCase() === conditions.npcPresent.toLowerCase()
          )
      }

      if (matches) {
        return profile.toneRules
      }
    }

    // Fallback to first profile
    return toneProfiles[0]?.toneRules
  }

  /**
   * Find relevant mechanics rules based on user input
   */
  private findRelevantMechanics(
    mechanicsRules: any[],
    userInput: string
  ): string[] {
    const userInputLower = userInput.toLowerCase()
    const relevant: string[] = []

    // Determine which categories are relevant
    const relevantCategories = new Set<string>()
    Object.entries(MECHANICS_KEYWORDS).forEach(([category, keywords]) => {
      if (keywords.some((keyword) => userInputLower.includes(keyword))) {
        relevantCategories.add(category)
      }
    })

    // If no mechanics keywords detected, return empty
    if (relevantCategories.size === 0) {
      return []
    }

    // Find matching rules
    mechanicsRules.forEach((rule) => {
      if (relevantCategories.has(rule.category)) {
        relevant.push(`${rule.title}: ${rule.content}`)
      } else if (rule.keywords && Array.isArray(rule.keywords)) {
        // Check keywords
        const hasKeyword = rule.keywords.some((keyword: string) =>
          userInputLower.includes(keyword.toLowerCase())
        )
        if (hasKeyword) {
          relevant.push(`${rule.title}: ${rule.content}`)
        }
      }
    })

    return relevant.slice(0, 3) // Limit to 3 most relevant rules
  }

  /**
   * Extract and update state from AI response
   * This uses rule-based extraction to update the session state
   */
  async updateStateFromResponse(
    sessionId: string,
    userInput: string,
    aiResponse: string
  ): Promise<void> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { state: true },
    })

    if (!session) return

    const updates: any = {}

    // Extract location mentions
    const locationMatch = aiResponse.match(
      /(?:you (?:arrive|enter|reach|find yourself in|are in|stand in|move to))\s+(?:a |an |the |)\s*([^.!?]+)/i
    )
    if (locationMatch) {
      updates.currentLocation = locationMatch[1].trim()
    }

    // Extract NPC mentions
    const npcPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:says|tells|asks|responds|replies|approaches)/g
    const npcs = new Set<string>()
    let npcMatch
    while ((npcMatch = npcPattern.exec(aiResponse)) !== null) {
      npcs.add(npcMatch[1])
    }
    if (npcs.size > 0) {
      updates.activeNPCs = Array.from(npcs)
    }

    // Extract quest mentions
    const questPattern = /(?:quest|mission|task|objective):\s*([^.!?]+)/gi
    const quests = []
    let questMatch
    while ((questMatch = questPattern.exec(aiResponse)) !== null) {
      quests.push(questMatch[1].trim())
    }
    if (quests.length > 0) {
      updates.ongoingQuests = quests
    }

    // Add to recent events (keep last 5)
    const existingEvents = (session.state?.recentEvents as string[]) || []
    const newEvent = userInput.substring(0, 100) // Truncate to 100 chars
    const recentEvents = [newEvent, ...existingEvents].slice(0, 5)
    updates.recentEvents = recentEvents

    // Upsert state
    if (Object.keys(updates).length > 0) {
      await prisma.sessionState.upsert({
        where: { sessionId },
        update: updates,
        create: {
          sessionId,
          ...updates,
        },
      })
    }
  }

  /**
   * Get message count since last summary
   */
  async getMessageCountSinceLastSummary(sessionId: string): Promise<number> {
    const lastSummary = await prisma.sessionSummary.findFirst({
      where: { sessionId },
      orderBy: { messageRangeEnd: 'desc' },
    })

    if (!lastSummary) {
      // Count all messages
      return await prisma.message.count({
        where: { sessionId },
      })
    }

    // Count messages after the last summary
    const totalMessages = await prisma.message.count({
      where: { sessionId },
    })

    return totalMessages - lastSummary.messageRangeEnd
  }
}

export const contextBuilderService = new ContextBuilderService()


