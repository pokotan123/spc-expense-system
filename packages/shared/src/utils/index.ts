import type { ApplicationStatus } from '../constants/index.js'
import { VALID_STATUS_TRANSITIONS } from '../constants/index.js'

/**
 * Format amount as Japanese Yen (¥1,234)
 */
export function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString('ja-JP')}`
}

/**
 * Format date as Japanese format (2024年1月15日)
 */
export function formatDateJP(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Format date as short format (2024/01/15)
 */
export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

/**
 * Check if a status transition is valid
 */
export function isValidStatusTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
): boolean {
  const allowed = VALID_STATUS_TRANSITIONS[from]
  return allowed.includes(to)
}

/**
 * Generate application number format: EXP-YYYYMM-NNNN
 */
export function generateApplicationNumber(
  date: Date,
  sequence: number,
): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const seq = String(sequence).padStart(4, '0')
  return `EXP-${year}${month}-${seq}`
}

/**
 * Calculate proposed subsidy amount: 50% of original, rounded down
 */
export function calculateProposedAmount(amount: number): number {
  return Math.floor(amount / 2)
}
