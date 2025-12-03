import OpenAI from 'openai'
import { AIResponse, AIPromptContext, EnhancedAIContext } from '@/types'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

const MAX_TOKENS_PER_REQUEST = parseInt(process.env.MAX_TOKENS_PER_REQUEST || '500', 10)
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

export class OpenAIService {
  async generateStoryResponse(
    userInput: string,
    context: AIPromptContext
  ): Promise<AIResponse> {
    const systemPrompt = this.buildSystemPrompt(context)
    const messages = this.buildMessageHistory(context, userInput)

    try {
      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        max_tokens: MAX_TOKENS_PER_REQUEST,
        temperature: 0.8,
        presence_penalty: 0.6,
        frequency_penalty: 0.3,
      })

      const content = completion.choices[0]?.message?.content || ''
      const usage = completion.usage

      return {
        content,
        tokenCount: usage?.total_tokens || 0,
        metadata: {
          model: MODEL,
          promptTokens: usage?.prompt_tokens || 0,
          completionTokens: usage?.completion_tokens || 0,
        },
      }
    } catch (error) {
      console.error('OpenAI API error:', error)
      throw new Error('Failed to generate AI response')
    }
  }

  async generateStreamingResponse(
    userInput: string,
    context: AIPromptContext
  ): Promise<ReadableStream> {
    const systemPrompt = this.buildSystemPrompt(context)
    const messages = this.buildMessageHistory(context, userInput)

    const stream = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      max_tokens: MAX_TOKENS_PER_REQUEST,
      temperature: 0.8,
      presence_penalty: 0.6,
      frequency_penalty: 0.3,
      stream: true,
    })

    const encoder = new TextEncoder()
    return new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || ''
            if (content) {
              controller.enqueue(encoder.encode(content))
            }
          }
          controller.close()
        } catch (error) {
          controller.error(error)
        }
      },
    })
  }

  private buildSystemPrompt(context: AIPromptContext): string {
    let prompt = `You are an expert Dungeon Master running a tabletop RPG session. `
    prompt += `You should be creative, engaging, and follow D&D 5e rules when applicable.\n\n`

    prompt += `Campaign: ${context.campaignName}\n`

    if (context.campaignDescription) {
      prompt += `Description: ${context.campaignDescription}\n`
    }

    if (context.worldSettings) {
      prompt += `\nWorld Settings:\n${context.worldSettings}\n`
    }

    if (context.aiGuidelines) {
      prompt += `\nDM Guidelines:\n${context.aiGuidelines}\n`
    }

    if (context.characterNames && context.characterNames.length > 0) {
      prompt += `\nActive Characters: ${context.characterNames.join(', ')}\n`
    }

    prompt += `\nYour responses should:\n`
    prompt += `- Be descriptive and immersive\n`
    prompt += `- React to player actions and decisions\n`
    prompt += `- Ask for dice rolls when appropriate\n`
    prompt += `- Maintain consistency with the campaign world\n`
    prompt += `- Be concise but engaging (2-3 paragraphs max)\n`

    return prompt
  }

  private buildMessageHistory(
    context: AIPromptContext,
    userInput: string
  ): Array<{ role: 'user' | 'assistant'; content: string }> {
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = []

    // Add recent history (last 5 exchanges to keep context reasonable)
    const recentHistory = context.recentHistory.slice(-10)
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role === 'USER' ? 'user' : 'assistant',
        content: msg.content,
      })
    }

    // Add current user input
    messages.push({
      role: 'user',
      content: userInput,
    })

    return messages
  }

  // ==================== ENHANCED CONTEXT METHODS ====================

  /**
   * Generate story response using enhanced context (optimized for cost)
   * Now includes structured movement detection
   */
  async generateEnhancedStoryResponse(
    userInput: string,
    context: EnhancedAIContext
  ): Promise<AIResponse> {
    const systemPrompt = this.buildEnhancedSystemPrompt(context)
    const messages = this.buildEnhancedMessageHistory(context, userInput)

    try {
      // Use JSON mode for structured output with movement detection
      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        max_tokens: MAX_TOKENS_PER_REQUEST,
        temperature: 0.8,
        presence_penalty: 0.6,
        frequency_penalty: 0.3,
        response_format: { type: 'json_object' },
      })

      const content = completion.choices[0]?.message?.content || ''
      const usage = completion.usage

      // Parse JSON response
      let parsedResponse: {
        narrative: string
        movement?: {
          detected: boolean
          characterName?: string
          targetName?: string
          targetPosition?: { x: number; y: number; z: number }
          actionType?: string
          reason?: string
        }
      }

      try {
        parsedResponse = JSON.parse(content)
      } catch {
        // Fallback if JSON parsing fails
        parsedResponse = { narrative: content }
      }

      // Build movement suggestion if detected
      let movementSuggestion = undefined
      if (parsedResponse.movement?.detected && parsedResponse.movement.targetPosition) {
        const mov = parsedResponse.movement
        movementSuggestion = {
          id: `mov_${Date.now()}`,
          characterId: context.spatialContext?.characterPosition ? 'player' : '',
          characterName: mov.characterName || 'Player',
          from: context.spatialContext?.characterPosition || { x: 0, y: 0, z: 0 },
          to: mov.targetPosition,
          reason: mov.reason || 'Movement detected',
          targetName: mov.targetName,
          actionType: (mov.actionType || 'MOVEMENT') as any,
          distance: this.calculateDistance(
            context.spatialContext?.characterPosition || { x: 0, y: 0, z: 0 },
            mov.targetPosition
          ),
          locationId: context.currentState?.locationId || '',
          isValid: true, // Will be validated separately
          validationIssues: [],
        }
      }

      return {
        content: parsedResponse.narrative,
        tokenCount: usage?.total_tokens || 0,
        metadata: {
          model: MODEL,
          promptTokens: usage?.prompt_tokens || 0,
          completionTokens: usage?.completion_tokens || 0,
          movementSuggestion,
        },
      }
    } catch (error) {
      console.error('OpenAI API error:', error)
      throw new Error('Failed to generate AI response')
    }
  }

  /**
   * Helper to calculate distance between positions
   */
  private calculateDistance(
    pos1: { x: number; y: number; z: number },
    pos2: { x: number; y: number; z: number }
  ): number {
    const dx = pos2.x - pos1.x
    const dy = pos2.y - pos1.y
    const dz = pos2.z - pos1.z
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  }

  /**
   * Build optimized system prompt using enhanced context
   */
  private buildEnhancedSystemPrompt(context: EnhancedAIContext): string {
    let prompt = `You are an expert Dungeon Master running a tabletop RPG session for "${context.campaignName}".\n\n`

    // Add current state (much more efficient than full campaign description)
    if (context.currentState) {
      prompt += `Current Situation:\n`
      if (context.currentState.currentLocation) {
        prompt += `- Location: ${context.currentState.currentLocation}\n`
      }
      if (context.currentState.activeNPCs && context.currentState.activeNPCs.length > 0) {
        prompt += `- NPCs Present: ${context.currentState.activeNPCs.join(', ')}\n`
      }
      if (context.currentState.ongoingQuests && context.currentState.ongoingQuests.length > 0) {
        prompt += `- Active Quests: ${context.currentState.ongoingQuests.join('; ')}\n`
      }
      if (context.currentState.partyConditions) {
        prompt += `- Party Status: ${JSON.stringify(context.currentState.partyConditions)}\n`
      }
      prompt += `\n`
    }

    // Add spatial context (positions, distances, line of sight)
    if (context.spatialContext) {
      prompt += `Spatial Context:\n`
      
      if (context.spatialContext.locationName) {
        prompt += `- Current Location: ${context.spatialContext.locationName}\n`
      }
      
      if (context.spatialContext.characterPosition) {
        const pos = context.spatialContext.characterPosition
        prompt += `- Your Position: (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})\n`
      }
      
      if (context.spatialContext.nearbyCharacters && context.spatialContext.nearbyCharacters.length > 0) {
        prompt += `- Nearby Characters:\n`
        context.spatialContext.nearbyCharacters.forEach((char) => {
          const visibility = char.canSee ? 'visible' : 'hidden'
          const cover = char.coverLevel !== 'NONE' ? ` with ${char.coverLevel.toLowerCase()} cover` : ''
          prompt += `  • ${char.name} at (${char.position.x.toFixed(1)}, ${char.position.y.toFixed(1)}, ${char.position.z.toFixed(1)}) - ${char.distance.toFixed(1)} units away, ${visibility}${cover}\n`
        })
      }
      
      if (context.spatialContext.nearbyFeatures && context.spatialContext.nearbyFeatures.length > 0) {
        prompt += `- Nearby Features:\n`
        context.spatialContext.nearbyFeatures.slice(0, 5).forEach((feature) => {
          prompt += `  • ${feature.name} (${feature.type}) - ${feature.distance.toFixed(1)} units away\n`
        })
      }
      
      if (context.spatialContext.availableActions && context.spatialContext.availableActions.length > 0) {
        prompt += `- Available Actions:\n`
        context.spatialContext.availableActions.slice(0, 5).forEach((action) => {
          const movement = action.requiresMovement ? ' (requires movement)' : ''
          prompt += `  • ${action.action} → ${action.targetName}${movement}\n`
        })
      }
      
      prompt += `\n`
      prompt += `IMPORTANT: When describing actions, take into account the positions and distances between characters. ` +
        `Use the stored location data and mechanics rules to determine what is physically possible. ` +
        `If a character wants to interact with something far away, suggest they move closer first.\n\n`
    }

    // Add relevant knowledge (only 3-5 entries instead of full campaign lore)
    if (context.relevantKnowledge && context.relevantKnowledge.length > 0) {
      prompt += `Relevant Information:\n`
      context.relevantKnowledge.forEach((knowledge) => {
        prompt += `- ${knowledge.title}: ${knowledge.content}\n`
      })
      prompt += `\n`
    }

    // Add tone guidelines if present
    if (context.toneGuidelines) {
      prompt += `Tone & Style:\n${context.toneGuidelines}\n\n`
    }

    // Add mechanics rules only if relevant
    if (context.mechanicsRules && context.mechanicsRules.length > 0) {
      prompt += `Relevant Rules:\n`
      context.mechanicsRules.forEach((rule) => {
        prompt += `- ${rule}\n`
      })
      prompt += `\n`
    }

    // Core instructions (always included)
    prompt += `Instructions:\n`
    prompt += `- Be descriptive and immersive\n`
    prompt += `- React to player actions naturally\n`
    prompt += `- Request dice rolls when appropriate\n`
    prompt += `- Stay consistent with established facts\n`
    prompt += `- Keep responses concise (2-3 paragraphs)\n\n`

    // Movement detection instructions
    prompt += `IMPORTANT: You MUST respond in JSON format with this structure:\n`
    prompt += `{\n`
    prompt += `  "narrative": "Your story response here",\n`
    prompt += `  "movement": {\n`
    prompt += `    "detected": false,  // Set to true if player indicates they want to move\n`
    prompt += `    "characterName": "Player",\n`
    prompt += `    "targetName": "orc",  // Name of target character/feature\n`
    prompt += `    "targetPosition": {"x": 15.5, "y": 14.0, "z": 0.0},  // Calculate based on spatial context\n`
    prompt += `    "actionType": "MELEE",  // MELEE, RANGED, SPELL, CONVERSATION, PERCEPTION, or MOVEMENT\n`
    prompt += `    "reason": "To attack the orc"  // Why they're moving\n`
    prompt += `  }\n`
    prompt += `}\n\n`
    prompt += `Movement Keywords to Watch For:\n`
    prompt += `- Approach, move to, walk to, go to, head to\n`
    prompt += `- Charge, rush, attack (close distance for melee)\n`
    prompt += `- Flee, retreat, back away (move away)\n`
    prompt += `- Investigate, examine, inspect (move closer to feature)\n`
    prompt += `- Talk to, speak to (move to conversation range)\n\n`
    prompt += `When movement is detected:\n`
    prompt += `1. Set "detected" to true\n`
    prompt += `2. Identify the target from the spatial context\n`
    prompt += `3. Calculate appropriate position based on action type:\n`
    prompt += `   - MELEE: 1.5 meters from target\n`
    prompt += `   - RANGED: 10-18 meters from target\n`
    prompt += `   - SPELL: 5-9 meters from target\n`
    prompt += `   - CONVERSATION: 2-6 meters from target\n`
    prompt += `   - PERCEPTION: Close to feature for investigation\n`
    prompt += `4. Include the reason for movement\n\n`

    return prompt
  }

  /**
   * Build message history using enhanced context
   */
  private buildEnhancedMessageHistory(
    context: EnhancedAIContext,
    userInput: string
  ): Array<{ role: 'user' | 'assistant'; content: string }> {
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = []

    // If there's a recent summary, add it as context (more efficient than full history)
    if (context.recentSummary) {
      messages.push({
        role: 'assistant',
        content: `[Session Summary]: ${context.recentSummary}`,
      })
    }

    // Add only the most recent messages (3-5 instead of 10)
    const recentMessages = context.recentMessages.slice(-5)
    for (const msg of recentMessages) {
      messages.push({
        role: msg.role === 'USER' ? 'user' : 'assistant',
        content: msg.content,
      })
    }

    // Add current user input
    messages.push({
      role: 'user',
      content: userInput,
    })

    return messages
  }
}

export const openaiService = new OpenAIService()

