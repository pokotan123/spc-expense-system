import type { TokenPayload } from '@spc/shared'
import type { Env } from './config/env.js'
import type { AuditLogFn } from './middleware/audit-logger.js'

export type Variables = {
  user: TokenPayload
  auditLog: AuditLogFn
}

export type AppEnv = {
  Variables: Variables
}

export type { Env }
