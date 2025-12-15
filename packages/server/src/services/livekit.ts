import { AccessToken } from 'livekit-server-sdk'
import type { Role } from '@nameless/shared'
import { TOKEN_EXPIRY_SECONDS } from '@nameless/shared'

/**
 * Configuration for LiveKit from environment variables.
 */
export interface LiveKitConfig {
  apiKey: string
  apiSecret: string
  url: string
}

/**
 * Gets LiveKit configuration from environment variables.
 * Throws an error if required variables are not set.
 *
 * @returns The LiveKit configuration
 * @throws Error if LIVEKIT_API_KEY or LIVEKIT_API_SECRET is not set
 */
export function getLiveKitConfig(): LiveKitConfig {
  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET
  const url = process.env.LIVEKIT_URL ?? 'ws://localhost:7880'

  if (!apiKey) {
    throw new Error('LIVEKIT_API_KEY environment variable is not set')
  }

  if (!apiSecret) {
    throw new Error('LIVEKIT_API_SECRET environment variable is not set')
  }

  return { apiKey, apiSecret, url }
}

/**
 * Generates a LiveKit JWT token for a participant.
 *
 * @param roomId - The room ID to grant access to
 * @param participantId - The unique identifier for the participant (UUID)
 * @param name - The display name of the participant
 * @param role - The role of the participant ('host', 'sharer', 'annotator', 'viewer')
 * @param color - The hex color assigned to the participant
 * @returns A promise that resolves to the JWT token string
 */
export async function generateToken(
  roomId: string,
  participantId: string,
  name: string,
  role: Role,
  color: string
): Promise<string> {
  const { apiKey, apiSecret } = getLiveKitConfig()

  // Create token with identity and name
  const token = new AccessToken(apiKey, apiSecret, {
    identity: participantId,
    name: name,
    metadata: JSON.stringify({ role, color }),
    ttl: TOKEN_EXPIRY_SECONDS,
  })

  // Add room grants
  token.addGrant({
    room: roomId,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  })

  return await token.toJwt()
}

/**
 * Generates a LiveKit JWT token for screen share (separate identity).
 *
 * This token has a different identity (participantId-screenshare) so it can
 * connect separately from the main participant connection. This allows the
 * native Core process to publish screen share while WebView handles other tracks.
 *
 * @param roomId - The room ID to grant access to
 * @param participantId - The unique identifier for the main participant
 * @param name - The display name of the participant
 * @returns A promise that resolves to the JWT token string
 */
export async function generateScreenShareToken(
  roomId: string,
  participantId: string,
  name: string
): Promise<string> {
  const { apiKey, apiSecret } = getLiveKitConfig()

  // Create token with separate identity for screen share
  const screenShareIdentity = `${participantId}-screenshare`
  const token = new AccessToken(apiKey, apiSecret, {
    identity: screenShareIdentity,
    name: `${name} (Screen)`,
    metadata: JSON.stringify({ role: 'screenshare', parentId: participantId, isScreenShare: true }),
    ttl: TOKEN_EXPIRY_SECONDS,
  })

  // Add room grants - only publish screen share, subscribe to nothing
  token.addGrant({
    room: roomId,
    roomJoin: true,
    canPublish: true,
    canSubscribe: false, // Screen share connection doesn't need to subscribe
    canPublishData: false,
  })

  return await token.toJwt()
}

/**
 * Gets the LiveKit WebSocket URL.
 *
 * @returns The LiveKit URL from environment or default
 */
export function getLiveKitUrl(): string {
  return process.env.LIVEKIT_URL ?? 'ws://localhost:7880'
}
