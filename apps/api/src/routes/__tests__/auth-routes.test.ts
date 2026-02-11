import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Hono } from 'hono'
import type { Variables } from '../../types.js'
import { authMiddleware } from '../../middleware/auth.js'
import { errorHandler } from '../../middleware/error-handler.js'
import { signAccessToken, AuthError } from '../../lib/jwt.js'
import { createAuthRoutes } from '../auth.js'

const JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long'

async function getAuthHeader(role = 'MEMBER') {
  const token = await signAccessToken(
    { sub: 'user-uuid-1', memberId: 'SPC-0001', role },
    JWT_SECRET,
    '15m',
  )
  return { Authorization: `Bearer ${token}` }
}

// Mock the member-service dynamic import used by GET /auth/me
vi.mock('../../services/member-service.js', () => ({
  createMemberService: () => ({
    findById: vi.fn().mockResolvedValue({
      id: 'user-uuid-1',
      memberId: 'SPC-0001',
      name: 'Test User',
      email: 'test@example.com',
      role: 'MEMBER',
      isActive: true,
      departmentId: null,
      department: null,
    }),
  }),
}))

function createMockAuthService() {
  return {
    login: vi.fn(),
    refreshAccessToken: vi.fn(),
    logout: vi.fn(),
    logoutAll: vi.fn(),
  }
}

function createTestApp(authService: ReturnType<typeof createMockAuthService>) {
  const app = new Hono<{ Variables: Variables }>()
  app.onError(errorHandler)
  const authMw = authMiddleware(JWT_SECRET)
  app.route('/auth', createAuthRoutes(authService, authMw))
  return app
}

describe('Auth routes', () => {
  let authService: ReturnType<typeof createMockAuthService>
  let app: ReturnType<typeof createTestApp>

  beforeEach(() => {
    vi.clearAllMocks()
    authService = createMockAuthService()
    app = createTestApp(authService)
  })

  describe('POST /auth/login', () => {
    it('returns tokens and member on success', async () => {
      authService.login.mockResolvedValue({
        accessToken: 'access-tok',
        refreshToken: 'refresh-tok',
        member: {
          id: 'user-uuid-1',
          memberId: 'SPC-0001',
          name: 'Test User',
          email: 'test@example.com',
          role: 'MEMBER',
          departmentId: null,
        },
      })

      const res = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: 'SPC-0001', password: 'password123' }),
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data.access_token).toBe('access-tok')
      expect(body.data.refresh_token).toBe('refresh-tok')
      expect(body.data.token_type).toBe('Bearer')
      expect(body.data.member.memberId).toBe('SPC-0001')
      expect(authService.login).toHaveBeenCalledWith('SPC-0001', 'password123')
    })

    it('returns 400 on validation error (missing password)', async () => {
      const res = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: 'SPC-0001' }),
      })

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })

    it('returns 401 on invalid credentials', async () => {
      authService.login.mockRejectedValue(
        new AuthError('Invalid credentials', 'INVALID_CREDENTIALS'),
      )

      const res = await app.request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: 'SPC-0001', password: 'wrongpassword' }),
      })

      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('INVALID_CREDENTIALS')
    })
  })

  describe('POST /auth/refresh', () => {
    it('returns new tokens on success', async () => {
      authService.refreshAccessToken.mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      })

      const res = await app.request('/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: 'old-refresh-token' }),
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data.access_token).toBe('new-access')
      expect(body.data.refresh_token).toBe('new-refresh')
      expect(authService.refreshAccessToken).toHaveBeenCalledWith('old-refresh-token')
    })

    it('returns 400 when refresh_token is missing', async () => {
      const res = await app.request('/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('POST /auth/logout', () => {
    it('returns success on logout', async () => {
      authService.logout.mockResolvedValue(undefined)

      const res = await app.request('/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: 'some-refresh-token' }),
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data.message).toBe('Logged out successfully')
      expect(authService.logout).toHaveBeenCalledWith('some-refresh-token')
    })
  })

  describe('GET /auth/me', () => {
    it('returns member info with valid token', async () => {
      const headers = await getAuthHeader()

      const res = await app.request('/auth/me', { headers })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data.memberId).toBe('SPC-0001')
    })

    it('returns 401 without Authorization header', async () => {
      const res = await app.request('/auth/me')

      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.success).toBe(false)
    })
  })
})
