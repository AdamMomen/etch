import { Hono } from 'hono'

const healthRouter = new Hono()

healthRouter.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: Date.now(),
  })
})

export { healthRouter }
