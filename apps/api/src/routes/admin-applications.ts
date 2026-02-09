import { Hono } from 'hono'
import {
  paginationSchema,
  applicationFilterSchema,
  approveApplicationSchema,
  returnApplicationSchema,
  rejectApplicationSchema,
  type ApiResponse,
} from '@spc/shared'
import type { Variables } from '../types.js'
import { getUser } from '../middleware/auth.js'
import { createAdminApplicationService } from '../services/admin-application-service.js'

export function createAdminApplicationRoutes(
  authMw: ReturnType<typeof import('../middleware/auth.js').authMiddleware>,
  adminMw: ReturnType<typeof import('../middleware/rbac.js').requireAdmin>,
) {
  const routes = new Hono<{ Variables: Variables }>()
  const service = createAdminApplicationService()

  // All admin routes require auth + admin role
  routes.use('*', authMw)
  routes.use('*', adminMw)

  // GET /api/admin/applications - List with advanced filters
  routes.get('/', async (c) => {
    const query = c.req.query()
    const pagination = paginationSchema.parse(query)
    const filters = applicationFilterSchema.parse(query)

    const result = await service.list(filters, pagination.page, pagination.limit)

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

  // GET /api/admin/applications/:id - Get single application
  routes.get('/:id', async (c) => {
    const id = c.req.param('id')
    const application = await service.findById(id)

    const body: ApiResponse<typeof application> = {
      success: true,
      data: application,
    }
    return c.json(body)
  })

  // POST /api/admin/applications/:id/approve
  routes.post('/:id/approve', async (c) => {
    const id = c.req.param('id')
    const user = getUser(c)
    const raw = await c.req.json()
    const input = approveApplicationSchema.parse(raw)

    const result = await service.approve({
      applicationId: id,
      adminId: user.sub,
      internalCategoryId: input.internal_category_id,
      finalAmount: input.final_amount,
      comment: input.comment,
    })

    const body: ApiResponse<typeof result> = {
      success: true,
      data: result,
    }
    return c.json(body)
  })

  // POST /api/admin/applications/:id/return
  routes.post('/:id/return', async (c) => {
    const id = c.req.param('id')
    const user = getUser(c)
    const raw = await c.req.json()
    const input = returnApplicationSchema.parse(raw)

    const result = await service.returnApplication({
      applicationId: id,
      adminId: user.sub,
      comment: input.comment,
    })

    const body: ApiResponse<typeof result> = {
      success: true,
      data: result,
    }
    return c.json(body)
  })

  // POST /api/admin/applications/:id/reject
  routes.post('/:id/reject', async (c) => {
    const id = c.req.param('id')
    const user = getUser(c)
    const raw = await c.req.json()
    const input = rejectApplicationSchema.parse(raw)

    const result = await service.reject({
      applicationId: id,
      adminId: user.sub,
      comment: input.comment,
    })

    const body: ApiResponse<typeof result> = {
      success: true,
      data: result,
    }
    return c.json(body)
  })

  // GET /api/admin/applications/:id/subsidy - Calculate subsidy for an amount
  routes.get('/:id/subsidy', async (c) => {
    const id = c.req.param('id')
    const application = await service.findById(id)
    const amount = Number(application.amount)
    const result = service.calculateSubsidy(amount)

    const body: ApiResponse<typeof result> = {
      success: true,
      data: result,
    }
    return c.json(body)
  })

  return routes
}
