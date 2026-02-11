import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { securityHeaders } from '../security-headers.js'

function createTestApp() {
  const app = new Hono()
  app.use('/*', securityHeaders())
  app.get('/test', (c) => c.json({ success: true }))
  return app
}

describe('securityHeaders', () => {
  const app = createTestApp()

  it('sets X-Content-Type-Options to nosniff', async () => {
    const res = await app.request('/test')
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
  })

  it('sets X-Frame-Options to DENY', async () => {
    const res = await app.request('/test')
    expect(res.headers.get('X-Frame-Options')).toBe('DENY')
  })

  it('sets X-XSS-Protection to 1; mode=block', async () => {
    const res = await app.request('/test')
    expect(res.headers.get('X-XSS-Protection')).toBe('1; mode=block')
  })

  it('sets Referrer-Policy to strict-origin-when-cross-origin', async () => {
    const res = await app.request('/test')
    expect(res.headers.get('Referrer-Policy')).toBe(
      'strict-origin-when-cross-origin',
    )
  })

  it('sets Strict-Transport-Security with max-age and includeSubDomains', async () => {
    const res = await app.request('/test')
    expect(res.headers.get('Strict-Transport-Security')).toBe(
      'max-age=31536000; includeSubDomains',
    )
  })

  it('sets Permissions-Policy to deny camera, microphone, and geolocation', async () => {
    const res = await app.request('/test')
    expect(res.headers.get('Permissions-Policy')).toBe(
      'camera=(), microphone=(), geolocation=()',
    )
  })

  it('sets Content-Security-Policy with required directives', async () => {
    const res = await app.request('/test')
    const csp = res.headers.get('Content-Security-Policy')
    expect(csp).toBeTruthy()
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("script-src 'self'")
    expect(csp).toContain("style-src 'self' 'unsafe-inline'")
    expect(csp).toContain("img-src 'self' data: blob:")
    expect(csp).toContain("font-src 'self'")
    expect(csp).toContain("connect-src 'self'")
    expect(csp).toContain("frame-ancestors 'none'")
  })
})
