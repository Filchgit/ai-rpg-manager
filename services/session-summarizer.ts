import { prisma } from '@/lib/db'
import { openaiService } from '@/lib/openai'

const AUTO_SUMMARIZE_MESSAGE_THRESHOLD = parseInt(
  process.env.AUTO_SUMMARIZE_MESSAGE_THRESHOLD || '15',
  10
)
const SUMMARY_MAX_TOKENS = parseInt(process.env.SUMMARY_MAX_TOKENS || '300', 10)

interface KeyEvent {
  type: 'dice_roll' | 'combat' | 'decision' | 'discovery' | 'dialogue'
  description: string
  timestamp: Date
}

export class SessionSummarizerService {
  /**
   * Check if session needs summarization
   */
  async needsSummarization(sessionId: string): Promise<boolean> {
    const lastSummary = await prisma.sessionSummary.findFirst({
      where: { sessionId },
      orderBy: { messageRangeEnd: 'desc' },
    })

    const totalMessages = await prisma.message.count({
      where: { sessionId },
    })

    if (!lastSummary) {
      return totalMessages >= AUTO_SUMMARIZE_MESSAGE_THRESHOLD
    }

    const messagesSinceLastSummary = totalMessages - lastSummary.messageRangeEnd
    return messagesSinceLastSummary >= AUTO_SUMMARIZE_MESSAGE_THRESHOLD
  }

  /**
   * Generate summary for a session
   * Hybrid approach: rule-based for mechanics, AI for narrative
   */
  async generateSummary(sessionId: string): Promise<void> {
    const lastSummary = await prisma.sessionSummary.findFirst({
      where: { sessionId },
      orderBy: { messageRangeEnd: 'desc' },
    })

    const startMessageNumber = lastSummary ? lastSummary.messageRangeEnd + 1 : 1

    // Get messages to summarize
    const allMessages = await prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    })

    const messagesToSummarize = allMessages.slice(startMessageNumber - 1)

    if (messagesToSummarize.length === 0) {
      return
    }

    // Extract key events using rules
    const keyEvents = this.extractKeyEvents(messagesToSummarize)

    // Generate narrative summary using AI
    const narrativeSummary = await this.generateNarrativeSummary(
      messagesToSummarize
    )

    // Combine into final summary
    const fullSummary = this.combineSummary(narrativeSummary, keyEvents)

    // Save summary
    await prisma.sessionSummary.create({
      data: {
        sessionId,
        messageRangeStart: startMessageNumber,
        messageRangeEnd: allMessages.length,
        summary: fullSummary,
        keyEvents: keyEvents,
      },
    })
  }

  /**
   * Extract key events using rule-based patterns
   */
  private extractKeyEvents(messages: any[]): KeyEvent[] {
    const keyEvents: KeyEvent[] = []

    messages.forEach((message) => {
      const content = message.content.toLowerCase()

      // Detect dice rolls
      if (content.match(/\b(?:roll|rolled|rolls)\b.*\bd\d+\b/i)) {
        keyEvents.push({
          type: 'dice_roll',
          description: this.extractSentence(message.content, 'roll'),
          timestamp: message.createdAt,
        })
      }

      // Detect combat
      if (
        content.match(
          /\b(?:attack|damage|hit|miss|defeat|kill|wound|injure|strike)\b/i
        )
      ) {
        keyEvents.push({
          type: 'combat',
          description: this.extractSentence(message.content, 'attack|damage|hit'),
          timestamp: message.createdAt,
        })
      }

      // Detect major decisions
      if (
        content.match(
          /\b(?:decide|choose|pick|select|agree to|refuse to|accept|decline)\b/i
        )
      ) {
        keyEvents.push({
          type: 'decision',
          description: this.extractSentence(message.content, 'decide|choose'),
          timestamp: message.createdAt,
        })
      }

      // Detect discoveries
      if (
        content.match(
          /\b(?:find|discover|locate|uncover|reveal|notice|spot|see)\b/i
        )
      ) {
        keyEvents.push({
          type: 'discovery',
          description: this.extractSentence(message.content, 'find|discover'),
          timestamp: message.createdAt,
        })
      }

      // Detect important dialogue (dialogue with NPCs)
      if (
        content.match(/\b(?:says|tells|asks|responds|replies|whispers)\b/i) &&
        message.role === 'ASSISTANT'
      ) {
        keyEvents.push({
          type: 'dialogue',
          description: this.extractSentence(message.content, 'says|tells|asks'),
          timestamp: message.createdAt,
        })
      }
    })

    // Limit to most important events (max 10)
    return keyEvents.slice(0, 10)
  }

  /**
   * Extract the sentence containing a keyword
   */
  private extractSentence(text: string, keyword: string): string {
    const regex = new RegExp(`[^.!?]*\\b(?:${keyword})\\b[^.!?]*[.!?]`, 'i')
    const match = text.match(regex)
    if (match) {
      return match[0].trim().substring(0, 150) // Limit length
    }
    return text.substring(0, 150)
  }

  /**
   * Generate narrative summary using AI
   */
  private async generateNarrativeSummary(messages: any[]): Promise<string> {
    // Build conversation for AI to summarize
    const conversation = messages
      .map((m) => {
        const role = m.role === 'USER' ? 'Player' : 'DM'
        return `${role}: ${m.content}`
      })
      .join('\n\n')

    const systemPrompt = `You are a helpful assistant that creates concise summaries of tabletop RPG sessions. 
Focus on the narrative flow, character development, and story progression.
Keep the summary under 200 words. Write in past tense.`

    const userPrompt = `Please summarize the following RPG session exchange:\n\n${conversation}`

    try {
      const response = await openaiService.generateStoryResponse(userPrompt, {
        campaignName: 'Summary Generation',
        recentHistory: [],
      })

      return response.content
    } catch (error) {
      console.error('Failed to generate AI summary:', error)
      // Fallback to simple rule-based summary
      return this.generateFallbackSummary(messages)
    }
  }

  /**
   * Fallback summary if AI fails
   */
  private generateFallbackSummary(messages: any[]): string {
    const playerActions = messages
      .filter((m) => m.role === 'USER')
      .map((m) => m.content)
      .slice(0, 5)

    return `The session included ${messages.length} exchanges. Key player actions: ${playerActions.join('; ')}`
  }

  /**
   * Combine narrative and key events into final summary
   */
  private combineSummary(narrative: string, keyEvents: KeyEvent[]): string {
    let summary = narrative

    if (keyEvents.length > 0) {
      summary += '\n\nKey Events:\n'
      keyEvents.forEach((event) => {
        summary += `- [${event.type}] ${event.description}\n`
      })
    }

    return summary
  }

  /**
   * Manually trigger summarization for a session
   */
  async triggerSummarization(sessionId: string): Promise<void> {
    await this.generateSummary(sessionId)
  }

  /**
   * Get all summaries for a session
   */
  async getSessionSummaries(sessionId: string) {
    return await prisma.sessionSummary.findMany({
      where: { sessionId },
      orderBy: { messageRangeEnd: 'asc' },
    })
  }

  /**
   * Get latest summary for a session
   */
  async getLatestSummary(sessionId: string) {
    return await prisma.sessionSummary.findFirst({
      where: { sessionId },
      orderBy: { messageRangeEnd: 'desc' },
    })
  }

  /**
   * Auto-summarize if threshold is met
   */
  async autoSummarizeIfNeeded(sessionId: string): Promise<boolean> {
    const needs = await this.needsSummarization(sessionId)
    if (needs) {
      await this.generateSummary(sessionId)
      return true
    }
    return false
  }
}

export const sessionSummarizerService = new SessionSummarizerService()


