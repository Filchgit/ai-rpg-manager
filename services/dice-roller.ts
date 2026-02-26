/**
 * Dice Rolling Engine
 * 
 * Parses and executes dice notation for combat and skill checks.
 * Supports standard RPG dice notation: XdY+Z
 * 
 * Examples:
 * - 1d20 → Roll one 20-sided die
 * - 2d6+3 → Roll two 6-sided dice and add 3
 * - 1d20+5-2 → Roll one 20-sided die, add 5, subtract 2
 * - 3d6kh2 → Roll three 6-sided dice, keep highest 2
 * - 2d20kh1 → Advantage (roll 2d20, keep highest)
 * - 2d20kl1 → Disadvantage (roll 2d20, keep lowest)
 */

export interface DiceRollResult {
  total: number
  formula: string
  breakdown: string
  rolls: number[][]  // Array of arrays for multiple dice groups
  modifiers: number
  kept: number[][]   // Which dice were kept (for kh/kl)
  dropped: number[][] // Which dice were dropped
}

export interface DiceGroup {
  count: number      // Number of dice
  sides: number      // Sides per die
  keep?: {
    type: 'highest' | 'lowest'
    count: number
  }
}

export interface DiceFormula {
  groups: DiceGroup[]
  modifiers: number[]
}

export class DiceRollerService {
  /**
   * Roll dice based on a formula string
   */
  roll(formula: string): DiceRollResult {
    const cleanFormula = formula.toLowerCase().replace(/\s+/g, '')
    
    if (!cleanFormula) {
      throw new Error('Empty dice formula')
    }

    const parsed = this.parseFormula(cleanFormula)
    return this.executeRoll(parsed, formula)
  }

  /**
   * Parse a dice formula into components
   */
  private parseFormula(formula: string): DiceFormula {
    const groups: DiceGroup[] = []
    const modifiers: number[] = []

    // Check for invalid patterns
    if (/[+-]{2,}/.test(formula)) {
      throw new Error('Invalid formula: consecutive operators not allowed')
    }

    // Split by + and - while keeping the operators
    const parts = formula.split(/([+-])/).filter(p => p)
    
    let currentSign = 1
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      
      if (part === '+') {
        currentSign = 1
        continue
      }
      if (part === '-') {
        currentSign = -1
        continue
      }

      // Check if it's a dice notation (XdY) or modifier (number)
      if (part.includes('d')) {
        const group = this.parseDiceGroup(part)
        groups.push(group)
        currentSign = 1 // Reset sign after dice group
      } else {
        // It's a modifier - must be a pure number
        if (!/^\d+$/.test(part)) {
          throw new Error(`Invalid modifier or dice notation: ${part}`)
        }
        const value = parseInt(part, 10)
        modifiers.push(value * currentSign)
        currentSign = 1
      }
    }

    if (groups.length === 0) {
      throw new Error('No dice specified in formula')
    }

    return { groups, modifiers }
  }

  /**
   * Parse a single dice group (e.g., "3d6kh2")
   */
  private parseDiceGroup(groupStr: string): DiceGroup {
    // Match patterns like: 3d6, 1d20, 2d6kh1, 3d6kl2
    const match = groupStr.match(/^(\d*)d(\d+)(kh|kl)?(\d*)$/i)
    
    if (!match) {
      throw new Error(`Invalid dice notation: ${groupStr}`)
    }

    const count = match[1] ? parseInt(match[1], 10) : 1
    const sides = parseInt(match[2], 10)
    const keepType = match[3] as 'kh' | 'kl' | undefined
    const keepCount = match[4] ? parseInt(match[4], 10) : undefined

    if (count <= 0 || count > 100) {
      throw new Error(`Dice count must be between 1 and 100: ${count}`)
    }

    if (sides < 2 || sides > 1000) {
      throw new Error(`Dice sides must be between 2 and 1000: ${sides}`)
    }

    const group: DiceGroup = { count, sides }

    if (keepType && keepCount !== undefined) {
      if (keepCount > count) {
        throw new Error(`Cannot keep ${keepCount} dice from ${count} rolled`)
      }
      group.keep = {
        type: keepType === 'kh' ? 'highest' : 'lowest',
        count: keepCount,
      }
    }

    return group
  }

  /**
   * Execute the dice roll
   */
  private executeRoll(parsed: DiceFormula, originalFormula: string): DiceRollResult {
    const allRolls: number[][] = []
    const keptRolls: number[][] = []
    const droppedRolls: number[][] = []
    let runningTotal = 0

    // Roll each dice group
    for (const group of parsed.groups) {
      const rolls = this.rollDice(group.count, group.sides)
      allRolls.push(rolls)

      let kept: number[]
      let dropped: number[]

      if (group.keep) {
        const sorted = [...rolls].sort((a, b) => 
          group.keep!.type === 'highest' ? b - a : a - b
        )
        kept = sorted.slice(0, group.keep.count)
        dropped = sorted.slice(group.keep.count)
      } else {
        kept = rolls
        dropped = []
      }

      keptRolls.push(kept)
      droppedRolls.push(dropped)
      runningTotal += kept.reduce((sum, roll) => sum + roll, 0)
    }

    // Apply modifiers
    const totalModifiers = parsed.modifiers.reduce((sum, mod) => sum + mod, 0)
    runningTotal += totalModifiers

    // Build breakdown string
    const breakdown = this.buildBreakdown(parsed, allRolls, keptRolls, droppedRolls, totalModifiers, runningTotal)

    return {
      total: runningTotal,
      formula: originalFormula,
      breakdown,
      rolls: allRolls,
      modifiers: totalModifiers,
      kept: keptRolls,
      dropped: droppedRolls,
    }
  }

  /**
   * Roll multiple dice
   */
  private rollDice(count: number, sides: number): number[] {
    const rolls: number[] = []
    for (let i = 0; i < count; i++) {
      rolls.push(Math.floor(Math.random() * sides) + 1)
    }
    return rolls
  }

  /**
   * Build a human-readable breakdown string
   */
  private buildBreakdown(
    parsed: DiceFormula,
    allRolls: number[][],
    keptRolls: number[][],
    droppedRolls: number[][],
    totalModifiers: number,
    finalTotal: number
  ): string {
    const parts: string[] = []

    // Describe each dice group
    parsed.groups.forEach((group, idx) => {
      const rolls = allRolls[idx]
      const kept = keptRolls[idx]
      const dropped = droppedRolls[idx]

      let groupStr = `${group.count}d${group.sides}: [${rolls.join(', ')}]`

      if (group.keep) {
        groupStr += ` → kept [${kept.join(', ')}]`
        if (dropped.length > 0) {
          groupStr += `, dropped [${dropped.join(', ')}]`
        }
      }

      const subtotal = kept.reduce((sum, r) => sum + r, 0)
      groupStr += ` = ${subtotal}`

      parts.push(groupStr)
    })

    // Add modifiers
    if (totalModifiers !== 0) {
      const sign = totalModifiers > 0 ? '+' : ''
      parts.push(`${sign}${totalModifiers}`)
    }

    // Final total
    return `${parts.join('; ')} → Total: ${finalTotal}`
  }

  /**
   * Validate a formula without rolling
   */
  validateFormula(formula: string): { valid: boolean; error?: string } {
    try {
      const cleanFormula = formula.toLowerCase().replace(/\s+/g, '')
      this.parseFormula(cleanFormula)
      return { valid: true }
    } catch (error: any) {
      return { valid: false, error: error.message }
    }
  }

  /**
   * Common dice presets
   */
  static readonly PRESETS = {
    D20: '1d20',
    D20_ADV: '2d20kh1',  // Advantage
    D20_DISADV: '2d20kl1', // Disadvantage
    D6: '1d6',
    D8: '1d8',
    D10: '1d10',
    D12: '1d12',
    D100: '1d100',
  }
}

// Singleton instance
export const diceRollerService = new DiceRollerService()
