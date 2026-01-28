import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Hono } from 'hono'
import { rateLimiter } from './rateLimiter'

describe('rateLimiter middleware', () => {
  let app: Hono

  beforeEach(() => {
    app = new Hono()
    // Clear any module state by creating fresh app each test
  })

  it('should allow requests under the limit', async () => {
    app.use('*', rateLimiter({ limit: 5, windowMs: 60000 }))
    app.get('/test', (c) => c.json({ ok: true }))

    const res = await app.request('/test', {
      headers: { 'x-forwarded-for': '192.168.1.1' },
    })

    expect(res.status).toBe(200)
    expect(res.headers.get('X-RateLimit-Limit')).toBe('5')
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('4')
  })

  it('should block requests over the limit with 429', async () => {
    app.use('*', rateLimiter({ limit: 3, windowMs: 60000 }))
    app.get('/test', (c) => c.json({ ok: true }))

    const ip = '192.168.1.100' // Unique IP for this test

    // Make requests up to and over the limit
    for (let i = 0; i < 3; i++) {
      const res = await app.request('/test', {
        headers: { 'x-forwarded-for': ip },
      })
      expect(res.status).toBe(200)
    }

    // 4th request should be blocked
    const blocked = await app.request('/test', {
      headers: { 'x-forwarded-for': ip },
    })

    expect(blocked.status).toBe(429)
    const body = await blocked.json()
    expect(body.error).toBe('Too many requests')
    expect(blocked.headers.get('Retry-After')).toBeDefined()
  })

  it('should track different IPs separately', async () => {
    app.use('*', rateLimiter({ limit: 2, windowMs: 60000 }))
    app.get('/test', (c) => c.json({ ok: true }))

    // IP 1 makes 2 requests (at limit)
    for (let i = 0; i < 2; i++) {
      const res = await app.request('/test', {
        headers: { 'x-forwarded-for': '10.0.0.1' },
      })
      expect(res.status).toBe(200)
    }

    // IP 1 is now blocked
    const blocked = await app.request('/test', {
      headers: { 'x-forwarded-for': '10.0.0.1' },
    })
    expect(blocked.status).toBe(429)

    // IP 2 should still be allowed
    const allowed = await app.request('/test', {
      headers: { 'x-forwarded-for': '10.0.0.2' },
    })
    expect(allowed.status).toBe(200)
  })

  it('should use cf-connecting-ip header when available', async () => {
    app.use('*', rateLimiter({ limit: 2, windowMs: 60000 }))
    app.get('/test', (c) => c.json({ ok: true }))

    const cfIp = '203.0.113.50'

    // Make requests using CloudFlare IP header
    for (let i = 0; i < 2; i++) {
      const res = await app.request('/test', {
        headers: { 'cf-connecting-ip': cfIp },
      })
      expect(res.status).toBe(200)
    }

    // 3rd request should be blocked
    const blocked = await app.request('/test', {
      headers: { 'cf-connecting-ip': cfIp },
    })
    expect(blocked.status).toBe(429)
  })

  it('should return correct rate limit headers', async () => {
    app.use('*', rateLimiter({ limit: 10, windowMs: 60000 }))
    app.get('/test', (c) => c.json({ ok: true }))

    const res = await app.request('/test', {
      headers: { 'x-forwarded-for': '172.16.0.1' },
    })

    expect(res.headers.get('X-RateLimit-Limit')).toBe('10')
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('9')
    expect(res.headers.get('X-RateLimit-Reset')).toBeDefined()

    const resetSeconds = parseInt(res.headers.get('X-RateLimit-Reset') || '0')
    expect(resetSeconds).toBeGreaterThan(0)
    expect(resetSeconds).toBeLessThanOrEqual(60)
  })

  it('should support custom key generator', async () => {
    // Rate limit by a custom header instead of IP
    app.use(
      '*',
      rateLimiter({
        limit: 2,
        windowMs: 60000,
        keyGenerator: (c) => c.req.header('x-api-key') || 'anonymous',
      })
    )
    app.get('/test', (c) => c.json({ ok: true }))

    // Same API key from different IPs should share limit
    for (let i = 0; i < 2; i++) {
      const res = await app.request('/test', {
        headers: {
          'x-api-key': 'shared-key',
          'x-forwarded-for': `192.168.${i}.1`,
        },
      })
      expect(res.status).toBe(200)
    }

    // 3rd request with same key should be blocked
    const blocked = await app.request('/test', {
      headers: {
        'x-api-key': 'shared-key',
        'x-forwarded-for': '192.168.99.1',
      },
    })
    expect(blocked.status).toBe(429)

    // Different API key should be allowed
    const allowed = await app.request('/test', {
      headers: {
        'x-api-key': 'different-key',
        'x-forwarded-for': '192.168.99.1',
      },
    })
    expect(allowed.status).toBe(200)
  })
})
