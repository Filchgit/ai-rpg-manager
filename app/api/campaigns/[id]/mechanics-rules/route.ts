import { NextRequest, NextResponse } from 'next/server'
import { knowledgeManagerService } from '@/services/knowledge-manager'
import { z } from 'zod'

const MechanicsRuleCreateSchema = z.object({
  category: z.enum([
    'COMBAT',
    'SKILL_CHECK',
    'MAGIC',
    'SOCIAL',
    'EXPLORATION',
    'REST',
    'OTHER',
  ]),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(3000),
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

    const rules = await knowledgeManagerService.getCampaignMechanicsRules(
      campaignId,
      category || undefined
    )
    return NextResponse.json(rules)
  } catch (error) {
    console.error('Error fetching mechanics rules:', error)
    return NextResponse.json(
      { error: 'Failed to fetch mechanics rules' },
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
    const data = MechanicsRuleCreateSchema.parse(body)

    const rule = await knowledgeManagerService.createMechanicsRule({
      campaignId,
      ...data,
    })

    return NextResponse.json(rule, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('Error creating mechanics rule:', error)
    return NextResponse.json(
      { error: 'Failed to create mechanics rule' },
      { status: 500 }
    )
  }
}


