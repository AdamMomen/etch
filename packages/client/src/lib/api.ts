import type { CreateRoomResponse, JoinRoomResponse } from '@etch/shared'

/**
 * Validates and returns the API base URL.
 * Defense in depth: ensures URL is well-formed before making requests.
 */
function getValidatedApiBaseUrl(): string {
  const url = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

  try {
    // Validate URL is well-formed
    const parsed = new URL(url)

    // Only allow http/https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      console.error(`Invalid API URL protocol: ${parsed.protocol}`)
      return 'http://localhost:3000/api'
    }

    // Remove trailing slash for consistency
    return url.replace(/\/$/, '')
  } catch {
    console.error(`Invalid API URL: ${url}`)
    return 'http://localhost:3000/api'
  }
}

const API_BASE_URL = getValidatedApiBaseUrl()

export async function createRoom(hostName: string): Promise<CreateRoomResponse> {
  const response = await fetch(`${API_BASE_URL}/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hostName }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to create room')
  }

  return response.json()
}

export async function joinRoom(
  roomId: string,
  participantName: string
): Promise<JoinRoomResponse> {
  const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ participantName }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to join room')
  }

  return response.json()
}
