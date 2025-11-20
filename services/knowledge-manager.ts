import { prisma } from '@/lib/db'

export type KnowledgeCategoryType =
  | 'LOCATION'
  | 'NPC'
  | 'ITEM'
  | 'LORE'
  | 'FACTION'
  | 'QUEST'
  | 'OTHER'

export interface KnowledgeCreateInput {
  campaignId: string
  category: KnowledgeCategoryType
  title: string
  content: string
  keywords?: string[]
}

export interface KnowledgeUpdateInput {
  category?: KnowledgeCategoryType
  title?: string
  content?: string
  keywords?: string[]
}

export interface ToneProfileCreateInput {
  campaignId: string
  name: string
  description?: string
  conditions?: Record<string, any>
  toneRules: string
  priority?: number
}

export interface ToneProfileUpdateInput {
  name?: string
  description?: string
  conditions?: Record<string, any>
  toneRules?: string
  priority?: number
}

export interface MechanicsRuleCreateInput {
  campaignId: string
  category:
    | 'COMBAT'
    | 'SKILL_CHECK'
    | 'MAGIC'
    | 'SOCIAL'
    | 'EXPLORATION'
    | 'REST'
    | 'OTHER'
  title: string
  content: string
  keywords?: string[]
}

export interface MechanicsRuleUpdateInput {
  category?:
    | 'COMBAT'
    | 'SKILL_CHECK'
    | 'MAGIC'
    | 'SOCIAL'
    | 'EXPLORATION'
    | 'REST'
    | 'OTHER'
  title?: string
  content?: string
  keywords?: string[]
}

export class KnowledgeManagerService {
  // ==================== Campaign Knowledge ====================

  /**
   * Create a new knowledge entry
   */
  async createKnowledge(input: KnowledgeCreateInput) {
    return await prisma.campaignKnowledge.create({
      data: {
        campaignId: input.campaignId,
        category: input.category,
        title: input.title,
        content: input.content,
        keywords: input.keywords || [],
      },
    })
  }

  /**
   * Get all knowledge entries for a campaign
   */
  async getCampaignKnowledge(
    campaignId: string,
    category?: KnowledgeCategoryType
  ) {
    return await prisma.campaignKnowledge.findMany({
      where: {
        campaignId,
        ...(category ? { category } : {}),
      },
      orderBy: [{ usageCount: 'desc' }, { updatedAt: 'desc' }],
    })
  }

  /**
   * Get a single knowledge entry
   */
  async getKnowledge(id: string) {
    return await prisma.campaignKnowledge.findUnique({
      where: { id },
    })
  }

  /**
   * Update a knowledge entry
   */
  async updateKnowledge(id: string, input: KnowledgeUpdateInput) {
    return await prisma.campaignKnowledge.update({
      where: { id },
      data: input,
    })
  }

  /**
   * Delete a knowledge entry
   */
  async deleteKnowledge(id: string) {
    return await prisma.campaignKnowledge.delete({
      where: { id },
    })
  }

  /**
   * Increment usage count for a knowledge entry
   */
  async incrementKnowledgeUsage(id: string) {
    return await prisma.campaignKnowledge.update({
      where: { id },
      data: {
        usageCount: { increment: 1 },
      },
    })
  }

  /**
   * Search knowledge entries
   */
  async searchKnowledge(campaignId: string, query: string) {
    const queryLower = query.toLowerCase()

    return await prisma.campaignKnowledge.findMany({
      where: {
        campaignId,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { usageCount: 'desc' },
      take: 10,
    })
  }

  // ==================== Tone Profiles ====================

  /**
   * Create a new tone profile
   */
  async createToneProfile(input: ToneProfileCreateInput) {
    return await prisma.toneProfile.create({
      data: {
        campaignId: input.campaignId,
        name: input.name,
        description: input.description,
        conditions: input.conditions,
        toneRules: input.toneRules,
        priority: input.priority || 0,
      },
    })
  }

  /**
   * Get all tone profiles for a campaign
   */
  async getCampaignToneProfiles(campaignId: string) {
    return await prisma.toneProfile.findMany({
      where: { campaignId },
      orderBy: { priority: 'desc' },
    })
  }

  /**
   * Get a single tone profile
   */
  async getToneProfile(id: string) {
    return await prisma.toneProfile.findUnique({
      where: { id },
    })
  }

  /**
   * Update a tone profile
   */
  async updateToneProfile(id: string, input: ToneProfileUpdateInput) {
    return await prisma.toneProfile.update({
      where: { id },
      data: input,
    })
  }

  /**
   * Delete a tone profile
   */
  async deleteToneProfile(id: string) {
    return await prisma.toneProfile.delete({
      where: { id },
    })
  }

  // ==================== Mechanics Rules ====================

  /**
   * Create a new mechanics rule
   */
  async createMechanicsRule(input: MechanicsRuleCreateInput) {
    return await prisma.mechanicsRule.create({
      data: {
        campaignId: input.campaignId,
        category: input.category,
        title: input.title,
        content: input.content,
        keywords: input.keywords || [],
      },
    })
  }

  /**
   * Get all mechanics rules for a campaign
   */
  async getCampaignMechanicsRules(campaignId: string, category?: string) {
    return await prisma.mechanicsRule.findMany({
      where: {
        campaignId,
        ...(category ? { category } : {}),
      },
      orderBy: { category: 'asc' },
    })
  }

  /**
   * Get a single mechanics rule
   */
  async getMechanicsRule(id: string) {
    return await prisma.mechanicsRule.findUnique({
      where: { id },
    })
  }

  /**
   * Update a mechanics rule
   */
  async updateMechanicsRule(id: string, input: MechanicsRuleUpdateInput) {
    return await prisma.mechanicsRule.update({
      where: { id },
      data: input,
    })
  }

  /**
   * Delete a mechanics rule
   */
  async deleteMechanicsRule(id: string) {
    return await prisma.mechanicsRule.delete({
      where: { id },
    })
  }

  // ==================== Bulk Operations ====================

  /**
   * Get all knowledge-related data for a campaign
   */
  async getAllCampaignKnowledgeData(campaignId: string) {
    const [knowledge, toneProfiles, mechanicsRules] = await Promise.all([
      this.getCampaignKnowledge(campaignId),
      this.getCampaignToneProfiles(campaignId),
      this.getCampaignMechanicsRules(campaignId),
    ])

    return {
      knowledge,
      toneProfiles,
      mechanicsRules,
    }
  }

  /**
   * Get statistics about campaign knowledge
   */
  async getCampaignKnowledgeStats(campaignId: string) {
    const [
      totalKnowledge,
      totalToneProfiles,
      totalMechanicsRules,
      knowledgeByCategory,
    ] = await Promise.all([
      prisma.campaignKnowledge.count({ where: { campaignId } }),
      prisma.toneProfile.count({ where: { campaignId } }),
      prisma.mechanicsRule.count({ where: { campaignId } }),
      prisma.campaignKnowledge.groupBy({
        by: ['category'],
        where: { campaignId },
        _count: true,
      }),
    ])

    return {
      totalKnowledge,
      totalToneProfiles,
      totalMechanicsRules,
      knowledgeByCategory: knowledgeByCategory.map((item) => ({
        category: item.category,
        count: item._count,
      })),
    }
  }
}

export const knowledgeManagerService = new KnowledgeManagerService()


