import { Hono } from 'hono'
import {
  createCategorySchema,
  updateCategorySchema,
  type ApiResponse,
} from '@spc/shared'
import type { Variables } from '../types.js'
import { createCategoryService } from '../services/category-service.js'

export function createAdminCategoryRoutes(
  authMw: ReturnType<typeof import('../middleware/auth.js').authMiddleware>,
  adminMw: ReturnType<typeof import('../middleware/rbac.js').requireAdmin>,
) {
  const routes = new Hono<{ Variables: Variables }>()
  const service = createCategoryService()

  // All admin routes require auth + admin role
  routes.use('*', authMw)
  routes.use('*', adminMw)

  // GET /api/admin/categories - List all (including inactive)
  routes.get('/', async (c) => {
    const includeInactive = c.req.query('include_inactive') === 'true'
    const categories = await service.findAll(includeInactive)

    const body: ApiResponse<typeof categories> = {
      success: true,
      data: categories,
    }
    return c.json(body)
  })

  // GET /api/admin/categories/:id
  routes.get('/:id', async (c) => {
    const id = c.req.param('id')
    const category = await service.findById(id)

    const body: ApiResponse<typeof category> = {
      success: true,
      data: category,
    }
    return c.json(body)
  })

  // POST /api/admin/categories
  routes.post('/', async (c) => {
    const raw = await c.req.json()
    const input = createCategorySchema.parse(raw)

    const category = await service.create(input)

    const body: ApiResponse<typeof category> = {
      success: true,
      data: category,
    }
    return c.json(body, 201)
  })

  // PUT /api/admin/categories/:id
  routes.put('/:id', async (c) => {
    const id = c.req.param('id')
    const raw = await c.req.json()
    const input = updateCategorySchema.parse(raw)

    const category = await service.update(id, input)

    const body: ApiResponse<typeof category> = {
      success: true,
      data: category,
    }
    return c.json(body)
  })

  // DELETE /api/admin/categories/:id
  routes.delete('/:id', async (c) => {
    const id = c.req.param('id')
    await service.remove(id)

    const body: ApiResponse<{ readonly message: string }> = {
      success: true,
      data: Object.freeze({ message: 'Category deleted successfully' }),
    }
    return c.json(body)
  })

  return routes
}
