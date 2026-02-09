import type { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { AppError } from '../middleware/error-handler.js'
import {
  ERROR_CODES,
  APPLICATION_STATUSES,
  COMMENT_TYPES,
  isValidStatusTransition,
  type ApplicationStatus,
} from '@spc/shared'
import { createSubsidyService } from './subsidy-service.js'

interface ApplicationListItem {
  readonly id: string
  readonly applicationNumber: string
  readonly status: string
  readonly expenseDate: Date
  readonly amount: Prisma.Decimal
  readonly proposedAmount: Prisma.Decimal | null
  readonly finalAmount: Prisma.Decimal | null
  readonly description: string
  readonly isCashPayment: boolean
  readonly submittedAt: Date | null
  readonly approvedAt: Date | null
  readonly createdAt: Date
  readonly member: {
    readonly id: string
    readonly memberId: string
    readonly name: string
    readonly department: {
      readonly id: string
      readonly name: string
      readonly code: string
    } | null
  }
  readonly internalCategory: {
    readonly id: string
    readonly name: string
    readonly code: string
  } | null
}

interface ApplicationListResult {
  readonly items: readonly ApplicationListItem[]
  readonly total: number
  readonly page: number
  readonly limit: number
  readonly totalPages: number
}

interface ListFilters {
  readonly status?: string
  readonly date_from?: string
  readonly date_to?: string
  readonly member_id?: string
  readonly department_id?: string
  readonly category_id?: string
}

interface ApproveParams {
  readonly applicationId: string
  readonly adminId: string
  readonly internalCategoryId: string
  readonly finalAmount: number
  readonly comment?: string
}

interface ReturnParams {
  readonly applicationId: string
  readonly adminId: string
  readonly comment: string
}

interface RejectParams {
  readonly applicationId: string
  readonly adminId: string
  readonly comment: string
}

const APPLICATION_LIST_SELECT = {
  id: true,
  applicationNumber: true,
  status: true,
  expenseDate: true,
  amount: true,
  proposedAmount: true,
  finalAmount: true,
  description: true,
  isCashPayment: true,
  submittedAt: true,
  approvedAt: true,
  createdAt: true,
  member: {
    select: {
      id: true,
      memberId: true,
      name: true,
      department: {
        select: { id: true, name: true, code: true },
      },
    },
  },
  internalCategory: {
    select: { id: true, name: true, code: true },
  },
} as const

function buildWhereClause(
  filters: ListFilters,
): Prisma.ExpenseApplicationWhereInput {
  const conditions: Prisma.ExpenseApplicationWhereInput[] = []

  if (filters.status) {
    conditions.push({ status: filters.status as Prisma.EnumApplicationStatusFilter['equals'] })
  }

  if (filters.date_from) {
    conditions.push({ expenseDate: { gte: new Date(filters.date_from) } })
  }

  if (filters.date_to) {
    conditions.push({ expenseDate: { lte: new Date(filters.date_to) } })
  }

  if (filters.member_id) {
    conditions.push({ memberId: filters.member_id })
  }

  if (filters.department_id) {
    conditions.push({ member: { departmentId: filters.department_id } })
  }

  if (filters.category_id) {
    conditions.push({ internalCategoryId: filters.category_id })
  }

  if (conditions.length === 0) {
    return {}
  }

  return { AND: conditions }
}

export function createAdminApplicationService() {
  const subsidyService = createSubsidyService()

  async function list(
    filters: ListFilters,
    page: number,
    limit: number,
  ): Promise<ApplicationListResult> {
    const where = buildWhereClause(filters)
    const skip = (page - 1) * limit

    const [items, total] = await Promise.all([
      prisma.expenseApplication.findMany({
        where,
        select: APPLICATION_LIST_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.expenseApplication.count({ where }),
    ])

    return Object.freeze({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  }

  async function findById(id: string): Promise<ApplicationListItem> {
    const application = await prisma.expenseApplication.findUnique({
      where: { id },
      select: APPLICATION_LIST_SELECT,
    })

    if (!application) {
      throw new AppError('Application not found', ERROR_CODES.NOT_FOUND, 404)
    }

    return application
  }

  async function approve(params: ApproveParams): Promise<ApplicationListItem> {
    const application = await findById(params.applicationId)

    if (
      !isValidStatusTransition(
        application.status as ApplicationStatus,
        APPLICATION_STATUSES.APPROVED,
      )
    ) {
      throw new AppError(
        `Cannot approve application with status "${application.status}"`,
        ERROR_CODES.INVALID_STATUS_TRANSITION,
        400,
      )
    }

    // Verify internal category exists
    const category = await prisma.internalCategory.findUnique({
      where: { id: params.internalCategoryId },
    })
    if (!category || !category.isActive) {
      throw new AppError(
        'Internal category not found or inactive',
        ERROR_CODES.VALIDATION_ERROR,
        400,
      )
    }

    const now = new Date()

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.expenseApplication.update({
        where: { id: params.applicationId },
        data: {
          status: APPLICATION_STATUSES.APPROVED,
          internalCategoryId: params.internalCategoryId,
          finalAmount: params.finalAmount,
          approvedById: params.adminId,
          approvedAt: now,
        },
        select: APPLICATION_LIST_SELECT,
      })

      if (params.comment) {
        await tx.applicationComment.create({
          data: {
            expenseApplicationId: params.applicationId,
            memberId: params.adminId,
            comment: params.comment,
            commentType: COMMENT_TYPES.APPROVAL,
          },
        })
      }

      return result
    })

    return updated
  }

  async function returnApplication(
    params: ReturnParams,
  ): Promise<ApplicationListItem> {
    const application = await findById(params.applicationId)

    if (
      !isValidStatusTransition(
        application.status as ApplicationStatus,
        APPLICATION_STATUSES.RETURNED,
      )
    ) {
      throw new AppError(
        `Cannot return application with status "${application.status}"`,
        ERROR_CODES.INVALID_STATUS_TRANSITION,
        400,
      )
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.expenseApplication.update({
        where: { id: params.applicationId },
        data: { status: APPLICATION_STATUSES.RETURNED },
        select: APPLICATION_LIST_SELECT,
      })

      await tx.applicationComment.create({
        data: {
          expenseApplicationId: params.applicationId,
          memberId: params.adminId,
          comment: params.comment,
          commentType: COMMENT_TYPES.RETURN,
        },
      })

      return result
    })

    return updated
  }

  async function reject(params: RejectParams): Promise<ApplicationListItem> {
    const application = await findById(params.applicationId)

    if (
      !isValidStatusTransition(
        application.status as ApplicationStatus,
        APPLICATION_STATUSES.REJECTED,
      )
    ) {
      throw new AppError(
        `Cannot reject application with status "${application.status}"`,
        ERROR_CODES.INVALID_STATUS_TRANSITION,
        400,
      )
    }

    const now = new Date()

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.expenseApplication.update({
        where: { id: params.applicationId },
        data: {
          status: APPLICATION_STATUSES.REJECTED,
          rejectedAt: now,
        },
        select: APPLICATION_LIST_SELECT,
      })

      await tx.applicationComment.create({
        data: {
          expenseApplicationId: params.applicationId,
          memberId: params.adminId,
          comment: params.comment,
          commentType: COMMENT_TYPES.REJECTION,
        },
      })

      return result
    })

    return updated
  }

  function calculateSubsidy(amount: number) {
    return subsidyService.calculate(amount)
  }

  return Object.freeze({
    list,
    findById,
    approve,
    returnApplication,
    reject,
    calculateSubsidy,
  })
}

export type AdminApplicationService = ReturnType<
  typeof createAdminApplicationService
>
