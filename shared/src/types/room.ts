/**
 * Room Types for NAMELESS
 */

import { UserRole } from './roles';

export interface Room {
  id: string;
  name?: string;
  createdAt: number;
  participants: Participant[];
}

export interface Participant {
  id: string;
  role: UserRole;
  joinedAt: number;
}

export interface CreateRoomRequest {
  name?: string;
}

export interface CreateRoomResponse {
  roomId: string;
  token: string;
}

export interface JoinRoomRequest {
  roomId: string;
}

export interface JoinRoomResponse {
  token: string;
  role: UserRole;
}

