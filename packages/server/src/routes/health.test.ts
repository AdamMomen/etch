import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { healthRouter } from './health'

describe('Health Endpoint', () => {
  const app = new Hono()
  app.route('/api', healthRouter)

  it('should return 200 status', async () => {
    const res = await app.request('/api/health')
    expect(res.status).toBe(200)
  })

  it('should return correct JSON format', async () => {
    const res = await app.request('/api/health')
    const body = await res.json()

    expect(body).toHaveProperty('status', 'ok')
    expect(body).toHaveProperty('timestamp')
  })

  it('should return a valid timestamp number', async () => {
    const before = Date.now()
    const res = await app.request('/api/health')
    const after = Date.now()
    const body = await res.json()

    expect(typeof body.timestamp).toBe('number')
    expect(body.timestamp).toBeGreaterThanOrEqual(before)
    expect(body.timestamp).toBeLessThanOrEqual(after)
  })
})
