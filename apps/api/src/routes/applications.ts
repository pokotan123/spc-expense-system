import { Hono } from 'hono'
import {
  createExpenseApplicationSchema,
  updateExpenseApplicationSchema,
  paginationSchema,
  applicationFilterSchema,
  updateOcrResultSchema,
  type ApiResponse,
} from '@spc/shared'
import type { Variables } from '../types.js'
import { getUser } from '../middleware/auth.js'
import type { ApplicationService } from '../services/application-service.js'
import type { ReceiptService } from '../services/receipt-service.js'
import type { MiddlewareHandler } from 'hono'

export function createApplicationRoutes(
  applicationService: ApplicationService,
  receiptService: ReceiptService,
  authMw: MiddlewareHandler,
) {
  const routes = new Hono<{ Variables: Variables }>()

  // All routes require auth
  routes.use('*', authMw)

  // GET /applications - list with filters
  routes.get('/', async (c) => {
    const user = getUser(c)
    const query = c.req.query()

    const pagination = paginationSchema.parse({
      page: query.page,
      limit: query.limit,
    })

    const filters = applicationFilterSchema.parse({
      status: query.status || undefined,
      date_from: query.date_from || undefined,
      date_to: query.date_to || undefined,
      member_id: query.member_id || undefined,
      department_id: query.department_id || undefined,
      category_id: query.category_id || undefined,
    })

    const result = await applicationService.listByMember(user.sub, {
      ...filters,
      ...pagination,
    })

    const body: ApiResponse<typeof result.items> = {
      success: true,
      data: result.items,
      meta: result.meta,
    }
    return c.json(body)
  })

  // GET /applications/dashboard - member dashboard stats
  routes.get('/dashboard', async (c) => {
    const user = getUser(c)
    const stats = await applicationService.getDashboard(user.sub)

    const body: ApiResponse<typeof stats> = {
      success: true,
      data: stats,
    }
    return c.json(body)
  })

  // GET /applications/:id - detail
  routes.get('/:id', async (c) => {
    const id = c.req.param('id')
    const application = await applicationService.findById(id)

    const body: ApiResponse<typeof application> = {
      success: true,
      data: application,
    }
    return c.json(body)
  })

  // POST /applications - create draft
  routes.post('/', async (c) => {
    const user = getUser(c)
    const raw = await c.req.json()
    const input = createExpenseApplicationSchema.parse(raw)

    const application = await applicationService.create(user.sub, input)

    const body: ApiResponse<typeof application> = {
      success: true,
      data: application,
    }
    return c.json(body, 201)
  })

  // PUT /applications/:id - update draft
  routes.put('/:id', async (c) => {
    const user = getUser(c)
    const id = c.req.param('id')
    const raw = await c.req.json()
    const input = updateExpenseApplicationSchema.parse(raw)

    const application = await applicationService.update(id, user.sub, input)

    const body: ApiResponse<typeof application> = {
      success: true,
      data: application,
    }
    return c.json(body)
  })

  // DELETE /applications/:id - delete draft
  routes.delete('/:id', async (c) => {
    const user = getUser(c)
    const id = c.req.param('id')

    await applicationService.remove(id, user.sub)

    const body: ApiResponse<{ readonly message: string }> = {
      success: true,
      data: Object.freeze({ message: 'Application deleted' }),
    }
    return c.json(body)
  })

  // POST /applications/:id/submit - submit application
  routes.post('/:id/submit', async (c) => {
    const user = getUser(c)
    const id = c.req.param('id')

    const application = await applicationService.submit(id, user.sub)

    const body: ApiResponse<typeof application> = {
      success: true,
      data: application,
    }
    return c.json(body)
  })

  // POST /applications/:id/receipts - upload receipt
  routes.post('/:id/receipts', async (c) => {
    const user = getUser(c)
    const applicationId = c.req.param('id')

    const formData = await c.req.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return c.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'File is required' },
        },
        400,
      )
    }

    const receipt = await receiptService.upload(applicationId, user.sub, file)

    const body: ApiResponse<typeof receipt> = {
      success: true,
      data: receipt,
    }
    return c.json(body, 201)
  })

  // GET /applications/:appId/receipts/:receiptId/url - get signed download URL
  routes.get('/:appId/receipts/:receiptId/url', async (c) => {
    const user = getUser(c)
    const receiptId = c.req.param('receiptId')

    const result = await receiptService.getSignedUrl(receiptId, user.sub)

    const body: ApiResponse<{ readonly url: string }> = {
      success: true,
      data: Object.freeze({ url: result.url }),
    }
    return c.json(body)
  })

  // DELETE /applications/:appId/receipts/:receiptId - delete receipt
  routes.delete('/:appId/receipts/:receiptId', async (c) => {
    const user = getUser(c)
    const receiptId = c.req.param('receiptId')

    await receiptService.deleteReceipt(receiptId, user.sub)

    const body: ApiResponse<{ readonly message: string }> = {
      success: true,
      data: Object.freeze({ message: 'Receipt deleted' }),
    }
    return c.json(body)
  })

  // POST /receipts/:receiptId/ocr - trigger OCR
  routes.post('/receipts/:receiptId/ocr', async (c) => {
    const receiptId = c.req.param('receiptId')
    const ocrResult = await receiptService.triggerOcr(receiptId)

    const body: ApiResponse<typeof ocrResult> = {
      success: true,
      data: ocrResult,
    }
    return c.json(body)
  })

  // PUT /receipts/:receiptId/ocr - update OCR result
  routes.put('/receipts/:receiptId/ocr', async (c) => {
    const receiptId = c.req.param('receiptId')
    const raw = await c.req.json()
    const input = updateOcrResultSchema.parse(raw)

    const ocrResult = await receiptService.updateOcrResult(receiptId, input)

    const body: ApiResponse<typeof ocrResult> = {
      success: true,
      data: ocrResult,
    }
    return c.json(body)
  })

  return routes
}
