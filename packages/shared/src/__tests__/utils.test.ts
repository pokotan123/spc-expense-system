import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  formatDateJP,
  formatDateShort,
  isValidStatusTransition,
  generateApplicationNumber,
  calculateProposedAmount,
} from '../utils/index.js'
import type { ApplicationStatus } from '../constants/index.js'

describe('formatCurrency', () => {
  it('formats 1234 as ¥1,234', () => {
    expect(formatCurrency(1234)).toBe('¥1,234')
  })

  it('formats 0 as ¥0', () => {
    expect(formatCurrency(0)).toBe('¥0')
  })

  it('formats large numbers with commas', () => {
    expect(formatCurrency(1_000_000)).toBe('¥1,000,000')
  })

  it('formats small number without commas', () => {
    expect(formatCurrency(100)).toBe('¥100')
  })
})

describe('formatDateJP', () => {
  it('formats Date object to Japanese date string', () => {
    const date = new Date(2024, 0, 15) // Jan 15, 2024
    const result = formatDateJP(date)
    expect(result).toContain('2024')
    expect(result).toContain('1')
    expect(result).toContain('15')
  })

  it('formats string date to Japanese date string', () => {
    const result = formatDateJP('2024-03-20T00:00:00.000Z')
    expect(result).toContain('2024')
    expect(result).toContain('3')
    expect(result).toContain('20')
  })
})

describe('formatDateShort', () => {
  it('formats Date object to short format', () => {
    const date = new Date(2024, 0, 15) // Jan 15, 2024
    const result = formatDateShort(date)
    expect(result).toContain('2024')
    expect(result).toContain('01')
    expect(result).toContain('15')
  })

  it('formats string date to short format', () => {
    const result = formatDateShort('2024-06-01T00:00:00.000Z')
    expect(result).toContain('2024')
    expect(result).toContain('06')
    expect(result).toContain('01')
  })
})

describe('isValidStatusTransition', () => {
  it('DRAFT → SUBMITTED = true', () => {
    expect(isValidStatusTransition('DRAFT', 'SUBMITTED')).toBe(true)
  })

  it('DRAFT → APPROVED = false', () => {
    expect(isValidStatusTransition('DRAFT', 'APPROVED')).toBe(false)
  })

  it('DRAFT → REJECTED = false', () => {
    expect(isValidStatusTransition('DRAFT', 'REJECTED')).toBe(false)
  })

  it('SUBMITTED → APPROVED = true', () => {
    expect(isValidStatusTransition('SUBMITTED', 'APPROVED')).toBe(true)
  })

  it('SUBMITTED → RETURNED = true', () => {
    expect(isValidStatusTransition('SUBMITTED', 'RETURNED')).toBe(true)
  })

  it('SUBMITTED → REJECTED = true', () => {
    expect(isValidStatusTransition('SUBMITTED', 'REJECTED')).toBe(true)
  })

  it('SUBMITTED → DRAFT = false', () => {
    expect(isValidStatusTransition('SUBMITTED', 'DRAFT')).toBe(false)
  })

  it('APPROVED → DRAFT = false', () => {
    expect(isValidStatusTransition('APPROVED', 'DRAFT')).toBe(false)
  })

  it('APPROVED → SUBMITTED = false', () => {
    expect(isValidStatusTransition('APPROVED', 'SUBMITTED')).toBe(false)
  })

  it('REJECTED → SUBMITTED = false', () => {
    expect(isValidStatusTransition('REJECTED', 'SUBMITTED')).toBe(false)
  })

  it('RETURNED → SUBMITTED = true', () => {
    expect(isValidStatusTransition('RETURNED', 'SUBMITTED')).toBe(true)
  })

  it('RETURNED → APPROVED = false', () => {
    expect(isValidStatusTransition('RETURNED', 'APPROVED')).toBe(false)
  })
})

describe('generateApplicationNumber', () => {
  it('generates correct format EXP-YYYYMM-NNNN', () => {
    const date = new Date(2024, 11, 1) // Dec 2024
    const result = generateApplicationNumber(date, 1)
    expect(result).toBe('EXP-202412-0001')
  })

  it('pads month with leading zero', () => {
    const date = new Date(2024, 0, 1) // Jan 2024
    const result = generateApplicationNumber(date, 5)
    expect(result).toBe('EXP-202401-0005')
  })

  it('pads sequence number to 4 digits', () => {
    const date = new Date(2024, 5, 1) // Jun 2024
    const result = generateApplicationNumber(date, 42)
    expect(result).toBe('EXP-202406-0042')
  })

  it('handles large sequence numbers', () => {
    const date = new Date(2024, 0, 1)
    const result = generateApplicationNumber(date, 9999)
    expect(result).toBe('EXP-202401-9999')
  })
})

describe('calculateProposedAmount', () => {
  it('returns 50% of amount', () => {
    expect(calculateProposedAmount(1000)).toBe(500)
  })

  it('rounds down for odd amounts', () => {
    expect(calculateProposedAmount(1001)).toBe(500)
  })

  it('returns 0 for amount 0', () => {
    expect(calculateProposedAmount(0)).toBe(0)
  })

  it('returns 0 for amount 1', () => {
    expect(calculateProposedAmount(1)).toBe(0)
  })

  it('handles large amounts', () => {
    expect(calculateProposedAmount(1_000_000)).toBe(500_000)
  })

  it('returns 1 for amount 3 (floor of 1.5)', () => {
    expect(calculateProposedAmount(3)).toBe(1)
  })
})
