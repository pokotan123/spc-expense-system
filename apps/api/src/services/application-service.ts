import { prisma } from '../lib/prisma.js'
import { getNotificationService } from '../lib/notification.js'
import { AppError } from '../middleware/error-handler.js'
import { AuthError } from '../lib/jwt.js'
import {
  ERROR_CODES,
  isValidStatusTransition,
  calculateProposedAmount,
  generateApplicationNumber,
  type ApplicationStatus,
  APPLICATION_STATUSES,
} from '@spc/shared'
import type { Prisma } from '@spc/db'

interface CreateInput {
  readonly expense_date: string
  readonly amount: number
  readonly description: string
  readonly is_cash_payment: boolean
}

interface UpdateInput {
  readonly expense_date?: string
  readonly amount?: number
  readonly description?: string
  readonly is_cash_payment?: boolean
}

interface ListFilters {
  readonly status?: string
  readonly date_from?: string
  readonly date_to?: string
  readonly member_id?: string
  readonly department_id?: string
  readonly category_id?: string
  readonly page: number
  readonly limit: number
}

export function createApplicationService() {
  async function list(filters: ListFilters) {
    const where: Prisma.ExpenseApplicationWhereInput = {}

    if (filters.status) {
      where.status = filters.status as ApplicationStatus
    }
    if (filters.member_id) {
      where.memberId = filters.member_id
    }
    if (filters.department_id) {
      where.member = { departmentId: filters.department_id }
    }
    if (filters.category_id) {
      where.internalCategoryId = filters.category_id
    }
    if (filters.date_from || filters.date_to) {
      where.expenseDate = {}
      if (filters.date_from) {
        where.expenseDate.gte = new Date(filters.date_from)
      }
      if (filters.date_to) {
        where.expenseDate.lte = new Date(filters.date_to)
      }
    }

    const [items, total] = await Promise.all([
      prisma.expenseApplication.findMany({
        where,
        include: {
          member: {
            select: { id: true, memberId: true, name: true },
          },
          internalCategory: {
            select: { id: true, name: true, code: true },
          },
          _count: { select: { receipts: true, comments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.expenseApplication.count({ where }),
    ])

    const totalPages = Math.ceil(total / filters.limit)

    return Object.freeze({
      items,
      meta: Object.freeze({
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages,
      }),
    })
  }

  async function listByMember(memberId: string, filters: ListFilters) {
    return list({ ...filters, member_id: memberId })
  }

  async function findById(id: string) {
    const application = await prisma.expenseApplication.findUnique({
      where: { id },
      include: {
        member: {
          select: { id: true, memberId: true, name: true, email: true },
        },
        approvedBy: {
          select: { id: true, memberId: true, name: true },
        },
        internalCategory: {
          select: { id: true, name: true, code: true },
        },
        receipts: {
          include: {
            ocrResult: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        comments: {
          include: {
            member: {
              select: { id: true, memberId: true, name: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!application) {
      throw new AppError('Application not found', ERROR_CODES.NOT_FOUND, 404)
    }

    return application
  }

  async function create(memberId: string, input: CreateInput) {
    const sequenceCount = await prisma.expenseApplication.count()
    const applicationNumber = generateApplicationNumber(
      new Date(),
      sequenceCount + 1,
    )

    const proposedAmount = calculateProposedAmount(input.amount)

    const application = await prisma.expenseApplication.create({
      data: {
        applicationNumber,
        memberId,
        expenseDate: new Date(input.expense_date),
        amount: input.amount,
        proposedAmount,
        description: input.description,
        isCashPayment: input.is_cash_payment,
        status: APPLICATION_STATUSES.DRAFT,
      },
      include: {
        member: {
          select: { id: true, memberId: true, name: true },
        },
      },
    })

    return application
  }

  async function update(id: string, memberId: string, input: UpdateInput) {
    const existing = await findById(id)

    if (existing.memberId !== memberId) {
      throw new AuthError('Not authorized to update this application', 'FORBIDDEN')
    }

    if (existing.status !== APPLICATION_STATUSES.DRAFT &&
        existing.status !== APPLICATION_STATUSES.RETURNED) {
      throw new AppError(
        'Can only update applications in DRAFT or RETURNED status',
        ERROR_CODES.INVALID_STATUS_TRANSITION,
        400,
      )
    }

    const data: Prisma.ExpenseApplicationUpdateInput = {}

    if (input.expense_date !== undefined) {
      data.expenseDate = new Date(input.expense_date)
    }
    if (input.amount !== undefined) {
      data.amount = input.amount
      data.proposedAmount = calculateProposedAmount(input.amount)
    }
    if (input.description !== undefined) {
      data.description = input.description
    }
    if (input.is_cash_payment !== undefined) {
      data.isCashPayment = input.is_cash_payment
    }

    const updated = await prisma.expenseApplication.update({
      where: { id },
      data,
      include: {
        member: {
          select: { id: true, memberId: true, name: true },
        },
      },
    })

    return updated
  }

  async function remove(id: string, memberId: string) {
    const existing = await findById(id)

    if (existing.memberId !== memberId) {
      throw new AuthError('Not authorized to delete this application', 'FORBIDDEN')
    }

    if (existing.status !== APPLICATION_STATUSES.DRAFT) {
      throw new AppError(
        'Can only delete applications in DRAFT status',
        ERROR_CODES.INVALID_STATUS_TRANSITION,
        400,
      )
    }

    // Cascade delete: OCR results -> receipts -> comments -> application
    await prisma.$transaction([
      prisma.ocrResult.deleteMany({
        where: { receipt: { expenseApplicationId: id } },
      }),
      prisma.receipt.deleteMany({ where: { expenseApplicationId: id } }),
      prisma.applicationComment.deleteMany({
        where: { expenseApplicationId: id },
      }),
      prisma.expenseApplication.delete({ where: { id } }),
    ])
  }

  async function submit(id: string, memberId: string) {
    const existing = await findById(id)

    if (existing.memberId !== memberId) {
      throw new AuthError('Not authorized to submit this application', 'FORBIDDEN')
    }

    const fromStatus = existing.status as ApplicationStatus
    if (!isValidStatusTransition(fromStatus, APPLICATION_STATUSES.SUBMITTED)) {
      throw new AppError(
        `Cannot transition from ${fromStatus} to SUBMITTED`,
        ERROR_CODES.INVALID_STATUS_TRANSITION,
        400,
      )
    }

    const updated = await prisma.expenseApplication.update({
      where: { id },
      data: {
        status: APPLICATION_STATUSES.SUBMITTED,
        submittedAt: new Date(),
      },
      include: {
        member: {
          select: { id: true, memberId: true, name: true, email: true },
        },
      },
    })

    await prisma.applicationComment.create({
      data: {
        expenseApplicationId: id,
        memberId,
        comment: '申請しました',
        commentType: 'SUBMISSION',
      },
    })

    void getNotificationService().notifyApplicationSubmitted(updated)

    return updated
  }

  async function getDashboard(memberId: string) {
    const applications = await prisma.expenseApplication.findMany({
      where: { memberId },
      select: {
        id: true,
        applicationNumber: true,
        status: true,
        amount: true,
        expenseDate: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const submittedApplications = applications.filter(
      (app) => app.status !== APPLICATION_STATUSES.DRAFT,
    )
    const draftApplications = applications.filter(
      (app) => app.status === APPLICATION_STATUSES.DRAFT,
    )

    const totalApplications = submittedApplications.length
    const totalAmount = submittedApplications.reduce(
      (sum, app) => sum + Number(app.amount),
      0,
    )

    const draftCount = draftApplications.length
    const draftAmount = draftApplications.reduce(
      (sum, app) => sum + Number(app.amount),
      0,
    )

    const byStatus: Record<string, { count: number; amount: number }> = {}
    for (const app of submittedApplications) {
      const entry = byStatus[app.status] ?? { count: 0, amount: 0 }
      byStatus[app.status] = {
        count: entry.count + 1,
        amount: entry.amount + Number(app.amount),
      }
    }

    const recentApplications = submittedApplications.slice(0, 10).map((app) =>
      Object.freeze({
        id: app.id,
        applicationNumber: app.applicationNumber,
        status: app.status,
        amount: Number(app.amount),
        expenseDate: app.expenseDate.toISOString(),
        createdAt: app.createdAt.toISOString(),
      }),
    )

    return Object.freeze({
      totalApplications,
      totalAmount,
      draftCount,
      draftAmount,
      byStatus,
      recentApplications,
    })
  }

  async function addComment(
    applicationId: string,
    memberId: string,
    commentText: string,
    commentType: string = 'GENERAL',
  ) {
    await findById(applicationId)

    const created = await prisma.applicationComment.create({
      data: {
        expenseApplicationId: applicationId,
        memberId,
        comment: commentText,
        commentType: commentType as 'GENERAL' | 'SUBMISSION' | 'APPROVAL' | 'RETURN' | 'REJECTION',
      },
      include: {
        member: {
          select: { id: true, memberId: true, name: true },
        },
      },
    })

    return created
  }

  return Object.freeze({
    list,
    listByMember,
    findById,
    create,
    update,
    remove,
    submit,
    getDashboard,
    addComment,
  })
}

export type ApplicationService = ReturnType<typeof createApplicationService>
