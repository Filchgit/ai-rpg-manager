import { NextResponse } from 'next/server'
import { combatManagerService } from '@/services/combat-manager'

// POST - Add condition
export async function POST(
  request: Request,
  { params }: { params: Promise<{ combatId: string }> }
) {
  try {
    const { combatId } = await params
    const body = await request.json()
    const { combatantId, condition } = body

    if (!combatantId || !condition) {
      return NextResponse.json(
        { error: 'combatantId and condition are required' },
        { status: 400 }
      )
    }

    const result = await combatManagerService.addCondition(combatantId, condition)

    return NextResponse.json({
      success: true,
      combatant: result,
    })
  } catch (error: any) {
    console.error('Error adding condition:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to add condition' },
      { status: 500 }
    )
  }
}

// DELETE - Remove condition
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ combatId: string }> }
) {
  try {
    const { combatId } = await params
    const body = await request.json()
    const { combatantId, condition } = body

    if (!combatantId || !condition) {
      return NextResponse.json(
        { error: 'combatantId and condition are required' },
        { status: 400 }
      )
    }

    const result = await combatManagerService.removeCondition(combatantId, condition)

    return NextResponse.json({
      success: true,
      combatant: result,
    })
  } catch (error: any) {
    console.error('Error removing condition:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to remove condition' },
      { status: 500 }
    )
  }
}
