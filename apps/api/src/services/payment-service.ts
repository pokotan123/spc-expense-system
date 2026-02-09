import type { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { AppError } from '../middleware/error-handler.js'
import {
  ERROR_CODES,
  APPLICATION_STATUSES,
  PAYMENT_STATUSES,
} from '@spc/shared'

interface PaymentListItem {
  readonly id: string
  readonly paymentStatus: string
  readonly paymentDate: Date | null
  readonly batchId: string | null
  readonly createdAt: Date
  readonly expenseApplication: {
    readonly id: string
    readonly applicationNumber: string
    readonly amount: Prisma.Decimal
    readonly finalAmount: Prisma.Decimal | null
    readonly member: {
      readonly id: string
      readonly memberId: string
      readonly name: string
    }
  }
}

interface PaymentListResult {
  readonly items: readonly PaymentListItem[]
  readonly total: number
  readonly page: number
  readonly limit: number
  readonly totalPages: number
}

interface ApprovedApplicationItem {
  readonly id: string
  readonly applicationNumber: string
  readonly amount: Prisma.Decimal
  readonly finalAmount: Prisma.Decimal | null
  readonly approvedAt: Date | null
  readonly member: {
    readonly id: string
    readonly memberId: string
    readonly name: string
  }
}

interface BatchResult {
  readonly batchId: string
  readonly paymentCount: number
  readonly totalAmount: number
}

const PAYMENT_LIST_SELECT = {
  id: true,
  paymentStatus: true,
  paymentDate: true,
  batchId: true,
  createdAt: true,
  expenseApplication: {
    select: {
      id: true,
      applicationNumber: true,
      amount: true,
      finalAmount: true,
      member: {
        select: { id: true, memberId: true, name: true },
      },
    },
  },
} as const

function generateBatchId(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  return `BATCH-${year}${month}${day}-${hours}${minutes}${seconds}`
}

export function createPaymentService() {
  async function listPayments(
    page: number,
    limit: number,
    statusFilter?: string,
  ): Promise<PaymentListResult> {
    const where: Prisma.PaymentWhereInput = statusFilter
      ? { paymentStatus: statusFilter as Prisma.EnumPaymentStatusFilter['equals'] }
      : {}
    const skip = (page - 1) * limit

    const [items, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        select: PAYMENT_LIST_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ])

    return Object.freeze({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  }

  async function listApprovedApplicationsReadyForPayment(): Promise<
    readonly ApprovedApplicationItem[]
  > {
    // Find approved applications that don't have a payment record yet
    return prisma.expenseApplication.findMany({
      where: {
        status: APPLICATION_STATUSES.APPROVED,
        payments: { none: {} },
      },
      select: {
        id: true,
        applicationNumber: true,
        amount: true,
        finalAmount: true,
        approvedAt: true,
        member: {
          select: { id: true, memberId: true, name: true },
        },
      },
      orderBy: { approvedAt: 'asc' },
    })
  }

  async function generateBatch(
    applicationIds: readonly string[],
  ): Promise<BatchResult> {
    // Verify all applications are approved and have no existing payment
    const applications = await prisma.expenseApplication.findMany({
      where: {
        id: { in: [...applicationIds] },
        status: APPLICATION_STATUSES.APPROVED,
      },
      select: {
        id: true,
        finalAmount: true,
        amount: true,
        payments: { select: { id: true } },
      },
    })

    if (applications.length !== applicationIds.length) {
      throw new AppError(
        'Some applications are not found or not in APPROVED status',
        ERROR_CODES.VALIDATION_ERROR,
        400,
      )
    }

    const alreadyPaid = applications.filter((a) => a.payments.length > 0)
    if (alreadyPaid.length > 0) {
      throw new AppError(
        'Some applications already have payment records',
        ERROR_CODES.VALIDATION_ERROR,
        400,
      )
    }

    const batchId = generateBatchId()
    const now = new Date()

    let totalAmount = 0
    const paymentData = applications.map((app) => {
      const paymentAmount = app.finalAmount
        ? Number(app.finalAmount)
        : Number(app.amount)
      totalAmount += paymentAmount
      return {
        expenseApplicationId: app.id,
        paymentStatus: PAYMENT_STATUSES.PENDING,
        batchId,
        createdAt: now,
      }
    })

    await prisma.payment.createMany({ data: paymentData })

    return Object.freeze({
      batchId,
      paymentCount: paymentData.length,
      totalAmount,
    })
  }

  async function findPaymentsByBatchId(
    batchId: string,
  ): Promise<readonly PaymentListItem[]> {
    return prisma.payment.findMany({
      where: { batchId },
      select: PAYMENT_LIST_SELECT,
      orderBy: { createdAt: 'asc' },
    })
  }

  return Object.freeze({
    listPayments,
    listApprovedApplicationsReadyForPayment,
    generateBatch,
    findPaymentsByBatchId,
  })
}

export type PaymentService = ReturnType<typeof createPaymentService>
