import { NextRequest, NextResponse } from 'next/server'
import { costTrackingService } from '@/services/cost-tracking'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params

    const costSummary = await costTrackingService.getSessionCostSummary(sessionId)
    const budgetStatus = await costTrackingService.checkSessionBudget(sessionId)

    return NextResponse.json({
      summary: costSummary,
      budget: budgetStatus,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Session not found') {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }
    console.error('Error fetching session costs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch session costs' },
      { status: 500 }
    )
  }
}


