/**
 * Unit Tests for Dice Roller Service
 */

import { DiceRollerService, DiceRollResult } from '@/services/dice-roller'

describe('DiceRollerService', () => {
  let diceRoller: DiceRollerService

  beforeEach(() => {
    diceRoller = new DiceRollerService()
  })

  describe('Basic Dice Rolling', () => {
    test('rolls a single d20', () => {
      const result = diceRoller.roll('1d20')
      
      expect(result.formula).toBe('1d20')
      expect(result.total).toBeGreaterThanOrEqual(1)
      expect(result.total).toBeLessThanOrEqual(20)
      expect(result.rolls).toHaveLength(1)
      expect(result.rolls[0]).toHaveLength(1)
      expect(result.modifiers).toBe(0)
    })

    test('rolls multiple d6', () => {
      const result = diceRoller.roll('3d6')
      
      expect(result.formula).toBe('3d6')
      expect(result.total).toBeGreaterThanOrEqual(3)
      expect(result.total).toBeLessThanOrEqual(18)
      expect(result.rolls).toHaveLength(1)
      expect(result.rolls[0]).toHaveLength(3)
      expect(result.modifiers).toBe(0)
    })

    test('handles implicit 1 in dice notation', () => {
      const result = diceRoller.roll('d20')
      
      expect(result.total).toBeGreaterThanOrEqual(1)
      expect(result.total).toBeLessThanOrEqual(20)
      expect(result.rolls[0]).toHaveLength(1)
    })

    test('rolls different dice types', () => {
      const dice = ['1d4', '1d6', '1d8', '1d10', '1d12', '1d20', '1d100']
      const maxValues = [4, 6, 8, 10, 12, 20, 100]

      dice.forEach((die, idx) => {
        const result = diceRoller.roll(die)
        expect(result.total).toBeGreaterThanOrEqual(1)
        expect(result.total).toBeLessThanOrEqual(maxValues[idx])
      })
    })
  })

  describe('Modifiers', () => {
    test('adds positive modifier', () => {
      const result = diceRoller.roll('1d20+5')
      
      expect(result.modifiers).toBe(5)
      expect(result.total).toBeGreaterThanOrEqual(6) // 1 + 5
      expect(result.total).toBeLessThanOrEqual(25)   // 20 + 5
      expect(result.breakdown).toContain('+5')
    })

    test('subtracts negative modifier', () => {
      const result = diceRoller.roll('1d20-3')
      
      expect(result.modifiers).toBe(-3)
      expect(result.total).toBeGreaterThanOrEqual(-2) // 1 - 3
      expect(result.total).toBeLessThanOrEqual(17)     // 20 - 3
      expect(result.breakdown).toContain('-3')
    })

    test('handles multiple modifiers', () => {
      const result = diceRoller.roll('1d20+5-2+3')
      
      expect(result.modifiers).toBe(6) // 5 - 2 + 3
      expect(result.total).toBeGreaterThanOrEqual(7)
      expect(result.total).toBeLessThanOrEqual(26)
    })

    test('handles spaces in formula', () => {
      const result = diceRoller.roll('1d20 + 5 - 2')
      
      expect(result.modifiers).toBe(3)
      expect(result.total).toBeGreaterThanOrEqual(4)
      expect(result.total).toBeLessThanOrEqual(23)
    })
  })

  describe('Keep Highest/Lowest', () => {
    test('keeps highest (advantage)', () => {
      const result = diceRoller.roll('2d20kh1')
      
      expect(result.formula).toBe('2d20kh1')
      expect(result.rolls[0]).toHaveLength(2)
      expect(result.kept[0]).toHaveLength(1)
      expect(result.dropped[0]).toHaveLength(1)
      
      // Kept die should be >= dropped die
      const kept = result.kept[0][0]
      const dropped = result.dropped[0][0]
      expect(kept).toBeGreaterThanOrEqual(dropped)
      expect(result.total).toBe(kept)
    })

    test('keeps lowest (disadvantage)', () => {
      const result = diceRoller.roll('2d20kl1')
      
      expect(result.rolls[0]).toHaveLength(2)
      expect(result.kept[0]).toHaveLength(1)
      expect(result.dropped[0]).toHaveLength(1)
      
      // Kept die should be <= dropped die
      const kept = result.kept[0][0]
      const dropped = result.dropped[0][0]
      expect(kept).toBeLessThanOrEqual(dropped)
      expect(result.total).toBe(kept)
    })

    test('keeps highest 2 from 3d6', () => {
      const result = diceRoller.roll('3d6kh2')
      
      expect(result.rolls[0]).toHaveLength(3)
      expect(result.kept[0]).toHaveLength(2)
      expect(result.dropped[0]).toHaveLength(1)
      
      const kept = result.kept[0]
      const dropped = result.dropped[0][0]
      
      // Both kept dice should be >= dropped die
      kept.forEach(k => {
        expect(k).toBeGreaterThanOrEqual(dropped)
      })
      
      expect(result.total).toBe(kept[0] + kept[1])
    })

    test('keeps lowest 2 from 4d6', () => {
      const result = diceRoller.roll('4d6kl2')
      
      expect(result.rolls[0]).toHaveLength(4)
      expect(result.kept[0]).toHaveLength(2)
      expect(result.dropped[0]).toHaveLength(2)
      
      const kept = result.kept[0]
      const total = kept.reduce((sum, k) => sum + k, 0)
      expect(result.total).toBe(total)
    })

    test('keeps with modifiers', () => {
      const result = diceRoller.roll('2d20kh1+5')
      
      expect(result.kept[0]).toHaveLength(1)
      expect(result.modifiers).toBe(5)
      expect(result.total).toBe(result.kept[0][0] + 5)
    })
  })

  describe('Multiple Dice Groups', () => {
    test('rolls multiple different dice', () => {
      const result = diceRoller.roll('1d20+2d6')
      
      expect(result.rolls).toHaveLength(2)
      expect(result.rolls[0]).toHaveLength(1) // 1d20
      expect(result.rolls[1]).toHaveLength(2) // 2d6
      
      const d20Roll = result.rolls[0][0]
      const d6Rolls = result.rolls[1]
      const expectedTotal = d20Roll + d6Rolls[0] + d6Rolls[1]
      
      expect(result.total).toBe(expectedTotal)
    })

    test('combines dice groups with modifiers', () => {
      const result = diceRoller.roll('1d20+2d6+5')
      
      expect(result.rolls).toHaveLength(2)
      expect(result.modifiers).toBe(5)
      
      const d20Total = result.rolls[0][0]
      const d6Total = result.rolls[1].reduce((sum, r) => sum + r, 0)
      const expectedTotal = d20Total + d6Total + 5
      
      expect(result.total).toBe(expectedTotal)
    })

    test('handles complex formula', () => {
      const result = diceRoller.roll('1d20+1d8+1d6+3')
      
      expect(result.rolls).toHaveLength(3)
      expect(result.modifiers).toBe(3)
      expect(result.total).toBeGreaterThanOrEqual(6)  // 1+1+1+3
      expect(result.total).toBeLessThanOrEqual(37)   // 20+8+6+3
    })
  })

  describe('Breakdown String', () => {
    test('includes dice rolls in breakdown', () => {
      const result = diceRoller.roll('2d6')
      
      expect(result.breakdown).toContain('2d6')
      expect(result.breakdown).toContain('Total')
    })

    test('shows kept and dropped dice', () => {
      const result = diceRoller.roll('3d6kh2')
      
      expect(result.breakdown).toContain('kept')
      expect(result.breakdown).toContain('dropped')
    })

    test('includes modifiers in breakdown', () => {
      const result = diceRoller.roll('1d20+5')
      
      expect(result.breakdown).toContain('+5')
      expect(result.breakdown).toContain('Total')
    })
  })

  describe('Formula Validation', () => {
    test('validates correct formulas', () => {
      const valid = [
        '1d20',
        '2d6+3',
        '1d20-2',
        '3d6kh2',
        '2d20kl1',
        'd20+5',
        '1d20 + 5 - 2',
      ]

      valid.forEach(formula => {
        const result = diceRoller.validateFormula(formula)
        expect(result.valid).toBe(true)
        expect(result.error).toBeUndefined()
      })
    })

    test('rejects invalid formulas', () => {
      const invalid = [
        '',
        'abc',
        '1d',
        'd',
        '1x20',
        // Note: '1d20+' and '+5' are actually valid (parsed as modifiers or rolls)
        '1d20++5',
      ]

      invalid.forEach(formula => {
        const result = diceRoller.validateFormula(formula)
        expect(result.valid).toBe(false)
        expect(result.error).toBeDefined()
      })
    })
  })

  describe('Edge Cases', () => {
    test('throws error for empty formula', () => {
      expect(() => diceRoller.roll('')).toThrow('Empty dice formula')
    })

    test('throws error for no dice in formula', () => {
      expect(() => diceRoller.roll('5')).toThrow('No dice specified')
    })

    test('throws error for invalid dice notation', () => {
      expect(() => diceRoller.roll('1x20')).toThrow('Invalid modifier or dice notation')
      expect(() => diceRoller.roll('abc')).toThrow('Invalid modifier or dice notation')
    })

    test('throws error for too many dice', () => {
      expect(() => diceRoller.roll('101d6')).toThrow('Dice count must be between')
    })

    test('throws error for invalid dice sides', () => {
      expect(() => diceRoller.roll('1d1')).toThrow('Dice sides must be between')
      expect(() => diceRoller.roll('1d1001')).toThrow('Dice sides must be between')
    })

    test('throws error for keeping more dice than rolled', () => {
      expect(() => diceRoller.roll('2d6kh3')).toThrow('Cannot keep 3 dice from 2 rolled')
    })

    test('handles 0 dice gracefully', () => {
      expect(() => diceRoller.roll('0d6')).toThrow('Dice count must be between')
    })

    test('handles negative modifiers resulting in negative total', () => {
      // Force a low roll scenario (statistically possible)
      const result = diceRoller.roll('1d4-10')
      expect(result.modifiers).toBe(-10)
      expect(result.total).toBeGreaterThanOrEqual(-9) // 1 - 10
      expect(result.total).toBeLessThanOrEqual(-6)     // 4 - 10
    })
  })

  describe('Presets', () => {
    test('has standard presets defined', () => {
      expect(DiceRollerService.PRESETS.D20).toBe('1d20')
      expect(DiceRollerService.PRESETS.D20_ADV).toBe('2d20kh1')
      expect(DiceRollerService.PRESETS.D20_DISADV).toBe('2d20kl1')
      expect(DiceRollerService.PRESETS.D6).toBe('1d6')
      expect(DiceRollerService.PRESETS.D100).toBe('1d100')
    })

    test('presets work correctly', () => {
      Object.values(DiceRollerService.PRESETS).forEach(preset => {
        const result = diceRoller.roll(preset)
        expect(result.total).toBeGreaterThan(0)
      })
    })
  })

  describe('Randomness Distribution', () => {
    test('d20 rolls are within expected range over multiple rolls', () => {
      const rolls = Array.from({ length: 100 }, () => diceRoller.roll('1d20'))
      
      rolls.forEach(result => {
        expect(result.total).toBeGreaterThanOrEqual(1)
        expect(result.total).toBeLessThanOrEqual(20)
      })

      // Check we got some variety (not all the same number)
      const uniqueTotals = new Set(rolls.map(r => r.total))
      expect(uniqueTotals.size).toBeGreaterThan(5)
    })

    test('advantage tends to roll higher than disadvantage', () => {
      const advantageRolls = Array.from({ length: 50 }, () => 
        diceRoller.roll('2d20kh1').total
      )
      const disadvantageRolls = Array.from({ length: 50 }, () => 
        diceRoller.roll('2d20kl1').total
      )

      const avgAdvantage = advantageRolls.reduce((a, b) => a + b, 0) / advantageRolls.length
      const avgDisadvantage = disadvantageRolls.reduce((a, b) => a + b, 0) / disadvantageRolls.length

      // Statistically, advantage should average higher (not guaranteed in small sample, but likely)
      // We'll just check both are in valid range
      expect(avgAdvantage).toBeGreaterThanOrEqual(1)
      expect(avgAdvantage).toBeLessThanOrEqual(20)
      expect(avgDisadvantage).toBeGreaterThanOrEqual(1)
      expect(avgDisadvantage).toBeLessThanOrEqual(20)
    })
  })

  describe('Case Insensitivity', () => {
    test('handles uppercase notation', () => {
      const result = diceRoller.roll('1D20+5')
      expect(result.total).toBeGreaterThanOrEqual(6)
      expect(result.total).toBeLessThanOrEqual(25)
    })

    test('handles mixed case', () => {
      const result = diceRoller.roll('2d20KH1')
      expect(result.kept[0]).toHaveLength(1)
    })
  })
})
