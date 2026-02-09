import { Hono } from 'hono'
import {
  paginationSchema,
  generatePaymentSchema,
  type ApiResponse,
} from '@spc/shared'
import type { Variables } from '../types.js'
import { AppError } from '../middleware/error-handler.js'
import { createPaymentService } from '../services/payment-service.js'
import { createZenginService } from '../services/zengin-service.js'

const DEFAULT_SENDER_CODE = 'SPC0000001'
const DEFAULT_SENDER_NAME = 'SPC TRADING'
const DEFAULT_BANK_CODE = '0001'
const DEFAULT_BRANCH_CODE = '001'

export function createAdminPaymentRoutes(
  authMw: ReturnType<typeof import('../middleware/auth.js').authMiddleware>,
  adminMw: ReturnType<typeof import('../middleware/rbac.js').requireAdmin>,
) {
  const routes = new Hono<{ Variables: Variables }>()
  const paymentService = createPaymentService()
  const zenginService = createZenginService()

  // All admin routes require auth + admin role
  routes.use('*', authMw)
  routes.use('*', adminMw)

  // GET /api/admin/payments - List payments with optional status filter
  routes.get('/', async (c) => {
    const query = c.req.query()
    const pagination = paginationSchema.parse(query)
    const statusFilter = query['status']

    const result = await paymentService.listPayments(
      pagination.page,
      pagination.limit,
      statusFilter,
    )

    const body: ApiResponse<typeof result.items> = {
      success: true,
      data: result.items,
      meta: Object.freeze({
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      }),
    }
    return c.json(body)
  })

  // GET /api/admin/payments/ready - List approved applications ready for payment
  routes.get('/ready', async (c) => {
    const applications =
      await paymentService.listApprovedApplicationsReadyForPayment()

    const body: ApiResponse<typeof applications> = {
      success: true,
      data: applications,
    }
    return c.json(body)
  })

  // POST /api/admin/payments/generate - Generate payment batch
  routes.post('/generate', async (c) => {
    const raw = await c.req.json()
    const input = generatePaymentSchema.parse(raw)

    const result = await paymentService.generateBatch(input.application_ids)

    const body: ApiResponse<typeof result> = {
      success: true,
      data: result,
    }
    return c.json(body, 201)
  })

  // GET /api/admin/payments/:batchId/download - Download Zengin format file
  routes.get('/:batchId/download', async (c) => {
    const batchId = c.req.param('batchId')
    const payments = await paymentService.findPaymentsByBatchId(batchId)

    if (payments.length === 0) {
      throw new AppError(
        `No payments found for batch "${batchId}"`,
        'NOT_FOUND',
        404,
      )
    }

    const zenginPayments = payments.map((payment) => {
      const amount = payment.expenseApplication.finalAmount
        ? Number(payment.expenseApplication.finalAmount)
        : Number(payment.expenseApplication.amount)

      return Object.freeze({
        recipientName: payment.expenseApplication.member.name,
        bankCode: DEFAULT_BANK_CODE,
        branchCode: DEFAULT_BRANCH_CODE,
        accountType: '1' as const,
        accountNumber: '0000000',
        amount,
      })
    })

    const zenginContent = zenginService.generate(
      {
        senderCode: DEFAULT_SENDER_CODE,
        senderName: DEFAULT_SENDER_NAME,
        transferDate: new Date(),
        bankCode: DEFAULT_BANK_CODE,
        branchCode: DEFAULT_BRANCH_CODE,
      },
      zenginPayments,
    )

    const buffer = zenginService.encodeToShiftJIS(zenginContent)

    c.header('Content-Type', 'application/octet-stream')
    c.header(
      'Content-Disposition',
      `attachment; filename="${batchId}.dat"`,
    )
    return c.body(new Uint8Array(buffer))
  })

  return routes
}
