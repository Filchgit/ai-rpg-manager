import { NextRequest, NextResponse } from 'next/server'
import { aiDungeonMasterService } from '@/services/ai-dungeon-master'
import { costTrackingService } from '@/services/cost-tracking'
import { z } from 'zod'

const MessageSchema = z.object({
  content: z.string().min(1).max(1000),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params
    const body = await request.json()
    const { content } = MessageSchema.parse(body)

    const response = await aiDungeonMasterService.generateResponse(sessionId, content)
    
    // Update cost snapshot after each AI response (only if tables exist)
    try {
      await costTrackingService.updateSessionCostSnapshot(sessionId)
    } catch (costError) {
      // Silently fail if tables don't exist yet (migration not applied)
      if (costError instanceof Error && !costError.message.includes('does not exist')) {
        console.error('Error updating cost snapshot:', costError)
      }
      // Don't fail the request if cost tracking fails
    }
    
    return NextResponse.json(response)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    if (error instanceof Error && error.message.includes('Rate limit exceeded')) {
      return NextResponse.json({ error: error.message }, { status: 429 })
    }
    console.error('Error generating AI response:', error)
    return NextResponse.json(
      { error: 'Failed to generate AI response' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params
    const messages = await aiDungeonMasterService.getSessionHistory(sessionId)
    return NextResponse.json(messages)
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

