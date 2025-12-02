import { NextRequest, NextResponse } from 'next/server'
import { locationService } from '@/services/location-service'
import { z } from 'zod'

const LocationCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1),
  minX: z.number(),
  maxX: z.number(),
  minY: z.number(),
  maxY: z.number(),
  minZ: z.number(),
  maxZ: z.number(),
  unitType: z.string().optional(),
})

const LocationTemplateSchema = z.object({
  template: z.enum(['tavern', 'dungeon_room', 'forest_clearing']),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params
    const locations = await locationService.getCampaignLocations(campaignId)
    return NextResponse.json(locations)
  } catch (error) {
    console.error('Error fetching locations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch locations' },
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

    // Check if this is a template request
    if ('template' in body) {
      const { template } = LocationTemplateSchema.parse(body)
      const location = await locationService.createFromTemplate(campaignId, template)
      return NextResponse.json(location, { status: 201 })
    }

    // Otherwise, create from explicit data
    const data = LocationCreateSchema.parse(body)
    const location = await locationService.createLocation({
      campaignId,
      ...data,
    })
    return NextResponse.json(location, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('Error creating location:', error)
    return NextResponse.json(
      { error: 'Failed to create location' },
      { status: 500 }
    )
  }
}

