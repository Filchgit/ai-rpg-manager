import { prisma } from '@/lib/db'
import { MovementIntent, Position3D, MovementSuggestion } from '@/types'
import { spatialService } from './spatial-service'

/**
 * Movement Detection Service
 * Analyzes player input to detect movement intentions and calculate target positions
 */
export class MovementDetectorService {
  // Keywords that indicate movement intent
  private readonly movementKeywords = {
    approach: ['approach', 'move to', 'walk to', 'go to', 'head to', 'move toward', 'walk toward'],
    attack: ['charge', 'rush', 'attack', 'strike', 'engage', 'fight'],
    flee: ['flee', 'run away', 'retreat', 'back away', 'step back', 'move back'],
    investigate: ['investigate', 'examine', 'inspect', 'look at', 'check out', 'search'],
    talk: ['talk to', 'speak to', 'approach to talk', 'go talk', 'converse with'],
    follow: ['follow', 'tail', 'pursue', 'chase'],
    general: ['move', 'walk', 'run', 'step', 'go', 'head'],
  }

  /**
   * Detect if user input contains movement intent
   */
  detectMovementIntent(userInput: string): MovementIntent {
    const lowerInput = userInput.toLowerCase()
    
    // Check for attack-related movement
    if (this.containsKeywords(lowerInput, this.movementKeywords.attack)) {
      return {
        detected: true,
        actionType: 'MELEE',
        keywords: this.movementKeywords.attack.filter(k => lowerInput.includes(k)),
      }
    }

    // Check for approach (could be for conversation)
    if (this.containsKeywords(lowerInput, this.movementKeywords.talk)) {
      return {
        detected: true,
        actionType: 'CONVERSATION',
        keywords: this.movementKeywords.talk.filter(k => lowerInput.includes(k)),
      }
    }

    // Check for investigation
    if (this.containsKeywords(lowerInput, this.movementKeywords.investigate)) {
      return {
        detected: true,
        actionType: 'PERCEPTION',
        keywords: this.movementKeywords.investigate.filter(k => lowerInput.includes(k)),
      }
    }

    // Check for fleeing
    if (this.containsKeywords(lowerInput, this.movementKeywords.flee)) {
      return {
        detected: true,
        actionType: 'MOVEMENT',
        keywords: this.movementKeywords.flee.filter(k => lowerInput.includes(k)),
      }
    }

    // Check for general approach
    if (this.containsKeywords(lowerInput, this.movementKeywords.approach)) {
      return {
        detected: true,
        actionType: 'MOVEMENT',
        keywords: this.movementKeywords.approach.filter(k => lowerInput.includes(k)),
      }
    }

    // Check for general movement
    if (this.containsKeywords(lowerInput, this.movementKeywords.general)) {
      return {
        detected: true,
        actionType: 'MOVEMENT',
        keywords: this.movementKeywords.general.filter(k => lowerInput.includes(k)),
      }
    }

    return { detected: false }
  }

  /**
   * Extract target name from user input
   */
  extractTargetName(userInput: string, sessionId: string): string | null {
    // This is a simple extraction - in production you'd want more sophisticated NLP
    const lowerInput = userInput.toLowerCase()
    
    // Common patterns: "approach the orc", "move to the altar", "attack goblin"
    const patterns = [
      /(?:the\s+)?(\w+)(?:\s+|$)/i,  // Capture word after "the" or standalone
    ]
    
    // For now, return null - will be enhanced by AI in structured output
    return null
  }

  /**
   * Calculate target position based on movement intent and target
   */
  async calculateTargetPosition(
    intent: MovementIntent,
    sessionId: string,
    currentPosition: Position3D,
    targetName?: string
  ): Promise<Position3D | null> {
    // Get session and campaign data
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        campaign: {
          include: {
            movementRules: true,
          },
        },
        state: true,
      },
    })

    if (!session?.state?.locationId) {
      return null
    }

    // If we have a target name, try to find it
    if (targetName) {
      // Try to find character with this name
      const targetCharacter = await prisma.character.findFirst({
        where: {
          campaignId: session.campaignId,
          name: {
            contains: targetName,
            mode: 'insensitive',
          },
        },
        include: {
          position: true,
        },
      })

      if (targetCharacter?.position) {
        // Calculate appropriate distance based on action type
        const rule = session.campaign.movementRules.find(
          r => r.interactionType === intent.actionType
        )
        const targetDistance = rule?.maxDistance || 1.5 // Default to melee range

        // Calculate position at appropriate distance
        return this.calculatePositionAtDistance(
          currentPosition,
          targetCharacter.position,
          targetDistance
        )
      }

      // Try to find feature with this name
      const targetFeature = await prisma.locationFeature.findFirst({
        where: {
          locationId: session.state.locationId,
          name: {
            contains: targetName,
            mode: 'insensitive',
          },
        },
      })

      if (targetFeature) {
        // Move close to feature (1 meter)
        return this.calculatePositionAtDistance(
          currentPosition,
          { x: targetFeature.x, y: targetFeature.y, z: targetFeature.z },
          1.0
        )
      }
    }

    // If no specific target, return null (AI will suggest)
    return null
  }

  /**
   * Calculate position at specific distance from target
   */
  private calculatePositionAtDistance(
    from: Position3D,
    to: Position3D,
    targetDistance: number
  ): Position3D {
    const dx = to.x - from.x
    const dy = to.y - from.y
    const dz = to.z - from.z
    const currentDistance = Math.sqrt(dx * dx + dy * dy + dz * dz)

    if (currentDistance <= targetDistance) {
      // Already at appropriate distance
      return from
    }

    // Calculate unit vector
    const ratio = (currentDistance - targetDistance) / currentDistance

    return {
      x: from.x + dx * ratio,
      y: from.y + dy * ratio,
      z: from.z + dz * ratio,
    }
  }

  /**
   * Validate if a target name exists in the session context
   */
  async validateTarget(
    targetName: string,
    sessionId: string
  ): Promise<{ exists: boolean; type?: 'character' | 'feature' }> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        campaign: {
          include: {
            characters: true,
          },
        },
        state: true,
      },
    })

    if (!session) {
      return { exists: false }
    }

    // Check characters
    const character = session.campaign.characters.find(
      c => c.name.toLowerCase().includes(targetName.toLowerCase())
    )
    if (character) {
      return { exists: true, type: 'character' }
    }

    // Check features
    if (session.state?.locationId) {
      const feature = await prisma.locationFeature.findFirst({
        where: {
          locationId: session.state.locationId,
          name: {
            contains: targetName,
            mode: 'insensitive',
          },
        },
      })
      if (feature) {
        return { exists: true, type: 'feature' }
      }
    }

    return { exists: false }
  }

  /**
   * Helper to check if input contains any of the keywords
   */
  private containsKeywords(input: string, keywords: string[]): boolean {
    return keywords.some(keyword => input.includes(keyword))
  }
}

export const movementDetectorService = new MovementDetectorService()

