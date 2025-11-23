import "dotenv/config";
import { AccessToken } from "livekit-server-sdk";
import { UserRole } from "@nameless/shared";

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "";
const LIVEKIT_URL = process.env.LIVEKIT_URL || "ws://localhost:7880";

if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
  console.warn("Warning: LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set");
}

export interface TokenOptions {
  roomName: string;
  participantName: string;
  role: UserRole;
}

/**
 * Generate a LiveKit access token for a participant
 */
export async function generateToken(options: TokenOptions): Promise<string> {
  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    throw new Error("LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set");
  }

  const { roomName, participantName, role } = options;

  const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: participantName,
  });

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  // Add role metadata to token
  token.metadata = JSON.stringify({ role });

  return await token.toJwt();
}

export function getLiveKitUrl(): string {
  return LIVEKIT_URL;
}
