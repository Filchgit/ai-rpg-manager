import { NextResponse } from 'next/server'
import { combatManagerService } from '@/services/combat-manager'

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
