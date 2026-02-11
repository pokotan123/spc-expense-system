import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Hono } from 'hono'
import type { Variables } from '../../types.js'
import { authMiddleware } from '../../middleware/auth.js'
import { errorHandler } from '../../middleware/error-handler.js'
import { signAccessToken } from '../../lib/jwt.js'
import { createApplicationRoutes } from '../applications.js'
import type { ApplicationService } from '../../services/application-service.js'
import type { ReceiptService } from '../../services/receipt-service.js'

const JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long'

async function getAuthHeader(role = 'MEMBER') {
  const token = await signAccessToken(
    { sub: 'user-uuid-1', memberId: 'SPC-0001', role },
    JWT_SECRET,
    '15m',
  )
  return { Authorization: `Bearer ${token}` }
}

function createMockApplicationService(): {
  [K in keyof ApplicationService]: ReturnType<typeof vi.fn>
} {
  return {
    list: vi.fn(),
    listByMember: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    submit: vi.fn(),
    getDashboard: vi.fn(),
    addComment: vi.fn(),
  }
}

function createMockReceiptService(): {
  [K in keyof ReceiptService]: ReturnType<typeof vi.fn>
} {
  return {
    upload: vi.fn(),
    getSignedUrl: vi.fn(),
    triggerOcr: vi.fn(),
    updateOcrResult: vi.fn(),
    deleteReceipt: vi.fn(),
  }
}

function createTestApp(
  appService: ReturnType<typeof createMockApplicationService>,
  receiptService: ReturnType<typeof createMockReceiptService>,
) {
  const app = new Hono<{ Variables: Variables }>()
  app.onError(errorHandler)
  const authMw = authMiddleware(JWT_SECRET)
  app.route(
    '/applications',
    createApplicationRoutes(
      appService as unknown as ApplicationService,
      receiptService as unknown as ReceiptService,
      authMw,
    ),
  )
  return app
}

describe('Application routes', () => {
  let appService: ReturnType<typeof createMockApplicationService>
  let receiptService: ReturnType<typeof createMockReceiptService>
  let app: ReturnType<typeof createTestApp>

  beforeEach(() => {
    vi.clearAllMocks()
    appService = createMockApplicationService()
    receiptService = createMockReceiptService()
    app = createTestApp(appService, receiptService)
  })

  describe('GET /applications', () => {
    it('returns paginated list on success', async () => {
      const mockItems = [
        { id: 'app-1', applicationNumber: 'EA-202401-0001', status: 'DRAFT', amount: 1000 },
      ]
      appService.listByMember.mockResolvedValue({
        items: mockItems,
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      })

      const headers = await getAuthHeader()
      const res = await app.request('/applications', { headers })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data).toHaveLength(1)
      expect(body.meta.total).toBe(1)
      expect(appService.listByMember).toHaveBeenCalledWith(
        'user-uuid-1',
        expect.objectContaining({ page: 1, limit: 20 }),
      )
    })

    it('returns 401 without auth', async () => {
      const res = await app.request('/applications')
      expect(res.status).toBe(401)
    })
  })

  describe('GET /applications/dashboard', () => {
    it('returns dashboard stats on success', async () => {
      const mockStats = {
        totalApplications: 5,
        totalAmount: 25000,
        byStatus: { DRAFT: { count: 2, amount: 10000 } },
        recentApplications: [],
      }
      appService.getDashboard.mockResolvedValue(mockStats)

      const headers = await getAuthHeader()
      const res = await app.request('/applications/dashboard', { headers })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data.totalApplications).toBe(5)
      expect(appService.getDashboard).toHaveBeenCalledWith('user-uuid-1')
    })
  })

  describe('GET /applications/:id', () => {
    it('returns application detail on success', async () => {
      const mockApp = { id: 'app-1', applicationNumber: 'EA-202401-0001', status: 'DRAFT' }
      appService.findById.mockResolvedValue(mockApp)

      const headers = await getAuthHeader()
      const res = await app.request('/applications/app-1', { headers })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data.id).toBe('app-1')
      expect(appService.findById).toHaveBeenCalledWith('app-1')
    })

    it('returns 404 when not found', async () => {
      const { AppError } = await import('../../middleware/error-handler.js')
      appService.findById.mockRejectedValue(
        new AppError('Application not found', 'NOT_FOUND', 404),
      )

      const headers = await getAuthHeader()
      const res = await app.request('/applications/nonexistent', { headers })

      expect(res.status).toBe(404)
      const body = await res.json()
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('NOT_FOUND')
    })
  })

  describe('POST /applications', () => {
    it('creates application and returns 201', async () => {
      const mockCreated = {
        id: 'new-app',
        applicationNumber: 'EA-202401-0001',
        status: 'DRAFT',
        amount: 5000,
      }
      appService.create.mockResolvedValue(mockCreated)

      const headers = await getAuthHeader()
      const res = await app.request('/applications', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expense_date: '2024-01-15',
          amount: 5000,
          description: 'Office supplies',
          is_cash_payment: false,
        }),
      })

      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data.id).toBe('new-app')
      expect(appService.create).toHaveBeenCalledWith('user-uuid-1', {
        expense_date: '2024-01-15',
        amount: 5000,
        description: 'Office supplies',
        is_cash_payment: false,
      })
    })

    it('returns 400 on validation error (missing fields)', async () => {
      const headers = await getAuthHeader()
      const res = await app.request('/applications', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 5000 }),
      })

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('PUT /applications/:id', () => {
    it('updates application on success', async () => {
      const mockUpdated = { id: 'app-1', amount: 7000, status: 'DRAFT' }
      appService.update.mockResolvedValue(mockUpdated)

      const headers = await getAuthHeader()
      const res = await app.request('/applications/app-1', {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 7000 }),
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data.amount).toBe(7000)
      expect(appService.update).toHaveBeenCalledWith('app-1', 'user-uuid-1', { amount: 7000 })
    })
  })

  describe('DELETE /applications/:id', () => {
    it('deletes application on success', async () => {
      appService.remove.mockResolvedValue(undefined)

      const headers = await getAuthHeader()
      const res = await app.request('/applications/app-1', {
        method: 'DELETE',
        headers,
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data.message).toBe('Application deleted')
      expect(appService.remove).toHaveBeenCalledWith('app-1', 'user-uuid-1')
    })
  })

  describe('POST /applications/:id/submit', () => {
    it('submits application on success', async () => {
      const mockSubmitted = { id: 'app-1', status: 'SUBMITTED' }
      appService.submit.mockResolvedValue(mockSubmitted)

      const headers = await getAuthHeader()
      const res = await app.request('/applications/app-1/submit', {
        method: 'POST',
        headers,
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data.status).toBe('SUBMITTED')
      expect(appService.submit).toHaveBeenCalledWith('app-1', 'user-uuid-1')
    })
  })

  describe('POST /applications/:id/comments', () => {
    it('adds a comment on success', async () => {
      const mockComment = {
        id: 'comment-1',
        comment: 'Please review',
        commentType: 'GENERAL',
        member: { id: 'user-uuid-1', memberId: 'SPC-0001', name: 'Test' },
      }
      appService.addComment.mockResolvedValue(mockComment)

      const headers = await getAuthHeader()
      const res = await app.request('/applications/app-1/comments', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: 'Please review', comment_type: 'GENERAL' }),
      })

      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data.comment).toBe('Please review')
      expect(appService.addComment).toHaveBeenCalledWith(
        'app-1',
        'user-uuid-1',
        'Please review',
        'GENERAL',
      )
    })
  })

  describe('POST /applications/:id/receipts', () => {
    it('uploads receipt on success', async () => {
      const mockReceipt = {
        id: 'receipt-1',
        fileName: 'receipt.jpg',
        filePath: 'receipts/app-1/abc.jpg',
      }
      receiptService.upload.mockResolvedValue(mockReceipt)

      const headers = await getAuthHeader()
      const formData = new FormData()
      formData.append('file', new File(['fake-content'], 'receipt.jpg', { type: 'image/jpeg' }))

      const res = await app.request('/applications/app-1/receipts', {
        method: 'POST',
        headers,
        body: formData,
      })

      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data.id).toBe('receipt-1')
      expect(receiptService.upload).toHaveBeenCalledWith(
        'app-1',
        'user-uuid-1',
        expect.any(File),
      )
    })

    it('returns 400 when no file provided', async () => {
      const headers = await getAuthHeader()
      const formData = new FormData()

      const res = await app.request('/applications/app-1/receipts', {
        method: 'POST',
        headers,
        body: formData,
      })

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.success).toBe(false)
      expect(body.error.message).toBe('File is required')
    })
  })
})
