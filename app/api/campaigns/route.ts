import { NextRequest, NextResponse } from 'next/server'
import { campaignService } from '@/services/campaign-service'
import { z } from 'zod'

const CampaignSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  worldSettings: z.string().optional(),
  aiGuidelines: z.string().optional(),
})

export async function GET() {
  try {
    const campaigns = await campaignService.getCampaigns()
    return NextResponse.json(campaigns)
  } catch (error) {
    console.error('Error fetching campaigns:', error)
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = CampaignSchema.parse(body)
    const campaign = await campaignService.createCampaign(validatedData)
    return NextResponse.json(campaign, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error creating campaign:', error)
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
  }
}

