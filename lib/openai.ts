import OpenAI from 'openai'
import { AIResponse, AIPromptContext } from '@/types'

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
}

export const openaiService = new OpenAIService()

