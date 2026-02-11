import { describe, it, expect, vi, beforeEach } from 'vitest'
import { APPLICATION_STATUSES, PAYMENT_STATUSES } from '@spc/shared'

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    payment: {
      findMany: vi.fn(),
      count: vi.fn(),
      createMany: vi.fn(),
    },
    expenseApplication: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('../../middleware/error-handler.js', () => ({
  AppError: class AppError extends Error {
    readonly code: string
    readonly statusCode: number
    constructor(message: string, code: string, statusCode: number) {
      super(message)
      this.name = 'AppError'
      this.code = code
      this.statusCode = statusCode
    }
  },
}))

import { prisma } from '../../lib/prisma.js'
import { createPaymentService } from '../payment-service.js'
import { AppError } from '../../middleware/error-handler.js'

const mockPayment = prisma.payment as {
  findMany: ReturnType<typeof vi.fn>
  count: ReturnType<typeof vi.fn>
  createMany: ReturnType<typeof vi.fn>
}
const mockExpenseApplication = prisma.expenseApplication as {
  findMany: ReturnType<typeof vi.fn>
}

describe('PaymentService', () => {
  const service = createPaymentService()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listPayments', () => {
    it('applies pagination with skip and take', async () => {
      mockPayment.findMany.mockResolvedValue([])
      mockPayment.count.mockResolvedValue(0)

      await service.listPayments(3, 10)

      expect(mockPayment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      )
    })

    it('filters by status when provided', async () => {
      mockPayment.findMany.mockResolvedValue([])
      mockPayment.count.mockResolvedValue(0)

      await service.listPayments(1, 20, PAYMENT_STATUSES.PENDING)

      expect(mockPayment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { paymentStatus: PAYMENT_STATUSES.PENDING },
        }),
      )
      expect(mockPayment.count).toHaveBeenCalledWith({
        where: { paymentStatus: PAYMENT_STATUSES.PENDING },
      })
    })

    it('uses empty where when no status filter provided', async () => {
      mockPayment.findMany.mockResolvedValue([])
      mockPayment.count.mockResolvedValue(0)

      await service.listPayments(1, 20)

      expect(mockPayment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      )
      expect(mockPayment.count).toHaveBeenCalledWith({ where: {} })
    })

    it('calculates totalPages correctly', async () => {
      mockPayment.findMany.mockResolvedValue([])
      mockPayment.count.mockResolvedValue(25)

      const result = await service.listPayments(1, 10)

      expect(result.totalPages).toBe(3)
      expect(result.total).toBe(25)
      expect(result.page).toBe(1)
      expect(result.limit).toBe(10)
    })

    it('returns totalPages 0 when there are no items', async () => {
      mockPayment.findMany.mockResolvedValue([])
      mockPayment.count.mockResolvedValue(0)

      const result = await service.listPayments(1, 10)

      expect(result.totalPages).toBe(0)
    })
  })

  describe('listApprovedApplicationsReadyForPayment', () => {
    it('queries for APPROVED applications with no payments', async () => {
      const mockApps = [
        {
          id: 'app-1',
          applicationNumber: 'EXP-001',
          amount: 10000,
          finalAmount: null,
          approvedAt: new Date('2024-12-01'),
          member: { id: 'm-1', memberId: 'M001', name: 'Tanaka' },
        },
      ]
      mockExpenseApplication.findMany.mockResolvedValue(mockApps)

      const result = await service.listApprovedApplicationsReadyForPayment()

      expect(result).toEqual(mockApps)
      expect(mockExpenseApplication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: APPLICATION_STATUSES.APPROVED,
            payments: { none: {} },
          },
          orderBy: { approvedAt: 'asc' },
        }),
      )
    })

    it('returns empty array when no approved applications exist', async () => {
      mockExpenseApplication.findMany.mockResolvedValue([])

      const result = await service.listApprovedApplicationsReadyForPayment()

      expect(result).toEqual([])
    })
  })

  describe('generateBatch', () => {
    it('creates batch with correct batchId format and totals using finalAmount', async () => {
      const apps = [
        { id: 'app-1', finalAmount: { toString: () => '15000' }, amount: { toString: () => '10000' }, payments: [] },
        { id: 'app-2', finalAmount: { toString: () => '25000' }, amount: { toString: () => '20000' }, payments: [] },
      ]
      mockExpenseApplication.findMany.mockResolvedValue(apps)
      mockPayment.createMany.mockResolvedValue({ count: 2 })

      const result = await service.generateBatch(['app-1', 'app-2'])

      expect(result.batchId).toMatch(/^BATCH-\d{8}-\d{6}$/)
      expect(result.paymentCount).toBe(2)
      expect(result.totalAmount).toBe(40000)
      expect(mockPayment.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            expenseApplicationId: 'app-1',
            paymentStatus: PAYMENT_STATUSES.PENDING,
            batchId: expect.stringMatching(/^BATCH-/),
          }),
        ]),
      })
    })

    it('uses amount when finalAmount is null', async () => {
      const apps = [
        { id: 'app-1', finalAmount: null, amount: { toString: () => '8000' }, payments: [] },
      ]
      mockExpenseApplication.findMany.mockResolvedValue(apps)
      mockPayment.createMany.mockResolvedValue({ count: 1 })

      const result = await service.generateBatch(['app-1'])

      expect(result.totalAmount).toBe(8000)
      expect(result.paymentCount).toBe(1)
    })

    it('throws when not all applications are in APPROVED status', async () => {
      mockExpenseApplication.findMany.mockResolvedValue([
        { id: 'app-1', finalAmount: null, amount: 10000, payments: [] },
      ])

      await expect(
        service.generateBatch(['app-1', 'app-2']),
      ).rejects.toThrow('Some applications are not found or not in APPROVED status')
    })

    it('throws when applications already have payment records', async () => {
      mockExpenseApplication.findMany.mockResolvedValue([
        { id: 'app-1', finalAmount: null, amount: 10000, payments: [{ id: 'pay-1' }] },
      ])

      await expect(
        service.generateBatch(['app-1']),
      ).rejects.toThrow('Some applications already have payment records')
    })
  })

  describe('findPaymentsByBatchId', () => {
    it('returns payments matching batchId', async () => {
      const payments = [
        { id: 'pay-1', batchId: 'BATCH-20241215-120000' },
        { id: 'pay-2', batchId: 'BATCH-20241215-120000' },
      ]
      mockPayment.findMany.mockResolvedValue(payments)

      const result = await service.findPaymentsByBatchId('BATCH-20241215-120000')

      expect(result).toEqual(payments)
      expect(mockPayment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { batchId: 'BATCH-20241215-120000' },
          orderBy: { createdAt: 'asc' },
        }),
      )
    })

    it('returns empty array when no payments match', async () => {
      mockPayment.findMany.mockResolvedValue([])

      const result = await service.findPaymentsByBatchId('BATCH-NONEXISTENT')

      expect(result).toEqual([])
    })
  })
})
