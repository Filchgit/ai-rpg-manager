import { prisma } from '@/lib/db'

export interface LocationCreateInput {
  campaignId: string
  name: string
  description: string
  minX: number
  maxX: number
  minY: number
  maxY: number
  minZ: number
  maxZ: number
  unitType?: string
}

export interface LocationFeatureCreateInput {
  locationId: string
  type: string
  name: string
  description?: string
  x: number
  y: number
  z: number
  width?: number
  height?: number
  depth?: number
  blocksMovement?: boolean
  blocksVision?: boolean
  providesCover?: string
  elevation?: number
  metadata?: any
}

export interface CharacterPositionUpdateInput {
  characterId: string
  locationId?: string | null
  x?: number
  y?: number
  z?: number
  facing?: number | null
}

export class LocationService {
  /**
   * Create a new location
   */
  async createLocation(input: LocationCreateInput) {
    return await prisma.location.create({
      data: {
        campaignId: input.campaignId,
        name: input.name,
        description: input.description,
        minX: input.minX,
        maxX: input.maxX,
        minY: input.minY,
        maxY: input.maxY,
        minZ: input.minZ,
        maxZ: input.maxZ,
        unitType: input.unitType || 'feet',
      },
      include: {
        features: true,
      },
    })
  }

  /**
   * Get all locations for a campaign
   */
  async getCampaignLocations(campaignId: string) {
    return await prisma.location.findMany({
      where: { campaignId },
      include: {
        features: true,
        characterPositions: {
          include: {
            character: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            features: true,
            characterPositions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Get a single location with all details
   */
  async getLocationById(locationId: string) {
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      include: {
        features: {
          orderBy: { name: 'asc' },
        },
        characterPositions: {
          include: {
            character: {
              select: {
                id: true,
                name: true,
                race: true,
                class: true,
              },
            },
          },
        },
        campaign: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!location) {
      throw new Error('Location not found')
    }

    return location
  }

  /**
   * Update location details
   */
  async updateLocation(locationId: string, data: Partial<LocationCreateInput>) {
    return await prisma.location.update({
      where: { id: locationId },
      data,
      include: {
        features: true,
      },
    })
  }

  /**
   * Delete a location
   */
  async deleteLocation(locationId: string) {
    return await prisma.location.delete({
      where: { id: locationId },
    })
  }

  /**
   * Add a feature to a location
   */
  async createFeature(input: LocationFeatureCreateInput) {
    return await prisma.locationFeature.create({
      data: {
        locationId: input.locationId,
        type: input.type as any,
        name: input.name,
        description: input.description,
        x: input.x,
        y: input.y,
        z: input.z,
        width: input.width,
        height: input.height,
        depth: input.depth,
        blocksMovement: input.blocksMovement ?? false,
        blocksVision: input.blocksVision ?? false,
        providesCover: (input.providesCover as any) || 'NONE',
        elevation: input.elevation ?? 0,
        metadata: input.metadata,
      },
    })
  }

  /**
   * Update a feature
   */
  async updateFeature(
    featureId: string,
    data: Partial<LocationFeatureCreateInput>
  ) {
    return await prisma.locationFeature.update({
      where: { id: featureId },
      data: {
        ...(data.type && { type: data.type as any }),
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.x !== undefined && { x: data.x }),
        ...(data.y !== undefined && { y: data.y }),
        ...(data.z !== undefined && { z: data.z }),
        ...(data.width !== undefined && { width: data.width }),
        ...(data.height !== undefined && { height: data.height }),
        ...(data.depth !== undefined && { depth: data.depth }),
        ...(data.blocksMovement !== undefined && {
          blocksMovement: data.blocksMovement,
        }),
        ...(data.blocksVision !== undefined && {
          blocksVision: data.blocksVision,
        }),
        ...(data.providesCover && { providesCover: data.providesCover as any }),
        ...(data.elevation !== undefined && { elevation: data.elevation }),
        ...(data.metadata !== undefined && { metadata: data.metadata }),
      },
    })
  }

  /**
   * Delete a feature
   */
  async deleteFeature(featureId: string) {
    return await prisma.locationFeature.delete({
      where: { id: featureId },
    })
  }

  /**
   * Get or create character position
   */
  async getOrCreateCharacterPosition(characterId: string) {
    let position = await prisma.characterPosition.findUnique({
      where: { characterId },
      include: {
        character: true,
        location: true,
      },
    })

    if (!position) {
      // Create default position at origin
      position = await prisma.characterPosition.create({
        data: {
          characterId,
          x: 0,
          y: 0,
          z: 0,
        },
        include: {
          character: true,
          location: true,
        },
      })
    }

    return position
  }

  /**
   * Update character position
   */
  async updateCharacterPosition(input: CharacterPositionUpdateInput) {
    const existingPosition = await this.getOrCreateCharacterPosition(
      input.characterId
    )

    return await prisma.characterPosition.update({
      where: { id: existingPosition.id },
      data: {
        ...(input.locationId !== undefined && { locationId: input.locationId }),
        ...(input.x !== undefined && { x: input.x }),
        ...(input.y !== undefined && { y: input.y }),
        ...(input.z !== undefined && { z: input.z }),
        ...(input.facing !== undefined && { facing: input.facing }),
      },
      include: {
        character: true,
        location: true,
      },
    })
  }

  /**
   * Validate if a position is within location bounds
   */
  validatePosition(
    x: number,
    y: number,
    z: number,
    location: {
      minX: number
      maxX: number
      minY: number
      maxY: number
      minZ: number
      maxZ: number
    }
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (x < location.minX || x > location.maxX) {
      errors.push(`X coordinate ${x} out of bounds [${location.minX}, ${location.maxX}]`)
    }
    if (y < location.minY || y > location.maxY) {
      errors.push(`Y coordinate ${y} out of bounds [${location.minY}, ${location.maxY}]`)
    }
    if (z < location.minZ || z > location.maxZ) {
      errors.push(`Z coordinate ${z} out of bounds [${location.minZ}, ${location.maxZ}]`)
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Create location from template
   */
  async createFromTemplate(
    campaignId: string,
    templateName: string
  ): Promise<any> {
    const templates: Record<string, any> = {
      tavern: {
        name: 'The Prancing Pony Tavern',
        description:
          'A cozy tavern with wooden tables, a long bar, and a crackling fireplace.',
        minX: 0,
        maxX: 60,
        minY: 0,
        maxY: 40,
        minZ: 0,
        maxZ: 15,
        features: [
          {
            type: 'FURNITURE',
            name: 'Bar Counter',
            x: 30,
            y: 5,
            z: 0,
            width: 20,
            depth: 3,
            height: 4,
            blocksMovement: true,
            providesCover: 'HALF',
          },
          {
            type: 'FURNITURE',
            name: 'Fireplace',
            x: 5,
            y: 35,
            z: 0,
            width: 8,
            depth: 4,
            height: 6,
            blocksMovement: true,
            blocksVision: false,
            providesCover: 'FULL',
          },
          {
            type: 'DOOR',
            name: 'Main Entrance',
            x: 30,
            y: 0,
            z: 0,
            width: 5,
            depth: 1,
            height: 8,
            blocksMovement: false,
            blocksVision: false,
          },
        ],
      },
      dungeon_room: {
        name: 'Dark Dungeon Chamber',
        description:
          'A damp stone chamber with pillars and scattered rubble. Torches flicker on the walls.',
        minX: 0,
        maxX: 50,
        minY: 0,
        maxY: 50,
        minZ: 0,
        maxZ: 20,
        features: [
          {
            type: 'OBSTACLE',
            name: 'Stone Pillar',
            x: 15,
            y: 15,
            z: 0,
            width: 5,
            depth: 5,
            height: 20,
            blocksMovement: true,
            blocksVision: true,
            providesCover: 'FULL',
          },
          {
            type: 'OBSTACLE',
            name: 'Stone Pillar',
            x: 30,
            y: 15,
            z: 0,
            width: 5,
            depth: 5,
            height: 20,
            blocksMovement: true,
            blocksVision: true,
            providesCover: 'FULL',
          },
          {
            type: 'TERRAIN',
            name: 'Rubble Pile',
            x: 40,
            y: 35,
            z: 0,
            width: 8,
            depth: 8,
            height: 3,
            blocksMovement: false,
            providesCover: 'HALF',
            elevation: 1.5,
          },
        ],
      },
      forest_clearing: {
        name: 'Forest Clearing',
        description:
          'An open clearing surrounded by dense trees. Sunlight filters through the canopy.',
        minX: 0,
        maxX: 80,
        minY: 0,
        maxY: 80,
        minZ: 0,
        maxZ: 30,
        features: [
          {
            type: 'TERRAIN',
            name: 'Large Oak Tree',
            x: 20,
            y: 20,
            z: 0,
            width: 6,
            depth: 6,
            height: 30,
            blocksMovement: true,
            blocksVision: false,
            providesCover: 'FULL',
          },
          {
            type: 'TERRAIN',
            name: 'Boulder',
            x: 50,
            y: 60,
            z: 0,
            width: 8,
            depth: 8,
            height: 5,
            blocksMovement: true,
            providesCover: 'THREE_QUARTERS',
          },
          {
            type: 'POI',
            name: 'Campfire Ring',
            x: 40,
            y: 40,
            z: 0,
            width: 4,
            depth: 4,
            height: 0.5,
            blocksMovement: false,
          },
        ],
      },
    }

    const template = templates[templateName]
    if (!template) {
      throw new Error(`Template '${templateName}' not found`)
    }

    // Create location
    const location = await this.createLocation({
      campaignId,
      ...template,
    })

    // Create features
    if (template.features) {
      for (const feature of template.features) {
        await this.createFeature({
          locationId: location.id,
          ...feature,
        })
      }
    }

    return await this.getLocationById(location.id)
  }
}

export const locationService = new LocationService()

