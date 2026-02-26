import { NextResponse } from 'next/server'
import { combatManagerService } from '@/services/combat-manager'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ combatId: string }> }
) {
  try {
    const { combatId } = await params
    const body = await request.json()
    const { combatantId, amount, source } = body

    if (!combatantId || amount === undefined) {
      return NextResponse.json(
        { error: 'combatantId and amount are required' },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Damage amount must be positive' },
        { status: 400 }
      )
    }

    const result = await combatManagerService.applyDamage(combatantId, amount, source)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error: any) {
    console.error('Error applying damage:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to apply damage' },
      { status: 500 }
    )
  }
}
