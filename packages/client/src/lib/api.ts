import type { CreateRoomResponse, JoinRoomResponse } from '@nameless/shared'

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

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
