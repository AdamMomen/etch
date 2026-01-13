import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from '@hono/node-server/serve-static'
import { healthRouter } from './routes/health'
import { roomsRouter } from './routes/rooms'
import { inviteRouter } from './routes/invite'
import { setupRouter } from './routes/setup'
import { logger } from './middleware/logger'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = new Hono()

// Global middleware
app.use('*', logger())
app.use(
  '*',
  cors({
    // Allow all origins in development for local network access
    origin: '*', //(origin) => origin || '*',
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  })
)

// Mount routes
app.route('/api', healthRouter)
app.route('/api/rooms', roomsRouter)
app.route('/api/setup', setupRouter)
app.route('/join', inviteRouter)

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  // Path to client dist directory
  const clientDistPath = path.join(__dirname, '../../client/dist')

  // Serve static assets (JS, CSS, images, etc.)
  app.use('/*', serveStatic({ root: clientDistPath }))

  // SPA fallback - serve index.html for all non-API routes
  app.get('*', serveStatic({ path: path.join(clientDistPath, 'index.html') }))
}

export { app }
