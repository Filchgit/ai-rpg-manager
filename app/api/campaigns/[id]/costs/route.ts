import { NextRequest, NextResponse } from 'next/server'
import { costTrackingService } from '@/services/cost-tracking'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params
    const { searchParams } = new URL(request.url)
    const trendDays = parseInt(searchParams.get('trendDays') || '30', 10)

    let costSummary
    let costTrends
    
    try {
      // Try the new method that includes deleted sessions from snapshots
      [costSummary, costTrends] = await Promise.all([
        costTrackingService.getCampaignCostSummaryWithHistory(campaignId),
        costTrackingService.getCampaignCostTrends(campaignId, trendDays),
      ])
    } catch (snapshotError) {
      // Fallback to old method if tables don't exist yet (migration not applied)
      console.log('Falling back to old cost calculation method:', snapshotError)
      ;[costSummary, costTrends] = await Promise.all([
        costTrackingService.getCampaignCostSummary(campaignId),
        costTrackingService.getCampaignCostTrends(campaignId, trendDays),
      ])
    }

    return NextResponse.json({
      summary: costSummary,
      trends: costTrends,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Campaign not found') {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }
    console.error('Error fetching campaign costs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaign costs' },
      { status: 500 }
    )
  }
}


