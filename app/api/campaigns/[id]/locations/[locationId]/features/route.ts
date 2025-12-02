import { NextRequest, NextResponse } from 'next/server'
import { locationService } from '@/services/location-service'
import { z } from 'zod'

const FeatureCreateSchema = z.object({
  type: z.enum(['OBSTACLE', 'POI', 'DOOR', 'FURNITURE', 'TERRAIN', 'HAZARD']),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  x: z.number(),
  y: z.number(),
  z: z.number(),
  width: z.number().optional(),
  height: z.number().optional(),
  depth: z.number().optional(),
  blocksMovement: z.boolean().optional(),
  blocksVision: z.boolean().optional(),
  providesCover: z.enum(['NONE', 'HALF', 'THREE_QUARTERS', 'FULL']).optional(),
  elevation: z.number().optional(),
  metadata: z.record(z.any()).optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; locationId: string }> }
) {
  try {
    const { locationId } = await params
    const body = await request.json()
    const data = FeatureCreateSchema.parse(body)
    
    const feature = await locationService.createFeature({
      locationId,
      ...data,
    })
    
    return NextResponse.json(feature, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('Error creating feature:', error)
    return NextResponse.json(
      { error: 'Failed to create feature' },
      { status: 500 }
    )
  }
}

