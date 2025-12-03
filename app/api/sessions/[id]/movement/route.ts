import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { spatialService } from '@/services/spatial-service'
import { z } from 'zod'

const MovementSuggestSchema = z.object({
  characterId: z.string(),
  targetPosition: z.object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
  }),
  actionType: z.enum(['MELEE', 'RANGED', 'SPELL', 'CONVERSATION', 'PERCEPTION', 'CUSTOM', 'MOVEMENT']),
  reason: z.string().optional(),
  targetName: z.string().optional(),
})

const MovementApplySchema = z.object({
  characterId: z.string(),
  targetPosition: z.object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
  }),
  reason: z.string().optional(),
  facing: z.number().optional(),
})

/**
 * POST /api/sessions/[id]/movement/suggest
 * Calculate and validate a movement suggestion without applying it
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params
    const body = await request.json()

    // Handle different endpoints based on URL
    const url = new URL(request.url)
    const action = url.searchParams.get('action')

    if (action === 'suggest') {
      return await handleSuggest(sessionId, body)
    } else if (action === 'apply') {
      return await handleApply(sessionId, body)
    } else if (action === 'reject') {
      return await handleReject(sessionId, body)
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use ?action=suggest, ?action=apply, or ?action=reject' },
        { status: 400 }
      )
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('Error in movement endpoint:', error)
    return NextResponse.json(
      { error: 'Failed to process movement request' },
      { status: 500 }
    )
  }
}

/**
 * Suggest a movement (calculate and validate)
 */
async function handleSuggest(sessionId: string, body: any) {
  const data = MovementSuggestSchema.parse(body)

  // Get session and character position
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      state: true,
    },
  })

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  if (!session.state?.locationId) {
    return NextResponse.json(
      { error: 'Session has no active location' },
      { status: 400 }
    )
  }

  // Get current character position
  const currentPosition = await prisma.characterPosition.findUnique({
    where: { characterId: data.characterId },
  })

  if (!currentPosition) {
    return NextResponse.json(
      { error: 'Character position not found' },
      { status: 404 }
    )
  }

  // Validate movement
  const validation = await spatialService.validateMovement(
    { x: currentPosition.x, y: currentPosition.y, z: currentPosition.z },
    data.targetPosition,
    session.state.locationId
  )

  // Calculate distance
  const distance = spatialService.calculateDistance(
    { x: currentPosition.x, y: currentPosition.y, z: currentPosition.z },
    data.targetPosition
  )

  // Get character name
  const character = await prisma.character.findUnique({
    where: { id: data.characterId },
    select: { name: true },
  })

  return NextResponse.json({
    id: `mov_${Date.now()}`,
    characterId: data.characterId,
    characterName: character?.name || 'Unknown',
    from: {
      x: currentPosition.x,
      y: currentPosition.y,
      z: currentPosition.z,
    },
    to: data.targetPosition,
    reason: data.reason || 'Movement requested',
    targetName: data.targetName,
    actionType: data.actionType,
    distance,
    locationId: session.state.locationId,
    isValid: validation.isValid,
    validationIssues: validation.warnings,
    blockedBy: validation.blockedBy,
  })
}

/**
 * Apply a movement (update database)
 */
async function handleApply(sessionId: string, body: any) {
  const data = MovementApplySchema.parse(body)

  // Get session to validate
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      state: true,
    },
  })

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  if (!session.state?.locationId) {
    return NextResponse.json(
      { error: 'Session has no active location' },
      { status: 400 }
    )
  }

  // Get current position
  const currentPosition = await prisma.characterPosition.findUnique({
    where: { characterId: data.characterId },
  })

  if (!currentPosition) {
    return NextResponse.json(
      { error: 'Character position not found' },
      { status: 404 }
    )
  }

  // Validate movement one more time
  const validation = await spatialService.validateMovement(
    { x: currentPosition.x, y: currentPosition.y, z: currentPosition.z },
    data.targetPosition,
    session.state.locationId
  )

  if (!validation.isValid) {
    return NextResponse.json(
      {
        error: 'Invalid movement',
        issues: validation.warnings,
        blockedBy: validation.blockedBy,
      },
      { status: 400 }
    )
  }

  // Update character position
  const updatedPosition = await prisma.characterPosition.update({
    where: { characterId: data.characterId },
    data: {
      x: data.targetPosition.x,
      y: data.targetPosition.y,
      z: data.targetPosition.z,
      facing: data.facing,
    },
    include: {
      character: {
        select: {
          name: true,
        },
      },
    },
  })

  // Add movement event to session state
  if (session.state) {
    const existingEvents = (session.state.recentEvents || []) as string[]
    const movementEvent = {
      type: 'movement',
      characterId: data.characterId,
      characterName: updatedPosition.character.name,
      from: {
        x: currentPosition.x,
        y: currentPosition.y,
        z: currentPosition.z,
      },
      to: data.targetPosition,
      reason: data.reason || 'Movement',
      timestamp: new Date().toISOString(),
    }

    // Keep last 5 events
    const newEvents = [JSON.stringify(movementEvent), ...existingEvents].slice(0, 5)

    await prisma.sessionState.update({
      where: { id: session.state.id },
      data: {
        recentEvents: newEvents,
      },
    })
  }

  return NextResponse.json({
    success: true,
    position: {
      x: updatedPosition.x,
      y: updatedPosition.y,
      z: updatedPosition.z,
      facing: updatedPosition.facing,
    },
    message: 'Movement applied successfully',
  })
}

/**
 * Reject a movement suggestion (just logs, no database changes)
 */
async function handleReject(sessionId: string, body: any) {
  const { suggestionId, reason } = body

  // In the future, could log rejections for analytics
  console.log(`Movement suggestion ${suggestionId} rejected for session ${sessionId}:`, reason)

  return NextResponse.json({
    success: true,
    message: 'Movement suggestion rejected',
  })
}

