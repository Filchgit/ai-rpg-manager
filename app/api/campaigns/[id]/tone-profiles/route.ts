import { NextRequest, NextResponse } from 'next/server'
import { knowledgeManagerService } from '@/services/knowledge-manager'
import { z } from 'zod'

const ToneProfileCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  conditions: z.record(z.any()).optional(),
  toneRules: z.string().min(1).max(2000),
  priority: z.number().int().min(0).max(100).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params
    const profiles = await knowledgeManagerService.getCampaignToneProfiles(
      campaignId
    )
    return NextResponse.json(profiles)
  } catch (error) {
    console.error('Error fetching tone profiles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tone profiles' },
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
    const data = ToneProfileCreateSchema.parse(body)

    const profile = await knowledgeManagerService.createToneProfile({
      campaignId,
      ...data,
    })

    return NextResponse.json(profile, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('Error creating tone profile:', error)
    return NextResponse.json(
      { error: 'Failed to create tone profile' },
      { status: 500 }
    )
  }
}


