import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const MovementRuleCreateSchema = z.object({
  name: z.string().min(1).max(100),
  maxDistance: z.number().positive(),
  interactionType: z.enum([
    'MELEE',
    'RANGED',
    'SPELL',
    'CONVERSATION',
    'PERCEPTION',
    'CUSTOM',
  ]),
  requiresLineOfSight: z.boolean().optional(),
  description: z.string().min(1),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params
    const rules = await prisma.movementRule.findMany({
      where: { campaignId },
      orderBy: { interactionType: 'asc' },
    })
    return NextResponse.json(rules)
  } catch (error) {
    console.error('Error fetching movement rules:', error)
    return NextResponse.json(
      { error: 'Failed to fetch movement rules' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params
    const body = await request.json()
    const data = MovementRuleCreateSchema.parse(body)
    
    const rule = await prisma.movementRule.create({
      data: {
        campaignId,
        ...data,
        requiresLineOfSight: data.requiresLineOfSight ?? false,
      },
    })
    
    return NextResponse.json(rule, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('Error creating movement rule:', error)
    return NextResponse.json(
      { error: 'Failed to create movement rule' },
      { status: 500 }
    )
  }
}

