import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { healthRoutes } from '../health.js'

function createTestApp() {
  const app = new Hono()
  app.route('/api/health', healthRoutes)
  app.notFound((c) =>
    c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } }, 404),
  )
  return app
}

describe('Health routes', () => {
  const app = createTestApp()

  it('GET /api/health returns 200 with status ok', async () => {
    const res = await app.request('/api/health')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.status).toBe('ok')
    expect(body.data.timestamp).toBeDefined()
    expect(typeof body.data.uptime).toBe('number')
  })

  it('Unknown route returns 404', async () => {
    const res = await app.request('/api/unknown')
    expect(res.status).toBe(404)

    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('NOT_FOUND')
  })
})
