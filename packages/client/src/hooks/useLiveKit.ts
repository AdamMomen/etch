import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Room,
  RoomEvent,
  ConnectionState,
  RemoteParticipant,
  RemoteTrackPublication,
  Track,
  Participant as LKParticipant,
} from 'livekit-client'
import { toast } from 'sonner'
import { useRoomStore } from '@/stores/roomStore'
import { parseParticipantMetadata } from '@/utils/participantMetadata'
import type { Participant } from '@nameless/shared'

export interface UseLiveKitOptions {
  token: string | null
  livekitUrl: string | null
}

export interface UseLiveKitReturn {
  room: Room | null
  connectionState: ConnectionState
  isConnecting: boolean
  isConnected: boolean
  error: string | null
  retry: () => void
}

export function useLiveKit({ token, livekitUrl }: UseLiveKitOptions): UseLiveKitReturn {
  const roomRef = useRef<Room | null>(null)
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected)
  const [error, setError] = useState<string | null>(null)
  const retryCounterRef = useRef(0)
  const [retryTrigger, setRetryTrigger] = useState(0)

  const {
    setConnectionState: setStoreConnectionState,
    setLocalParticipant,
    addRemoteParticipant,
    removeRemoteParticipant,
    updateParticipant,
    clearParticipants,
  } = useRoomStore()

  const isConnecting = connectionState === ConnectionState.Connecting
  const isConnected = connectionState === ConnectionState.Connected

  // Initialize room only once
  if (!roomRef.current) {
    roomRef.current = new Room()
  }
  const room = roomRef.current

  const convertLKParticipant = useCallback((lkParticipant: LKParticipant, isLocal: boolean): Participant => {
    const metadata = parseParticipantMetadata(lkParticipant.metadata || '')
    return {
      id: lkParticipant.identity,
      name: lkParticipant.name || lkParticipant.identity,
      role: metadata.role,
      color: metadata.color,
      isLocal,
    }
  }, [])

  // Effect for managing connection
  useEffect(() => {
    if (!token || !livekitUrl) return

    let cancelled = false

    const handleConnectionStateChange = (state: ConnectionState) => {
      if (cancelled) return
      setConnectionState(state)
      setStoreConnectionState({
        isConnecting: state === ConnectionState.Connecting,
        isConnected: state === ConnectionState.Connected,
        error: state === ConnectionState.Disconnected ? error : null,
      })
    }

    const handleParticipantConnected = (participant: RemoteParticipant) => {
      if (cancelled) return
      const converted = convertLKParticipant(participant, false)
      addRemoteParticipant(converted)
      toast.info(`${converted.name} joined`)
    }

    const handleParticipantDisconnected = (participant: RemoteParticipant) => {
      if (cancelled) return
      const name = participant.name || participant.identity
      removeRemoteParticipant(participant.identity)
      toast.info(`${name} left`)
    }

    // Handle remote track subscription - update hasVideo state
    const handleTrackSubscribed = (
      track: Track,
      _publication: RemoteTrackPublication,
      participant: RemoteParticipant
    ) => {
      if (cancelled) return

      if (track.kind === Track.Kind.Video && track.source === Track.Source.Camera) {
        updateParticipant(participant.identity, { hasVideo: true })
      }
    }

    // Handle remote track unsubscription
    const handleTrackUnsubscribed = (
      track: Track,
      _publication: RemoteTrackPublication,
      participant: RemoteParticipant
    ) => {
      if (cancelled) return

      if (track.kind === Track.Kind.Video && track.source === Track.Source.Camera) {
        updateParticipant(participant.identity, { hasVideo: false })
      }
    }

    // Handle speaking detection changes
    const handleActiveSpeakersChanged = (speakers: LKParticipant[]) => {
      if (cancelled) return

      // Get all participant IDs that are currently speaking
      const speakingIds = new Set(speakers.map((s) => s.identity))

      // Update all remote participants
      room.remoteParticipants.forEach((participant) => {
        const isSpeaking = speakingIds.has(participant.identity)
        updateParticipant(participant.identity, { isSpeaking })
      })

      // Update local participant if in speakers list
      if (room.localParticipant) {
        const isSpeaking = speakingIds.has(room.localParticipant.identity)
        updateParticipant(room.localParticipant.identity, { isSpeaking })
      }
    }

    // Set up event listeners
    room.on(RoomEvent.ConnectionStateChanged, handleConnectionStateChange)
    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected)
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
    room.on(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakersChanged)

    // Async connection logic
    const connect = async () => {
      setError(null)
      setStoreConnectionState({ isConnecting: true, isConnected: false, error: null })

      try {
        await room.connect(livekitUrl, token)

        if (cancelled) return

        // Set local participant after successful connection
        const localParticipant = convertLKParticipant(room.localParticipant, true)
        setLocalParticipant(localParticipant)

        // Add existing remote participants
        room.remoteParticipants.forEach((participant) => {
          const converted = convertLKParticipant(participant, false)
          addRemoteParticipant(converted)
        })
      } catch (err) {
        if (cancelled) return

        const errorMessage = err instanceof Error ? err.message : 'Failed to connect to LiveKit'
        setError(errorMessage)
        setStoreConnectionState({ isConnecting: false, isConnected: false, error: errorMessage })
        toast.error('Failed to connect', {
          description: 'Check your connection and try again',
        })
      }
    }

    connect()

    return () => {
      cancelled = true
      room.off(RoomEvent.ConnectionStateChanged, handleConnectionStateChange)
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected)
      room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed)
      room.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
      room.off(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakersChanged)
      room.disconnect()
      clearParticipants()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, livekitUrl, retryTrigger])

  const retry = useCallback(() => {
    // Increment retry counter to trigger effect re-run
    retryCounterRef.current += 1
    setRetryTrigger(retryCounterRef.current)
  }, [])

  return {
    room: isConnected ? room : null,
    connectionState,
    isConnecting,
    isConnected,
    error,
    retry,
  }
}
