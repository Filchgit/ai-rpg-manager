# Spatial Location System

## Overview

The AI RPG Manager now includes a comprehensive 3D spatial location system that tracks character positions, calculates distances, and enforces location-based game mechanics. The AI Dungeon Master uses this spatial data as its primary source of information when describing scenes and determining what actions are possible.

## Key Features

- **3D Coordinate System**: Track characters and objects in (x, y, z) space
- **Location Management**: Define locations with boundaries and features
- **Distance-Based Interactions**: Custom rules for melee, ranged, spells, etc.
- **Line of Sight**: Automatic LOS calculations considering obstacles
- **Cover System**: Features can provide half, three-quarters, or full cover
- **AI Integration**: Spatial context automatically included in AI prompts
- **Movement Suggestions**: AI can suggest character movement based on actions

## Core Concepts

### Locations

Locations define bounded 3D spaces where gameplay occurs:

```typescript
{
  name: "Tavern Main Hall",
  description: "A cozy tavern...",
  minX: 0, maxX: 18,    // 18 meters wide (~60 feet)
  minY: 0, maxY: 12,    // 12 meters deep (~40 feet)
  minZ: 0, maxZ: 4.5,   // 4.5 meters tall (~15 feet)
  unitType: "meters"    // Default is meters (can be "feet", etc.)
}
```

### Location Features

Features are objects within locations:

- **OBSTACLE**: Blocks movement and/or vision
- **POI**: Points of interest (altars, chests, etc.)
- **DOOR**: Entrances/exits
- **FURNITURE**: Tables, chairs, etc.
- **TERRAIN**: Natural features (rocks, trees)
- **HAZARD**: Dangerous areas (fire, traps)

Features have properties:
- `blocksMovement`: Can characters pass through?
- `blocksVision`: Does it block line of sight?
- `providesCover`: NONE, HALF, THREE_QUARTERS, FULL
- `elevation`: Height offset from ground

### Character Positions

Every character has a position:

```typescript
{
  characterId: "...",
  locationId: "...",
  x: 25.5,
  y: 30.0,
  z: 0.0,
  facing: 90  // Degrees (0-360)
}
```

### Movement Rules

Define what interactions are possible at what distances:

```typescript
{
  name: "Melee Attack",
  maxDistance: 5,
  interactionType: "MELEE",
  requiresLineOfSight: false,
  description: "Attack with melee weapons"
}
```

Default rules created for new campaigns (in meters):
- Melee: 1.5 meters (~5 feet)
- Ranged: 18 meters (~60 feet, requires LOS)
- Spell: 9 meters (~30 feet, requires LOS)
- Conversation: 6 meters (~20 feet)
- Perception: 18 meters (~60 feet, requires LOS)

**Note:** The system uses metric (meters) by default. Imperial conversions can be added in the UI layer later.

## API Endpoints

### Locations

```
GET    /api/campaigns/[id]/locations
POST   /api/campaigns/[id]/locations
GET    /api/campaigns/[id]/locations/[locationId]
PUT    /api/campaigns/[id]/locations/[locationId]
DELETE /api/campaigns/[id]/locations/[locationId]
```

Create from template:
```json
POST /api/campaigns/[id]/locations
{
  "template": "tavern"  // or "dungeon_room", "forest_clearing"
}
```

### Features

```
POST /api/campaigns/[id]/locations/[locationId]/features
```

### Character Positions

```
GET /api/characters/[id]/position
PUT /api/characters/[id]/position
```

### Movement Rules

```
GET  /api/campaigns/[id]/movement-rules
POST /api/campaigns/[id]/movement-rules
```

## Usage Examples

### Creating a Location

```typescript
// Create from template
const response = await fetch(`/api/campaigns/${campaignId}/locations`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ template: 'tavern' })
})

// Or create custom
const response = await fetch(`/api/campaigns/${campaignId}/locations`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Throne Room',
    description: 'A grand throne room...',
    minX: 0, maxX: 24,
    minY: 0, maxY: 18,
    minZ: 0, maxZ: 9,
    unitType: 'meters'
  })
})
```

### Adding Features

```typescript
const response = await fetch(
  `/api/campaigns/${campaignId}/locations/${locationId}/features`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'OBSTACLE',
      name: 'Stone Pillar',
      x: 6, y: 9, z: 0,
      width: 1.5, height: 6, depth: 1.5,
      blocksMovement: true,
      blocksVision: true,
      providesCover: 'FULL'
    })
  }
)
```

### Updating Character Position

```typescript
const response = await fetch(`/api/characters/${characterId}/position`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    locationId: locationId,
    x: 13.5,
    y: 15,
    z: 0,
    facing: 180
  })
})
```

## Spatial Services

### SpatialService

Provides spatial calculations:

```typescript
import { spatialService } from '@/services/spatial-service'

// Calculate distance
const distance = spatialService.calculateDistance(pos1, pos2)

// Check line of sight
const canSee = await spatialService.checkLineOfSight(pos1, pos2, locationId)

// Get cover level
const cover = await spatialService.getCoverLevel(attacker, defender, locationId)

// Find valid actions
const actions = await spatialService.findValidActions(characterId, campaignId)

// Get visible characters
const visible = await spatialService.getVisibleCharacters(position, locationId)

// Get nearby features
const features = await spatialService.getNearbyFeatures(position, locationId, 30)
```

### LocationService

Manages locations and features:

```typescript
import { locationService } from '@/services/location-service'

// Create location
const location = await locationService.createLocation(data)

// Create from template
const location = await locationService.createFromTemplate(campaignId, 'tavern')

// Add feature
const feature = await locationService.createFeature(featureData)

// Update character position
const position = await locationService.updateCharacterPosition({
  characterId,
  locationId,
  x: 25,
  y: 30,
  z: 0
})
```

## AI Integration

The spatial system is automatically integrated with the AI Dungeon Master. The AI receives spatial context in every prompt:

```
Spatial Context:
- Current Location: Tavern Main Hall
- Your Position: (13.5, 15.0, 0.0)
- Nearby Characters:
  • Orc Warrior at (15.0, 14.5, 0.0) - 1.6 meters away, visible
  • Elven Mage at (9.0, 10.5, 0.0) - 6.3 meters away, visible with half cover
- Nearby Features:
  • Bar Counter (FURNITURE) - 4.8 meters away
  • Fireplace (FURNITURE) - 7.7 meters away
- Available Actions:
  • MELEE (Melee Attack) → Orc Warrior
  • RANGED (Ranged Attack) → Elven Mage
  • CONVERSATION (Conversation) → Orc Warrior

IMPORTANT: When describing actions, take into account the positions and distances 
between characters. Use the stored location data and mechanics rules to determine 
what is physically possible.
```

The AI will:
- Describe scenes based on actual positions
- Prevent impossible actions (e.g., melee attack from 50 feet away)
- Suggest movement when needed
- Account for cover and line of sight
- Use location features in descriptions

## Migration

### Applying the Schema Migration

```bash
# Apply database migration
npx prisma migrate deploy

# Or in development
npx prisma migrate dev
```

### Migrating Existing Campaigns

After schema migration, run the data migration:

```bash
npx tsx prisma/migrations/20251203103936_add_spatial_location_system/data-migration.ts
```

This will:
- Create a default "Starting Area" (30x30x3 meters, ~100x100x10 feet) for each campaign
- Place all characters at the center (15, 15, 0)
- Create default movement rules (in meters)
- Set up character positions

## Location Templates

Three built-in templates are available (all in meters):

### Tavern
- 18x12x4.5 meters (~60x40x15 feet)
- Includes bar counter, fireplace, main entrance
- Good for social encounters

### Dungeon Room
- 15x15x6 meters (~50x50x20 feet)
- Stone pillars, rubble piles
- Good for combat

### Forest Clearing
- 24x24x9 meters (~80x80x30 feet)
- Large trees, boulders, campfire ring
- Good for outdoor encounters

## Best Practices

### Location Design

1. **Size Appropriately**: Most combat encounters work well in 15x15 to 30x30 meters (~50x50 to 100x100 feet)
2. **Add Features**: Include 3-5 interesting features per location
3. **Use Cover**: Add features with cover for tactical combat
4. **Vary Elevation**: Use the Z axis for platforms, elevated areas

### Movement Rules

1. **Start with Defaults**: The default rules work for most D&D-style games (converted to metric)
2. **Customize Per Campaign**: Adjust distances based on your setting
3. **Consider Line of Sight**: Ranged attacks and spells usually need LOS
4. **Metric First**: All measurements are in meters by default; UI can convert to imperial for display

### Character Positioning

1. **Update Regularly**: Move characters as they act
2. **Group Characters**: Keep party members within 1.5-3 meters (~5-10 feet) for cohesion
3. **Use Facing**: Track which direction characters face for tactical play

### AI Interaction

1. **Let AI Suggest**: The AI can detect movement intent and suggest positions
2. **Confirm Suggestions**: Use the hybrid confirmation system
3. **Trust the System**: The AI uses spatial data as ground truth

## Troubleshooting

### Characters Not Showing Up

Check that:
1. Character has a position record
2. Position references a valid location
3. Characters are in the same location

### Actions Not Available

Check that:
1. Movement rules exist for the campaign
2. Character is within maxDistance
3. Line of sight is clear (if required)
4. Character position is up to date

### AI Not Using Spatial Data

Check that:
1. Session has a location set in SessionState
2. Characters have positions
3. Context builder is including spatialContext

## Future Enhancements

Planned features:
- Visual map editor UI component
- Pathfinding around obstacles
- Area of effect calculations
- Dynamic lighting and vision ranges
- Multi-floor/level support
- Teleportation and portals
- Flying and swimming mechanics

## Technical Details

### Distance Calculation

Uses 3D Euclidean distance:
```
distance = √((x₂-x₁)² + (y₂-y₁)² + (z₂-z₁)²)
```

### Line of Sight

Uses ray-AABB (Axis-Aligned Bounding Box) intersection testing to check if the line between two points intersects any obstacles.

### Cover Calculation

Checks all features with `providesCover` property that intersect the line between attacker and defender, returns the highest level of cover found.

### Performance

- Spatial queries are indexed by locationId
- Distance calculations are O(1)
- LOS checks are O(n) where n = number of vision-blocking features
- Typical location has 5-10 features, so very fast

## Support

For issues or questions about the spatial system, see:
- [Architecture Documentation](./ARCHITECTURE.md)
- [API Documentation](./API.md)
- [GitHub Issues](https://github.com/Filchgit/ai-rpg-manager/issues)

