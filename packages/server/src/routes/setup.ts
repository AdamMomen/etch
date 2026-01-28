import { Hono } from 'hono'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const setupRouter = new Hono()

/**
 * Get setup status and API credentials (first-time setup only)
 * This endpoint allows admins to retrieve auto-generated LiveKit credentials
 * on first deployment.
 */
setupRouter.get('/status', async (c) => {
  try {
    // Check for credentials in environment variables first (docker-compose mode)
    const envApiKey = process.env.LIVEKIT_API_KEY
    const envApiSecret = process.env.LIVEKIT_API_SECRET

    if (envApiKey && envApiSecret) {
      // Credentials from environment variables (Coolify/docker-compose)
      return c.json({
        isFirstTimeSetup: false,
        configured: true,
        publicUrls: {
          appUrl: process.env.APP_URL,
          livekitUrl: process.env.LIVEKIT_URL,
        },
        message: 'LiveKit is configured via environment variables.',
      })
    }

    // Fall back to config file (unified Dockerfile mode)
    const configPath = process.env.CONFIG_PATH || '/livekit-config/api-keys.env'

    if (!existsSync(configPath)) {
      return c.json(
        {
          isFirstTimeSetup: true,
          error:
            'Configuration not found. Set LIVEKIT_API_KEY and LIVEKIT_API_SECRET environment variables.',
          message: 'LiveKit credentials are not configured.',
        },
        503
      )
    }

    // Read the API keys from file
    const configContent = await readFile(configPath, 'utf-8')
    const lines = configContent.split('\n')

    const config: Record<string, string> = {}
    lines.forEach((line) => {
      const [key, ...valueParts] = line.split('=')
      if (key && valueParts.length > 0) {
        config[key.trim()] = valueParts.join('=').trim()
      }
    })

    return c.json({
      isFirstTimeSetup: false,
      credentials: {
        apiKey: config.LIVEKIT_API_KEY,
        apiSecret: config.LIVEKIT_API_SECRET,
        wsUrl: process.env.LIVEKIT_WS_URL || 'ws://livekit:7880',
        httpUrl: process.env.LIVEKIT_HTTP_URL || 'http://livekit:7880',
      },
      publicUrls: {
        appUrl: process.env.APP_URL,
        livekitUrl:
          process.env.LIVEKIT_PUBLIC_URL || 'Set this in environment variables',
      },
      message:
        'Store these credentials securely. You will need them for administration.',
      warnings: [
        'Keep your API secret safe - it grants full access to LiveKit',
        'If using externally, configure LIVEKIT_PUBLIC_URL in your environment',
        'Consider setting up authentication for this endpoint in production',
      ],
    })
  } catch (error) {
    console.error('Error reading setup config:', error)
    return c.json(
      {
        error: 'Failed to read configuration',
        message: error instanceof Error ? error.message : 'Unknown error',
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
