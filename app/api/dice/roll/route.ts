import { NextResponse } from 'next/server'
import { diceRollerService } from '@/services/dice-roller'
import { prisma } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { formula, sessionId, characterId, rollType, triggeredBy, metadata } = body

    // Validate required fields
    if (!formula) {
      return NextResponse.json(
        { error: 'Formula is required' },
        { status: 400 }
      )
    }

    // Validate formula
    const validation = diceRollerService.validateFormula(formula)
    if (!validation.valid) {
      return NextResponse.json(
        { error: `Invalid dice formula: ${validation.error}` },
        { status: 400 }
      )
    }

    // Roll the dice
    const rollResult = diceRollerService.roll(formula)

    // Log to database if sessionId provided
    let diceRollLog = null
    if (sessionId) {
      diceRollLog = await prisma.diceRollLog.create({
        data: {
          sessionId,
          characterId: characterId || null,
          rollType: rollType || 'custom',
          formula: rollResult.formula,
          result: rollResult.total,
          breakdown: {
            breakdown: rollResult.breakdown,
            rolls: rollResult.rolls,
            modifiers: rollResult.modifiers,
            kept: rollResult.kept,
            dropped: rollResult.dropped,
          },
          triggeredBy: triggeredBy || null,
          metadata: metadata || null,
        },
      })
    }

    return NextResponse.json({
      success: true,
      roll: rollResult,
      logId: diceRollLog?.id,
    })
  } catch (error: any) {
    console.error('Error rolling dice:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to roll dice' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const characterId = searchParams.get('characterId')
    const rollType = searchParams.get('rollType')
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      )
    }

    // Build query filters
    const where: any = { sessionId }
    if (characterId) where.characterId = characterId
    if (rollType) where.rollType = rollType

    // Fetch dice roll history
    const rolls = await prisma.diceRollLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100), // Max 100 rolls
      include: {
        character: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      rolls,
      count: rolls.length,
    })
  } catch (error: any) {
    console.error('Error fetching dice rolls:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dice rolls' },
      { status: 500 }
    )
  }
}
