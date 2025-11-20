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
  activeNPCs?: string[]
  ongoingQuests?: string[]
  partyConditions?: Record<string, any>
  recentEvents?: string[]
}

