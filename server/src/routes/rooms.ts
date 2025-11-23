import { Router } from "express";
import { generateToken, getLiveKitUrl } from "../services/livekitService";
import { roomService } from "../services/roomService";
import {
  CreateRoomRequest,
  CreateRoomResponse,
  JoinRoomRequest,
  JoinRoomResponse,
} from "@nameless/shared";

const router = Router();

/**
 * Create a new room
 */
router.post("/create", async (req, res) => {
  try {
    const { name } = req.body as CreateRoomRequest;
    const room = roomService.createRoom(name);

    // Generate participant ID (in real app, this would come from auth)
    const participantId = `user-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}`;
    const joinResult = roomService.joinRoom(room.id, participantId);

    if (!joinResult) {
      return res.status(500).json({ error: "Failed to join room" });
    }

    const token = await generateToken({
      roomName: room.id,
      participantName: participantId,
      role: joinResult.role,
    });

    const response: CreateRoomResponse = {
      roomId: room.id,
      token,
    };

    res.json(response);
  } catch (error) {
    console.error("Error creating room:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create room";
    res.status(500).json({ error: errorMessage });
  }
});

/**
 * Join an existing room
 */
router.post("/join", async (req, res) => {
  try {
    const { roomId } = req.body as JoinRoomRequest;

    if (!roomId) {
      return res.status(400).json({ error: "roomId is required" });
    }

    const room = roomService.getRoom(roomId);
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    // Generate participant ID (in real app, this would come from auth)
    const participantId = `user-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}`;
    const joinResult = roomService.joinRoom(roomId, participantId);

    if (!joinResult) {
      return res.status(500).json({ error: "Failed to join room" });
    }

    const token = await generateToken({
      roomName: roomId,
      participantName: participantId,
      role: joinResult.role,
    });

    const response: JoinRoomResponse = {
      token,
      role: joinResult.role,
    };

    res.json(response);
  } catch (error) {
    console.error("Error joining room:", error);
    res.status(500).json({ error: "Failed to join room" });
  }
});

/**
 * Get LiveKit URL
 */
router.get("/livekit-url", (req, res) => {
  res.json({ url: getLiveKitUrl() });
});

export default router;
