const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';

export interface CreateRoomResponse {
  roomId: string;
  token: string;
}

export interface JoinRoomResponse {
  token: string;
  role: string;
}

export interface LiveKitUrlResponse {
  url: string;
}

/**
 * Create a new room
 */
export async function createRoom(name?: string): Promise<CreateRoomResponse> {
  const response = await fetch(`${API_BASE_URL}/api/rooms/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    throw new Error('Failed to create room');
  }

  return response.json();
}

/**
 * Join an existing room
 */
export async function joinRoom(roomId: string): Promise<JoinRoomResponse> {
  const response = await fetch(`${API_BASE_URL}/api/rooms/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ roomId }),
  });

  if (!response.ok) {
    throw new Error('Failed to join room');
  }

  return response.json();
}

/**
 * Get LiveKit URL
 */
export async function getLiveKitUrl(): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/rooms/livekit-url`);
  if (!response.ok) {
    throw new Error('Failed to get LiveKit URL');
  }
  const data: LiveKitUrlResponse = await response.json();
  return data.url;
}

