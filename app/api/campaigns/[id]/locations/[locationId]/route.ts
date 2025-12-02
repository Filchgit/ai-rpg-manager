import { NextRequest, NextResponse } from 'next/server'
import { locationService } from '@/services/location-service'
import { z } from 'zod'

const LocationUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).optional(),
  minX: z.number().optional(),
  maxX: z.number().optional(),
  minY: z.number().optional(),
  maxY: z.number().optional(),
  minZ: z.number().optional(),
  maxZ: z.number().optional(),
  unitType: z.string().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; locationId: string }> }
) {
  try {
    const { locationId } = await params
    const location = await locationService.getLocationById(locationId)
    return NextResponse.json(location)
  } catch (error) {
    if (error instanceof Error && error.message === 'Location not found') {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }
    console.error('Error fetching location:', error)
    return NextResponse.json(
      { error: 'Failed to fetch location' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; locationId: string }> }
) {
  try {
    const { locationId } = await params
    const body = await request.json()
    const data = LocationUpdateSchema.parse(body)
    const location = await locationService.updateLocation(locationId, data)
    return NextResponse.json(location)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('Error updating location:', error)
    return NextResponse.json(
      { error: 'Failed to update location' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; locationId: string }> }
) {
  try {
    const { locationId } = await params
    await locationService.deleteLocation(locationId)
    return NextResponse.json({ message: 'Location deleted' })
  } catch (error) {
    console.error('Error deleting location:', error)
    return NextResponse.json(
      { error: 'Failed to delete location' },
      { status: 500 }
    )
  }
}

