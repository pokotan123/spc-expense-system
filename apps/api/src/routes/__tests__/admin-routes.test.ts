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

async function getMemberAuthHeader() {
  const token = await signAccessToken(
    { sub: 'user-uuid-1', memberId: 'SPC-0001', role: 'MEMBER' },
    JWT_SECRET,
    '15m',
  )
  return { Authorization: `Bearer ${token}` }
}

// Mock the admin-application-service module
const mockService = {
  list: vi.fn(),
  findById: vi.fn(),
  approve: vi.fn(),
  returnApplication: vi.fn(),
  reject: vi.fn(),
  calculateSubsidy: vi.fn(),
}

vi.mock('../../services/admin-application-service.js', () => ({
  createAdminApplicationService: () => mockService,
}))

// Dynamic import so the mock is applied
const { createAdminApplicationRoutes } = await import('../admin-applications.js')

function createTestApp() {
  const app = new Hono<{ Variables: Variables }>()
  app.onError(errorHandler)
  const authMw = authMiddleware(JWT_SECRET)
  const adminMw = requireAdmin()
  app.route('/admin/applications', createAdminApplicationRoutes(authMw, adminMw))
  return app
}

describe('Admin application routes', () => {
  let app: ReturnType<typeof createTestApp>

  beforeEach(() => {
    vi.clearAllMocks()
    app = createTestApp()
  })

  describe('GET /admin/applications', () => {
    it('returns list for admin users', async () => {
      const mockItems = [
        { id: 'app-1', applicationNumber: 'EA-202401-0001', status: 'SUBMITTED' },
      ]
      mockService.list.mockResolvedValue({
        items: mockItems,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      })

      const headers = await getAuthHeader()
      const res = await app.request('/admin/applications', { headers })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data).toHaveLength(1)
      expect(body.meta.total).toBe(1)
    })

    it('returns 403 for non-admin users', async () => {
      const headers = await getMemberAuthHeader()
      const res = await app.request('/admin/applications', { headers })

      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('FORBIDDEN')
    })
  })

  describe('GET /admin/applications/:id', () => {
    it('returns application detail for admin', async () => {
      const mockApp = { id: 'app-1', applicationNumber: 'EA-202401-0001', status: 'SUBMITTED' }
      mockService.findById.mockResolvedValue(mockApp)

      const headers = await getAuthHeader()
      const res = await app.request('/admin/applications/app-1', { headers })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data.id).toBe('app-1')
    })
  })

  describe('POST /admin/applications/:id/approve', () => {
    it('approves application on success', async () => {
      const mockResult = { id: 'app-1', status: 'APPROVED' }
      mockService.approve.mockResolvedValue(mockResult)

      const headers = await getAuthHeader()
      const res = await app.request('/admin/applications/app-1/approve', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internal_category_id: '550e8400-e29b-41d4-a716-446655440000',
          final_amount: 5000,
          comment: 'Approved',
        }),
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(mockService.approve).toHaveBeenCalledWith({
        applicationId: 'app-1',
        adminId: 'admin-uuid-1',
        internalCategoryId: '550e8400-e29b-41d4-a716-446655440000',
        finalAmount: 5000,
        comment: 'Approved',
      })
    })
  })

  describe('POST /admin/applications/:id/return', () => {
    it('returns application with comment', async () => {
      const mockResult = { id: 'app-1', status: 'RETURNED' }
      mockService.returnApplication.mockResolvedValue(mockResult)

      const headers = await getAuthHeader()
      const res = await app.request('/admin/applications/app-1/return', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: 'Please provide receipt' }),
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data.status).toBe('RETURNED')
      expect(mockService.returnApplication).toHaveBeenCalledWith({
        applicationId: 'app-1',
        adminId: 'admin-uuid-1',
        comment: 'Please provide receipt',
      })
    })

    it('returns 400 when comment is missing', async () => {
      const headers = await getAuthHeader()
      const res = await app.request('/admin/applications/app-1/return', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('POST /admin/applications/:id/reject', () => {
    it('rejects application with comment', async () => {
      const mockResult = { id: 'app-1', status: 'REJECTED' }
      mockService.reject.mockResolvedValue(mockResult)

      const headers = await getAuthHeader()
      const res = await app.request('/admin/applications/app-1/reject', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: 'Duplicate submission' }),
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data.status).toBe('REJECTED')
      expect(mockService.reject).toHaveBeenCalledWith({
        applicationId: 'app-1',
        adminId: 'admin-uuid-1',
        comment: 'Duplicate submission',
      })
    })
  })
})
