import { Hono } from 'hono'
import { updateOcrResultSchema, type ApiResponse } from '@spc/shared'
import type { Variables } from '../types.js'
import { getUser } from '../middleware/auth.js'
import type { ReceiptService } from '../services/receipt-service.js'
import type { OcrService } from '../services/ocr-service.js'
import type { MiddlewareHandler } from 'hono'

export function createReceiptRoutes(
  receiptService: ReceiptService,
  ocrService: OcrService,
  authMw: MiddlewareHandler,
) {
  const routes = new Hono<{ Variables: Variables }>()

  // All routes require auth
  routes.use('*', authMw)

  // POST /receipts/:applicationId/upload - upload receipt
  routes.post('/:applicationId/upload', async (c) => {
    const user = getUser(c)
    const applicationId = c.req.param('applicationId')

    const formData = await c.req.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return c.json(
        Object.freeze({
          success: false,
          error: Object.freeze({
            code: 'VALIDATION_ERROR',
            message: 'File is required',
          }),
        }),
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

  // DELETE /receipts/:id - delete receipt
  routes.delete('/:id', async (c) => {
    const user = getUser(c)
    const id = c.req.param('id')

    await receiptService.deleteReceipt(id, user.sub)

    const body: ApiResponse<{ readonly message: string }> = {
      success: true,
      data: Object.freeze({ message: 'Receipt deleted' }),
    }
    return c.json(body)
  })

  // GET /receipts/:id/url - get signed download URL
  routes.get('/:id/url', async (c) => {
    const user = getUser(c)
    const id = c.req.param('id')

    const result = await receiptService.getSignedUrl(id, user.sub)

    const body: ApiResponse<{ readonly url: string }> = {
      success: true,
      data: Object.freeze({ url: result.url }),
    }
    return c.json(body)
  })

  // POST /receipts/:id/ocr - trigger OCR processing
  routes.post('/:id/ocr', async (c) => {
    const user = getUser(c)
    const id = c.req.param('id')

    // Verify ownership via receipt -> application -> member
    await receiptService.getSignedUrl(id, user.sub)

    const ocrResult = await ocrService.processReceipt(id)

    const body: ApiResponse<typeof ocrResult> = {
      success: true,
      data: ocrResult,
    }
    return c.json(body)
  })

  // PUT /receipts/:id/ocr - update OCR result manually
  routes.put('/:id/ocr', async (c) => {
    const user = getUser(c)
    const id = c.req.param('id')
    const raw = await c.req.json()
    const input = updateOcrResultSchema.parse(raw)

    const ocrResult = await ocrService.updateOcrResult(id, user.sub, input)

    const body: ApiResponse<typeof ocrResult> = {
      success: true,
      data: ocrResult,
    }
    return c.json(body)
  })

  return routes
}
