import { describe, it, expect, vi, afterEach } from 'vitest'
import { Hono } from 'hono'
import { ZodError, z } from 'zod'
import { HTTPException } from 'hono/http-exception'
import { errorHandler, AppError } from '../error-handler.js'
import { AuthError } from '../../lib/jwt.js'

function createTestApp() {
  const app = new Hono()

  app.get('/zod-error', () => {
    const schema = z.object({
      email: z.string().email(),
      age: z.number().int().min(0),
    })
    schema.parse({ email: 'not-email', age: -1 })
  })

  app.get('/auth-unauthorized', () => {
    throw new AuthError('Token expired', 'UNAUTHORIZED')
  })

  app.get('/auth-forbidden', () => {
    throw new AuthError('Insufficient permissions', 'FORBIDDEN')
  })

  app.get('/app-error', () => {
    throw new AppError('Resource conflict', 'CONFLICT', 409)
  })

  app.get('/http-exception-401', () => {
    throw new HTTPException(401, { message: 'Not authenticated' })
  })

  app.get('/http-exception-404', () => {
    throw new HTTPException(404, { message: 'Not found' })
  })

  app.get('/unknown-error', () => {
    throw new Error('Something broke internally')
  })

  app.onError(errorHandler)

  return app
}

describe('errorHandler', () => {
  const app = createTestApp()

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('handles ZodError with 400 status and VALIDATION_ERROR code', async () => {
    const res = await app.request('/zod-error')
    expect(res.status).toBe(400)

    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(body.error.message).toBe('Validation failed')
    expect(Array.isArray(body.error.details)).toBe(true)
    expect(body.error.details.length).toBeGreaterThan(0)
  })

  it('includes path and message in ZodError details', async () => {
    const res = await app.request('/zod-error')
    const body = await res.json()
    const detail = body.error.details[0]
    expect(detail).toHaveProperty('path')
    expect(detail).toHaveProperty('message')
  })

  it('handles AuthError with UNAUTHORIZED code as 401', async () => {
    const res = await app.request('/auth-unauthorized')
    expect(res.status).toBe(401)

    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('UNAUTHORIZED')
    expect(body.error.message).toBe('Token expired')
  })

  it('handles AuthError with FORBIDDEN code as 403', async () => {
    const res = await app.request('/auth-forbidden')
    expect(res.status).toBe(403)

    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('FORBIDDEN')
    expect(body.error.message).toBe('Insufficient permissions')
  })

  it('handles AppError with custom statusCode', async () => {
    const res = await app.request('/app-error')
    expect(res.status).toBe(409)

    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('CONFLICT')
    expect(body.error.message).toBe('Resource conflict')
  })

  it('handles HTTPException and maps status to error code', async () => {
    const res401 = await app.request('/http-exception-401')
    expect(res401.status).toBe(401)
    const body401 = await res401.json()
    expect(body401.error.code).toBe('UNAUTHORIZED')

    const res404 = await app.request('/http-exception-404')
    expect(res404.status).toBe(404)
    const body404 = await res404.json()
    expect(body404.error.code).toBe('NOT_FOUND')
  })

  it('handles unknown Error with 500 and INTERNAL_ERROR code', async () => {
    const res = await app.request('/unknown-error')
    expect(res.status).toBe(500)

    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('INTERNAL_ERROR')
    expect(body.error.message).toBe('Something broke internally')
  })

  it('masks error message in production mode', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    const res = await app.request('/unknown-error')
    expect(res.status).toBe(500)

    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('INTERNAL_ERROR')
    expect(body.error.message).toBe('An unexpected error occurred')
  })

  it('returns consistent error response format', async () => {
    const res = await app.request('/unknown-error')
    const body = await res.json()

    expect(body).toHaveProperty('success', false)
    expect(body).toHaveProperty('error')
    expect(body.error).toHaveProperty('code')
    expect(body.error).toHaveProperty('message')
    expect(body).not.toHaveProperty('data')
  })
})
