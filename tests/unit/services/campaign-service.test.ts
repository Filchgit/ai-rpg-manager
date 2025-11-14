import { campaignService } from '@/services/campaign-service'
import { prisma } from '@/lib/db'

jest.mock('@/lib/db', () => ({
  prisma: {
    campaign: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

describe('CampaignService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createCampaign', () => {
    it('should create a campaign when given valid data', async () => {
      // Given
      const campaignData = {
        name: 'Test Campaign',
        description: 'A test campaign',
        worldSettings: 'Fantasy world',
        aiGuidelines: 'Be creative',
      }
      const mockCampaign = { id: '1', ...campaignData, createdAt: new Date(), updatedAt: new Date() }
      ;(prisma.campaign.create as jest.Mock).mockResolvedValue(mockCampaign)

      // When
      const result = await campaignService.createCampaign(campaignData)

      // Then
      expect(prisma.campaign.create).toHaveBeenCalledWith({ data: campaignData })
      expect(result).toEqual(mockCampaign)
    })
  })

  describe('getCampaigns', () => {
    it('should return all campaigns with counts', async () => {
      // Given
      const mockCampaigns = [
        { id: '1', name: 'Campaign 1', _count: { sessions: 2, characters: 3 } },
        { id: '2', name: 'Campaign 2', _count: { sessions: 1, characters: 1 } },
      ]
      ;(prisma.campaign.findMany as jest.Mock).mockResolvedValue(mockCampaigns)

      // When
      const result = await campaignService.getCampaigns()

      // Then
      expect(prisma.campaign.findMany).toHaveBeenCalled()
      expect(result).toEqual(mockCampaigns)
    })
  })

  describe('getCampaignById', () => {
    it('should return a campaign when given a valid id', async () => {
      // Given
      const mockCampaign = {
        id: '1',
        name: 'Test Campaign',
        sessions: [],
        characters: [],
      }
      ;(prisma.campaign.findUnique as jest.Mock).mockResolvedValue(mockCampaign)

      // When
      const result = await campaignService.getCampaignById('1')

      // Then
      expect(prisma.campaign.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: {
          sessions: { orderBy: { startedAt: 'desc' } },
          characters: { orderBy: { createdAt: 'desc' } },
        },
      })
      expect(result).toEqual(mockCampaign)
    })

    it('should throw an error when campaign is not found', async () => {
      // Given
      ;(prisma.campaign.findUnique as jest.Mock).mockResolvedValue(null)

      // When / Then
      await expect(campaignService.getCampaignById('999')).rejects.toThrow('Campaign not found')
    })
  })

  describe('updateCampaign', () => {
    it('should update a campaign when given valid data', async () => {
      // Given
      const updateData = { name: 'Updated Campaign' }
      const mockUpdatedCampaign = { id: '1', ...updateData }
      ;(prisma.campaign.update as jest.Mock).mockResolvedValue(mockUpdatedCampaign)

      // When
      const result = await campaignService.updateCampaign('1', updateData)

      // Then
      expect(prisma.campaign.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateData,
      })
      expect(result).toEqual(mockUpdatedCampaign)
    })
  })

  describe('deleteCampaign', () => {
    it('should delete a campaign when given a valid id', async () => {
      // Given
      const mockDeletedCampaign = { id: '1', name: 'Deleted Campaign' }
      ;(prisma.campaign.delete as jest.Mock).mockResolvedValue(mockDeletedCampaign)

      // When
      const result = await campaignService.deleteCampaign('1')

      // Then
      expect(prisma.campaign.delete).toHaveBeenCalledWith({ where: { id: '1' } })
      expect(result).toEqual(mockDeletedCampaign)
    })
  })
})

