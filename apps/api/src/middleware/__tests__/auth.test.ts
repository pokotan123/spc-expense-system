import { describe, it, expect, beforeAll } from 'vitest'
import { Hono } from 'hono'
import { authMiddleware, getUser } from '../auth.js'
import { signAccessToken, AuthError } from '../../lib/jwt.js'
import { errorHandler } from '../error-handler.js'

const JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long'

function createTestApp() {
  const app = new Hono()

  app.onError(errorHandler)

  app.use('/protected/*', authMiddleware(JWT_SECRET))

  app.get('/protected/data', (c) => {
    const user = getUser(c)
    return c.json({ success: true, data: { userId: user.sub, role: user.role } })
  })

  app.get('/public/health', (c) => {
    return c.json({ success: true })
  })

  return app
}

describe('authMiddleware', () => {
  const app = createTestApp()

  it('returns 401 when no Authorization header', async () => {
    const res = await app.request('/protected/data')
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('UNAUTHORIZED')
  })

  it('returns 401 when Authorization header has no Bearer prefix', async () => {
    const res = await app.request('/protected/data', {
      headers: { Authorization: 'Basic some-token' },
    })
    expect(res.status).toBe(401)
  })

  it('returns 401 when Bearer token is empty', async () => {
    const res = await app.request('/protected/data', {
      headers: { Authorization: 'Bearer ' },
    })
    expect(res.status).toBe(401)
  })

  it('returns 401 when token is invalid', async () => {
    const res = await app.request('/protected/data', {
      headers: { Authorization: 'Bearer invalid.token.here' },
    })
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error.code).toBe('INVALID_TOKEN')
  })

  it('sets user context when token is valid', async () => {
    const token = await signAccessToken(
      { sub: 'user-uuid-1', memberId: 'SPC-0001', role: 'MEMBER' },
      JWT_SECRET,
      '15m',
    )

    const res = await app.request('/protected/data', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.userId).toBe('user-uuid-1')
    expect(body.data.role).toBe('MEMBER')
  })

  it('does not require auth for public endpoints', async () => {
    const res = await app.request('/public/health')
    expect(res.status).toBe(200)
  })

  it('returns 401 for expired token', async () => {
    const token = await signAccessToken(
      { sub: 'user-uuid-1', memberId: 'SPC-0001', role: 'MEMBER' },
      JWT_SECRET,
      '1s',
    )

    await new Promise((resolve) => setTimeout(resolve, 1500))

    const res = await app.request('/protected/data', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error.code).toBe('TOKEN_EXPIRED')
  })
})

describe('getUser', () => {
  it('throws AuthError when user is not set', () => {
    const mockContext = {
      get: (_key: 'user') => undefined,
    }
    expect(() => getUser(mockContext)).toThrow(AuthError)
  })

  it('returns user when set in context', () => {
    const mockUser = {
      sub: 'uuid-1',
      memberId: 'SPC-0001',
      role: 'MEMBER',
      iat: Date.now(),
      exp: Date.now() + 900,
    }
    const mockContext = {
      get: (_key: 'user') => mockUser,
    }
    const result = getUser(mockContext)
    expect(result).toEqual(mockUser)
  })
})
