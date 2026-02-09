import { createMiddleware } from 'hono/factory'
import type { TokenPayload } from '@spc/shared'
import type { Variables } from '../types.js'
import { verifyAccessToken, AuthError } from '../lib/jwt.js'

const BEARER_PREFIX = 'Bearer '

export function authMiddleware(jwtSecret: string) {
  return createMiddleware<{ Variables: Variables }>(async (c, next) => {
    const authorization = c.req.header('Authorization')
    if (!authorization?.startsWith(BEARER_PREFIX)) {
      throw new AuthError(
        'Missing or invalid Authorization header',
        'UNAUTHORIZED',
      )
    }

    const token = authorization.slice(BEARER_PREFIX.length)
    if (!token) {
      throw new AuthError('Token is required', 'UNAUTHORIZED')
    }

    const payload = await verifyAccessToken(token, jwtSecret)
    c.set('user', payload)

    await next()
  })
}

export function getUser(c: { get: (key: 'user') => TokenPayload | undefined }): TokenPayload {
  const user = c.get('user')
  if (!user) {
    throw new AuthError('Not authenticated', 'UNAUTHORIZED')
  }
  return user
}
