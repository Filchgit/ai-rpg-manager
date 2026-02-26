import { NextResponse } from 'next/server'
import { rateLimitService } from '@/lib/rate-limit'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const status = await rateLimitService.getRateLimitStatus(id)
    return NextResponse.json(status)
  } catch (error) {
    console.error('Error fetching rate limit status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch rate limit status' },
      { status: 500 }
    )
  }
}
