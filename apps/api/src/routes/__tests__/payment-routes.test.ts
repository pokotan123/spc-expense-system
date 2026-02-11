import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Hono } from 'hono'
import type { Variables } from '../../types.js'
import { authMiddleware } from '../../middleware/auth.js'
import { requireAdmin } from '../../middleware/rbac.js'
import { errorHandler } from '../../middleware/error-handler.js'
import { signAccessToken } from '../../lib/jwt.js'

const JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long'

async function getAuthHeader(role = 'ADMIN') {
  const token = await signAccessToken(
    { sub: 'admin-uuid-1', memberId: 'SPC-ADMIN', role },
    JWT_SECRET,
    '15m',
  )
  return { Authorization: `Bearer ${token}` }
}

// Mock payment-service
const mockPaymentService = {
  listPayments: vi.fn(),
  listApprovedApplicationsReadyForPayment: vi.fn(),
  generateBatch: vi.fn(),
  findPaymentsByBatchId: vi.fn(),
}

// Mock zengin-service
const mockZenginService = {
  generate: vi.fn(),
  encodeToShiftJIS: vi.fn(),
}

vi.mock('../../services/payment-service.js', () => ({
  createPaymentService: () => mockPaymentService,
}))

vi.mock('../../services/zengin-service.js', () => ({
  createZenginService: () => mockZenginService,
}))

const { createAdminPaymentRoutes } = await import('../admin-payments.js')

function createTestApp() {
  const app = new Hono<{ Variables: Variables }>()
  app.onError(errorHandler)
  const authMw = authMiddleware(JWT_SECRET)
  const adminMw = requireAdmin()
  app.route('/admin/payments', createAdminPaymentRoutes(authMw, adminMw))
  return app
}

describe('Payment routes', () => {
  let app: ReturnType<typeof createTestApp>

  beforeEach(() => {
    vi.clearAllMocks()
    app = createTestApp()
  })

  describe('GET /admin/payments', () => {
    it('returns paginated payments list', async () => {
      mockPaymentService.listPayments.mockResolvedValue({
        items: [{ id: 'pay-1', paymentStatus: 'PENDING', batchId: 'BATCH-001' }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      })

      const headers = await getAuthHeader()
      const res = await app.request('/admin/payments', { headers })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data).toHaveLength(1)
      expect(body.meta.total).toBe(1)
    })
  })

  describe('GET /admin/payments/ready', () => {
    it('returns applications ready for payment', async () => {
      const mockApps = [
        { id: 'app-1', applicationNumber: 'EA-001', amount: 5000, finalAmount: 4000 },
      ]
      mockPaymentService.listApprovedApplicationsReadyForPayment.mockResolvedValue(mockApps)

      const headers = await getAuthHeader()
      const res = await app.request('/admin/payments/ready', { headers })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data).toHaveLength(1)
    })
  })

  describe('POST /admin/payments/generate', () => {
    it('generates payment batch on success', async () => {
      mockPaymentService.generateBatch.mockResolvedValue({
        batchId: 'BATCH-20240115-120000',
        paymentCount: 2,
        totalAmount: 10000,
      })

      const headers = await getAuthHeader()
      const res = await app.request('/admin/payments/generate', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_ids: [
            '550e8400-e29b-41d4-a716-446655440000',
            '550e8400-e29b-41d4-a716-446655440001',
          ],
        }),
      })

      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data.batchId).toBe('BATCH-20240115-120000')
      expect(body.data.paymentCount).toBe(2)
    })

    it('returns 400 on validation error (empty array)', async () => {
      const headers = await getAuthHeader()
      const res = await app.request('/admin/payments/generate', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_ids: [] }),
      })

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('GET /admin/payments/:batchId/download', () => {
    it('downloads Zengin format file on success', async () => {
      const mockPayments = [
        {
          id: 'pay-1',
          expenseApplication: {
            finalAmount: { toString: () => '5000' },
            amount: { toString: () => '5000' },
            member: { name: 'Test User' },
          },
        },
      ]
      mockPaymentService.findPaymentsByBatchId.mockResolvedValue(mockPayments)
      mockZenginService.generate.mockReturnValue('zengin-content')
      mockZenginService.encodeToShiftJIS.mockReturnValue(
        Buffer.from('encoded-content'),
      )

      const headers = await getAuthHeader()
      const res = await app.request('/admin/payments/BATCH-001/download', { headers })

      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toBe('application/octet-stream')
      expect(res.headers.get('Content-Disposition')).toContain('BATCH-001.dat')
      expect(mockPaymentService.findPaymentsByBatchId).toHaveBeenCalledWith('BATCH-001')
      expect(mockZenginService.generate).toHaveBeenCalled()
    })

    it('returns 404 when batch has no payments', async () => {
      mockPaymentService.findPaymentsByBatchId.mockResolvedValue([])

      const headers = await getAuthHeader()
      const res = await app.request('/admin/payments/NONEXISTENT/download', { headers })

      expect(res.status).toBe(404)
      const body = await res.json()
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('NOT_FOUND')
    })
  })
})
