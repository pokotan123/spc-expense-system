import { calculateProposedAmount } from '@spc/shared'

export interface SubsidyCalculation {
  readonly originalAmount: number
  readonly proposedAmount: number
}

export function createSubsidyService() {
  /**
   * Calculate proposed subsidy amount.
   * Rule: max(amount/2, fixed_amount).
   * Currently fixed_amount is not defined, so we use amount/2 (floor).
   * Admin can override with final_amount at approval time.
   */
  function calculate(amount: number): SubsidyCalculation {
    const proposedAmount = calculateProposedAmount(amount)
    return Object.freeze({
      originalAmount: amount,
      proposedAmount,
    })
  }

  return Object.freeze({ calculate })
}

export type SubsidyService = ReturnType<typeof createSubsidyService>
