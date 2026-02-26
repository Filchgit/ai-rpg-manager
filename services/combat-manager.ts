/**
 * Combat Manager Service
 * 
 * Manages combat sessions, combatants, initiative, HP tracking, and conditions.
 */

import { prisma } from '@/lib/db'
import { diceRollerService } from './dice-roller'
import { CombatStatus } from '@prisma/client'

export interface CombatantInput {
  name: string
  characterId?: string
  maxHP: number
  currentHP?: number
  armorClass?: number
  initiativeBonus?: number
  isPlayer?: boolean
  notes?: string
}

export interface CombatStateSummary {
  id: string
  status: CombatStatus
  currentRound: number
  currentTurn: number
  currentCombatant: CombatantSummary | null
  combatants: CombatantSummary[]
  recentLog: CombatLogEntrySummary[]
}

export interface CombatantSummary {
  id: string
  name: string
  initiative: number
  currentHP: number
  maxHP: number
  tempHP: number
  armorClass: number
  conditions: string[]
  isPlayer: boolean
  isActive: boolean
  isCurrent: boolean
}

export interface CombatLogEntrySummary {
  id: string
  round: number
  turn: number
  combatantName: string | null
  action: string
  description: string
  createdAt: Date
}

export class CombatManagerService {
  /**
   * Start a new combat session
   */
  async startCombat(sessionId: string, combatants: CombatantInput[]) {
    if (combatants.length === 0) {
      throw new Error('At least one combatant is required to start combat')
    }

    // Check if there's already an active combat
    const existingCombat = await prisma.combatSession.findFirst({
      where: {
        sessionId,
        status: CombatStatus.ACTIVE,
      },
    })

    if (existingCombat) {
      throw new Error('There is already an active combat session. End it first.')
    }

    // Create combat session
    const combatSession = await prisma.combatSession.create({
      data: {
        sessionId,
        status: CombatStatus.ACTIVE,
        currentTurn: 0,
        currentRound: 1,
        initiativeOrder: [],
        combatants: {
          create: combatants.map(c => ({
            name: c.name,
            characterId: c.characterId,
            maxHP: c.maxHP,
            currentHP: c.currentHP ?? c.maxHP,
            armorClass: c.armorClass ?? 10,
            initiative: 0, // Will be set when rolling initiative
            isPlayer: c.isPlayer ?? false,
            notes: c.notes,
          })),
        },
      },
      include: {
        combatants: true,
      },
    })

    // Log combat start
    await prisma.combatLogEntry.create({
      data: {
        combatSessionId: combatSession.id,
        round: 1,
        turn: 0,
        action: 'combat_start',
        description: `Combat started with ${combatants.length} combatant(s)`,
      },
    })

    return combatSession
  }

  /**
   * Roll initiative for all combatants
   */
  async rollInitiative(combatSessionId: string) {
    const combatSession = await prisma.combatSession.findUnique({
      where: { id: combatSessionId },
      include: { combatants: true },
    })

    if (!combatSession) {
      throw new Error('Combat session not found')
    }

    // Roll initiative for each combatant
    const initiativeRolls: { combatantId: string; initiative: number; name: string }[] = []

    for (const combatant of combatSession.combatants) {
      // Roll 1d20 for initiative (no modifiers for now - can be added later)
      const roll = diceRollerService.roll('1d20')
      const initiative = roll.total

      // Update combatant initiative
      await prisma.combatant.update({
        where: { id: combatant.id },
        data: { initiative },
      })

      initiativeRolls.push({
        combatantId: combatant.id,
        initiative,
        name: combatant.name,
      })

      // Log the roll
      await prisma.combatLogEntry.create({
        data: {
          combatSessionId,
          round: 1,
          turn: 0,
          combatantId: combatant.id,
          combatantName: combatant.name,
          action: 'initiative_roll',
          description: `${combatant.name} rolled ${initiative} for initiative`,
          metadata: { initiative, roll: roll.breakdown },
        },
      })
    }

    // Sort by initiative (highest first), then by name as tiebreaker
    const sortedInitiative = initiativeRolls.sort((a, b) => {
      if (b.initiative !== a.initiative) {
        return b.initiative - a.initiative
      }
      return a.name.localeCompare(b.name)
    })

    // Update combat session with initiative order
    const initiativeOrder = sortedInitiative.map(r => r.combatantId)
    await prisma.combatSession.update({
      where: { id: combatSessionId },
      data: {
        initiativeOrder,
        currentTurn: 0, // Start at first combatant
      },
    })

    return {
      initiativeOrder: sortedInitiative,
    }
  }

  /**
   * Get the current combatant
   */
  async getCurrentCombatant(combatSessionId: string) {
    const combatSession = await prisma.combatSession.findUnique({
      where: { id: combatSessionId },
      include: { combatants: true },
    })

    if (!combatSession) {
      throw new Error('Combat session not found')
    }

    const initiativeOrder = combatSession.initiativeOrder as string[]
    if (initiativeOrder.length === 0) {
      return null
    }

    const currentCombatantId = initiativeOrder[combatSession.currentTurn]
    return combatSession.combatants.find(c => c.id === currentCombatantId) || null
  }

  /**
   * Advance to the next turn
   */
  async nextTurn(combatSessionId: string) {
    const combatSession = await prisma.combatSession.findUnique({
      where: { id: combatSessionId },
      include: { combatants: true },
    })

    if (!combatSession) {
      throw new Error('Combat session not found')
    }

    const initiativeOrder = combatSession.initiativeOrder as string[]
    if (initiativeOrder.length === 0) {
      throw new Error('Initiative has not been rolled yet')
    }

    let nextTurn = combatSession.currentTurn + 1
    let nextRound = combatSession.currentRound

    // If we've cycled through all combatants, start new round
    if (nextTurn >= initiativeOrder.length) {
      nextTurn = 0
      nextRound += 1
    }

    // Skip inactive combatants
    let skippedCount = 0
    while (skippedCount < initiativeOrder.length) {
      const combatantId = initiativeOrder[nextTurn]
      const combatant = combatSession.combatants.find(c => c.id === combatantId)

      if (combatant?.isActive) {
        break // Found an active combatant
      }

      // Skip this combatant
      nextTurn += 1
      if (nextTurn >= initiativeOrder.length) {
        nextTurn = 0
        nextRound += 1
      }
      skippedCount += 1
    }

    // If all combatants are inactive, combat should end
    if (skippedCount >= initiativeOrder.length) {
      return await this.endCombat(combatSessionId)
    }

    // Update combat session
    await prisma.combatSession.update({
      where: { id: combatSessionId },
      data: {
        currentTurn: nextTurn,
        currentRound: nextRound,
      },
    })

    const currentCombatant = await this.getCurrentCombatant(combatSessionId)

    // Log turn change
    if (currentCombatant) {
      await prisma.combatLogEntry.create({
        data: {
          combatSessionId,
          round: nextRound,
          turn: nextTurn,
          combatantId: currentCombatant.id,
          combatantName: currentCombatant.name,
          action: 'turn_start',
          description: `${currentCombatant.name}'s turn (Round ${nextRound})`,
        },
      })
    }

    return {
      currentRound: nextRound,
      currentTurn: nextTurn,
      currentCombatant,
    }
  }

  /**
   * Apply damage to a combatant
   */
  async applyDamage(combatantId: string, amount: number, source?: string) {
    const combatant = await prisma.combatant.findUnique({
      where: { id: combatantId },
      include: { combatSession: true },
    })

    if (!combatant) {
      throw new Error('Combatant not found')
    }

    // Temp HP absorbs damage first
    let remainingDamage = amount
    let newTempHP = combatant.tempHP
    let newCurrentHP = combatant.currentHP

    if (newTempHP > 0) {
      if (remainingDamage <= newTempHP) {
        newTempHP -= remainingDamage
        remainingDamage = 0
      } else {
        remainingDamage -= newTempHP
        newTempHP = 0
      }
    }

    // Apply remaining damage to current HP
    newCurrentHP -= remainingDamage
    const isDead = newCurrentHP <= 0

    // Update combatant
    await prisma.combatant.update({
      where: { id: combatantId },
      data: {
        currentHP: Math.max(0, newCurrentHP),
        tempHP: newTempHP,
        isActive: !isDead,
      },
    })

    // Log the damage
    const description = source
      ? `${combatant.name} took ${amount} damage from ${source} (${newCurrentHP}/${combatant.maxHP} HP${isDead ? ', DEFEATED' : ''})`
      : `${combatant.name} took ${amount} damage (${newCurrentHP}/${combatant.maxHP} HP${isDead ? ', DEFEATED' : ''})`

    await prisma.combatLogEntry.create({
      data: {
        combatSessionId: combatant.combatSessionId,
        round: combatant.combatSession.currentRound,
        turn: combatant.combatSession.currentTurn,
        combatantId,
        combatantName: combatant.name,
        action: isDead ? 'death' : 'damage',
        description,
        metadata: { damage: amount, source, newHP: newCurrentHP, isDead },
      },
    })

    return {
      combatant: await prisma.combatant.findUnique({ where: { id: combatantId } }),
      isDead,
    }
  }

  /**
   * Apply healing to a combatant
   */
  async applyHealing(combatantId: string, amount: number, source?: string) {
    const combatant = await prisma.combatant.findUnique({
      where: { id: combatantId },
      include: { combatSession: true },
    })

    if (!combatant) {
      throw new Error('Combatant not found')
    }

    const newCurrentHP = Math.min(combatant.currentHP + amount, combatant.maxHP)
    const actualHealing = newCurrentHP - combatant.currentHP

    await prisma.combatant.update({
      where: { id: combatantId },
      data: { currentHP: newCurrentHP },
    })

    // Log the healing
    const description = source
      ? `${combatant.name} was healed for ${actualHealing} HP by ${source} (${newCurrentHP}/${combatant.maxHP} HP)`
      : `${combatant.name} was healed for ${actualHealing} HP (${newCurrentHP}/${combatant.maxHP} HP)`

    await prisma.combatLogEntry.create({
      data: {
        combatSessionId: combatant.combatSessionId,
        round: combatant.combatSession.currentRound,
        turn: combatant.combatSession.currentTurn,
        combatantId,
        combatantName: combatant.name,
        action: 'heal',
        description,
        metadata: { healing: actualHealing, source, newHP: newCurrentHP },
      },
    })

    return await prisma.combatant.findUnique({ where: { id: combatantId } })
  }

  /**
   * Add a condition to a combatant
   */
  async addCondition(combatantId: string, condition: string) {
    const combatant = await prisma.combatant.findUnique({
      where: { id: combatantId },
      include: { combatSession: true },
    })

    if (!combatant) {
      throw new Error('Combatant not found')
    }

    const conditions = combatant.conditions as string[]
    if (conditions.includes(condition)) {
      throw new Error(`Combatant already has condition: ${condition}`)
    }

    const newConditions = [...conditions, condition]

    await prisma.combatant.update({
      where: { id: combatantId },
      data: { conditions: newConditions },
    })

    // Log the condition
    await prisma.combatLogEntry.create({
      data: {
        combatSessionId: combatant.combatSessionId,
        round: combatant.combatSession.currentRound,
        turn: combatant.combatSession.currentTurn,
        combatantId,
        combatantName: combatant.name,
        action: 'condition_add',
        description: `${combatant.name} gained condition: ${condition}`,
        metadata: { condition, conditions: newConditions },
      },
    })

    return await prisma.combatant.findUnique({ where: { id: combatantId } })
  }

  /**
   * Remove a condition from a combatant
   */
  async removeCondition(combatantId: string, condition: string) {
    const combatant = await prisma.combatant.findUnique({
      where: { id: combatantId },
      include: { combatSession: true },
    })

    if (!combatant) {
      throw new Error('Combatant not found')
    }

    const conditions = combatant.conditions as string[]
    if (!conditions.includes(condition)) {
      throw new Error(`Combatant does not have condition: ${condition}`)
    }

    const newConditions = conditions.filter(c => c !== condition)

    await prisma.combatant.update({
      where: { id: combatantId },
      data: { conditions: newConditions },
    })

    // Log the condition removal
    await prisma.combatLogEntry.create({
      data: {
        combatSessionId: combatant.combatSessionId,
        round: combatant.combatSession.currentRound,
        turn: combatant.combatSession.currentTurn,
        combatantId,
        combatantName: combatant.name,
        action: 'condition_remove',
        description: `${combatant.name} lost condition: ${condition}`,
        metadata: { condition, conditions: newConditions },
      },
    })

    return await prisma.combatant.findUnique({ where: { id: combatantId } })
  }

  /**
   * End combat
   */
  async endCombat(combatSessionId: string) {
    const combatSession = await prisma.combatSession.findUnique({
      where: { id: combatSessionId },
      include: { combatants: true },
    })

    if (!combatSession) {
      throw new Error('Combat session not found')
    }

    await prisma.combatSession.update({
      where: { id: combatSessionId },
      data: {
        status: CombatStatus.ENDED,
        endedAt: new Date(),
      },
    })

    // Log combat end
    await prisma.combatLogEntry.create({
      data: {
        combatSessionId,
        round: combatSession.currentRound,
        turn: combatSession.currentTurn,
        action: 'combat_end',
        description: `Combat ended after ${combatSession.currentRound} round(s)`,
      },
    })

    return await prisma.combatSession.findUnique({
      where: { id: combatSessionId },
      include: { combatants: true },
    })
  }

  /**
   * Get detailed combat state
   */
  async getCombatState(combatSessionId: string): Promise<CombatStateSummary> {
    const combatSession = await prisma.combatSession.findUnique({
      where: { id: combatSessionId },
      include: {
        combatants: {
          orderBy: { initiative: 'desc' },
        },
        combatLog: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!combatSession) {
      throw new Error('Combat session not found')
    }

    const initiativeOrder = combatSession.initiativeOrder as string[]
    const currentCombatantId = initiativeOrder[combatSession.currentTurn]

    return {
      id: combatSession.id,
      status: combatSession.status,
      currentRound: combatSession.currentRound,
      currentTurn: combatSession.currentTurn,
      currentCombatant: combatSession.combatants.find(c => c.id === currentCombatantId)
        ? {
            id: combatSession.combatants.find(c => c.id === currentCombatantId)!.id,
            name: combatSession.combatants.find(c => c.id === currentCombatantId)!.name,
            initiative: combatSession.combatants.find(c => c.id === currentCombatantId)!.initiative,
            currentHP: combatSession.combatants.find(c => c.id === currentCombatantId)!.currentHP,
            maxHP: combatSession.combatants.find(c => c.id === currentCombatantId)!.maxHP,
            tempHP: combatSession.combatants.find(c => c.id === currentCombatantId)!.tempHP,
            armorClass: combatSession.combatants.find(c => c.id === currentCombatantId)!.armorClass,
            conditions: combatSession.combatants.find(c => c.id === currentCombatantId)!.conditions as string[],
            isPlayer: combatSession.combatants.find(c => c.id === currentCombatantId)!.isPlayer,
            isActive: combatSession.combatants.find(c => c.id === currentCombatantId)!.isActive,
            isCurrent: true,
          }
        : null,
      combatants: combatSession.combatants.map(c => ({
        id: c.id,
        name: c.name,
        initiative: c.initiative,
        currentHP: c.currentHP,
        maxHP: c.maxHP,
        tempHP: c.tempHP,
        armorClass: c.armorClass,
        conditions: c.conditions as string[],
        isPlayer: c.isPlayer,
        isActive: c.isActive,
        isCurrent: c.id === currentCombatantId,
      })),
      recentLog: combatSession.combatLog.map(log => ({
        id: log.id,
        round: log.round,
        turn: log.turn,
        combatantName: log.combatantName,
        action: log.action,
        description: log.description,
        createdAt: log.createdAt,
      })),
    }
  }
}

// Singleton instance
export const combatManagerService = new CombatManagerService()
