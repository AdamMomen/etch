import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import {
  Room,
  RoomEvent,
  RemoteParticipant,
  LocalParticipant,
  RemoteTrack,
} from "livekit-client";

export interface LiveKitState {
  room: Room | null;
  isConnected: boolean;
  participants: RemoteParticipant[];
  localParticipant: LocalParticipant | null;
  error: string | null;
}

interface LiveKitContextType extends LiveKitState {
  connect: (url: string, token: string) => Promise<void>;
  disconnect: () => void;
  publishData: (data: Uint8Array) => Promise<void>;
}

const LiveKitContext = createContext<LiveKitContextType | undefined>(undefined);

export function LiveKitProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LiveKitState>({
    room: null,
    isConnected: false,
    participants: [],
    localParticipant: null,
    error: null,
  });

  const connect = useCallback(async (url: string, token: string) => {
    try {
      const { Room } = await import("livekit-client");
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

      room.on(
        RoomEvent.ParticipantConnected,
        (_participant: RemoteParticipant) => {
          setState((prev) => ({
            ...prev,
            participants: Array.from(room.remoteParticipants.values()),
          }));
        }
      );

      room.on(RoomEvent.ParticipantDisconnected, () => {
        setState((prev) => ({
          ...prev,
          participants: Array.from(room.remoteParticipants.values()),
        }));
      });

      room.on(RoomEvent.TrackSubscribed, (_track: RemoteTrack) => {
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
        error: error instanceof Error ? error.message : "Failed to connect",
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    if (state.room) {
      state.room.disconnect();
    }
  }, [state.room]);

  const publishData = useCallback(
    async (data: Uint8Array) => {
      if (!state.room || !state.isConnected) {
        throw new Error("Not connected to room");
      }
      await state.room.localParticipant.publishData(data);
    },
    [state.room, state.isConnected]
  );

  return (
    <LiveKitContext.Provider
      value={{
        ...state,
        connect,
        disconnect,
        publishData,
      }}
    >
      {children}
    </LiveKitContext.Provider>
  );
}

export function useLiveKit(): LiveKitContextType {
  const context = useContext(LiveKitContext);
  if (context === undefined) {
    throw new Error("useLiveKit must be used within a LiveKitProvider");
  }
  return context;
}
