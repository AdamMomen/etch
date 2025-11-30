import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { healthRouter } from './routes/health'
import { logger, log } from './middleware/logger'

const app = new Hono()

// Global middleware
app.use('*', logger())
app.use(
  '*',
  cors({
    origin: ['http://localhost:5173'],
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  })
)

// Mount routes
app.route('/api', healthRouter)

// Start server
const port = parseInt(process.env.PORT || '3000', 10)

serve({ fetch: app.fetch, port }, (info) => {
  log({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: `Server started on port ${info.port}`,
  })
})

export { app }
