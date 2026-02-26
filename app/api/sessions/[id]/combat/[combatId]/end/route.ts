import { NextResponse } from 'next/server'
import { combatManagerService } from '@/services/combat-manager'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ combatId: string }> }
) {
  try {
    const { combatId } = await params
    const result = await combatManagerService.endCombat(combatId)

    return NextResponse.json({
      success: true,
      combat: result,
    })
  } catch (error: any) {
    console.error('Error ending combat:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to end combat' },
      { status: 500 }
    )
  }
}
