import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import type { Variables } from './types.js'
import { loadEnv } from './config/env.js'
import { errorHandler } from './middleware/error-handler.js'
import { authMiddleware } from './middleware/auth.js'
import { createAuthService } from './services/auth-service.js'
import { createApplicationService } from './services/application-service.js'
import { createReceiptService } from './services/receipt-service.js'
import { createStorageService } from './services/storage-service.js'
import { requireAdmin } from './middleware/rbac.js'
import { createAuthRoutes } from './routes/auth.js'
import { createApplicationRoutes } from './routes/applications.js'
import { createAdminApplicationRoutes } from './routes/admin-applications.js'
import { createAdminCategoryRoutes } from './routes/admin-categories.js'
import { createAdminPaymentRoutes } from './routes/admin-payments.js'
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
  const storageService = createStorageService(env)
  const applicationService = createApplicationService()
  const receiptService = createReceiptService(storageService)

  // Auth middleware factory (for protected routes)
  const authMw = authMiddleware(env.JWT_SECRET)
  const adminMw = requireAdmin()

  // Routes
  app.route('/api/health', healthRoutes)
  app.route('/api/auth', createAuthRoutes(authService, authMw))
  app.route(
    '/api/applications',
    createApplicationRoutes(applicationService, receiptService, authMw),
  )

  // Admin routes
  app.route('/api/admin/applications', createAdminApplicationRoutes(authMw, adminMw))
  app.route('/api/admin/categories', createAdminCategoryRoutes(authMw, adminMw))
  app.route('/api/admin/payments', createAdminPaymentRoutes(authMw, adminMw))

  return { app, env }
}
