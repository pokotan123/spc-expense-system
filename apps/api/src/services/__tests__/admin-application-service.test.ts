import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createAdminApplicationService } from '../admin-application-service.js'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/error-handler.js'
import {
  APPLICATION_STATUSES,
  COMMENT_TYPES,
  ERROR_CODES,
} from '@spc/shared'

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    expenseApplication: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    internalCategory: {
      findUnique: vi.fn(),
    },
    applicationComment: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('../subsidy-service.js', () => ({
  createSubsidyService: () =>
    Object.freeze({
      calculate: (amount: number) =>
        Object.freeze({
          originalAmount: amount,
          proposedAmount: Math.floor(amount / 2),
        }),
    }),
}))

const mockApplication = {
  id: 'app-1',
  applicationNumber: 'EXP-202501-0001',
  status: 'SUBMITTED',
  expenseDate: new Date('2025-01-15'),
  amount: 10000,
  proposedAmount: 5000,
  finalAmount: null,
  description: 'Business lunch',
  isCashPayment: false,
  submittedAt: new Date('2025-01-16'),
  approvedAt: null,
  createdAt: new Date('2025-01-14'),
  member: {
    id: 'member-1',
    memberId: 'M001',
    name: 'Test User',
    department: { id: 'dept-1', name: 'Sales', code: 'SALES' },
  },
  internalCategory: null,
}

const mockApprovedApplication = {
  ...mockApplication,
  status: 'APPROVED',
  finalAmount: 8000,
  approvedAt: new Date('2025-01-17'),
  internalCategory: { id: 'cat-1', name: 'Travel', code: 'TRV' },
}

const mockCategory = {
  id: 'cat-1',
  name: 'Travel',
  code: 'TRV',
  isActive: true,
}

describe('AdminApplicationService', () => {
  const service = createAdminApplicationService()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('list', () => {
    it('returns paginated results with no filters and excludes DRAFT', async () => {
      vi.mocked(prisma.expenseApplication.findMany).mockResolvedValue([
        mockApplication,
      ] as never)
      vi.mocked(prisma.expenseApplication.count).mockResolvedValue(1)

      const result = await service.list({}, 1, 20)

      expect(result.items).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.page).toBe(1)
      expect(result.limit).toBe(20)
      expect(result.totalPages).toBe(1)
      expect(prisma.expenseApplication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { AND: [{ status: { not: 'DRAFT' } }] },
          skip: 0,
          take: 20,
          orderBy: { createdAt: 'desc' },
        }),
      )
    })

    it('filters by status while always excluding DRAFT', async () => {
      vi.mocked(prisma.expenseApplication.findMany).mockResolvedValue(
        [] as never,
      )
      vi.mocked(prisma.expenseApplication.count).mockResolvedValue(0)

      await service.list({ status: 'SUBMITTED' }, 1, 20)

      expect(prisma.expenseApplication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { AND: [{ status: { not: 'DRAFT' } }, { status: 'SUBMITTED' }] },
        }),
      )
    })

    it('filters by date_from', async () => {
      vi.mocked(prisma.expenseApplication.findMany).mockResolvedValue(
        [] as never,
      )
      vi.mocked(prisma.expenseApplication.count).mockResolvedValue(0)

      await service.list({ date_from: '2025-01-01' }, 1, 20)

      expect(prisma.expenseApplication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: [{ status: { not: 'DRAFT' } }, { expenseDate: { gte: new Date('2025-01-01') } }],
          },
        }),
      )
    })

    it('filters by date_to', async () => {
      vi.mocked(prisma.expenseApplication.findMany).mockResolvedValue(
        [] as never,
      )
      vi.mocked(prisma.expenseApplication.count).mockResolvedValue(0)

      await service.list({ date_to: '2025-12-31' }, 1, 20)

      expect(prisma.expenseApplication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: [{ status: { not: 'DRAFT' } }, { expenseDate: { lte: new Date('2025-12-31') } }],
          },
        }),
      )
    })

    it('filters by member_id', async () => {
      vi.mocked(prisma.expenseApplication.findMany).mockResolvedValue(
        [] as never,
      )
      vi.mocked(prisma.expenseApplication.count).mockResolvedValue(0)

      await service.list({ member_id: 'member-1' }, 1, 20)

      expect(prisma.expenseApplication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { AND: [{ status: { not: 'DRAFT' } }, { memberId: 'member-1' }] },
        }),
      )
    })

    it('filters by department_id', async () => {
      vi.mocked(prisma.expenseApplication.findMany).mockResolvedValue(
        [] as never,
      )
      vi.mocked(prisma.expenseApplication.count).mockResolvedValue(0)

      await service.list({ department_id: 'dept-1' }, 1, 20)

      expect(prisma.expenseApplication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: [{ status: { not: 'DRAFT' } }, { member: { departmentId: 'dept-1' } }],
          },
        }),
      )
    })

    it('filters by category_id', async () => {
      vi.mocked(prisma.expenseApplication.findMany).mockResolvedValue(
        [] as never,
      )
      vi.mocked(prisma.expenseApplication.count).mockResolvedValue(0)

      await service.list({ category_id: 'cat-1' }, 1, 20)

      expect(prisma.expenseApplication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { AND: [{ status: { not: 'DRAFT' } }, { internalCategoryId: 'cat-1' }] },
        }),
      )
    })

    it('applies correct pagination offset', async () => {
      vi.mocked(prisma.expenseApplication.findMany).mockResolvedValue(
        [] as never,
      )
      vi.mocked(prisma.expenseApplication.count).mockResolvedValue(0)

      await service.list({}, 3, 10)

      expect(prisma.expenseApplication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      )
    })

    it('calculates totalPages correctly', async () => {
      vi.mocked(prisma.expenseApplication.findMany).mockResolvedValue(
        [] as never,
      )
      vi.mocked(prisma.expenseApplication.count).mockResolvedValue(25)

      const result = await service.list({}, 1, 10)

      expect(result.totalPages).toBe(3)
    })

    it('returns totalPages of 0 when no results', async () => {
      vi.mocked(prisma.expenseApplication.findMany).mockResolvedValue(
        [] as never,
      )
      vi.mocked(prisma.expenseApplication.count).mockResolvedValue(0)

      const result = await service.list({}, 1, 10)

      expect(result.totalPages).toBe(0)
    })
  })

  describe('findById', () => {
    it('returns application when found', async () => {
      vi.mocked(prisma.expenseApplication.findUnique).mockResolvedValue(
        mockApplication as never,
      )

      const result = await service.findById('app-1')

      expect(result).toEqual(mockApplication)
      expect(prisma.expenseApplication.findUnique).toHaveBeenCalledWith({
        where: { id: 'app-1' },
        select: expect.any(Object),
      })
    })

    it('throws AppError 404 when not found', async () => {
      vi.mocked(prisma.expenseApplication.findUnique).mockResolvedValue(null)

      await expect(service.findById('nonexistent')).rejects.toThrow(AppError)
      await expect(service.findById('nonexistent')).rejects.toMatchObject({
        statusCode: 404,
        code: ERROR_CODES.NOT_FOUND,
      })
    })

    it('throws AppError 403 when application is DRAFT', async () => {
      const draftApp = { ...mockApplication, status: 'DRAFT' }
      vi.mocked(prisma.expenseApplication.findUnique).mockResolvedValue(
        draftApp as never,
      )

      await expect(service.findById('app-1')).rejects.toThrow(AppError)
      await expect(service.findById('app-1')).rejects.toMatchObject({
        statusCode: 403,
        code: ERROR_CODES.FORBIDDEN,
      })
    })
  })

  describe('approve', () => {
    it('approves a SUBMITTED application', async () => {
      vi.mocked(prisma.expenseApplication.findUnique).mockResolvedValue(
        mockApplication as never,
      )
      vi.mocked(prisma.internalCategory.findUnique).mockResolvedValue(
        mockCategory as never,
      )
      const mockTx = {
        expenseApplication: {
          update: vi.fn().mockResolvedValue(mockApprovedApplication),
        },
        applicationComment: { create: vi.fn() },
      }
      vi.mocked(prisma.$transaction).mockImplementation(
        async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx),
      )

      const result = await service.approve({
        applicationId: 'app-1',
        adminId: 'admin-1',
        internalCategoryId: 'cat-1',
        finalAmount: 8000,
      })

      expect(result).toEqual(mockApprovedApplication)
      expect(mockTx.expenseApplication.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'app-1' },
          data: expect.objectContaining({
            status: APPLICATION_STATUSES.APPROVED,
            internalCategoryId: 'cat-1',
            finalAmount: 8000,
            approvedById: 'admin-1',
            approvedAt: expect.any(Date),
          }),
        }),
      )
    })

    it('creates comment when provided', async () => {
      vi.mocked(prisma.expenseApplication.findUnique).mockResolvedValue(
        mockApplication as never,
      )
      vi.mocked(prisma.internalCategory.findUnique).mockResolvedValue(
        mockCategory as never,
      )
      const mockTx = {
        expenseApplication: {
          update: vi.fn().mockResolvedValue(mockApprovedApplication),
        },
        applicationComment: { create: vi.fn() },
      }
      vi.mocked(prisma.$transaction).mockImplementation(
        async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx),
      )

      await service.approve({
        applicationId: 'app-1',
        adminId: 'admin-1',
        internalCategoryId: 'cat-1',
        finalAmount: 8000,
        comment: 'Approved with adjustment',
      })

      expect(mockTx.applicationComment.create).toHaveBeenCalledWith({
        data: {
          expenseApplicationId: 'app-1',
          memberId: 'admin-1',
          comment: 'Approved with adjustment',
          commentType: COMMENT_TYPES.APPROVAL,
        },
      })
    })

    it('does not create comment when not provided', async () => {
      vi.mocked(prisma.expenseApplication.findUnique).mockResolvedValue(
        mockApplication as never,
      )
      vi.mocked(prisma.internalCategory.findUnique).mockResolvedValue(
        mockCategory as never,
      )
      const mockTx = {
        expenseApplication: {
          update: vi.fn().mockResolvedValue(mockApprovedApplication),
        },
        applicationComment: { create: vi.fn() },
      }
      vi.mocked(prisma.$transaction).mockImplementation(
        async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx),
      )

      await service.approve({
        applicationId: 'app-1',
        adminId: 'admin-1',
        internalCategoryId: 'cat-1',
        finalAmount: 8000,
      })

      expect(mockTx.applicationComment.create).not.toHaveBeenCalled()
    })

    it('throws 400 when category not found', async () => {
      vi.mocked(prisma.expenseApplication.findUnique).mockResolvedValue(
        mockApplication as never,
      )
      vi.mocked(prisma.internalCategory.findUnique).mockResolvedValue(null)

      await expect(
        service.approve({
          applicationId: 'app-1',
          adminId: 'admin-1',
          internalCategoryId: 'nonexistent',
          finalAmount: 8000,
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        code: ERROR_CODES.VALIDATION_ERROR,
      })
    })

    it('throws 400 when category is inactive', async () => {
      vi.mocked(prisma.expenseApplication.findUnique).mockResolvedValue(
        mockApplication as never,
      )
      vi.mocked(prisma.internalCategory.findUnique).mockResolvedValue({
        ...mockCategory,
        isActive: false,
      } as never)

      await expect(
        service.approve({
          applicationId: 'app-1',
          adminId: 'admin-1',
          internalCategoryId: 'cat-1',
          finalAmount: 8000,
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        code: ERROR_CODES.VALIDATION_ERROR,
      })
    })

    it('throws 403 when application is DRAFT', async () => {
      const draftApp = { ...mockApplication, status: 'DRAFT' }
      vi.mocked(prisma.expenseApplication.findUnique).mockResolvedValue(
        draftApp as never,
      )

      await expect(
        service.approve({
          applicationId: 'app-1',
          adminId: 'admin-1',
          internalCategoryId: 'cat-1',
          finalAmount: 8000,
        }),
      ).rejects.toMatchObject({
        statusCode: 403,
        code: ERROR_CODES.FORBIDDEN,
      })
    })

    it('throws 400 for invalid transition from REJECTED', async () => {
      const rejectedApp = { ...mockApplication, status: 'REJECTED' }
      vi.mocked(prisma.expenseApplication.findUnique).mockResolvedValue(
        rejectedApp as never,
      )

      await expect(
        service.approve({
          applicationId: 'app-1',
          adminId: 'admin-1',
          internalCategoryId: 'cat-1',
          finalAmount: 8000,
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        code: ERROR_CODES.INVALID_STATUS_TRANSITION,
      })
    })
  })

  describe('returnApplication', () => {
    it('returns a SUBMITTED application with comment', async () => {
      const returnedApp = { ...mockApplication, status: 'RETURNED' }
      vi.mocked(prisma.expenseApplication.findUnique).mockResolvedValue(
        mockApplication as never,
      )
      const mockTx = {
        expenseApplication: {
          update: vi.fn().mockResolvedValue(returnedApp),
        },
        applicationComment: { create: vi.fn() },
      }
      vi.mocked(prisma.$transaction).mockImplementation(
        async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx),
      )

      const result = await service.returnApplication({
        applicationId: 'app-1',
        adminId: 'admin-1',
        comment: 'Missing receipt',
      })

      expect(result).toEqual(returnedApp)
      expect(mockTx.expenseApplication.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'app-1' },
          data: { status: APPLICATION_STATUSES.RETURNED },
        }),
      )
      expect(mockTx.applicationComment.create).toHaveBeenCalledWith({
        data: {
          expenseApplicationId: 'app-1',
          memberId: 'admin-1',
          comment: 'Missing receipt',
          commentType: COMMENT_TYPES.RETURN,
        },
      })
    })

    it('throws 403 when application is DRAFT', async () => {
      const draftApp = { ...mockApplication, status: 'DRAFT' }
      vi.mocked(prisma.expenseApplication.findUnique).mockResolvedValue(
        draftApp as never,
      )

      await expect(
        service.returnApplication({
          applicationId: 'app-1',
          adminId: 'admin-1',
          comment: 'Invalid',
        }),
      ).rejects.toMatchObject({
        statusCode: 403,
        code: ERROR_CODES.FORBIDDEN,
      })
    })

    it('throws 400 for invalid transition from APPROVED', async () => {
      vi.mocked(prisma.expenseApplication.findUnique).mockResolvedValue(
        mockApprovedApplication as never,
      )

      await expect(
        service.returnApplication({
          applicationId: 'app-1',
          adminId: 'admin-1',
          comment: 'Too late',
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        code: ERROR_CODES.INVALID_STATUS_TRANSITION,
      })
    })
  })

  describe('reject', () => {
    it('rejects a SUBMITTED application', async () => {
      const rejectedApp = {
        ...mockApplication,
        status: 'REJECTED',
        rejectedAt: new Date(),
      }
      vi.mocked(prisma.expenseApplication.findUnique).mockResolvedValue(
        mockApplication as never,
      )
      const mockTx = {
        expenseApplication: {
          update: vi.fn().mockResolvedValue(rejectedApp),
        },
        applicationComment: { create: vi.fn() },
      }
      vi.mocked(prisma.$transaction).mockImplementation(
        async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx),
      )

      const result = await service.reject({
        applicationId: 'app-1',
        adminId: 'admin-1',
        comment: 'Not eligible',
      })

      expect(result).toEqual(rejectedApp)
      expect(mockTx.expenseApplication.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'app-1' },
          data: expect.objectContaining({
            status: APPLICATION_STATUSES.REJECTED,
            rejectedAt: expect.any(Date),
          }),
        }),
      )
    })

    it('creates rejection comment', async () => {
      vi.mocked(prisma.expenseApplication.findUnique).mockResolvedValue(
        mockApplication as never,
      )
      const mockTx = {
        expenseApplication: {
          update: vi.fn().mockResolvedValue({
            ...mockApplication,
            status: 'REJECTED',
          }),
        },
        applicationComment: { create: vi.fn() },
      }
      vi.mocked(prisma.$transaction).mockImplementation(
        async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx),
      )

      await service.reject({
        applicationId: 'app-1',
        adminId: 'admin-1',
        comment: 'Policy violation',
      })

      expect(mockTx.applicationComment.create).toHaveBeenCalledWith({
        data: {
          expenseApplicationId: 'app-1',
          memberId: 'admin-1',
          comment: 'Policy violation',
          commentType: COMMENT_TYPES.REJECTION,
        },
      })
    })

    it('throws 403 when application is DRAFT', async () => {
      const draftApp = { ...mockApplication, status: 'DRAFT' }
      vi.mocked(prisma.expenseApplication.findUnique).mockResolvedValue(
        draftApp as never,
      )

      await expect(
        service.reject({
          applicationId: 'app-1',
          adminId: 'admin-1',
          comment: 'Reject',
        }),
      ).rejects.toMatchObject({
        statusCode: 403,
        code: ERROR_CODES.FORBIDDEN,
      })
    })

    it('throws 400 for invalid transition from APPROVED', async () => {
      vi.mocked(prisma.expenseApplication.findUnique).mockResolvedValue(
        mockApprovedApplication as never,
      )

      await expect(
        service.reject({
          applicationId: 'app-1',
          adminId: 'admin-1',
          comment: 'Reject',
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        code: ERROR_CODES.INVALID_STATUS_TRANSITION,
      })
    })
  })

  describe('calculateSubsidy', () => {
    it('delegates to subsidy service with 50% calculation', () => {
      const result = service.calculateSubsidy(10000)

      expect(result).toEqual({
        originalAmount: 10000,
        proposedAmount: 5000,
      })
    })

    it('rounds down odd amounts', () => {
      const result = service.calculateSubsidy(1001)

      expect(result).toEqual({
        originalAmount: 1001,
        proposedAmount: 500,
      })
    })
  })
})
