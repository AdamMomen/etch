import { Hono } from 'hono'
import { existsSync } from 'fs'

const setupRouter = new Hono()

/**
 * Get setup status (configuration check only)
 *
 * SECURITY: This endpoint never exposes API secrets.
 * Admins must retrieve credentials via secure channels (env vars, container access, etc.)
 */
setupRouter.get('/status', async (c) => {
  try {
    // Check for credentials in environment variables first (docker-compose mode)
    const envApiKey = process.env.LIVEKIT_API_KEY
    const envApiSecret = process.env.LIVEKIT_API_SECRET

    if (envApiKey && envApiSecret) {
      // Credentials configured via environment variables (Coolify/docker-compose)
      return c.json({
        isFirstTimeSetup: false,
        configured: true,
        publicUrls: {
          appUrl: process.env.APP_URL,
          livekitUrl: process.env.LIVEKIT_URL,
        },
        message: 'LiveKit is configured and ready.',
      })
    }

    // Fall back to config file check (unified Dockerfile mode)
    const configPath = process.env.CONFIG_PATH || '/livekit-config/api-keys.env'

    if (!existsSync(configPath)) {
      return c.json(
        {
          isFirstTimeSetup: true,
          configured: false,
          error:
            'Configuration not found. Set LIVEKIT_API_KEY and LIVEKIT_API_SECRET environment variables.',
          message: 'LiveKit credentials are not configured.',
        },
        503
      )
    }

    // Config file exists - system is configured
    // SECURITY: Never expose credentials via API. Admins should access via SSH/container.
    return c.json({
      isFirstTimeSetup: false,
      configured: true,
      publicUrls: {
        appUrl: process.env.APP_URL,
        livekitUrl:
          process.env.LIVEKIT_PUBLIC_URL || process.env.LIVEKIT_URL,
      },
      message: 'LiveKit is configured. Access credentials via environment variables or container.',
    })
  } catch (error) {
    console.error('Error checking setup config:', error)
    return c.json(
      {
        error: 'Failed to check configuration',
        // Don't expose error details in production
        message: process.env.NODE_ENV === 'production'
          ? 'Configuration check failed'
          : error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})

/**
 * Health check for the setup endpoint
 */
setupRouter.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'setup' })
})

export { setupRouter }
