import { Hono } from 'hono'
import { z } from 'zod'
import { loginSchema, type ApiResponse } from '@spc/shared'
import type { Variables } from '../types.js'
import type { AuthService } from '../services/auth-service.js'
import { getUser } from '../middleware/auth.js'

const refreshSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
})

const logoutSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
})

interface LoginResponseData {
  readonly access_token: string
  readonly refresh_token: string
  readonly token_type: string
  readonly member: {
    readonly id: string
    readonly memberId: string
    readonly name: string
    readonly email: string
    readonly role: string
    readonly departmentId: string | null
  }
}

interface RefreshResponseData {
  readonly access_token: string
  readonly refresh_token: string
  readonly token_type: string
}

export function createAuthRoutes(
  authService: AuthService,
  authMiddlewareFn: ReturnType<typeof import('../middleware/auth.js').authMiddleware>,
) {
  const routes = new Hono<{ Variables: Variables }>()

  // POST /auth/login
  routes.post('/login', async (c) => {
    const raw = await c.req.json()
    const input = loginSchema.parse(raw)

    const result = await authService.login(input.member_id, input.password)

    const body: ApiResponse<LoginResponseData> = {
      success: true,
      data: Object.freeze({
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
        token_type: 'Bearer',
        member: result.member,
      }),
    }
    return c.json(body)
  })

  // POST /auth/refresh
  routes.post('/refresh', async (c) => {
    const raw = await c.req.json()
    const input = refreshSchema.parse(raw)

    const result = await authService.refreshAccessToken(input.refresh_token)

    const body: ApiResponse<RefreshResponseData> = {
      success: true,
      data: Object.freeze({
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
        token_type: 'Bearer',
      }),
    }
    return c.json(body)
  })

  // POST /auth/logout
  routes.post('/logout', async (c) => {
    const raw = await c.req.json()
    const input = logoutSchema.parse(raw)

    await authService.logout(input.refresh_token)

    const body: ApiResponse<{ readonly message: string }> = {
      success: true,
      data: Object.freeze({ message: 'Logged out successfully' }),
    }
    return c.json(body)
  })

  // GET /auth/me (requires auth)
  routes.get('/me', authMiddlewareFn, async (c) => {
    const user = getUser(c)

    const { createMemberService } = await import(
      '../services/member-service.js'
    )
    const memberService = createMemberService()
    const member = await memberService.findById(user.sub)

    const body: ApiResponse<typeof member> = {
      success: true,
      data: member,
    }
    return c.json(body)
  })

  return routes
}
