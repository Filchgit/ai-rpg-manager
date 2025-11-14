import { prisma } from '@/lib/db'
import { SessionCreateInput, SessionUpdateInput } from '@/types'

export class SessionService {
  async createSession(data: SessionCreateInput) {
    return prisma.session.create({
      data,
      include: {
        campaign: true,
      },
    })
  }

  async getSessionById(id: string) {
    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        campaign: {
          include: {
            characters: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!session) {
      throw new Error('Session not found')
    }

    return session
  }

  async updateSession(id: string, data: SessionUpdateInput) {
    return prisma.session.update({
      where: { id },
      data,
    })
  }

  async deleteSession(id: string) {
    return prisma.session.delete({
      where: { id },
    })
  }

  async getSessionsByCampaign(campaignId: string) {
    return prisma.session.findMany({
      where: { campaignId },
      orderBy: { startedAt: 'desc' },
      include: {
        _count: {
          select: {
            messages: true,
          },
        },
      },
    })
  }
}

export const sessionService = new SessionService()

