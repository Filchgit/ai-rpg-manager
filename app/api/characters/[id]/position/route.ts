import { NextRequest, NextResponse } from 'next/server'
import { locationService } from '@/services/location-service'
import { z } from 'zod'

const PositionUpdateSchema = z.object({
  locationId: z.string().nullable().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  z: z.number().optional(),
  facing: z.number().min(0).max(360).nullable().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: characterId } = await params
    const position = await locationService.getOrCreateCharacterPosition(characterId)
    return NextResponse.json(position)
  } catch (error) {
    console.error('Error fetching character position:', error)
    return NextResponse.json(
      { error: 'Failed to fetch character position' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: characterId } = await params
    const body = await request.json()
    const data = PositionUpdateSchema.parse(body)
    
    const position = await locationService.updateCharacterPosition({
      characterId,
      ...data,
    })
    
    return NextResponse.json(position)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('Error updating character position:', error)
    return NextResponse.json(
      { error: 'Failed to update character position' },
      { status: 500 }
    )
  }
}

