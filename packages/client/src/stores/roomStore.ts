import { create } from 'zustand'
import type { Participant } from '@nameless/shared'

export interface RoomInfo {
  roomId: string
  token: string
  livekitUrl: string
}

export interface ConnectionStateUpdate {
  isConnecting?: boolean
  isConnected?: boolean
  error?: string | null
}

interface RoomState {
  // Room info
  currentRoom: RoomInfo | null

  // Connection state
  isConnecting: boolean
  isConnected: boolean
  connectionError: string | null

  // Participants
  localParticipant: Participant | null
  remoteParticipants: Participant[]

  // Room actions
  setCurrentRoom: (room: RoomInfo | null) => void
  clearRoom: () => void

  // Connection actions
  setConnectionState: (state: ConnectionStateUpdate) => void

  // Participant actions
  setLocalParticipant: (participant: Participant | null) => void
  setRemoteParticipants: (participants: Participant[]) => void
  addRemoteParticipant: (participant: Participant) => void
  removeRemoteParticipant: (participantId: string) => void
  updateParticipant: (participantId: string, updates: Partial<Participant>) => void
  clearParticipants: () => void
}

const initialState = {
  currentRoom: null,
  isConnecting: false,
  isConnected: false,
  connectionError: null,
  localParticipant: null,
  remoteParticipants: [],
}

export const useRoomStore = create<RoomState>((set) => ({
  ...initialState,

  setCurrentRoom: (room) => set({ currentRoom: room }),

  clearRoom: () => set(initialState),

  setConnectionState: (state) =>
    set((prev) => ({
      isConnecting: state.isConnecting ?? prev.isConnecting,
      isConnected: state.isConnected ?? prev.isConnected,
      connectionError: state.error !== undefined ? state.error : prev.connectionError,
    })),

  setLocalParticipant: (participant) => set({ localParticipant: participant }),

  setRemoteParticipants: (participants) => set({ remoteParticipants: participants }),

  addRemoteParticipant: (participant) =>
    set((state) => {
      // Avoid duplicates
      if (state.remoteParticipants.some((p) => p.id === participant.id)) {
        return state
      }
      return {
        remoteParticipants: [...state.remoteParticipants, participant],
      }
    }),

  removeRemoteParticipant: (participantId) =>
    set((state) => ({
      remoteParticipants: state.remoteParticipants.filter((p) => p.id !== participantId),
    })),

  updateParticipant: (participantId, updates) =>
    set((state) => {
      // Update local participant if matches
      if (state.localParticipant?.id === participantId) {
        return {
          localParticipant: { ...state.localParticipant, ...updates },
        }
      }

      // Update remote participant
      return {
        remoteParticipants: state.remoteParticipants.map((p) =>
          p.id === participantId ? { ...p, ...updates } : p
        ),
      }
    }),

  clearParticipants: () =>
    set({
      localParticipant: null,
      remoteParticipants: [],
    }),
}))
