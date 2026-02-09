import { createMiddleware } from 'hono/factory'

interface RateLimitConfig {
  readonly windowMs: number
  readonly maxRequests: number
}

interface RateLimitEntry {
  count: number
  resetAt: number
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 30,
}

/**
 * Simple in-memory rate limiter.
 * For production, replace with Redis-backed solution.
 */
export function rateLimit(config: Partial<RateLimitConfig> = {}) {
  const { windowMs, maxRequests } = { ...DEFAULT_CONFIG, ...config }
  const store = new Map<string, RateLimitEntry>()

  // Periodic cleanup to prevent memory growth
  const cleanupInterval = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) {
        store.delete(key)
      }
    }
  }, windowMs)

  // Allow GC to clean up if the process exits
  if (cleanupInterval.unref) {
    cleanupInterval.unref()
  }

  return createMiddleware(async (c, next) => {
    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
      c.req.header('x-real-ip') ??
      'unknown'

    const now = Date.now()
    const existing = store.get(ip)

    if (!existing || existing.resetAt <= now) {
      store.set(ip, { count: 1, resetAt: now + windowMs })
      c.header('X-RateLimit-Limit', String(maxRequests))
      c.header('X-RateLimit-Remaining', String(maxRequests - 1))
      await next()
      return
    }

    const updatedCount = existing.count + 1
    store.set(ip, { count: updatedCount, resetAt: existing.resetAt })

    const remaining = Math.max(0, maxRequests - updatedCount)
    c.header('X-RateLimit-Limit', String(maxRequests))
    c.header('X-RateLimit-Remaining', String(remaining))
    c.header(
      'X-RateLimit-Reset',
      String(Math.ceil(existing.resetAt / 1000)),
    )

    if (updatedCount > maxRequests) {
      const retryAfter = Math.ceil((existing.resetAt - now) / 1000)
      c.header('Retry-After', String(retryAfter))
      return c.json(
        Object.freeze({
          success: false,
          error: Object.freeze({
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
          }),
        }),
        429,
      )
    }

    await next()
  })
}
