import 'dotenv/config'
import { serve } from '@hono/node-server'
import { app } from './app'
import { log } from './middleware/logger'

// Only start server if this file is run directly (not imported for testing)
const isMainModule = process.env.NODE_ENV !== 'test'

if (isMainModule) {
  const port = parseInt(process.env.PORT || '3000', 10)

  serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, (info) => {
    log({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Server started on http://0.0.0.0:${info.port}`,
    })
  })
}

// Re-export app for backwards compatibility
export { app }
