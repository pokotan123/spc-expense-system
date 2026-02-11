import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { rateLimit } from '../rate-limit.js'

function createTestApp(maxRequests = 3, windowMs = 1000) {
  const app = new Hono()
  app.use('/*', rateLimit({ windowMs, maxRequests }))
  app.get('/test', (c) => c.json({ success: true }))
  return app
}

describe('rateLimit', () => {
  it('sets X-RateLimit-Limit header', async () => {
    const app = createTestApp(5)
    const res = await app.request('/test')
    expect(res.status).toBe(200)
    expect(res.headers.get('X-RateLimit-Limit')).toBe('5')
  })

  it('sets X-RateLimit-Remaining header that decrements', async () => {
    const app = createTestApp(5)

    const res1 = await app.request('/test')
    expect(res1.headers.get('X-RateLimit-Remaining')).toBe('4')

    const res2 = await app.request('/test')
    expect(res2.headers.get('X-RateLimit-Remaining')).toBe('3')

    const res3 = await app.request('/test')
    expect(res3.headers.get('X-RateLimit-Remaining')).toBe('2')
  })

  it('returns 429 when limit is exceeded', async () => {
    const app = createTestApp(2)

    await app.request('/test')
    await app.request('/test')
    const res3 = await app.request('/test')

    expect(res3.status).toBe(429)
    const body = await res3.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED')
  })

  it('sets Retry-After header on 429 response', async () => {
    const app = createTestApp(1)

    await app.request('/test')
    const res = await app.request('/test')

    expect(res.status).toBe(429)
    const retryAfter = res.headers.get('Retry-After')
    expect(retryAfter).toBeTruthy()
    expect(Number(retryAfter)).toBeGreaterThan(0)
  })

  it('tracks different IPs separately', async () => {
    const app = createTestApp(1)

    const res1 = await app.request('/test', {
      headers: { 'x-forwarded-for': '1.1.1.1' },
    })
    expect(res1.status).toBe(200)

    const res2 = await app.request('/test', {
      headers: { 'x-forwarded-for': '2.2.2.2' },
    })
    expect(res2.status).toBe(200)

    const res3 = await app.request('/test', {
      headers: { 'x-forwarded-for': '1.1.1.1' },
    })
    expect(res3.status).toBe(429)
  })

  it('reads IP from x-forwarded-for header (first value)', async () => {
    const app = createTestApp(1)

    await app.request('/test', {
      headers: { 'x-forwarded-for': '10.0.0.1, 10.0.0.2' },
    })

    const res = await app.request('/test', {
      headers: { 'x-forwarded-for': '10.0.0.1, 10.0.0.3' },
    })
    expect(res.status).toBe(429)
  })

  it('reads IP from x-real-ip header when x-forwarded-for is absent', async () => {
    const app = createTestApp(1)

    await app.request('/test', {
      headers: { 'x-real-ip': '192.168.1.1' },
    })

    const res = await app.request('/test', {
      headers: { 'x-real-ip': '192.168.1.1' },
    })
    expect(res.status).toBe(429)

    const resOther = await app.request('/test', {
      headers: { 'x-real-ip': '192.168.1.2' },
    })
    expect(resOther.status).toBe(200)
  })

  it('resets count after window expires', async () => {
    const app = createTestApp(1, 200)

    const res1 = await app.request('/test')
    expect(res1.status).toBe(200)

    const res2 = await app.request('/test')
    expect(res2.status).toBe(429)

    await new Promise((resolve) => setTimeout(resolve, 300))

    const res3 = await app.request('/test')
    expect(res3.status).toBe(200)
  })
})
