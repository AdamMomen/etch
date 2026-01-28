import type { Context, Next } from 'hono'

interface RateLimitOptions {
  /** Maximum requests allowed in the window */
  limit: number
  /** Time window in milliseconds */
  windowMs: number
  /** Key generator function (defaults to IP-based) */
  keyGenerator?: (c: Context) => string
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store for rate limiting
// Note: Resets on server restart. For distributed/persistent limiting, use Redis.
const store = new Map<string, RateLimitEntry>()

// Cleanup old entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (entry.resetTime < now) {
      store.delete(key)
    }
  }
}, 5 * 60 * 1000)

/**
 * Extract client IP from request headers (handles proxies)
 */
function getClientIp(c: Context): string {
  // CloudFlare
  const cfIp = c.req.header('cf-connecting-ip')
  if (cfIp) return cfIp

  // X-Forwarded-For (first IP is the client)
  const xff = c.req.header('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()

  // X-Real-IP
  const realIp = c.req.header('x-real-ip')
  if (realIp) return realIp

  // Fallback (won't work behind proxy)
  return 'unknown'
}

/**
 * Clear the rate limit store (for testing)
 */
export function clearRateLimitStore() {
  store.clear()
}

/**
 * Rate limiting middleware for Hono
 *
 * @param options - Rate limit configuration
 * @returns Hono middleware function
 */
export function rateLimiter(options: RateLimitOptions) {
  const { limit, windowMs, keyGenerator } = options

  return async (c: Context, next: Next) => {
    // Skip rate limiting in test environment (unless testing rate limiter itself)
    if (process.env.NODE_ENV === 'test' && !c.req.header('x-forwarded-for') && !c.req.header('cf-connecting-ip')) {
      await next()
      return
    }

    const key = keyGenerator ? keyGenerator(c) : getClientIp(c)
    const now = Date.now()

    let entry = store.get(key)

    // Create new entry or reset if window expired
    if (!entry || entry.resetTime < now) {
      entry = {
        count: 0,
        resetTime: now + windowMs,
      }
    }

    entry.count++
    store.set(key, entry)

    // Set rate limit headers
    const remaining = Math.max(0, limit - entry.count)
    const resetSeconds = Math.ceil((entry.resetTime - now) / 1000)

    c.header('X-RateLimit-Limit', limit.toString())
    c.header('X-RateLimit-Remaining', remaining.toString())
    c.header('X-RateLimit-Reset', resetSeconds.toString())

    // Check if limit exceeded
    if (entry.count > limit) {
      c.header('Retry-After', resetSeconds.toString())
      return c.json(
        {
          error: 'Too many requests',
          message: `Rate limit exceeded. Try again in ${resetSeconds} seconds.`,
          retryAfter: resetSeconds,
        },
        429
      )
    }

    await next()
  }
}
