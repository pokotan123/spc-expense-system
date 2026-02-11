import { createMiddleware } from 'hono/factory'
import type { Variables } from '../types.js'
import { createAuditService } from '../services/audit-service.js'

interface AuditLogParams {
  readonly action: string
  readonly entity: string
  readonly entityId?: string
  readonly memberId?: string
  readonly details?: Record<string, unknown>
}

export type AuditLogFn = (params: AuditLogParams) => void

export function auditLogger() {
  const auditService = createAuditService()

  return createMiddleware<{ Variables: Variables & { auditLog: AuditLogFn } }>(
    async (c, next) => {
      const logAudit: AuditLogFn = (params) => {
        const ip =
          c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
          c.req.header('x-real-ip') ??
          'unknown'

        // Fire and forget - don't block the response
        void auditService.log({
          ...params,
          ipAddress: ip,
        })
      }

      c.set('auditLog', logAudit)
      await next()
    },
  )
}
