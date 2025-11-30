import type { MiddlewareHandler } from 'hono'

interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error'
  message: string
  method?: string
  path?: string
  status?: number
  duration?: number
}

function log(entry: LogEntry): void {
  console.log(JSON.stringify(entry))
}

export function logger(): MiddlewareHandler {
  return async (c, next) => {
    const start = Date.now()
    const method = c.req.method
    const path = c.req.path

    log({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Incoming request',
      method,
      path,
    })

    await next()

    const duration = Date.now() - start
    const status = c.res.status

    log({
      timestamp: new Date().toISOString(),
      level: status >= 400 ? 'error' : 'info',
      message: 'Request completed',
      method,
      path,
      status,
      duration,
    })
  }
}

export { log }
