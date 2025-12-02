/**
 * Data migration script to initialize spatial system for existing campaigns
 * 
 * Run this after applying the schema migration:
 * npx tsx prisma/migrations/20251203103936_add_spatial_location_system/data-migration.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting spatial system data migration...')

  // Get all campaigns
  const campaigns = await prisma.campaign.findMany({
    include: {
      characters: true,
      locations: true,
      movementRules: true,
    },
  })

  console.log(`Found ${campaigns.length} campaigns to migrate`)

  for (const campaign of campaigns) {
    console.log(`\nMigrating campaign: ${campaign.name} (${campaign.id})`)

    // Check if campaign already has locations
    if (campaign.locations.length > 0) {
      console.log(`  ✓ Campaign already has ${campaign.locations.length} location(s), skipping`)
      continue
    }

    // Create default location
    console.log(`  Creating default "Starting Area" location...`)
    const location = await prisma.location.create({
      data: {
        campaignId: campaign.id,
        name: 'Starting Area',
        description: 'A default starting location for your adventure. You can customize this or create new locations.',
        minX: 0,
        maxX: 100,
        minY: 0,
        maxY: 100,
        minZ: 0,
        maxZ: 10,
        unitType: 'feet',
      },
    })
    console.log(`  ✓ Created location: ${location.id}`)

    // Create default movement rules if none exist
    if (campaign.movementRules.length === 0) {
      console.log(`  Creating default movement rules...`)
      
      const defaultRules = [
        {
          name: 'Melee Attack',
          maxDistance: 5,
          interactionType: 'MELEE' as const,
          requiresLineOfSight: false,
          description: 'Attack with melee weapons at close range (5 feet)',
        },
        {
          name: 'Ranged Attack',
          maxDistance: 60,
          interactionType: 'RANGED' as const,
          requiresLineOfSight: true,
          description: 'Attack with ranged weapons up to 60 feet with line of sight',
        },
        {
          name: 'Spell Casting',
          maxDistance: 30,
          interactionType: 'SPELL' as const,
          requiresLineOfSight: true,
          description: 'Cast spells at targets within 30 feet with line of sight',
        },
        {
          name: 'Conversation',
          maxDistance: 20,
          interactionType: 'CONVERSATION' as const,
          requiresLineOfSight: false,
          description: 'Talk to characters within 20 feet',
        },
        {
          name: 'Perception Check',
          maxDistance: 60,
          interactionType: 'PERCEPTION' as const,
          requiresLineOfSight: true,
          description: 'Notice things within 60 feet with line of sight',
        },
      ]

      for (const rule of defaultRules) {
        await prisma.movementRule.create({
          data: {
            campaignId: campaign.id,
            ...rule,
          },
        })
      }
      console.log(`  ✓ Created ${defaultRules.length} default movement rules`)
    }

    // Create character positions for all characters
    console.log(`  Creating positions for ${campaign.characters.length} character(s)...`)
    let positionCount = 0
    
    for (const character of campaign.characters) {
      // Check if position already exists
      const existingPosition = await prisma.characterPosition.findUnique({
        where: { characterId: character.id },
      })

      if (!existingPosition) {
        // Place character at center of default location
        await prisma.characterPosition.create({
          data: {
            characterId: character.id,
            locationId: location.id,
            x: 50,
            y: 50,
            z: 0,
            facing: 0,
          },
        })
        positionCount++
      }
    }
    console.log(`  ✓ Created ${positionCount} character position(s)`)
  }

  console.log('\n✅ Migration completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

