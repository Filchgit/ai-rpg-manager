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

const CharacterSchema = z.object({
  campaignId: z.string(),
  name: z.string().min(1).max(100),
  race: z.string().optional(),
  class: z.string().optional(),
  level: z.number().min(1).max(20).optional(),
  stats: CharacterStatsSchema.optional(),
  backstory: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = CharacterSchema.parse(body)
    const character = await characterService.createCharacter(validatedData)
    return NextResponse.json(character, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('Error creating character:', error)
    return NextResponse.json({ error: 'Failed to create character' }, { status: 500 })
  }
}

