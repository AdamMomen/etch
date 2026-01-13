import type { CreateRoomResponse, JoinRoomResponse } from '@etch/shared'
import { useSettingsStore } from '@/stores/settingsStore'

/**
 * Validates and returns the API base URL.
 * Defense in depth: ensures URL is well-formed before making requests.
 *
 * Now uses runtime configuration from settingsStore to support production builds.
 * Fallback order:
 * 1. User-configured URL from settingsStore
 * 2. Build-time VITE_API_URL env var
 * 3. Default localhost
 */
function getValidatedApiBaseUrl(): string {
  // Get runtime config from settingsStore
  const runtimeUrl = useSettingsStore.getState().apiBaseUrl

  // Fallback: build-time env var, then localhost
  const url =
    runtimeUrl || import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

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

/**
 * Validates that a room exists before attempting to join.
 * Fast, lightweight check to provide early feedback to users.
 *
 * @param roomId - The room ID to validate
 * @returns Promise that resolves to true if room exists, false otherwise
 * @throws Error if validation check fails (network error, server error)
 */
export async function validateRoomExists(roomId: string): Promise<boolean> {
  const apiBaseUrl = getValidatedApiBaseUrl()

  console.log('[Auth] Validating room existence:', {
    roomId,
    apiBaseUrl,
    timestamp: new Date().toISOString(),
  })

  try {
    const response = await fetch(`${apiBaseUrl}/rooms/${roomId}/exists`, {
      method: 'GET',
    })

    console.log('[Auth] Room validation response:', {
      roomId,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    })

    if (!response.ok) {
      console.error('[Auth] Room validation failed:', {
        roomId,
        status: response.status,
      })
      // For validation errors, throw so caller can handle
      throw new Error('Failed to validate room existence')
    }

    const data = await response.json()
    const exists = data.exists === true

    console.log('[Auth] Room validation result:', { roomId, exists })

    return exists
  } catch (error) {
    console.error('[Auth] Room validation error:', { roomId, error })

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(
        'Cannot connect to server. Please check your network connection and API Server URL in Settings.'
      )
    }

    throw error
  }
}

export async function createRoom(
  hostName: string
): Promise<CreateRoomResponse> {
  // Get API URL dynamically to support runtime config changes
  const apiBaseUrl = getValidatedApiBaseUrl()

  console.log('[Auth] Creating room:', {
    hostName,
    apiBaseUrl,
    timestamp: new Date().toISOString(),
  })

  try {
    const response = await fetch(`${apiBaseUrl}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostName }),
    })

    console.log('[Auth] Create room response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('[Auth] Create room failed:', error)

      // Provide helpful error messages based on status code
      if (response.status === 404) {
        throw new Error(
          'API server not found. Please check the API Server URL in Settings.'
        )
      } else if (response.status >= 500) {
        throw new Error('Server error. Please try again or contact support.')
      }

      throw new Error(error.error?.message || 'Failed to create room')
    }

    const data = await response.json()
    console.log('[Auth] Room created successfully:', {
      roomId: data.roomId,
      hasToken: !!data.token,
      hasScreenShareToken: !!data.screenShareToken,
      livekitUrl: data.livekitUrl,
    })

    return data
  } catch (error) {
    console.error('[Auth] Create room error:', error)

    // Handle network errors (fetch throws TypeError for network failures)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(
        'Cannot connect to server. Please check your network connection and API Server URL in Settings.'
      )
    }

    throw error
  }
}

export async function joinRoom(
  roomId: string,
  participantName: string
): Promise<JoinRoomResponse> {
  // Get API URL dynamically to support runtime config changes
  const apiBaseUrl = getValidatedApiBaseUrl()

  console.log('[Auth] Joining room:', {
    roomId,
    participantName,
    apiBaseUrl,
    timestamp: new Date().toISOString(),
  })

  try {
    const response = await fetch(`${apiBaseUrl}/rooms/${roomId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantName }),
    })

    console.log('[Auth] Join room response:', {
      roomId,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('[Auth] Join room failed:', { roomId, error })

      // Provide helpful error messages based on status code
      if (response.status === 404) {
        if (error.error?.code === 'ROOM_NOT_FOUND') {
          throw new Error(
            'This room does not exist or has ended. Please check the room code.'
          )
        }
        throw new Error(
          'API server not found. Please check the API Server URL in Settings.'
        )
      } else if (response.status >= 500) {
        throw new Error('Server error. Please try again or contact support.')
      }

      throw new Error(error.error?.message || 'Failed to join room')
    }

    const data = await response.json()
    console.log('[Auth] Joined room successfully:', {
      roomId,
      hasToken: !!data.token,
      hasScreenShareToken: !!data.screenShareToken,
      livekitUrl: data.livekitUrl,
    })

    return data
  } catch (error) {
    console.error('[Auth] Join room error:', { roomId, error })

    // Handle network errors (fetch throws TypeError for network failures)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(
        'Cannot connect to server. Please check your network connection and API Server URL in Settings.'
      )
    }

    throw error
  }
}
