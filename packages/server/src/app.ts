import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from '@hono/node-server/serve-static'
import { healthRouter } from './routes/health'
import { roomsRouter } from './routes/rooms'
import { inviteRouter } from './routes/invite'
import { setupRouter } from './routes/setup'
import { logger } from './middleware/logger'
import { rateLimiter } from './middleware/rateLimiter'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = new Hono()

// Allowed origins for CORS
const allowedOrigins = [
  // Production
  'https://etch.momen.earth',
  'https://etch.coolify.momen.earth',
  // Development
  'http://localhost:3000',
  'http://localhost:5173',
  // Tauri desktop app
  'etch://',
  'tauri://localhost',
]

// Global middleware
app.use('*', logger())
app.use(
  '*',
  cors({
    origin: (origin) => {
      // Allow requests with no origin (same-origin, curl, etc.)
      if (!origin) return origin
      // Allow if origin matches or starts with allowed origins
      if (allowedOrigins.some(allowed => origin === allowed || origin.startsWith(allowed))) {
        return origin
      }
      // In development, allow all origins
      if (process.env.NODE_ENV !== 'production') {
        return origin
      }
      return null
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  })
)

// Rate limiting for sensitive endpoints
app.use('/api/rooms', rateLimiter({ limit: 20, windowMs: 60000 })) // 20 requests per minute
app.use('/api/rooms/*/join', rateLimiter({ limit: 10, windowMs: 60000 })) // 10 joins per minute
app.use('/api/setup/*', rateLimiter({ limit: 5, windowMs: 300000 })) // 5 requests per 5 minutes (strict)

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
