import { NextRequest, NextResponse } from 'next/server'
import { knowledgeManagerService } from '@/services/knowledge-manager'
import { z } from 'zod'

const KnowledgeUpdateSchema = z.object({
  category: z
    .enum(['LOCATION', 'NPC', 'ITEM', 'LORE', 'FACTION', 'QUEST', 'OTHER'])
    .optional(),
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(5000).optional(),
  keywords: z.array(z.string()).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; knowledgeId: string }> }
) {
  try {
    const { knowledgeId } = await params
    const knowledge = await knowledgeManagerService.getKnowledge(knowledgeId)

    if (!knowledge) {
      return NextResponse.json(
        { error: 'Knowledge entry not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(knowledge)
  } catch (error) {
    console.error('Error fetching knowledge:', error)
    return NextResponse.json(
      { error: 'Failed to fetch knowledge entry' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; knowledgeId: string }> }
) {
  try {
    const { knowledgeId } = await params
    const body = await request.json()
    const data = KnowledgeUpdateSchema.parse(body)

    const knowledge = await knowledgeManagerService.updateKnowledge(
      knowledgeId,
      data
    )
    return NextResponse.json(knowledge)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('Error updating knowledge:', error)
    return NextResponse.json(
      { error: 'Failed to update knowledge entry' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; knowledgeId: string }> }
) {
  try {
    const { knowledgeId } = await params
    await knowledgeManagerService.deleteKnowledge(knowledgeId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting knowledge:', error)
    return NextResponse.json(
      { error: 'Failed to delete knowledge entry' },
      { status: 500 }
    )
  }
}


