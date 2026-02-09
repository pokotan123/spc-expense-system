import { serve } from '@hono/node-server'
import { createApp } from './app.js'

const { app, env } = createApp()

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  process.stdout.write(
    `SPC API server running on http://localhost:${info.port} [${env.NODE_ENV}]\n`,
  )
})
