import { NextRequest, NextResponse } from 'next/server'
import { knowledgeManagerService } from '@/services/knowledge-manager'
import { z } from 'zod'

const KnowledgeCreateSchema = z.object({
  category: z.enum([
    'LOCATION',
    'NPC',
    'ITEM',
    'LORE',
    'FACTION',
    'QUEST',
    'OTHER',
  ]),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
  keywords: z.array(z.string()).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const query = searchParams.get('query')

    if (query) {
      const results = await knowledgeManagerService.searchKnowledge(
        campaignId,
        query
      )
      return NextResponse.json(results)
    }

    const knowledge = await knowledgeManagerService.getCampaignKnowledge(
      campaignId,
      category as any
    )
    return NextResponse.json(knowledge)
  } catch (error) {
    console.error('Error fetching campaign knowledge:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaign knowledge' },
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
    const data = KnowledgeCreateSchema.parse(body)

    const knowledge = await knowledgeManagerService.createKnowledge({
      campaignId,
      ...data,
    })

    return NextResponse.json(knowledge, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('Error creating knowledge:', error)
    return NextResponse.json(
      { error: 'Failed to create knowledge entry' },
      { status: 500 }
    )
  }
}




