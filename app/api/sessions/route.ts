import { NextRequest, NextResponse } from 'next/server'
import { sessionService } from '@/services/session-service'
import { z } from 'zod'

const SessionSchema = z.object({
  campaignId: z.string(),
  name: z.string().min(1).max(100),
  notes: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = SessionSchema.parse(body)
    const session = await sessionService.createSession(validatedData)
    return NextResponse.json(session, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error creating session:', error)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}

