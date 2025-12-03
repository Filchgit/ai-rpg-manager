import { prisma } from '@/lib/db'

export interface Position {
  x: number
  y: number
  z: number
}

export interface SpatialContext {
  characterPositions: Array<{
    characterId: string
    name: string
    position: Position
    distance: number
    canSee: boolean
    coverLevel: string
  }>
  nearbyFeatures: Array<{
    featureId: string
    name: string
    type: string
    position: Position
    distance: number
  }>
  availableActions: Array<{
    action: string
    targetId: string
    targetName: string
    requiresMovement: boolean
  }>
}

export class SpatialService {
  /**
   * Calculate 3D Euclidean distance between two positions
   */
  calculateDistance(pos1: Position, pos2: Position): number {
    const dx = pos2.x - pos1.x
    const dy = pos2.y - pos1.y
    const dz = pos2.z - pos1.z
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  }

  /**
   * Calculate 2D distance (ignoring Z axis) - useful for horizontal distance
   */
  calculateHorizontalDistance(pos1: Position, pos2: Position): number {
    const dx = pos2.x - pos1.x
    const dy = pos2.y - pos1.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  /**
   * Check if there's a clear line of sight between two positions
   * considering obstacles that block vision
   */
  async checkLineOfSight(
    pos1: Position,
    pos2: Position,
    locationId: string
  ): Promise<boolean> {
    // Get all vision-blocking features in this location
    const obstacles = await prisma.locationFeature.findMany({
      where: {
        locationId,
        blocksVision: true,
      },
    })

    // Simple raycasting - check if line intersects any obstacle
    for (const obstacle of obstacles) {
      if (this.lineIntersectsBox(pos1, pos2, obstacle)) {
        return false
      }
    }

    return true
  }

  /**
   * Check if a line segment intersects a 3D bounding box
   */
  private lineIntersectsBox(
    start: Position,
    end: Position,
    box: {
      x: number
      y: number
      z: number
      width: number | null
      height: number | null
      depth: number | null
    }
  ): boolean {
    const width = box.width || 5
    const height = box.height || 5
    const depth = box.depth || 5

    // Simplified box intersection check
    // Check if line passes through the box volume
    const minX = box.x
    const maxX = box.x + width
    const minY = box.y
    const maxY = box.y + depth
    const minZ = box.z
    const maxZ = box.z + height

    // Basic AABB line intersection
    return this.lineIntersectsAABB(start, end, {
      minX,
      maxX,
      minY,
      maxY,
      minZ,
      maxZ,
    })
  }

  /**
   * Line-AABB intersection test
   */
  private lineIntersectsAABB(
    start: Position,
    end: Position,
    box: {
      minX: number
      maxX: number
      minY: number
      maxY: number
      minZ: number
      maxZ: number
    }
  ): boolean {
    const dir = {
      x: end.x - start.x,
      y: end.y - start.y,
      z: end.z - start.z,
    }

    let tmin = 0
    let tmax = 1

    // X axis
    if (Math.abs(dir.x) < 0.0001) {
      if (start.x < box.minX || start.x > box.maxX) return false
    } else {
      const tx1 = (box.minX - start.x) / dir.x
      const tx2 = (box.maxX - start.x) / dir.x
      tmin = Math.max(tmin, Math.min(tx1, tx2))
      tmax = Math.min(tmax, Math.max(tx1, tx2))
    }

    // Y axis
    if (Math.abs(dir.y) < 0.0001) {
      if (start.y < box.minY || start.y > box.maxY) return false
    } else {
      const ty1 = (box.minY - start.y) / dir.y
      const ty2 = (box.maxY - start.y) / dir.y
      tmin = Math.max(tmin, Math.min(ty1, ty2))
      tmax = Math.min(tmax, Math.max(ty1, ty2))
    }

    // Z axis
    if (Math.abs(dir.z) < 0.0001) {
      if (start.z < box.minZ || start.z > box.maxZ) return false
    } else {
      const tz1 = (box.minZ - start.z) / dir.z
      const tz2 = (box.maxZ - start.z) / dir.z
      tmin = Math.max(tmin, Math.min(tz1, tz2))
      tmax = Math.min(tmax, Math.max(tz1, tz2))
    }

    return tmax >= tmin && tmin <= 1 && tmax >= 0
  }

  /**
   * Calculate cover level provided by features between attacker and defender
   */
  async getCoverLevel(
    attackerPos: Position,
    defenderPos: Position,
    locationId: string
  ): Promise<string> {
    const features = await prisma.locationFeature.findMany({
      where: {
        locationId,
        providesCover: { not: 'NONE' },
      },
    })

    let bestCover = 'NONE'
    const coverLevels = ['NONE', 'HALF', 'THREE_QUARTERS', 'FULL']

    for (const feature of features) {
      if (this.lineIntersectsBox(attackerPos, defenderPos, feature)) {
        const coverIndex = coverLevels.indexOf(feature.providesCover)
        const bestIndex = coverLevels.indexOf(bestCover)
        if (coverIndex > bestIndex) {
          bestCover = feature.providesCover
        }
      }
    }

    return bestCover
  }

  /**
   * Find all valid actions a character can perform based on distance rules
   */
  async findValidActions(
    characterId: string,
    campaignId: string
  ): Promise<
    Array<{
      ruleName: string
      interactionType: string
      maxDistance: number
      validTargets: Array<{
        characterId: string
        name: string
        distance: number
      }>
    }>
  > {
    // Get character position
    const charPos = await prisma.characterPosition.findUnique({
      where: { characterId },
      include: { character: true },
    })

    if (!charPos) {
      return []
    }

    // Get all movement rules for this campaign
    const rules = await prisma.movementRule.findMany({
      where: { campaignId },
    })

    // Get all other characters in the same location
    const otherChars = await prisma.characterPosition.findMany({
      where: {
        locationId: charPos.locationId,
        characterId: { not: characterId },
      },
      include: { character: true },
    })

    const validActions = []

    for (const rule of rules) {
      const validTargets = []

      for (const otherChar of otherChars) {
        const distance = this.calculateDistance(
          { x: charPos.x, y: charPos.y, z: charPos.z },
          { x: otherChar.x, y: otherChar.y, z: otherChar.z }
        )

        if (distance <= rule.maxDistance) {
          // Check line of sight if required
          if (rule.requiresLineOfSight && charPos.locationId) {
            const hasLOS = await this.checkLineOfSight(
              { x: charPos.x, y: charPos.y, z: charPos.z },
              { x: otherChar.x, y: otherChar.y, z: otherChar.z },
              charPos.locationId
            )
            if (!hasLOS) continue
          }

          validTargets.push({
            characterId: otherChar.characterId,
            name: otherChar.character.name,
            distance,
          })
        }
      }

      validActions.push({
        ruleName: rule.name,
        interactionType: rule.interactionType,
        maxDistance: rule.maxDistance,
        validTargets,
      })
    }

    return validActions
  }

  /**
   * Get all characters visible from a position
   */
  async getVisibleCharacters(
    position: Position,
    locationId: string,
    excludeCharacterId?: string
  ): Promise<
    Array<{
      characterId: string
      name: string
      position: Position
      distance: number
    }>
  > {
    const characters = await prisma.characterPosition.findMany({
      where: {
        locationId,
        ...(excludeCharacterId ? { characterId: { not: excludeCharacterId } } : {}),
      },
      include: { character: true },
    })

    const visibleChars = []

    for (const char of characters) {
      const charPos = { x: char.x, y: char.y, z: char.z }
      const distance = this.calculateDistance(position, charPos)

      // Check line of sight
      const hasLOS = await this.checkLineOfSight(position, charPos, locationId)

      if (hasLOS) {
        visibleChars.push({
          characterId: char.characterId,
          name: char.character.name,
          position: charPos,
          distance,
        })
      }
    }

    return visibleChars
  }

  /**
   * Get nearby features within a certain radius
   */
  async getNearbyFeatures(
    position: Position,
    locationId: string,
    maxDistance: number = 30
  ): Promise<
    Array<{
      featureId: string
      name: string
      type: string
      position: Position
      distance: number
    }>
  > {
    const features = await prisma.locationFeature.findMany({
      where: { locationId },
    })

    return features
      .map((feature) => {
        const featurePos = { x: feature.x, y: feature.y, z: feature.z }
        const distance = this.calculateDistance(position, featurePos)

        return {
          featureId: feature.id,
          name: feature.name,
          type: feature.type,
          position: featurePos,
          distance,
        }
      })
      .filter((f) => f.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance)
  }

  /**
   * Suggest a movement position based on action intent
   */
  suggestMovement(
    action: string,
    currentPos: Position,
    targetPos: Position,
    targetDistance: number
  ): Position {
    // Calculate direction vector
    const dir = {
      x: targetPos.x - currentPos.x,
      y: targetPos.y - currentPos.y,
      z: 0, // Usually stay on same level
    }

    // Normalize direction
    const length = Math.sqrt(dir.x * dir.x + dir.y * dir.y)
    if (length === 0) return currentPos

    const normalizedDir = {
      x: dir.x / length,
      y: dir.y / length,
      z: 0,
    }

    // Move to within target distance
    const moveDistance = Math.max(0, length - targetDistance)

    return {
      x: currentPos.x + normalizedDir.x * moveDistance,
      y: currentPos.y + normalizedDir.y * moveDistance,
      z: currentPos.z,
    }
  }

  /**
   * Build spatial context for AI prompt
   */
  async buildSpatialContext(
    characterId: string,
    sessionId: string
  ): Promise<SpatialContext | null> {
    const charPos = await prisma.characterPosition.findUnique({
      where: { characterId },
      include: { character: { include: { campaign: true } } },
    })

    if (!charPos || !charPos.locationId) {
      return null
    }

    const position = { x: charPos.x, y: charPos.y, z: charPos.z }

    // Get visible characters
    const visibleChars = await this.getVisibleCharacters(
      position,
      charPos.locationId,
      characterId
    )

    // Add cover and distance info
    const characterPositions = await Promise.all(
      visibleChars.map(async (char) => {
        const canSee = true // Already filtered for visibility
        const coverLevel = await this.getCoverLevel(
          position,
          char.position,
          charPos.locationId!
        )

        return {
          characterId: char.characterId,
          name: char.name,
          position: char.position,
          distance: char.distance,
          canSee,
          coverLevel,
        }
      })
    )

    // Get nearby features
    const nearbyFeatures = await this.getNearbyFeatures(
      position,
      charPos.locationId,
      30
    )

    // Get valid actions
    const validActions = await this.findValidActions(
      characterId,
      charPos.character.campaignId
    )

    // Flatten valid actions
    const availableActions = validActions.flatMap((rule) =>
      rule.validTargets.map((target) => ({
        action: `${rule.interactionType} (${rule.ruleName})`,
        targetId: target.characterId,
        targetName: target.name,
        requiresMovement: false,
      }))
    )

    return {
      characterPositions,
      nearbyFeatures,
      availableActions,
    }
  }

  /**
   * Calculate turn-based movement info for a character
   * Optionally apply a movement modifier (e.g., 2.0 for running/dashing)
   */
  async calculateTurnMovement(
    characterId: string,
    distance: number,
    movementModifier: number = 1.0
  ): Promise<{
    baseMovementRate: number
    canReachInOneTurn: boolean
    turnsRequired: number
    movementModifier: number
  }> {
    // Get character's movement rate
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: {
        baseMovementRate: true,
      },
    })

    const baseRate = character?.baseMovementRate || 9.0 // Default 9 meters
    const effectiveRate = baseRate * movementModifier

    // Calculate if reachable in one turn with current modifier
    const canReachInOneTurn = distance <= effectiveRate
    const turnsRequired = Math.ceil(distance / effectiveRate)

    return {
      baseMovementRate: baseRate,
      canReachInOneTurn,
      turnsRequired,
      movementModifier,
    }
  }

  /**
   * Validate movement from one position to another
   */
  async validateMovement(
    from: Position,
    to: Position,
    locationId: string
  ): Promise<{
    isValid: boolean
    blockedBy?: string[]
    suggestedAlternative?: Position
    warnings?: string[]
  }> {
    const warnings: string[] = []
    const blockedBy: string[] = []

    // Get location bounds
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      include: {
        features: {
          where: {
            blocksMovement: true,
          },
        },
      },
    })

    if (!location) {
      return {
        isValid: false,
        warnings: ['Location not found'],
      }
    }

    // Check if target position is within bounds
    if (
      to.x < location.minX ||
      to.x > location.maxX ||
      to.y < location.minY ||
      to.y > location.maxY ||
      to.z < location.minZ ||
      to.z > location.maxZ
    ) {
      warnings.push('Target position is outside location bounds')
      return {
        isValid: false,
        warnings,
      }
    }

    // Check if target position intersects with blocking features
    for (const feature of location.features) {
      if (this.positionIntersectsFeature(to, feature)) {
        blockedBy.push(feature.name)
      }
    }

    if (blockedBy.length > 0) {
      return {
        isValid: false,
        blockedBy,
        warnings: [`Path blocked by: ${blockedBy.join(', ')}`],
      }
    }

    // Check if movement distance is reasonable (not teleporting)
    const distance = this.calculateDistance(from, to)
    const maxReasonableDistance = 50 // meters - adjust based on your needs
    if (distance > maxReasonableDistance) {
      warnings.push(
        `Movement distance (${distance.toFixed(1)}m) seems unusually large`
      )
    }

    return {
      isValid: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    }
  }

  /**
   * Validate movement path (check if straight line path is clear)
   */
  async validateMovementPath(
    from: Position,
    to: Position,
    locationId: string
  ): Promise<{
    isValid: boolean
    blockedBy?: string[]
    suggestedAlternative?: Position
  }> {
    // Get features that block movement
    const features = await prisma.locationFeature.findMany({
      where: {
        locationId,
        blocksMovement: true,
      },
    })

    const blockedBy: string[] = []

    // Check if line path intersects any blocking features
    for (const feature of features) {
      if (this.lineIntersectsBox(from, to, feature)) {
        blockedBy.push(feature.name)
      }
    }

    if (blockedBy.length > 0) {
      return {
        isValid: false,
        blockedBy,
        // TODO: In Phase 3, calculate suggested alternative path around obstacles
      }
    }

    return {
      isValid: true,
    }
  }

  /**
   * Check if a position intersects with a feature's bounding box
   */
  private positionIntersectsFeature(
    position: Position,
    feature: {
      x: number
      y: number
      z: number
      width: number | null
      height: number | null
      depth: number | null
    }
  ): boolean {
    const width = feature.width || 0
    const height = feature.height || 0
    const depth = feature.depth || 0

    return (
      position.x >= feature.x &&
      position.x <= feature.x + width &&
      position.y >= feature.y &&
      position.y <= feature.y + depth &&
      position.z >= feature.z &&
      position.z <= feature.z + height
    )
  }

  /**
   * Find nearest valid position to a target position (if target is blocked)
   */
  async findNearestValidPosition(
    targetPosition: Position,
    locationId: string,
    searchRadius: number = 2
  ): Promise<Position | null> {
    // Get blocking features
    const features = await prisma.locationFeature.findMany({
      where: {
        locationId,
        blocksMovement: true,
      },
    })

    // Try positions in a spiral pattern around target
    const steps = 8 // Check 8 directions
    for (let radius = 0.5; radius <= searchRadius; radius += 0.5) {
      for (let i = 0; i < steps; i++) {
        const angle = (i / steps) * 2 * Math.PI
        const testPos: Position = {
          x: targetPosition.x + Math.cos(angle) * radius,
          y: targetPosition.y + Math.sin(angle) * radius,
          z: targetPosition.z,
        }

        // Check if this position is clear
        const isBlocked = features.some(f => this.positionIntersectsFeature(testPos, f))
        if (!isBlocked) {
          return testPos
        }
      }
    }

    return null // No valid position found within search radius
  }
}

export const spatialService = new SpatialService()

