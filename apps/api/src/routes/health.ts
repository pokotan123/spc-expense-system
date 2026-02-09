import { Hono } from 'hono'
import type { ApiResponse } from '@spc/shared'

interface HealthData {
  readonly status: string
  readonly timestamp: string
  readonly uptime: number
}

export const healthRoutes = new Hono()

healthRoutes.get('/', (c) => {
  const body: ApiResponse<HealthData> = {
    success: true,
    data: Object.freeze({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    }),
  }
  return c.json(body)
})
