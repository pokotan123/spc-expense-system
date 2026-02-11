import { Hono } from 'hono'
import { paginationSchema, type ApiResponse } from '@spc/shared'
import type { Variables } from '../types.js'
import { createAuditService } from '../services/audit-service.js'

export function createAdminAuditRoutes(
  authMw: ReturnType<typeof import('../middleware/auth.js').authMiddleware>,
  adminMw: ReturnType<typeof import('../middleware/rbac.js').requireAdmin>,
) {
  const routes = new Hono<{ Variables: Variables }>()
  const service = createAuditService()

  routes.use('*', authMw)
  routes.use('*', adminMw)

  // GET /api/admin/audit - List audit logs with filters
  routes.get('/', async (c) => {
    const query = c.req.query()
    const pagination = paginationSchema.parse({
      page: query.page,
      limit: query.limit,
    })

    const result = await service.list({
      action: query.action || undefined,
      entity: query.entity || undefined,
      memberId: query.member_id || undefined,
      dateFrom: query.date_from || undefined,
      dateTo: query.date_to || undefined,
      ...pagination,
    })

    const body: ApiResponse<typeof result.items> = {
      success: true,
      data: result.items,
      meta: result.meta,
    }
    return c.json(body)
  })

  return routes
}
