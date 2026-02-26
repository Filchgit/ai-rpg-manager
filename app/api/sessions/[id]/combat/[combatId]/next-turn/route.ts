import { NextResponse } from 'next/server'
import { combatManagerService } from '@/services/combat-manager'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ combatId: string }> }
) {
  try {
    const { combatId } = await params
    const result = await combatManagerService.nextTurn(combatId)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error: any) {
    console.error('Error advancing turn:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to advance turn' },
      { status: 500 }
    )
  }
}
