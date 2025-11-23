import { UserRole } from '@nameless/shared';

export interface RoomData {
  id: string;
  name?: string;
  createdAt: number;
  participants: Map<string, ParticipantData>;
}

export interface ParticipantData {
  id: string;
  role: UserRole;
  joinedAt: number;
}

class RoomService {
  private rooms: Map<string, RoomData> = new Map();

  /**
   * Create a new room
   */
  createRoom(name?: string): RoomData {
    const roomId = this.generateRoomId();
    const room: RoomData = {
      id: roomId,
      name,
      createdAt: Date.now(),
      participants: new Map(),
    };

    this.rooms.set(roomId, room);
    return room;
  }

  /**
   * Get room by ID
   */
  getRoom(roomId: string): RoomData | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Join a room and assign role
   */
  joinRoom(roomId: string, participantId: string): { room: RoomData; role: UserRole } | null {
    const room = this.rooms.get(roomId);
    if (!room) {
      return null;
    }

    // Determine role: first user = host, others = annotator (will be updated if they share screen)
    const isFirstUser = room.participants.size === 0;
    const role: UserRole = isFirstUser ? 'host' : 'annotator';

    const participant: ParticipantData = {
      id: participantId,
      role,
      joinedAt: Date.now(),
    };

    room.participants.set(participantId, participant);
    return { room, role };
  }

  /**
   * Update participant role (e.g., when they start sharing screen)
   */
  updateParticipantRole(roomId: string, participantId: string, role: UserRole): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      return false;
    }

    const participant = room.participants.get(participantId);
    if (!participant) {
      return false;
    }

    participant.role = role;
    return true;
  }

  /**
   * Remove participant from room
   */
  leaveRoom(roomId: string, participantId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      return;
    }

    room.participants.delete(participantId);

    // Clean up empty rooms
    if (room.participants.size === 0) {
      this.rooms.delete(roomId);
    }
  }

  /**
   * Generate a unique room ID
   */
  private generateRoomId(): string {
    return Math.random().toString(36).substring(2, 9);
  }
}

export const roomService = new RoomService();

