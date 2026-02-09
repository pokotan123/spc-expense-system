import type { TokenPayload } from '@spc/shared'
import type { Env } from './config/env.js'

export type Variables = {
  user: TokenPayload
}

export type AppEnv = {
  Variables: Variables
}

export type { Env }
