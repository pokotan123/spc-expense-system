import { describe, it, expect } from 'vitest'
import {
  loginSchema,
  createExpenseApplicationSchema,
  approveApplicationSchema,
  returnApplicationSchema,
  rejectApplicationSchema,
  paginationSchema,
  applicationFilterSchema,
  createMemberSchema,
  updateOcrResultSchema,
} from '../schemas/index.js'

describe('loginSchema', () => {
  it('validates correct input', () => {
    const result = loginSchema.safeParse({
      member_id: 'SPC-0001',
      password: 'password123',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty member_id', () => {
    const result = loginSchema.safeParse({
      member_id: '',
      password: 'password123',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing member_id', () => {
    const result = loginSchema.safeParse({
      password: 'password123',
    })
    expect(result.success).toBe(false)
  })

  it('rejects short password (< 6 chars)', () => {
    const result = loginSchema.safeParse({
      member_id: 'SPC-0001',
      password: '12345',
    })
    expect(result.success).toBe(false)
  })

  it('accepts password with exactly 6 characters', () => {
    const result = loginSchema.safeParse({
      member_id: 'SPC-0001',
      password: '123456',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing password', () => {
    const result = loginSchema.safeParse({
      member_id: 'SPC-0001',
    })
    expect(result.success).toBe(false)
  })
})

describe('createExpenseApplicationSchema', () => {
  const validInput = {
    expense_date: '2024-12-15',
    amount: 1000,
    description: 'Office supplies',
    is_cash_payment: false,
  }

  it('validates correct input', () => {
    const result = createExpenseApplicationSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it('rejects amount < 1', () => {
    const result = createExpenseApplicationSchema.safeParse({
      ...validInput,
      amount: 0,
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative amount', () => {
    const result = createExpenseApplicationSchema.safeParse({
      ...validInput,
      amount: -100,
    })
    expect(result.success).toBe(false)
  })

  it('rejects description > 500 chars', () => {
    const result = createExpenseApplicationSchema.safeParse({
      ...validInput,
      description: 'x'.repeat(501),
    })
    expect(result.success).toBe(false)
  })

  it('accepts description with exactly 500 chars', () => {
    const result = createExpenseApplicationSchema.safeParse({
      ...validInput,
      description: 'x'.repeat(500),
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty description', () => {
    const result = createExpenseApplicationSchema.safeParse({
      ...validInput,
      description: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty expense_date', () => {
    const result = createExpenseApplicationSchema.safeParse({
      ...validInput,
      expense_date: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects non-integer amount', () => {
    const result = createExpenseApplicationSchema.safeParse({
      ...validInput,
      amount: 10.5,
    })
    expect(result.success).toBe(false)
  })
})

describe('approveApplicationSchema', () => {
  it('validates correct input', () => {
    const result = approveApplicationSchema.safeParse({
      internal_category_id: '550e8400-e29b-41d4-a716-446655440000',
      final_amount: 500,
    })
    expect(result.success).toBe(true)
  })

  it('requires internal_category_id', () => {
    const result = approveApplicationSchema.safeParse({
      final_amount: 500,
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid UUID for internal_category_id', () => {
    const result = approveApplicationSchema.safeParse({
      internal_category_id: 'not-a-uuid',
      final_amount: 500,
    })
    expect(result.success).toBe(false)
  })

  it('allows optional comment', () => {
    const result = approveApplicationSchema.safeParse({
      internal_category_id: '550e8400-e29b-41d4-a716-446655440000',
      final_amount: 500,
      comment: 'Approved for team budget',
    })
    expect(result.success).toBe(true)
  })

  it('allows final_amount of 0', () => {
    const result = approveApplicationSchema.safeParse({
      internal_category_id: '550e8400-e29b-41d4-a716-446655440000',
      final_amount: 0,
    })
    expect(result.success).toBe(true)
  })
})

describe('returnApplicationSchema', () => {
  it('validates correct input', () => {
    const result = returnApplicationSchema.safeParse({
      comment: 'Please attach the receipt',
    })
    expect(result.success).toBe(true)
  })

  it('requires comment', () => {
    const result = returnApplicationSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects empty comment', () => {
    const result = returnApplicationSchema.safeParse({ comment: '' })
    expect(result.success).toBe(false)
  })
})

describe('rejectApplicationSchema', () => {
  it('validates correct input', () => {
    const result = rejectApplicationSchema.safeParse({
      comment: 'Not eligible for reimbursement',
    })
    expect(result.success).toBe(true)
  })

  it('requires comment', () => {
    const result = rejectApplicationSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects empty comment', () => {
    const result = rejectApplicationSchema.safeParse({ comment: '' })
    expect(result.success).toBe(false)
  })
})

describe('paginationSchema', () => {
  it('uses defaults when no input', () => {
    const result = paginationSchema.parse({})
    expect(result.page).toBe(1)
    expect(result.limit).toBe(20)
  })

  it('accepts valid page and limit', () => {
    const result = paginationSchema.parse({ page: 3, limit: 50 })
    expect(result.page).toBe(3)
    expect(result.limit).toBe(50)
  })

  it('coerces string numbers', () => {
    const result = paginationSchema.parse({ page: '2', limit: '10' })
    expect(result.page).toBe(2)
    expect(result.limit).toBe(10)
  })

  it('rejects page < 1', () => {
    const result = paginationSchema.safeParse({ page: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects limit > 100', () => {
    const result = paginationSchema.safeParse({ limit: 101 })
    expect(result.success).toBe(false)
  })

  it('rejects negative limit', () => {
    const result = paginationSchema.safeParse({ limit: -1 })
    expect(result.success).toBe(false)
  })
})

describe('applicationFilterSchema', () => {
  it('allows all fields optional', () => {
    const result = applicationFilterSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts valid status filter', () => {
    const result = applicationFilterSchema.safeParse({ status: 'DRAFT' })
    expect(result.success).toBe(true)
  })

  it('accepts valid date range', () => {
    const result = applicationFilterSchema.safeParse({
      date_from: '2024-01-01',
      date_to: '2024-12-31',
    })
    expect(result.success).toBe(true)
  })

  it('accepts valid member_id filter', () => {
    const result = applicationFilterSchema.safeParse({
      member_id: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid status', () => {
    const result = applicationFilterSchema.safeParse({ status: 'INVALID' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid UUID for member_id', () => {
    const result = applicationFilterSchema.safeParse({
      member_id: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })
})
