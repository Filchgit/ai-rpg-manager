import { NextResponse } from 'next/server'
import { combatManagerService } from '@/services/combat-manager'

// GET - Get combat state
export async function GET(
  request: Request,
  { params }: { params: Promise<{ combatId: string }> }
) {
  try {
    const { combatId } = await params
    const state = await combatManagerService.getCombatState(combatId)

    return NextResponse.json({
      success: true,
      state,
    })
  } catch (error: any) {
    console.error('Error getting combat state:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get combat state' },
      { status: 500 }
    )
  }
}

// POST - Roll initiative
export async function POST(
  request: Request,
  { params }: { params: Promise<{ combatId: string }> }
) {
  try {
    const { combatId } = await params
    const result = await combatManagerService.rollInitiative(combatId)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error: any) {
    console.error('Error rolling initiative:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to roll initiative' },
      { status: 500 }
    )
  }
}
