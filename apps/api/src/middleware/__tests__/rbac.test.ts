import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { authMiddleware } from '../auth.js'
import { requireRole, requireAdmin } from '../rbac.js'
import { signAccessToken } from '../../lib/jwt.js'
import { errorHandler } from '../error-handler.js'

const JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long'

function createTestApp() {
  const app = new Hono()

  app.onError(errorHandler)

  app.use('/api/*', authMiddleware(JWT_SECRET))

  app.get('/api/admin/data', requireAdmin(), (c) => {
    return c.json({ success: true, data: 'admin-only' })
  })

  app.get('/api/member/data', requireRole('MEMBER', 'ADMIN'), (c) => {
    return c.json({ success: true, data: 'member-or-admin' })
  })

  return app
}

async function createToken(role: string) {
  return signAccessToken(
    { sub: 'user-uuid-1', memberId: 'SPC-0001', role },
    JWT_SECRET,
    '15m',
  )
}

describe('requireRole', () => {
  const app = createTestApp()

  it('allows access for correct role (MEMBER accessing member endpoint)', async () => {
    const token = await createToken('MEMBER')
    const res = await app.request('/api/member/data', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toBe('member-or-admin')
  })

  it('allows access for ADMIN on member endpoint', async () => {
    const token = await createToken('ADMIN')
    const res = await app.request('/api/member/data', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
  })

  it('returns 403 for MEMBER accessing admin-only endpoint', async () => {
    const token = await createToken('MEMBER')
    const res = await app.request('/api/admin/data', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error.code).toBe('FORBIDDEN')
  })
})

describe('requireAdmin', () => {
  const app = createTestApp()

  it('allows ADMIN access', async () => {
    const token = await createToken('ADMIN')
    const res = await app.request('/api/admin/data', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toBe('admin-only')
  })

  it('rejects MEMBER with 403', async () => {
    const token = await createToken('MEMBER')
    const res = await app.request('/api/admin/data', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(403)
  })

  it('returns 401 without auth token', async () => {
    const res = await app.request('/api/admin/data')
    expect(res.status).toBe(401)
  })
})
