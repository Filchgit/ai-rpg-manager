import { prisma } from '@/lib/db'
import { CampaignCreateInput, CampaignUpdateInput } from '@/types'

export class CampaignService {
  async createCampaign(data: CampaignCreateInput) {
    return prisma.campaign.create({
      data,
    })
  }

  async getCampaigns() {
    return prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            sessions: true,
            characters: true,
          },
        },
      },
    })
  }

  async getCampaignById(id: string) {
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        sessions: {
          orderBy: { startedAt: 'desc' },
        },
        characters: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!campaign) {
      throw new Error('Campaign not found')
    }

    return campaign
  }

  async updateCampaign(id: string, data: CampaignUpdateInput) {
    return prisma.campaign.update({
      where: { id },
      data,
    })
  }

  async deleteCampaign(id: string) {
    return prisma.campaign.delete({
      where: { id },
    })
  }
}

export const campaignService = new CampaignService()

