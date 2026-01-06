import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Room,
  RoomEvent,
  ConnectionState,
  RemoteParticipant,
  RemoteTrackPublication,
  Track,
  Participant as LKParticipant,
  DataPacket_Kind,
} from 'livekit-client'
import { toast } from 'sonner'
import { useRoomStore } from '@/stores/roomStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { parseParticipantMetadata } from '@/utils/participantMetadata'
import { validateRoomExists, createRoom } from '@/lib/api'
import type { Participant } from '@etch/shared'

// Role transfer message type
interface RoleTransferMessage {
  type: 'role_transfer'
  newHostId: string
  previousHostId: string
  timestamp: number
}

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
  isRetrying: boolean
  retry: () => Promise<void>
  leaveRoom: () => Promise<void>
}

export function useLiveKit({
  token,
  livekitUrl,
}: UseLiveKitOptions): UseLiveKitReturn {
  const roomRef = useRef<Room | null>(null)
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.Disconnected
  )
  const [error, setError] = useState<string | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  const retryCounterRef = useRef(0)
  const [retryTrigger, setRetryTrigger] = useState(0)

  const {
    currentRoom,
    setCurrentRoom,
    setConnectionState: setStoreConnectionState,
    setLocalParticipant,
    addRemoteParticipant,
    removeRemoteParticipant,
    updateParticipant,
    clearParticipants,
  } = useRoomStore()

  const { displayName } = useSettingsStore()

  const isConnecting = connectionState === ConnectionState.Connecting
  const isConnected = connectionState === ConnectionState.Connected

  // Initialize room only once
  if (!roomRef.current) {
    roomRef.current = new Room()
  }
  const room = roomRef.current

  const convertLKParticipant = useCallback(
    (lkParticipant: LKParticipant, isLocal: boolean): Participant => {
      const metadata = parseParticipantMetadata(lkParticipant.metadata || '')
      return {
        id: lkParticipant.identity,
        name: lkParticipant.name || lkParticipant.identity,
        role: metadata.role,
        color: metadata.color,
        isLocal,
      }
    },
    []
  )

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

      // Check if this is a screen share participant (should not be shown in participant list)
      const metadata = parseParticipantMetadata(participant.metadata || '')
      if (metadata.isScreenShare) {
        // Don't add screen share participants to the list - their tracks will still be processed
        return
      }

      const converted = convertLKParticipant(participant, false)
      addRemoteParticipant(converted)
      toast.info(`${converted.name} joined`)
    }

    const handleParticipantDisconnected = (participant: RemoteParticipant) => {
      if (cancelled) return

      // Check if this is a screen share participant (don't show toast for them)
      const metadata = parseParticipantMetadata(participant.metadata || '')
      if (metadata.isScreenShare) {
        // Screen share participants were never added, so just ignore disconnect
        return
      }

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

      if (
        track.kind === Track.Kind.Video &&
        track.source === Track.Source.Camera
      ) {
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

      if (
        track.kind === Track.Kind.Video &&
        track.source === Track.Source.Camera
      ) {
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

    // Handle participant metadata changes (e.g., role changes from host)
    // AC-5.1.4: roomStore syncs roles from metadata
    const handleParticipantMetadataChanged = (
      _prevMetadata: string | undefined,
      participant: LKParticipant
    ) => {
      if (cancelled) return

      // Parse updated metadata
      const metadata = parseParticipantMetadata(participant.metadata || '')

      // Skip screen share participants
      if (metadata.isScreenShare) {
        return
      }

      // Update participant with new role and color from metadata
      updateParticipant(participant.identity, {
        role: metadata.role,
        color: metadata.color,
      })
    }

    // Handle data messages (e.g., role transfer)
    const handleDataReceived = (
      payload: Uint8Array,
      _participant?: RemoteParticipant,
      _kind?: DataPacket_Kind
    ) => {
      if (cancelled) return

      try {
        const message = JSON.parse(
          new TextDecoder().decode(payload)
        ) as RoleTransferMessage

        if (message.type === 'role_transfer') {
          const localIdentity = room.localParticipant?.identity

          // Check if this transfer is for us (we are the new host)
          if (message.newHostId === localIdentity) {
            // Update local participant role to host
            updateParticipant(localIdentity, { role: 'host' })

            // Show notification to the new host
            toast.success('You are now the host', {
              description: 'The previous host has left the meeting.',
            })
          }

          // Update the previous host's role for all participants (if they're still connected)
          if (
            message.previousHostId &&
            message.previousHostId !== localIdentity
          ) {
            updateParticipant(message.previousHostId, { role: 'annotator' })
          }

          // If we received this message, sender (previous host) is leaving
          // so we don't need to update their local state
        }
      } catch {
        // Not a JSON message or not a role transfer message, ignore
      }
    }

    // Set up event listeners
    room.on(RoomEvent.ConnectionStateChanged, handleConnectionStateChange)
    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected)
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
    room.on(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakersChanged)
    room.on(RoomEvent.ParticipantMetadataChanged, handleParticipantMetadataChanged)
    room.on(RoomEvent.DataReceived, handleDataReceived)

    // Async connection logic
    const connect = async () => {
      setError(null)
      setStoreConnectionState({
        isConnecting: true,
        isConnected: false,
        error: null,
      })

      try {
        await room.connect(livekitUrl, token)

        if (cancelled) return

        // Set local participant after successful connection
        const localParticipant = convertLKParticipant(
          room.localParticipant,
          true
        )
        setLocalParticipant(localParticipant)

        // Add existing remote participants (excluding screen share participants)
        room.remoteParticipants.forEach((participant) => {
          const metadata = parseParticipantMetadata(participant.metadata || '')
          if (metadata.isScreenShare) {
            // Don't add screen share participants to the list
            return
          }
          const converted = convertLKParticipant(participant, false)
          addRemoteParticipant(converted)
        })
      } catch (err) {
        if (cancelled) return

        const errorMessage =
          err instanceof Error ? err.message : 'Failed to connect to LiveKit'
        setError(errorMessage)
        setStoreConnectionState({
          isConnecting: false,
          isConnected: false,
          error: errorMessage,
        })
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
      room.off(RoomEvent.ParticipantMetadataChanged, handleParticipantMetadataChanged)
      room.off(RoomEvent.DataReceived, handleDataReceived)
      room.disconnect()
      clearParticipants()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, livekitUrl, retryTrigger])

  const retry = useCallback(async () => {
    // AC-2.16.1: Detect room state before retry
    // AC-2.16.4: Show feedback during retry process
    setIsRetrying(true)

    try {
      const roomId = currentRoom?.roomId

      if (!roomId) {
        toast.error('No room ID found')
        setIsRetrying(false)
        return
      }

      // Check if room still exists
      const exists = await validateRoomExists(roomId)

      if (exists) {
        // AC-2.16.3: Room exists - attempt to rejoin
        toast.info('Rejoining room...')
        retryCounterRef.current += 1
        setRetryTrigger(retryCounterRef.current)
      } else {
        // AC-2.16.2: Room closed - create new room
        toast.info('Room closed. Creating new room...')

        // Get host name (default to 'User' if not set)
        const hostName = displayName || 'User'

        // Create a new room
        const response = await createRoom(hostName)

        // Update room store with new credentials
        setCurrentRoom({
          roomId: response.roomId,
          token: response.token,
          screenShareToken: response.screenShareToken,
          livekitUrl: response.livekitUrl,
        })

        // Trigger reconnection with new credentials
        retryCounterRef.current += 1
        setRetryTrigger(retryCounterRef.current)

        toast.success('New room created')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Retry failed'
      toast.error(message)
      setError(message)
    } finally {
      setIsRetrying(false)
    }
  }, [currentRoom?.roomId, displayName, setCurrentRoom])

  const leaveRoom = useCallback(async () => {
    if (!room) return

    try {
      // Stop all local tracks first
      await room.localParticipant.setMicrophoneEnabled(false)
      await room.localParticipant.setCameraEnabled(false)

      // Disconnect from room
      await room.disconnect()

      // Clear participants from store
      clearParticipants()
    } catch (err) {
      // Even if disabling tracks fails, still try to disconnect
      console.error('Error during leave:', err)
      await room.disconnect()
      clearParticipants()
    }
  }, [room, clearParticipants])

  return {
    room: isConnected ? room : null,
    connectionState,
    isConnecting,
    isConnected,
    error,
    isRetrying,
    retry,
    leaveRoom,
  }
}
