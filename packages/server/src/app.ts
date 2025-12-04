import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { healthRouter } from './routes/health'
import { roomsRouter } from './routes/rooms'
import { inviteRouter } from './routes/invite'
import { logger } from './middleware/logger'

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
app.route('/api/rooms', roomsRouter)
app.route('/join', inviteRouter)

export { app }
