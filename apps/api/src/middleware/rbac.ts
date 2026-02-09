import { createMiddleware } from 'hono/factory'
import type { MemberRole } from '@spc/shared'
import { MEMBER_ROLES } from '@spc/shared'
import type { Variables } from '../types.js'
import { AuthError } from '../lib/jwt.js'

export function requireRole(...roles: readonly MemberRole[]) {
  return createMiddleware<{ Variables: Variables }>(async (c, next) => {
    const user = c.get('user')
    if (!user) {
      throw new AuthError('Authentication required', 'UNAUTHORIZED')
    }

    if (!roles.includes(user.role as MemberRole)) {
      throw new AuthError(
        `Role ${user.role} is not authorized for this resource`,
        'FORBIDDEN',
      )
    }

    await next()
  })
}

export function requireAdmin() {
  return requireRole(MEMBER_ROLES.ADMIN)
}
