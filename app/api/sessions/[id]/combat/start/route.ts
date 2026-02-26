import { NextResponse } from 'next/server'
import { combatManagerService } from '@/services/combat-manager'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params
    const body = await request.json()
    const { combatants } = body

    if (!combatants || !Array.isArray(combatants) || combatants.length === 0) {
      return NextResponse.json(
        { error: 'At least one combatant is required' },
        { status: 400 }
      )
    }

    // Validate combatants
    for (const combatant of combatants) {
      if (!combatant.name || !combatant.maxHP) {
        return NextResponse.json(
          { error: 'Each combatant must have a name and maxHP' },
          { status: 400 }
        )
      }
    }

    const combatSession = await combatManagerService.startCombat(sessionId, combatants)

    return NextResponse.json({
      success: true,
      combat: combatSession,
    })
  } catch (error: any) {
    console.error('Error starting combat:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to start combat' },
      { status: 500 }
    )
  }
}
