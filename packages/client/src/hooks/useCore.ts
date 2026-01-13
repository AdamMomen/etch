/**
 * React hook for Etch Core media engine
 *
 * Provides React integration for the Core client, including:
 * - Auto-start on mount
 * - State management for Core status
 * - Event handling for Core messages
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { getCoreClient } from '@/lib/core'
import type {
  CoreClient,
  CoreMessage,
  ScreenInfo,
  ParticipantData,
  ConnectionState,
  PermissionState,
  SourceType,
  CaptureConfig,
} from '@/lib/core'

export interface UseCoreOptions {
  /** Auto-start Core on mount (default: false) */
  autoStart?: boolean
  /** Callback for errors */
  onError?: (code: string, message: string) => void
}

export interface UseCoreReturn {
  // State
  isRunning: boolean
  isConnected: boolean
  connectionState: ConnectionState
  permissionState: PermissionState | null
  availableSources: { screens: ScreenInfo[] } | null // Window capture not supported
  participants: Map<string, ParticipantData>
  isScreenSharing: boolean
  screenSharerId: string | null

  // Actions
  start: () => Promise<void>
  stop: () => Promise<void>
  joinRoom: (serverUrl: string, token: string) => Promise<void>
  leaveRoom: () => Promise<void>
  getAvailableContent: () => Promise<void>
  startScreenShare: (
    sourceId: string,
    sourceType: SourceType,
    config?: Partial<CaptureConfig>
  ) => Promise<void>
  stopScreenShare: () => Promise<void>
  checkPermissions: () => Promise<void>
  requestScreenRecordingPermission: () => Promise<void>

  // Core client reference (for advanced use)
  client: CoreClient
}

export function useCore(options: UseCoreOptions = {}): UseCoreReturn {
  const { autoStart = false, onError } = options

  // State
  const [isRunning, setIsRunning] = useState(false)
  const [connectionState, setConnectionState] =
    useState<ConnectionState>('disconnected')
  const [permissionState, setPermissionState] =
    useState<PermissionState | null>(null)
  const [availableSources, setAvailableSources] = useState<{
    screens: ScreenInfo[]
  } | null>(null)
  const [participants, setParticipants] = useState<
    Map<string, ParticipantData>
  >(new Map())
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [screenSharerId, setScreenSharerId] = useState<string | null>(null)

  // Refs
  const client = useRef(getCoreClient())
  const unsubscribe = useRef<(() => void) | null>(null)

  // Handle Core messages
  const handleMessage = useCallback(
    (message: CoreMessage) => {
      switch (message.type) {
        case 'available_content':
          setAvailableSources({
            screens: message.screens,
          })
          break

        case 'participant_joined':
          setParticipants((prev) => {
            const next = new Map(prev)
            next.set(message.participant.id, message.participant)
            return next
          })
          break

        case 'participant_left':
          setParticipants((prev) => {
            const next = new Map(prev)
            next.delete(message.participant_id)
            return next
          })
          break

        case 'connection_state_changed':
          setConnectionState(message.state)
          break

        case 'screen_share_started':
          setIsScreenSharing(true)
          setScreenSharerId(message.sharer_id)
          break

        case 'screen_share_stopped':
          setIsScreenSharing(false)
          setScreenSharerId(null)
          break

        case 'permission_state':
          setPermissionState(message.state)
          break

        case 'error':
          console.error(`Core error [${message.code}]: ${message.message}`)
          onError?.(message.code, message.message)
          break

        case 'pong':
          // Health check response
          break

        case 'video_frame':
          // Frame relay - handled by video display components
          break
      }
    },
    [onError]
  )

  // Start Core
  const start = useCallback(async () => {
    if (client.current.isRunning()) {
      return
    }

    await client.current.start()
    setIsRunning(true)

    // Subscribe to messages
    unsubscribe.current = client.current.onMessage(handleMessage)
  }, [handleMessage])

  // Stop Core
  const stop = useCallback(async () => {
    if (!client.current.isRunning()) {
      return
    }

    // Unsubscribe from messages
    if (unsubscribe.current) {
      unsubscribe.current()
      unsubscribe.current = null
    }

    await client.current.stop()
    setIsRunning(false)
    setConnectionState('disconnected')
    setParticipants(new Map())
    setIsScreenSharing(false)
    setScreenSharerId(null)
  }, [])

  // Room operations
  const joinRoom = useCallback(async (serverUrl: string, token: string) => {
    await client.current.joinRoom(serverUrl, token)
  }, [])

  const leaveRoom = useCallback(async () => {
    await client.current.leaveRoom()
  }, [])

  // Screen share operations
  const getAvailableContent = useCallback(async () => {
    await client.current.getAvailableContent()
  }, [])

  const startScreenShare = useCallback(
    async (
      sourceId: string,
      sourceType: SourceType,
      config?: Partial<CaptureConfig>
    ) => {
      await client.current.startScreenShare(sourceId, sourceType, config)
    },
    []
  )

  const stopScreenShare = useCallback(async () => {
    await client.current.stopScreenShare()
  }, [])

  // Permission operations
  const checkPermissions = useCallback(async () => {
    await client.current.checkPermissions()
  }, [])

  const requestScreenRecordingPermission = useCallback(async () => {
    await client.current.requestScreenRecordingPermission()
  }, [])

  // Auto-start on mount
  useEffect(() => {
    if (autoStart) {
      start().catch((error) => {
        console.error('Failed to auto-start Core:', error)
      })
    }

    // Cleanup on unmount
    return () => {
      if (client.current.isRunning()) {
        stop().catch((error) => {
          console.error('Failed to stop Core on unmount:', error)
        })
      }
    }
  }, [autoStart, start, stop])

  // Sync running state with client
  useEffect(() => {
    setIsRunning(client.current.isRunning())
  }, [])

  return {
    // State
    isRunning,
    isConnected: connectionState === 'connected',
    connectionState,
    permissionState,
    availableSources,
    participants,
    isScreenSharing,
    screenSharerId,

    // Actions
    start,
    stop,
    joinRoom,
    leaveRoom,
    getAvailableContent,
    startScreenShare,
    stopScreenShare,
    checkPermissions,
    requestScreenRecordingPermission,

    // Client reference
    client: client.current,
  }
}
