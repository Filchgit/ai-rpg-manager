import { NextRequest, NextResponse } from 'next/server'
import { characterService } from '@/services/character-service'
import { z } from 'zod'

const CharacterStatsSchema = z.object({
  strength: z.number().min(1).max(20),
  dexterity: z.number().min(1).max(20),
  constitution: z.number().min(1).max(20),
  intelligence: z.number().min(1).max(20),
  wisdom: z.number().min(1).max(20),
  charisma: z.number().min(1).max(20),
})

const CharacterUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  race: z.string().optional(),
  class: z.string().optional(),
  level: z.number().min(1).max(20).optional(),
  stats: CharacterStatsSchema.optional(),
  backstory: z.string().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const character = await characterService.getCharacterById(id)
    return NextResponse.json(character)
  } catch (error) {
    if (error instanceof Error && error.message === 'Character not found') {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 })
    }
    console.error('Error fetching character:', error)
    return NextResponse.json({ error: 'Failed to fetch character' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const validatedData = CharacterUpdateSchema.parse(body)
    const character = await characterService.updateCharacter(id, validatedData)
    return NextResponse.json(character)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('Error updating character:', error)
    return NextResponse.json({ error: 'Failed to update character' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await characterService.deleteCharacter(id)
    return NextResponse.json({ message: 'Character deleted' })
  } catch (error) {
    console.error('Error deleting character:', error)
    return NextResponse.json({ error: 'Failed to delete character' }, { status: 500 })
  }
}

