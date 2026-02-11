import { vi, describe, it, expect, beforeEach } from 'vitest'
import { AppError } from '../../middleware/error-handler.js'
import { AuthError } from '../../lib/jwt.js'

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    expenseApplication: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    ocrResult: { deleteMany: vi.fn() },
    receipt: { deleteMany: vi.fn() },
    applicationComment: { deleteMany: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import { prisma } from '../../lib/prisma.js'
import { createApplicationService } from '../application-service.js'

const mockPrisma = prisma as unknown as {
  expenseApplication: {
    findMany: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    count: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
  }
  ocrResult: { deleteMany: ReturnType<typeof vi.fn> }
  receipt: { deleteMany: ReturnType<typeof vi.fn> }
  applicationComment: {
    deleteMany: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
  }
  $transaction: ReturnType<typeof vi.fn>
}

function makeFakeApplication(overrides: Record<string, unknown> = {}) {
  return {
    id: 'app-1',
    applicationNumber: 'EXP-202601-0001',
    memberId: 'member-1',
    expenseDate: new Date('2026-01-15'),
    amount: 10000,
    proposedAmount: 5000,
    description: 'Test expense',
    isCashPayment: false,
    status: 'DRAFT',
    createdAt: new Date('2026-01-10'),
    submittedAt: null,
    member: { id: 'member-1', memberId: 'SPC-0001', name: 'Test User' },
    internalCategory: null,
    approvedBy: null,
    receipts: [],
    comments: [],
    _count: { receipts: 0, comments: 0 },
    ...overrides,
  }
}

describe('ApplicationService', () => {
  const service = createApplicationService()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ──────────────────────────── list ────────────────────────────

  describe('list', () => {
    it('returns paginated items with meta', async () => {
      const items = [makeFakeApplication()]
      mockPrisma.expenseApplication.findMany.mockResolvedValue(items)
      mockPrisma.expenseApplication.count.mockResolvedValue(1)

      const result = await service.list({ page: 1, limit: 20 })

      expect(result.items).toEqual(items)
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      })
    })

    it('returns frozen result', async () => {
      mockPrisma.expenseApplication.findMany.mockResolvedValue([])
      mockPrisma.expenseApplication.count.mockResolvedValue(0)

      const result = await service.list({ page: 1, limit: 20 })

      expect(Object.isFrozen(result)).toBe(true)
      expect(Object.isFrozen(result.meta)).toBe(true)
    })

    it('calculates totalPages correctly', async () => {
      mockPrisma.expenseApplication.findMany.mockResolvedValue([])
      mockPrisma.expenseApplication.count.mockResolvedValue(45)

      const result = await service.list({ page: 1, limit: 20 })

      expect(result.meta.totalPages).toBe(3)
    })

    it('passes status filter to where clause', async () => {
      mockPrisma.expenseApplication.findMany.mockResolvedValue([])
      mockPrisma.expenseApplication.count.mockResolvedValue(0)

      await service.list({ page: 1, limit: 20, status: 'SUBMITTED' })

      const call = mockPrisma.expenseApplication.findMany.mock.calls[0]?.[0]
      expect(call.where.status).toBe('SUBMITTED')
    })

    it('passes member_id filter to where clause', async () => {
      mockPrisma.expenseApplication.findMany.mockResolvedValue([])
      mockPrisma.expenseApplication.count.mockResolvedValue(0)

      await service.list({ page: 1, limit: 20, member_id: 'member-1' })

      const call = mockPrisma.expenseApplication.findMany.mock.calls[0]?.[0]
      expect(call.where.memberId).toBe('member-1')
    })

    it('passes department_id filter to where clause', async () => {
      mockPrisma.expenseApplication.findMany.mockResolvedValue([])
      mockPrisma.expenseApplication.count.mockResolvedValue(0)

      await service.list({ page: 1, limit: 20, department_id: 'dept-1' })

      const call = mockPrisma.expenseApplication.findMany.mock.calls[0]?.[0]
      expect(call.where.member).toEqual({ departmentId: 'dept-1' })
    })

    it('passes category_id filter to where clause', async () => {
      mockPrisma.expenseApplication.findMany.mockResolvedValue([])
      mockPrisma.expenseApplication.count.mockResolvedValue(0)

      await service.list({ page: 1, limit: 20, category_id: 'cat-1' })

      const call = mockPrisma.expenseApplication.findMany.mock.calls[0]?.[0]
      expect(call.where.internalCategoryId).toBe('cat-1')
    })

    it('passes date range filters to where clause', async () => {
      mockPrisma.expenseApplication.findMany.mockResolvedValue([])
      mockPrisma.expenseApplication.count.mockResolvedValue(0)

      await service.list({
        page: 1,
        limit: 20,
        date_from: '2026-01-01',
        date_to: '2026-01-31',
      })

      const call = mockPrisma.expenseApplication.findMany.mock.calls[0]?.[0]
      expect(call.where.expenseDate.gte).toEqual(new Date('2026-01-01'))
      expect(call.where.expenseDate.lte).toEqual(new Date('2026-01-31'))
    })

    it('calculates skip correctly for pagination', async () => {
      mockPrisma.expenseApplication.findMany.mockResolvedValue([])
      mockPrisma.expenseApplication.count.mockResolvedValue(0)

      await service.list({ page: 3, limit: 10 })

      const call = mockPrisma.expenseApplication.findMany.mock.calls[0]?.[0]
      expect(call.skip).toBe(20)
      expect(call.take).toBe(10)
    })
  })

  // ──────────────────────── listByMember ────────────────────────

  describe('listByMember', () => {
    it('delegates to list with member_id set', async () => {
      mockPrisma.expenseApplication.findMany.mockResolvedValue([])
      mockPrisma.expenseApplication.count.mockResolvedValue(0)

      await service.listByMember('member-1', { page: 1, limit: 20 })

      const call = mockPrisma.expenseApplication.findMany.mock.calls[0]?.[0]
      expect(call.where.memberId).toBe('member-1')
    })
  })

  // ──────────────────────── findById ────────────────────────────

  describe('findById', () => {
    it('returns application when found', async () => {
      const app = makeFakeApplication()
      mockPrisma.expenseApplication.findUnique.mockResolvedValue(app)

      const result = await service.findById('app-1')

      expect(result).toEqual(app)
      expect(mockPrisma.expenseApplication.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'app-1' } }),
      )
    })

    it('includes full relations in query', async () => {
      mockPrisma.expenseApplication.findUnique.mockResolvedValue(
        makeFakeApplication(),
      )

      await service.findById('app-1')

      const call =
        mockPrisma.expenseApplication.findUnique.mock.calls[0]?.[0]
      expect(call.include.member).toBeDefined()
      expect(call.include.approvedBy).toBeDefined()
      expect(call.include.internalCategory).toBeDefined()
      expect(call.include.receipts).toBeDefined()
      expect(call.include.comments).toBeDefined()
    })

    it('throws AppError 404 when not found', async () => {
      mockPrisma.expenseApplication.findUnique.mockResolvedValue(null)

      await expect(service.findById('nonexistent')).rejects.toThrow(AppError)
      await expect(service.findById('nonexistent')).rejects.toMatchObject({
        statusCode: 404,
      })
    })
  })

  // ──────────────────────────── create ──────────────────────────

  describe('create', () => {
    it('creates application with DRAFT status', async () => {
      const created = makeFakeApplication()
      mockPrisma.expenseApplication.count.mockResolvedValue(0)
      mockPrisma.expenseApplication.create.mockResolvedValue(created)

      await service.create('member-1', {
        expense_date: '2026-01-15',
        amount: 10000,
        description: 'Test expense',
        is_cash_payment: false,
      })

      const call = mockPrisma.expenseApplication.create.mock.calls[0]?.[0]
      expect(call.data.status).toBe('DRAFT')
    })

    it('generates applicationNumber from count', async () => {
      mockPrisma.expenseApplication.count.mockResolvedValue(5)
      mockPrisma.expenseApplication.create.mockResolvedValue(
        makeFakeApplication(),
      )

      await service.create('member-1', {
        expense_date: '2026-01-15',
        amount: 10000,
        description: 'Test',
        is_cash_payment: false,
      })

      const call = mockPrisma.expenseApplication.create.mock.calls[0]?.[0]
      expect(call.data.applicationNumber).toMatch(/^EXP-\d{6}-0006$/)
    })

    it('calculates proposedAmount as 50% floor', async () => {
      mockPrisma.expenseApplication.count.mockResolvedValue(0)
      mockPrisma.expenseApplication.create.mockResolvedValue(
        makeFakeApplication(),
      )

      await service.create('member-1', {
        expense_date: '2026-01-15',
        amount: 10001,
        description: 'Test',
        is_cash_payment: false,
      })

      const call = mockPrisma.expenseApplication.create.mock.calls[0]?.[0]
      expect(call.data.proposedAmount).toBe(5000)
    })

    it('sets memberId from parameter', async () => {
      mockPrisma.expenseApplication.count.mockResolvedValue(0)
      mockPrisma.expenseApplication.create.mockResolvedValue(
        makeFakeApplication(),
      )

      await service.create('member-abc', {
        expense_date: '2026-01-15',
        amount: 1000,
        description: 'Test',
        is_cash_payment: true,
      })

      const call = mockPrisma.expenseApplication.create.mock.calls[0]?.[0]
      expect(call.data.memberId).toBe('member-abc')
      expect(call.data.isCashPayment).toBe(true)
    })
  })

  // ──────────────────────────── update ──────────────────────────

  describe('update', () => {
    it('updates DRAFT application successfully', async () => {
      const existing = makeFakeApplication({ status: 'DRAFT' })
      mockPrisma.expenseApplication.findUnique.mockResolvedValue(existing)
      const updated = makeFakeApplication({
        description: 'Updated',
        status: 'DRAFT',
      })
      mockPrisma.expenseApplication.update.mockResolvedValue(updated)

      const result = await service.update('app-1', 'member-1', {
        description: 'Updated',
      })

      expect(result).toEqual(updated)
    })

    it('updates RETURNED application successfully', async () => {
      const existing = makeFakeApplication({ status: 'RETURNED' })
      mockPrisma.expenseApplication.findUnique.mockResolvedValue(existing)
      mockPrisma.expenseApplication.update.mockResolvedValue(
        makeFakeApplication({ status: 'RETURNED', amount: 5000 }),
      )

      await service.update('app-1', 'member-1', { amount: 5000 })

      expect(mockPrisma.expenseApplication.update).toHaveBeenCalled()
    })

    it('throws AuthError when memberId does not match', async () => {
      const existing = makeFakeApplication({ memberId: 'member-1' })
      mockPrisma.expenseApplication.findUnique.mockResolvedValue(existing)

      await expect(
        service.update('app-1', 'other-member', { description: 'X' }),
      ).rejects.toThrow(AuthError)
    })

    it('throws AppError when status is SUBMITTED', async () => {
      const existing = makeFakeApplication({
        status: 'SUBMITTED',
        memberId: 'member-1',
      })
      mockPrisma.expenseApplication.findUnique.mockResolvedValue(existing)

      await expect(
        service.update('app-1', 'member-1', { description: 'X' }),
      ).rejects.toThrow(AppError)
    })

    it('recalculates proposedAmount when amount changes', async () => {
      const existing = makeFakeApplication({ status: 'DRAFT' })
      mockPrisma.expenseApplication.findUnique.mockResolvedValue(existing)
      mockPrisma.expenseApplication.update.mockResolvedValue(
        makeFakeApplication(),
      )

      await service.update('app-1', 'member-1', { amount: 8000 })

      const call = mockPrisma.expenseApplication.update.mock.calls[0]?.[0]
      expect(call.data.amount).toBe(8000)
      expect(call.data.proposedAmount).toBe(4000)
    })

    it('does not set proposedAmount when amount not provided', async () => {
      const existing = makeFakeApplication({ status: 'DRAFT' })
      mockPrisma.expenseApplication.findUnique.mockResolvedValue(existing)
      mockPrisma.expenseApplication.update.mockResolvedValue(
        makeFakeApplication(),
      )

      await service.update('app-1', 'member-1', {
        description: 'New description',
      })

      const call = mockPrisma.expenseApplication.update.mock.calls[0]?.[0]
      expect(call.data.proposedAmount).toBeUndefined()
      expect(call.data.description).toBe('New description')
    })
  })

  // ──────────────────────────── remove ──────────────────────────

  describe('remove', () => {
    it('cascade deletes via $transaction', async () => {
      const existing = makeFakeApplication({ status: 'DRAFT' })
      mockPrisma.expenseApplication.findUnique.mockResolvedValue(existing)
      mockPrisma.$transaction.mockResolvedValue([])

      await service.remove('app-1', 'member-1')

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
      const transactionArg = mockPrisma.$transaction.mock.calls[0]?.[0]
      expect(transactionArg).toHaveLength(4)
      expect(mockPrisma.ocrResult.deleteMany).toHaveBeenCalled()
      expect(mockPrisma.receipt.deleteMany).toHaveBeenCalled()
      expect(mockPrisma.applicationComment.deleteMany).toHaveBeenCalled()
      expect(mockPrisma.expenseApplication.delete).toHaveBeenCalledWith({
        where: { id: 'app-1' },
      })
    })

    it('throws AuthError when memberId does not match', async () => {
      const existing = makeFakeApplication({ memberId: 'member-1' })
      mockPrisma.expenseApplication.findUnique.mockResolvedValue(existing)

      await expect(
        service.remove('app-1', 'other-member'),
      ).rejects.toThrow(AuthError)
    })

    it('throws AppError when status is not DRAFT', async () => {
      const existing = makeFakeApplication({
        status: 'SUBMITTED',
        memberId: 'member-1',
      })
      mockPrisma.expenseApplication.findUnique.mockResolvedValue(existing)

      await expect(
        service.remove('app-1', 'member-1'),
      ).rejects.toThrow(AppError)
    })
  })

  // ──────────────────────────── submit ──────────────────────────

  describe('submit', () => {
    it('transitions DRAFT to SUBMITTED', async () => {
      const existing = makeFakeApplication({ status: 'DRAFT' })
      mockPrisma.expenseApplication.findUnique.mockResolvedValue(existing)
      const submitted = makeFakeApplication({ status: 'SUBMITTED' })
      mockPrisma.expenseApplication.update.mockResolvedValue(submitted)
      mockPrisma.applicationComment.create.mockResolvedValue({})

      const result = await service.submit('app-1', 'member-1')

      expect(result.status).toBe('SUBMITTED')
      const updateCall =
        mockPrisma.expenseApplication.update.mock.calls[0]?.[0]
      expect(updateCall.data.status).toBe('SUBMITTED')
      expect(updateCall.data.submittedAt).toBeInstanceOf(Date)
    })

    it('creates SUBMISSION comment', async () => {
      const existing = makeFakeApplication({ status: 'DRAFT' })
      mockPrisma.expenseApplication.findUnique.mockResolvedValue(existing)
      mockPrisma.expenseApplication.update.mockResolvedValue(
        makeFakeApplication({ status: 'SUBMITTED' }),
      )
      mockPrisma.applicationComment.create.mockResolvedValue({})

      await service.submit('app-1', 'member-1')

      expect(mockPrisma.applicationComment.create).toHaveBeenCalledWith({
        data: {
          expenseApplicationId: 'app-1',
          memberId: 'member-1',
          comment: '申請しました',
          commentType: 'SUBMISSION',
        },
      })
    })

    it('throws AuthError when memberId does not match', async () => {
      const existing = makeFakeApplication({ memberId: 'member-1' })
      mockPrisma.expenseApplication.findUnique.mockResolvedValue(existing)

      await expect(
        service.submit('app-1', 'other-member'),
      ).rejects.toThrow(AuthError)
    })

    it('throws AppError for invalid status transition', async () => {
      const existing = makeFakeApplication({
        status: 'APPROVED',
        memberId: 'member-1',
      })
      mockPrisma.expenseApplication.findUnique.mockResolvedValue(existing)

      await expect(
        service.submit('app-1', 'member-1'),
      ).rejects.toThrow(AppError)
    })

    it('allows RETURNED to SUBMITTED transition', async () => {
      const existing = makeFakeApplication({ status: 'RETURNED' })
      mockPrisma.expenseApplication.findUnique.mockResolvedValue(existing)
      mockPrisma.expenseApplication.update.mockResolvedValue(
        makeFakeApplication({ status: 'SUBMITTED' }),
      )
      mockPrisma.applicationComment.create.mockResolvedValue({})

      const result = await service.submit('app-1', 'member-1')

      expect(result.status).toBe('SUBMITTED')
    })
  })

  // ──────────────────────── getDashboard ────────────────────────

  describe('getDashboard', () => {
    it('returns dashboard stats excluding DRAFT from totals', async () => {
      const apps = [
        makeFakeApplication({
          status: 'DRAFT',
          amount: 10000,
          expenseDate: new Date('2026-01-15'),
          createdAt: new Date('2026-01-10'),
        }),
        makeFakeApplication({
          id: 'app-2',
          status: 'SUBMITTED',
          amount: 20000,
          expenseDate: new Date('2026-01-20'),
          createdAt: new Date('2026-01-12'),
        }),
        makeFakeApplication({
          id: 'app-3',
          status: 'DRAFT',
          amount: 5000,
          expenseDate: new Date('2026-01-25'),
          createdAt: new Date('2026-01-14'),
        }),
      ]
      mockPrisma.expenseApplication.findMany.mockResolvedValue(apps)

      const result = await service.getDashboard('member-1')

      expect(result.totalApplications).toBe(1)
      expect(result.totalAmount).toBe(20000)
      expect(result.draftCount).toBe(2)
      expect(result.draftAmount).toBe(15000)
      expect(result.byStatus.DRAFT).toBeUndefined()
      expect(result.byStatus.SUBMITTED.count).toBe(1)
      expect(result.byStatus.SUBMITTED.amount).toBe(20000)
    })

    it('limits recentApplications to 10 and excludes DRAFT', async () => {
      const apps = [
        makeFakeApplication({
          id: 'draft-1',
          status: 'DRAFT',
          amount: 1000,
          expenseDate: new Date('2026-01-15'),
          createdAt: new Date('2026-01-11'),
        }),
        ...Array.from({ length: 15 }, (_, i) =>
          makeFakeApplication({
            id: `app-${i}`,
            status: 'SUBMITTED',
            amount: 1000,
            expenseDate: new Date('2026-01-15'),
            createdAt: new Date('2026-01-10'),
          }),
        ),
      ]
      mockPrisma.expenseApplication.findMany.mockResolvedValue(apps)

      const result = await service.getDashboard('member-1')

      expect(result.recentApplications).toHaveLength(10)
      expect(
        result.recentApplications.every((app) => app.status !== 'DRAFT'),
      ).toBe(true)
    })

    it('returns frozen result', async () => {
      mockPrisma.expenseApplication.findMany.mockResolvedValue([])

      const result = await service.getDashboard('member-1')

      expect(Object.isFrozen(result)).toBe(true)
    })

    it('returns empty stats when no applications', async () => {
      mockPrisma.expenseApplication.findMany.mockResolvedValue([])

      const result = await service.getDashboard('member-1')

      expect(result.totalApplications).toBe(0)
      expect(result.totalAmount).toBe(0)
      expect(result.draftCount).toBe(0)
      expect(result.draftAmount).toBe(0)
      expect(result.byStatus).toEqual({})
      expect(result.recentApplications).toHaveLength(0)
    })

    it('maps recentApplications fields correctly (excludes DRAFT)', async () => {
      const apps = [
        makeFakeApplication({
          id: 'app-1',
          applicationNumber: 'EXP-202601-0001',
          status: 'SUBMITTED',
          amount: 10000,
          expenseDate: new Date('2026-01-15'),
          createdAt: new Date('2026-01-10'),
        }),
      ]
      mockPrisma.expenseApplication.findMany.mockResolvedValue(apps)

      const result = await service.getDashboard('member-1')

      const recent = result.recentApplications[0]
      expect(recent).toBeDefined()
      expect(recent?.id).toBe('app-1')
      expect(recent?.applicationNumber).toBe('EXP-202601-0001')
      expect(recent?.status).toBe('SUBMITTED')
      expect(recent?.amount).toBe(10000)
      expect(typeof recent?.expenseDate).toBe('string')
      expect(typeof recent?.createdAt).toBe('string')
    })

    it('returns draftCount and draftAmount correctly', async () => {
      const apps = [
        makeFakeApplication({
          id: 'draft-1',
          status: 'DRAFT',
          amount: 3000,
          expenseDate: new Date('2026-01-15'),
          createdAt: new Date('2026-01-10'),
        }),
        makeFakeApplication({
          id: 'draft-2',
          status: 'DRAFT',
          amount: 7000,
          expenseDate: new Date('2026-01-20'),
          createdAt: new Date('2026-01-12'),
        }),
      ]
      mockPrisma.expenseApplication.findMany.mockResolvedValue(apps)

      const result = await service.getDashboard('member-1')

      expect(result.draftCount).toBe(2)
      expect(result.draftAmount).toBe(10000)
      expect(result.totalApplications).toBe(0)
      expect(result.totalAmount).toBe(0)
    })

    it('does not include DRAFT in recentApplications', async () => {
      const apps = [
        makeFakeApplication({
          id: 'draft-1',
          status: 'DRAFT',
          amount: 5000,
          expenseDate: new Date('2026-01-15'),
          createdAt: new Date('2026-01-15'),
        }),
        makeFakeApplication({
          id: 'submitted-1',
          status: 'SUBMITTED',
          amount: 8000,
          expenseDate: new Date('2026-01-10'),
          createdAt: new Date('2026-01-10'),
        }),
      ]
      mockPrisma.expenseApplication.findMany.mockResolvedValue(apps)

      const result = await service.getDashboard('member-1')

      expect(result.recentApplications).toHaveLength(1)
      expect(result.recentApplications[0]?.id).toBe('submitted-1')
    })
  })
})
