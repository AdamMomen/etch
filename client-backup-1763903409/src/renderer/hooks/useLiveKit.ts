import { useState, useEffect, useCallback } from 'react';
import { Room, RoomEvent, RemoteParticipant, LocalParticipant, DataPacket_Kind, RemoteTrack } from 'livekit-client';

export interface LiveKitState {
  room: Room | null;
  isConnected: boolean;
  participants: RemoteParticipant[];
  localParticipant: LocalParticipant | null;
  error: string | null;
}

export interface UseLiveKitReturn extends LiveKitState {
  connect: (url: string, token: string) => Promise<void>;
  disconnect: () => void;
  publishDataTrack: (data: Uint8Array, kind?: DataPacket_Kind) => Promise<void>;
}

export function useLiveKit(): UseLiveKitReturn {
  const [state, setState] = useState<LiveKitState>({
    room: null,
    isConnected: false,
    participants: [],
    localParticipant: null,
    error: null,
  });

  const connect = useCallback(async (url: string, token: string) => {
    try {
      const { Room } = await import('livekit-client');
      const room = new Room();

      room.on(RoomEvent.Connected, () => {
        setState((prev) => ({
          ...prev,
          isConnected: true,
          localParticipant: room.localParticipant,
          error: null,
        }));
      });

      room.on(RoomEvent.Disconnected, () => {
        setState({
          room: null,
          isConnected: false,
          participants: [],
          localParticipant: null,
          error: null,
        });
      });

      room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        setState((prev) => ({
          ...prev,
          participants: Array.from(room.remoteParticipants.values()),
        }));
      });

      room.on(RoomEvent.ParticipantDisconnected, () => {
        setState((prev) => ({
          ...prev,
          participants: Array.from(room.remoteParticipants.values()),
        }));
      });

      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        // Handle track subscriptions
      });

      await room.connect(url, token);
      setState({
        room,
        isConnected: true,
        participants: Array.from(room.remoteParticipants.values()),
        localParticipant: room.localParticipant,
        error: null,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to connect',
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    if (state.room) {
      state.room.disconnect();
    }
  }, [state.room]);

  const publishDataTrack = useCallback(
    async (data: Uint8Array, kind: DataPacket_Kind = DataPacket_Kind.RELIABLE) => {
      if (!state.room || !state.isConnected) {
        throw new Error('Not connected to room');
      }
      await state.room.localParticipant.publishData(data, kind);
    },
    [state.room, state.isConnected]
  );

  return {
    ...state,
    connect,
    disconnect,
    publishDataTrack,
  };
}

