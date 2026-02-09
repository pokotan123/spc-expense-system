import { createMiddleware } from 'hono/factory'

export function securityHeaders() {
  return createMiddleware(async (c, next) => {
    await next()

    c.header('X-Content-Type-Options', 'nosniff')
    c.header('X-Frame-Options', 'DENY')
    c.header('X-XSS-Protection', '1; mode=block')
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    c.header(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains',
    )
    c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    c.header(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self'",
        "connect-src 'self'",
        "frame-ancestors 'none'",
      ].join('; '),
    )
  })
}
