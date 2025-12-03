export type CampaignCreateInput = {
  name: string
  description?: string
  worldSettings?: string
  aiGuidelines?: string
}

export type CampaignUpdateInput = Partial<CampaignCreateInput>

export type SessionCreateInput = {
  campaignId: string
  name: string
  notes?: string
}

export type SessionUpdateInput = {
  name?: string
  status?: 'ACTIVE' | 'PAUSED' | 'COMPLETED'
  notes?: string
  endedAt?: Date
}

export type CharacterCreateInput = {
  campaignId: string
  name: string
  race?: string
  class?: string
  level?: number
  stats?: CharacterStats
  backstory?: string
}

export type CharacterStats = {
  strength: number
  dexterity: number
  constitution: number
  intelligence: number
  wisdom: number
  charisma: number
}

export type CharacterUpdateInput = Partial<CharacterCreateInput>

export type MessageCreateInput = {
  sessionId: string
  role: 'USER' | 'ASSISTANT' | 'SYSTEM'
  content: string
  tokenCount?: number
  metadata?: Record<string, unknown>
}

export type AIResponse = {
  content: string
  tokenCount: number
  metadata?: {
    model: string
    promptTokens: number
    completionTokens: number
    movementSuggestion?: MovementSuggestion
  }
}

export type RateLimitStatus = {
  allowed: boolean
  requestCount: number
  tokenCount: number
  remainingRequests: number
  remainingTokens: number
  resetAt: Date
}

export type AIPromptContext = {
  campaignName: string
  campaignDescription?: string
  worldSettings?: string
  aiGuidelines?: string
  recentHistory: Array<{
    role: 'USER' | 'ASSISTANT'
    content: string
  }>
  characterNames?: string[]
}

// Enhanced AI Context for optimized prompts
export type EnhancedAIContext = {
  campaignName: string
  currentState?: SessionStateContext
  spatialContext?: SpatialAIContext
  recentSummary?: string
  recentMessages: Array<{
    role: 'USER' | 'ASSISTANT'
    content: string
  }>
  relevantKnowledge: Array<{
    title: string
    content: string
  }>
  toneGuidelines?: string
  mechanicsRules?: string[]
}

export type SessionStateContext = {
  currentLocation?: string
  locationId?: string
  activeNPCs?: string[]
  ongoingQuests?: string[]
  partyConditions?: Record<string, any>
  recentEvents?: string[]
}

// Spatial System Types

export type Position3D = {
  x: number
  y: number
  z: number
}

export type LocationCreateInput = {
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

export type LocationFeatureCreateInput = {
  locationId: string
  type: 'OBSTACLE' | 'POI' | 'DOOR' | 'FURNITURE' | 'TERRAIN' | 'HAZARD'
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
  providesCover?: 'NONE' | 'HALF' | 'THREE_QUARTERS' | 'FULL'
  elevation?: number
  metadata?: Record<string, any>
}

export type MovementRuleCreateInput = {
  campaignId: string
  name: string
  maxDistance: number
  interactionType: 'MELEE' | 'RANGED' | 'SPELL' | 'CONVERSATION' | 'PERCEPTION' | 'CUSTOM'
  requiresLineOfSight?: boolean
  description: string
}

export type CharacterPositionUpdate = {
  characterId: string
  locationId?: string | null
  x?: number
  y?: number
  z?: number
  facing?: number | null
}

export type SpatialAIContext = {
  locationName?: string
  characterPosition?: Position3D
  nearbyCharacters?: Array<{
    name: string
    position: Position3D
    distance: number
    canSee: boolean
    coverLevel: string
  }>
  nearbyFeatures?: Array<{
    name: string
    type: string
    position: Position3D
    distance: number
  }>
  availableActions?: Array<{
    action: string
    targetName: string
    requiresMovement: boolean
  }>
}

export type MovementSuggestion = {
  id: string // Unique ID for this suggestion
  characterId: string
  characterName: string
  from: Position3D
  to: Position3D
  reason: string // "To attack orc" or "To investigate altar"
  targetName?: string
  actionType: 'MELEE' | 'RANGED' | 'SPELL' | 'CONVERSATION' | 'PERCEPTION' | 'CUSTOM' | 'MOVEMENT'
  distance: number
  locationId: string
  isValid: boolean
  validationIssues?: string[]
}

export type MovementIntent = {
  detected: boolean
  actionType?: 'MELEE' | 'RANGED' | 'SPELL' | 'CONVERSATION' | 'PERCEPTION' | 'CUSTOM' | 'MOVEMENT'
  targetName?: string
  targetType?: 'character' | 'feature' | 'location' | 'coordinates'
  keywords?: string[]
}

export type MovementValidationResult = {
  isValid: boolean
  blockedBy?: string[]
  suggestedAlternative?: Position3D
  warnings?: string[]
}

export type MovementEvent = {
  type: 'movement'
  characterId: string
  characterName: string
  from: Position3D
  to: Position3D
  reason: string
  timestamp: string
}

