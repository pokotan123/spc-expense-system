import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import type { Variables } from './types.js'
import { loadEnv } from './config/env.js'
import { errorHandler } from './middleware/error-handler.js'
import { securityHeaders } from './middleware/security-headers.js'
import { rateLimit } from './middleware/rate-limit.js'
import { authMiddleware } from './middleware/auth.js'
import { createAuthService } from './services/auth-service.js'
import { createApplicationService } from './services/application-service.js'
import { createReceiptService } from './services/receipt-service.js'
import { createOcrService } from './services/ocr-service.js'
import { createStorageService } from './services/storage-service.js'
import { requireAdmin } from './middleware/rbac.js'
import { auditLogger } from './middleware/audit-logger.js'
import { createAuthRoutes } from './routes/auth.js'
import { createApplicationRoutes } from './routes/applications.js'
import { createReceiptRoutes } from './routes/receipts.js'
import { createAdminApplicationRoutes } from './routes/admin-applications.js'
import { createAdminCategoryRoutes } from './routes/admin-categories.js'
import { createAdminPaymentRoutes } from './routes/admin-payments.js'
import { createAdminAuditRoutes } from './routes/admin-audit.js'
import { healthRoutes } from './routes/health.js'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export function createApp() {
  const env = loadEnv()

  const app = new Hono<{ Variables: Variables }>()

  // Global middleware
  app.use('*', logger())
  app.use('*', securityHeaders())
  app.use(
    '*',
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  )

  // Audit logging
  app.use('/api/*', auditLogger())

  // Rate limiting: stricter for auth endpoints, general for API
  app.use('/api/auth/*', rateLimit({ windowMs: 60 * 1000, maxRequests: 10 }))
  app.use('/api/*', rateLimit({ windowMs: 60 * 1000, maxRequests: 100 }))

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
  const ocrService = createOcrService()

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
  app.route(
    '/api/receipts',
    createReceiptRoutes(receiptService, ocrService, authMw),
  )

  // Local file serving (when S3 is not configured)
  if (!env.S3_ENDPOINT) {
    app.get('/api/uploads/*', authMw, async (c) => {
      const key = c.req.path.replace('/api/uploads/', '')
      try {
        const filePath = join(process.cwd(), 'uploads', key)
        const buffer = await readFile(filePath)
        const ext = key.split('.').pop() ?? ''
        const mimeMap: Record<string, string> = {
          jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
          webp: 'image/webp', pdf: 'application/pdf',
        }
        return c.body(buffer, 200, {
          'Content-Type': mimeMap[ext] ?? 'application/octet-stream',
          'Cache-Control': 'private, max-age=3600',
        })
      } catch {
        return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'File not found' } }, 404)
      }
    })
  }

  // Admin routes
  app.route('/api/admin/applications', createAdminApplicationRoutes(authMw, adminMw))
  app.route('/api/admin/categories', createAdminCategoryRoutes(authMw, adminMw))
  app.route('/api/admin/payments', createAdminPaymentRoutes(authMw, adminMw))
  app.route('/api/admin/audit', createAdminAuditRoutes(authMw, adminMw))

  return { app, env }
}
