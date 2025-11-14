import { NextRequest, NextResponse } from 'next/server'
import { aiDungeonMasterService } from '@/services/ai-dungeon-master'
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
    return NextResponse.json(response)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
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

