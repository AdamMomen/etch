import { useCallback, useEffect, useState, useRef } from 'react'
import {
  Room,
  Track,
  RoomEvent,
  LocalTrackPublication,
  LocalVideoTrack,
  RemoteTrackPublication,
  RemoteParticipant,
  RemoteVideoTrack,
} from 'livekit-client'
import { toast } from 'sonner'
import { invoke } from '@tauri-apps/api/core'
import { useScreenShareStore } from '@/stores/screenShareStore'
import { useRoomStore } from '@/stores/roomStore'
import { getSidecarClient } from '@/lib/sidecar'
import { getCoreClient, type ScreenInfo } from '@/lib/core'
import { parseParticipantMetadata } from '@/utils/participantMetadata'
import { useAnnotationOverlay, type OverlayBounds } from './useAnnotationOverlay'

export interface UseScreenShareOptions {
  room: Room | null
  livekitUrl?: string | null
  token?: string | null
  /** Separate token for screen share with different identity (prevents WebView disconnection) */
  screenShareToken?: string | null
}

export interface SourcePickerState {
  isOpen: boolean
  isLoading: boolean
  screens: ScreenInfo[]
  // Window capture not supported - only screens are available
}

export interface UseScreenShareReturn {
  isSharing: boolean
  isLocalSharing: boolean
  canShare: boolean
  sharerName: string | null
  screenTrack: LocalVideoTrack | null
  remoteScreenTrack: RemoteVideoTrack | null
  startScreenShare: () => Promise<void>
  stopScreenShare: () => Promise<void>
  // Source picker state for native capture (macOS/Linux)
  sourcePicker: SourcePickerState
  onSourcePickerClose: () => void
  onSourceSelect: (
    sourceId: string,
    sourceType: 'screen'
  ) => Promise<void>
}

// Platform type from Tauri command
type Platform = 'windows' | 'macos' | 'linux'

// Get platform from Tauri command
const getPlatform = async (): Promise<Platform> => {
  try {
    return await invoke<Platform>('get_platform')
  } catch {
    // Fallback if command fails (e.g., running in browser)
    return 'windows'
  }
}

// Monitor info from Tauri
interface WindowMonitorInfo {
  x: number
  y: number
  width: number
  height: number
}

// Get the monitor the app window is currently on
const getWindowMonitor = async (): Promise<WindowMonitorInfo | null> => {
  try {
    return await invoke<WindowMonitorInfo | null>('get_window_monitor')
  } catch (error) {
    console.error('Failed to get window monitor:', error)
    return null
  }
}

// Check if two screens are the same by comparing position
const isSameScreen = (
  screen1: { x: number; y: number },
  screen2: { x: number; y: number }
): boolean => {
  // Screens are the same if their positions match
  return screen1.x === screen2.x && screen1.y === screen2.y
}

// Minimize main window via Tauri
const minimizeMainWindow = async (): Promise<void> => {
  try {
    await invoke('minimize_main_window')
  } catch (error) {
    console.error('Failed to minimize window:', error)
  }
}

// Smart minimize: only minimize if app is on the shared screen
const minimizeIfOnSharedScreen = async (
  sharedScreen: { x: number; y: number } | undefined
): Promise<void> => {
  if (!sharedScreen) {
    // No screen info, minimize to be safe
    await minimizeMainWindow()
    return
  }

  const appMonitor = await getWindowMonitor()
  if (!appMonitor) {
    // Can't determine app location, minimize to be safe
    await minimizeMainWindow()
    return
  }

  if (isSameScreen(appMonitor, sharedScreen)) {
    console.log('[ScreenShare] App is on shared screen, minimizing')
    await minimizeMainWindow()
  } else {
    console.log('[ScreenShare] App is on different screen, not minimizing')
  }
}

// Restore main window via Tauri
const restoreMainWindow = async (): Promise<void> => {
  try {
    await invoke('restore_main_window')
  } catch (error) {
    console.error('Failed to restore window:', error)
  }
}

// Start screen share using Windows WebView getDisplayMedia
const startWindowsScreenShare = async (
  room: Room
): Promise<{ track: LocalVideoTrack; stream: MediaStream }> => {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: {
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 30, max: 60 },
    },
    audio: false,
  })

  const videoTrack = stream.getVideoTracks()[0]

  if (!videoTrack) {
    stream.getTracks().forEach((t) => t.stop())
    throw new Error('No video track available')
  }

  // Set content hint to 'text' for text-optimized encoding (AC-3.5.4)
  // This tells the encoder to prioritize sharpness over smooth motion
  videoTrack.contentHint = 'text'

  // Publish track to LiveKit with screen share settings
  const publication = await room.localParticipant.publishTrack(videoTrack, {
    name: 'screen',
    source: Track.Source.ScreenShare,
    videoEncoding: {
      maxBitrate: 6_000_000,
      maxFramerate: 30,
    },
    videoCodec: 'vp9',
    // Prioritize resolution over framerate when bandwidth constrained (AC-3.5.2)
    // Text at 15fps is readable; text at 480p is not
    degradationPreference: 'maintain-resolution',
  })

  if (!publication.track) {
    stream.getTracks().forEach((t) => t.stop())
    throw new Error('Failed to publish track')
  }

  return { track: publication.track as LocalVideoTrack, stream }
}

// Initialize native screen share - returns available sources (screens only)
const initNativeScreenShare = async (): Promise<{
  screens: ScreenInfo[]
}> => {
  const sidecar = getSidecarClient()

  // Start sidecar if not running
  if (!sidecar.isRunning()) {
    try {
      await sidecar.start()
    } catch (error) {
      throw new Error(`Failed to start screen capture: ${error}`)
    }
  }

  // Check permission on macOS
  const platform = await getPlatform()
  if (platform === 'macos') {
    const permission = await sidecar.checkPermission()
    if (!permission.granted) {
      const requested = await sidecar.requestPermission()
      if (!requested.granted) {
        throw new Error(
          'Screen recording permission denied. Please enable in System Preferences > Privacy > Screen Recording'
        )
      }
    }
  }

  // Enumerate sources
  const sources = await sidecar.enumerateSources()

  if (sources.screens.length === 0) {
    throw new Error('No screens available for capture')
  }

  return sources
}

// Start capture with the selected source
// Note: Only 'screen' type is supported - window capture is not yet implemented
const startNativeCapture = async (
  sourceId: string,
  sourceType: 'screen',
  livekitUrl: string,
  token: string
): Promise<void> => {
  const sidecar = getSidecarClient()
  const core = getCoreClient()

  // Check if already connected - if so, skip reconnection
  const isConnected = await new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => resolve(false), 100)
    const unsubscribe = core.onMessage((message) => {
      if (message.type === 'connection_state_changed') {
        clearTimeout(timeout)
        unsubscribe()
        resolve(message.state === 'connected')
      }
    })
  })

  // Only connect if not already connected
  if (!isConnected) {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        unsubscribe()
        reject(new Error('Timeout waiting for room connection'))
      }, 10000)

      const unsubscribe = core.onMessage((message) => {
        if (
          message.type === 'connection_state_changed' &&
          message.state === 'connected'
        ) {
          clearTimeout(timeout)
          unsubscribe()
          resolve()
        } else if (message.type === 'error') {
          clearTimeout(timeout)
          unsubscribe()
          reject(new Error(message.message))
        }
      })

      core.joinRoom(livekitUrl, token).catch((err) => {
        clearTimeout(timeout)
        unsubscribe()
        reject(err)
      })
    })
  }

  // Start capture - Core will publish the track to LiveKit via RoomService
  await sidecar.startCapture(sourceId, sourceType, {
    width: 1920,
    height: 1080,
    framerate: 30,
    bitrate: 6_000_000,
  })
}

export function useScreenShare({
  room,
  livekitUrl,
  screenShareToken,
}: UseScreenShareOptions): UseScreenShareReturn {
  const {
    isSharing,
    isLocalSharing,
    sharerName,
    startSharing,
    stopSharing: stopSharingStore,
    setRemoteSharer,
  } = useScreenShareStore()
  const { localParticipant, updateParticipant } = useRoomStore()

  const [screenTrack, setScreenTrack] = useState<LocalVideoTrack | null>(null)
  const [remoteScreenTrack, setRemoteScreenTrack] =
    useState<RemoteVideoTrack | null>(null)
  const [canShare, setCanShare] = useState(true)
  const streamRef = useRef<MediaStream | null>(null)

  // Annotation overlay for sharer (Story 3.6)
  const { createOverlay, destroyOverlay } = useAnnotationOverlay()

  // Source picker state for native capture (macOS/Linux) - screens only
  const [sourcePicker, setSourcePicker] = useState<SourcePickerState>({
    isOpen: false,
    isLoading: false,
    screens: [],
  })

  // Close source picker
  const onSourcePickerClose = useCallback(() => {
    setSourcePicker((prev) => ({ ...prev, isOpen: false }))
    setCanShare(true)
  }, [])

  // Handle source selection from picker
  // Note: Only 'screen' type is supported - window capture is not yet implemented
  const onSourceSelect = useCallback(
    async (sourceId: string, sourceType: 'screen') => {
      if (!room || !livekitUrl || !screenShareToken) {
        toast.error('Not connected to room')
        return
      }

      try {
        // Close picker
        setSourcePicker((prev) => ({ ...prev, isOpen: false }))

        // Start capture with selected source - use screenShareToken for Core connection
        // to avoid disconnecting the WebView's LiveKit connection (different identity)
        await startNativeCapture(
          sourceId,
          sourceType,
          livekitUrl,
          screenShareToken
        )

        // Update store state
        startSharing('screen', sourceId)

        // Update local participant's sharing state
        if (localParticipant?.id) {
          updateParticipant(localParticipant.id, { isScreenSharing: true })
        }

        // Find the selected screen to get its bounds
        const selectedScreen = sourcePicker.screens.find(s => s.id === sourceId)

        // Create annotation overlay over the shared screen (Story 3.6)
        // Use the selected screen's position and dimensions from the source picker
        try {
          const overlayBounds: OverlayBounds = {
            x: selectedScreen?.x ?? 0,
            y: selectedScreen?.y ?? 0,
            width: selectedScreen?.width ?? window.screen.width,
            height: selectedScreen?.height ?? window.screen.height,
          }
          console.log('[ScreenShare] Creating overlay with bounds:', overlayBounds)
          await createOverlay(overlayBounds)
        } catch (overlayError) {
          // Log but don't fail the share if overlay creation fails
          console.warn('[ScreenShare] Failed to create annotation overlay:', overlayError)
        }

        // TODO: Transform mode for sharer controls (Story 3.7 - ADR-009)
        // Will be implemented with window transform instead of separate floating bar

        // Smart minimize: only minimize if app is on the shared screen
        // If sharing a different screen, keep the app visible
        await minimizeIfOnSharedScreen(selectedScreen)
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : 'Failed to start screen share'
        )
        console.error('Screen share error:', error)
        setCanShare(true)
      }
    },
    [
      room,
      livekitUrl,
      screenShareToken,
      startSharing,
      localParticipant?.id,
      updateParticipant,
      createOverlay,
      sourcePicker.screens,
    ]
  )

  // Start screen share
  const startScreenShare = useCallback(async () => {
    if (!room) {
      toast.error('Not connected to a room')
      return
    }

    // Check if someone else is already sharing (single share rule)
    if (isSharing && !isLocalSharing) {
      toast.error(`${sharerName || 'Another participant'} is already sharing`)
      return
    }

    try {
      setCanShare(false)

      // Platform detection
      const platform = await getPlatform()

      if (platform === 'windows') {
        // Windows: use WebView getDisplayMedia
        const { track, stream } = await startWindowsScreenShare(room)
        streamRef.current = stream
        setScreenTrack(track)

        // Update store state
        startSharing('screen', stream.getVideoTracks()[0].id)

        // Update local participant's sharing state
        if (localParticipant?.id) {
          updateParticipant(localParticipant.id, { isScreenSharing: true })
        }

        // Create annotation overlay over the shared screen (Story 3.6)
        try {
          const overlayBounds: OverlayBounds = {
            x: 0,
            y: 0,
            width: window.screen.width,
            height: window.screen.height,
          }
          await createOverlay(overlayBounds)
        } catch (overlayError) {
          console.warn('[ScreenShare] Failed to create annotation overlay:', overlayError)
        }

        // TODO: Transform mode for sharer controls (Story 3.7 - ADR-009)
        // Will be implemented with window transform instead of separate floating bar

        // Windows: Always minimize because getDisplayMedia doesn't tell us which screen was picked
        // On macOS/Linux we use native picker which gives us screen coordinates for smart minimize
        await minimizeMainWindow()

        // Listen for track ended (browser "Stop sharing" button)
        stream.getVideoTracks()[0].onended = () => {
          handleStopShare()
        }
      } else {
        // macOS/Linux: use native sidecar with source picker
        // Requires screenShareToken (separate identity to avoid disconnecting WebView)
        if (!livekitUrl || !screenShareToken) {
          throw new Error(
            'LiveKit connection info not available for native screen share'
          )
        }

        // Show loading state in picker
        setSourcePicker({
          isOpen: true,
          isLoading: true,
          screens: [],
        })

        try {
          // Initialize and enumerate sources (screens only)
          const sources = await initNativeScreenShare()

          // Show picker with sources
          setSourcePicker({
            isOpen: true,
            isLoading: false,
            screens: sources.screens,
          })
        } catch (error) {
          setSourcePicker({
            isOpen: false,
            isLoading: false,
            screens: [],
          })
          throw error
        }
      }
    } catch (error) {
      // User cancelled the picker - this is expected, do nothing (AC-3.1.5)
      if (error instanceof Error) {
        if (
          error.name === 'NotAllowedError' ||
          error.message.includes('Permission denied')
        ) {
          // User cancelled - silently fail per AC-3.1.5
          console.log('Screen share cancelled by user')
        } else {
          toast.error(error.message || 'Failed to start screen share')
          console.error('Screen share error:', error)
        }
      }
      setCanShare(true)
    }
  }, [
    room,
    isSharing,
    isLocalSharing,
    sharerName,
    startSharing,
    localParticipant?.id,
    updateParticipant,
    livekitUrl,
    screenShareToken,
    createOverlay,
  ])

  // Internal handler for stopping share
  const handleStopShare = useCallback(async () => {
    if (!room) return

    try {
      // Unpublish the screen share track
      const screenPub = room.localParticipant.getTrackPublication(
        Track.Source.ScreenShare
      )
      if (screenPub?.track) {
        await room.localParticipant.unpublishTrack(screenPub.track)
      }

      // Stop the media stream (Windows)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }

      // Stop sidecar capture (macOS/Linux)
      const platform = await getPlatform()
      if (platform !== 'windows') {
        const sidecar = getSidecarClient()
        if (sidecar.isRunning()) {
          await sidecar.stopCapture()
          // Leave the LiveKit room before stopping Core to ensure clean disconnect
          // This prevents the -screenshare participant from lingering
          const core = getCoreClient()
          await core.leaveRoom()
          // Wait a bit for the disconnection to fully complete on the server side
          // This prevents DUPLICATE_IDENTITY errors when reconnecting quickly
          await new Promise((resolve) => setTimeout(resolve, 300))
          await sidecar.stop()
        }
      }

      // Update store state
      stopSharingStore()
      setScreenTrack(null)
      setCanShare(true)

      // Update local participant's sharing state
      if (localParticipant?.id) {
        updateParticipant(localParticipant.id, { isScreenSharing: false })
      }

      // Destroy annotation overlay (Story 3.6)
      try {
        await destroyOverlay()
      } catch (overlayError) {
        console.warn('[ScreenShare] Failed to destroy annotation overlay:', overlayError)
      }

      // TODO: Transform mode cleanup (Story 3.7 - ADR-009)
      // Will restore window from control bar mode when implemented

      // TODO: Native window cleanup for remaining sharer overlay windows (Story 3.8)
      // When implemented, destroy these windows here:
      // - Share border indicator (Story 3.8) - invoke('destroy_floating_window', { label: 'share-border' })

      // Restore main window
      await restoreMainWindow()
    } catch (error) {
      console.error('Error stopping screen share:', error)
      stopSharingStore()
      setScreenTrack(null)
      setCanShare(true)
    }
  }, [room, stopSharingStore, localParticipant?.id, updateParticipant, destroyOverlay])

  // Public stop method
  const stopScreenShare = useCallback(async () => {
    await handleStopShare()
  }, [handleStopShare])

  // TODO: Transform mode event handling (Story 3.7 - ADR-009)
  // Transform mode will use same React context - no IPC events needed

  // Listen for remote screen share events
  useEffect(() => {
    if (!room) return

    // Handle remote participant starting screen share
    const handleTrackSubscribed = (
      track: Track,
      _publication: RemoteTrackPublication,
      participant: RemoteParticipant
    ) => {
      if (
        track.source === Track.Source.ScreenShare &&
        track.kind === Track.Kind.Video
      ) {
        setRemoteScreenTrack(track as RemoteVideoTrack)

        // Parse metadata to find the main participant (parentId)
        const metadata = parseParticipantMetadata(participant.metadata || '')

        if (metadata.isScreenShare && metadata.parentId) {
          // Check if this is OUR screen share from our sidecar/Core process
          const isOwnScreenShare =
            metadata.parentId === room.localParticipant?.identity

          if (isOwnScreenShare) {
            // This is our own screen share - don't treat as remote
            // State is already correct from startSharing() call
            // Just keep the track reference but don't update sharing state
            return
          }

          // This is a screen share from another user's sidecar - associate with main participant
          const mainParticipant = room.remoteParticipants.get(metadata.parentId)
          const mainParticipantName = mainParticipant?.name || metadata.parentId

          setRemoteSharer(metadata.parentId, mainParticipantName)
          updateParticipant(metadata.parentId, { isScreenSharing: true })
        } else {
          // This is a direct screen share (Windows getDisplayMedia) - use participant directly
          setRemoteSharer(
            participant.identity,
            participant.name || participant.identity
          )
          updateParticipant(participant.identity, { isScreenSharing: true })
        }

        // Disable local share button when remote participant starts sharing (AC-3.4.1)
        setCanShare(false)
      }
    }

    // Handle remote participant stopping screen share
    const handleTrackUnsubscribed = (
      track: Track,
      _publication: RemoteTrackPublication,
      participant: RemoteParticipant
    ) => {
      if (track.source === Track.Source.ScreenShare) {
        // Parse metadata to find the main participant
        const metadata = parseParticipantMetadata(participant.metadata || '')

        if (metadata.isScreenShare && metadata.parentId) {
          // Check if this is OUR screen share from our sidecar/Core process
          const isOwnScreenShare =
            metadata.parentId === room.localParticipant?.identity

          if (isOwnScreenShare) {
            // This is our own screen share stopping - handled by handleStopShare()
            // Don't show toast or update remote sharer state
            return
          }

          // Screen share from another user's sidecar - find main participant's name
          const mainParticipant = room.remoteParticipants.get(metadata.parentId)
          const sharerDisplayName = mainParticipant?.name || metadata.parentId

          // Notify viewers that the sharer stopped (AC-3.3.8)
          toast.info(`${sharerDisplayName} stopped sharing`)

          setRemoteScreenTrack(null)
          setRemoteSharer(null, null)
          updateParticipant(metadata.parentId, { isScreenSharing: false })
          // Re-enable local share button when remote participant stops sharing (AC-3.4.3)
          setCanShare(true)
        } else {
          // Direct screen share (Windows) from remote participant
          const sharerDisplayName = participant.name || participant.identity

          // Notify viewers that the sharer stopped (AC-3.3.8)
          toast.info(`${sharerDisplayName} stopped sharing`)

          setRemoteScreenTrack(null)
          setRemoteSharer(null, null)
          updateParticipant(participant.identity, { isScreenSharing: false })
          // Re-enable local share button when remote participant stops sharing (AC-3.4.3)
          setCanShare(true)
        }
      }
    }

    // Handle local track published
    const handleLocalTrackPublished = (publication: LocalTrackPublication) => {
      if (
        publication.source === Track.Source.ScreenShare &&
        publication.track
      ) {
        setScreenTrack(publication.track as LocalVideoTrack)
      }
    }

    // Handle local track unpublished
    const handleLocalTrackUnpublished = (
      publication: LocalTrackPublication
    ) => {
      if (publication.source === Track.Source.ScreenShare) {
        setScreenTrack(null)
        stopSharingStore()
        setCanShare(true)
      }
    }

    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
    room.on(RoomEvent.LocalTrackPublished, handleLocalTrackPublished)
    room.on(RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished)

    return () => {
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed)
      room.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
      room.off(RoomEvent.LocalTrackPublished, handleLocalTrackPublished)
      room.off(RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished)
    }
  }, [room, setRemoteSharer, stopSharingStore, updateParticipant])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
    }
  }, [])

  return {
    isSharing,
    isLocalSharing,
    canShare,
    sharerName,
    screenTrack,
    remoteScreenTrack,
    startScreenShare,
    stopScreenShare,
    // Source picker state for native capture (macOS/Linux)
    sourcePicker,
    onSourcePickerClose,
    onSourceSelect,
  }
}
