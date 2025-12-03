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

      console.log('OpenAI raw response:', content)

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
        console.log('Parsed movement:', parsedResponse.movement)
      } catch (e) {
        // Fallback if JSON parsing fails
        console.warn('Failed to parse JSON response from OpenAI:', e)
        parsedResponse = { narrative: content }
      }

      // Build movement suggestion if detected
      let movementSuggestion = undefined
      if (parsedResponse.movement?.detected && parsedResponse.movement.targetPosition) {
        console.log('Movement detected! Building suggestion...')
        const mov = parsedResponse.movement
        
        // Get actual character ID from context (passed from buildContext)
        const characterId = (context as any).characterId || ''
        
        movementSuggestion = {
          id: `mov_${Date.now()}`,
          characterId,
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
        console.log('Movement suggestion created:', movementSuggestion)
      } else {
        console.log('No movement detected or missing targetPosition')
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

    // JSON FORMAT REQUIREMENT - MUST BE FIRST
    prompt += `CRITICAL: You MUST ALWAYS respond in valid JSON format. Every response must be a JSON object.\n`
    prompt += `Required JSON structure:\n`
    prompt += `{\n`
    prompt += `  "narrative": "Your immersive story response here (2-3 paragraphs)",\n`
    prompt += `  "movement": {\n`
    prompt += `    "detected": false  // Set to true ONLY if player explicitly indicates movement\n`
    prompt += `  }\n`
    prompt += `}\n\n`
    prompt += `If movement is detected, include these additional fields in the movement object:\n`
    prompt += `{\n`
    prompt += `  "detected": true,\n`
    prompt += `  "characterName": "Player",\n`
    prompt += `  "targetName": "orc",\n`
    prompt += `  "targetPosition": {"x": 15.5, "y": 14.0, "z": 0.0},\n`
    prompt += `  "actionType": "MELEE",\n`
    prompt += `  "reason": "To attack the orc"\n`
    prompt += `}\n\n`

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

    // Core DM instructions
    prompt += `DM Instructions:\n`
    prompt += `- Be descriptive and immersive in the "narrative" field\n`
    prompt += `- React to player actions naturally\n`
    prompt += `- Request dice rolls when appropriate\n`
    prompt += `- Stay consistent with established facts\n`
    prompt += `- Keep narrative concise (2-3 paragraphs)\n\n`

    // Movement detection guide
    prompt += `Movement Detection Guide:\n`
    prompt += `Keywords that indicate movement: charge, rush, attack, approach, move to, walk to, flee, retreat, investigate, examine, talk to\n\n`
    prompt += `When you see these keywords:\n`
    prompt += `1. Set movement.detected = true\n`
    prompt += `2. Identify target from spatial context above\n`
    prompt += `3. Calculate targetPosition based on action:\n`
    prompt += `   - MELEE (attack/charge): 1.5m from target\n`
    prompt += `   - RANGED: 10-18m from target\n`
    prompt += `   - SPELL: 5-9m from target\n`
    prompt += `   - CONVERSATION (talk to): 2-6m from target\n`
    prompt += `   - PERCEPTION (investigate): 1m from feature\n`
    prompt += `4. Set actionType and reason fields\n\n`
    prompt += `Example: "I charge at the orc!" → movement.detected=true, actionType="MELEE", calculate position 1.5m from orc\n\n`
    prompt += `REMEMBER: Always return valid JSON with both "narrative" and "movement" fields!\n\n`

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

