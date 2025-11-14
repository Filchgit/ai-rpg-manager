import { prisma } from '@/lib/db'
import { CharacterCreateInput, CharacterUpdateInput } from '@/types'

export class CharacterService {
  async createCharacter(data: CharacterCreateInput) {
    return prisma.character.create({
      data,
    })
  }

  async getCharacterById(id: string) {
    const character = await prisma.character.findUnique({
      where: { id },
      include: {
        campaign: true,
      },
    })

    if (!character) {
      throw new Error('Character not found')
    }

    return character
  }

  async updateCharacter(id: string, data: CharacterUpdateInput) {
    return prisma.character.update({
      where: { id },
      data,
    })
  }

  async deleteCharacter(id: string) {
    return prisma.character.delete({
      where: { id },
    })
  }

  async getCharactersByCampaign(campaignId: string) {
    return prisma.character.findMany({
      where: { campaignId },
      orderBy: { createdAt: 'desc' },
    })
  }
}

export const characterService = new CharacterService()

