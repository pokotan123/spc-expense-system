import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import type { Variables } from './types.js'
import { loadEnv } from './config/env.js'
import { errorHandler } from './middleware/error-handler.js'
import { authMiddleware } from './middleware/auth.js'
import { createAuthService } from './services/auth-service.js'
import { createAuthRoutes } from './routes/auth.js'
import { healthRoutes } from './routes/health.js'

export function createApp() {
  const env = loadEnv()

  const app = new Hono<{ Variables: Variables }>()

  // Global middleware
  app.use('*', logger())
  app.use(
    '*',
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  )

  // Global error handler
  app.onError(errorHandler)

  // 404 handler
  app.notFound((c) =>
    c.json(
      Object.freeze({
        success: false,
        error: Object.freeze({
          code: 'NOT_FOUND',
          message: 'Route not found',
        }),
      }),
      404,
    ),
  )

  // Services
  const authService = createAuthService(env)

  // Auth middleware factory (for protected routes)
  const authMw = authMiddleware(env.JWT_SECRET)

  // Routes
  app.route('/api/health', healthRoutes)
  app.route('/api/auth', createAuthRoutes(authService, authMw))

  return { app, env }
}
