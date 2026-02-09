import { describe, it, expect } from 'vitest'
import { createSubsidyService } from '../subsidy-service.js'

describe('SubsidyService', () => {
  const service = createSubsidyService()

  describe('calculate', () => {
    it('returns 50% of amount (1000 → 500)', () => {
      const result = service.calculate(1000)
      expect(result.proposedAmount).toBe(500)
      expect(result.originalAmount).toBe(1000)
    })

    it('rounds down odd amounts (1001 → 500)', () => {
      const result = service.calculate(1001)
      expect(result.proposedAmount).toBe(500)
    })

    it('returns 0 for amount 0', () => {
      const result = service.calculate(0)
      expect(result.proposedAmount).toBe(0)
      expect(result.originalAmount).toBe(0)
    })

    it('returns 0 for amount 1 (floor of 0.5)', () => {
      const result = service.calculate(1)
      expect(result.proposedAmount).toBe(0)
    })

    it('handles large amounts correctly', () => {
      const result = service.calculate(1_000_000)
      expect(result.proposedAmount).toBe(500_000)
    })

    it('returns frozen object', () => {
      const result = service.calculate(1000)
      expect(Object.isFrozen(result)).toBe(true)
    })

    it('returns correct structure', () => {
      const result = service.calculate(2500)
      expect(result).toEqual({
        originalAmount: 2500,
        proposedAmount: 1250,
      })
    })
  })
})
