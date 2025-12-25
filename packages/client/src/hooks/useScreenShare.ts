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

// ============================================================================
// System Tray API (Story 3.7 - ADR-011 Simple Menu Bar)
// ============================================================================

/** Show the sharing tray icon with menu (AC-3.7.1) */
export const showSharingTray = async (): Promise<void> => {
  try {
    await invoke('show_sharing_tray')
    console.log('[Tray] Sharing tray shown')
  } catch (error) {
    console.warn('[Tray] Failed to show sharing tray:', error)
  }
}

/** Hide the sharing tray icon (AC-3.7.7) */
export const hideSharingTray = async (): Promise<void> => {
  try {
    await invoke('hide_sharing_tray')
    console.log('[Tray] Sharing tray hidden')
  } catch (error) {
    console.warn('[Tray] Failed to hide sharing tray:', error)
  }
}

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

export interface SharedScreenBounds {
  x: number
  y: number
  width: number
  height: number
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
  // Shared screen bounds for same-screen detection (Story 3.7 - ADR-010)
  sharedScreenBounds: SharedScreenBounds | null
  // Check if app window is on same screen as shared screen
  checkIsSameScreen: () => Promise<boolean>
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

// ============================================================================
// Main Window Minimize/Restore (Story 3.9)
// ============================================================================

/**
 * Store current window bounds before minimizing (AC-3.9.4)
 * Must be called BEFORE minimize to preserve position for restore
 */
export const storeWindowBounds = async (): Promise<void> => {
  try {
    await invoke('store_window_bounds')
    console.log('[Window] Bounds stored for restore')
  } catch (error) {
    console.warn('[Window] Failed to store bounds:', error)
  }
}

/**
 * Minimize the main window (AC-3.9.1)
 * Called after overlay/border are created and bounds are stored
 */
export const minimizeMainWindow = async (): Promise<void> => {
  try {
    await invoke('minimize_main_window')
    console.log('[Window] Main window minimized')
  } catch (error) {
    console.warn('[Window] Failed to minimize:', error)
  }
}

/**
 * Restore the main window to stored bounds (AC-3.9.3, AC-3.9.4)
 * Called after overlay/border are destroyed on share stop
 */
export const restoreMainWindow = async (): Promise<void> => {
  try {
    await invoke('restore_main_window')
    console.log('[Window] Main window restored')
  } catch (error) {
    console.warn('[Window] Failed to restore:', error)
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

  // Shared screen bounds for same-screen detection (Story 3.7 - ADR-010)
  const [sharedScreenBounds, setSharedScreenBounds] = useState<SharedScreenBounds | null>(null)

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

  // Check if app window is on same screen as shared screen (Story 3.7 - ADR-010)
  const checkIsSameScreen = useCallback(async (): Promise<boolean> => {
    if (!sharedScreenBounds) return false

    const appMonitor = await getWindowMonitor()
    if (!appMonitor) return true // Assume same screen if can't determine

    return isSameScreen(appMonitor, sharedScreenBounds)
  }, [sharedScreenBounds])

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

        // Find the selected screen to get its bounds FIRST (before triggering state changes)
        const selectedScreen = sourcePicker.screens.find(s => s.id === sourceId)

        // Store shared screen bounds for same-screen detection (Story 3.7 - ADR-010)
        // IMPORTANT: Set bounds BEFORE startSharing() to avoid race condition with MeetingRoom transform effect
        if (selectedScreen) {
          setSharedScreenBounds({
            x: selectedScreen.x,
            y: selectedScreen.y,
            width: selectedScreen.width,
            height: selectedScreen.height,
          })
        }

        // Start capture with selected source - use screenShareToken for Core connection
        // to avoid disconnecting the WebView's LiveKit connection (different identity)
        await startNativeCapture(
          sourceId,
          sourceType,
          livekitUrl,
          screenShareToken
        )

        // Update store state (triggers MeetingRoom transform effect)
        startSharing('screen', sourceId)

        // Update local participant's sharing state
        if (localParticipant?.id) {
          updateParticipant(localParticipant.id, { isScreenSharing: true })
        }

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

        // Story 3.9: Auto-minimize main window if sharing on SAME screen
        // Store bounds → Check same screen → Minimize if true
        try {
          // Store bounds BEFORE minimize (AC-3.9.4)
          await storeWindowBounds()

          // Check if app window is on same screen as shared content
          const appMonitor = await getWindowMonitor()
          const sameScreen = appMonitor && selectedScreen
            ? isSameScreen(appMonitor, selectedScreen)
            : true // Assume same screen if can't determine

          if (sameScreen) {
            // Minimize to get out of the way (AC-3.9.1)
            await minimizeMainWindow()
            console.log('[ScreenShare] Minimized main window (same screen)')
          } else {
            console.log('[ScreenShare] Skipping minimize (different screen)')
          }
        } catch (minimizeError) {
          console.warn('[ScreenShare] Failed to minimize:', minimizeError)
        }
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

        // Windows: Set primary screen bounds FIRST (before triggering state changes)
        // IMPORTANT: Set bounds BEFORE startSharing() to avoid race condition with MeetingRoom transform effect
        // Note: getDisplayMedia doesn't tell us which screen was picked, so assume primary
        setSharedScreenBounds({
          x: 0,
          y: 0,
          width: window.screen.width,
          height: window.screen.height,
        })

        // Update store state (triggers MeetingRoom transform effect)
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

        // Story 3.9: Auto-minimize main window if sharing on SAME screen
        // Windows: getDisplayMedia doesn't tell us which screen, assume primary
        // Store bounds → Check same screen → Minimize if true
        try {
          // Store bounds BEFORE minimize (AC-3.9.4)
          await storeWindowBounds()

          // Check if app window is on same screen as shared content
          // For Windows, we assume primary screen (0, 0)
          const appMonitor = await getWindowMonitor()
          const sameScreen = appMonitor
            ? isSameScreen(appMonitor, { x: 0, y: 0 })
            : true // Assume same screen if can't determine

          if (sameScreen) {
            // Minimize to get out of the way (AC-3.9.1)
            await minimizeMainWindow()
            console.log('[ScreenShare] Minimized main window (same screen)')
          } else {
            console.log('[ScreenShare] Skipping minimize (different screen)')
          }
        } catch (minimizeError) {
          console.warn('[ScreenShare] Failed to minimize:', minimizeError)
        }

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

      // Clear shared screen bounds (Story 3.7 - ADR-010)
      setSharedScreenBounds(null)

      // Border indicator is part of annotation overlay - destroyed with destroyOverlay() above (Story 3.8)

      // Story 3.9: Restore main window after overlay cleanup (AC-3.9.3, AC-3.9.5)
      try {
        await restoreMainWindow()
      } catch (restoreError) {
        console.warn('[ScreenShare] Failed to restore main window:', restoreError)
      }
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
    // Use TrackUnpublished (not TrackUnsubscribed) for faster detection - fires immediately
    // when the track is removed from the room, rather than waiting for WebRTC cleanup
    const handleTrackUnpublished = (
      publication: RemoteTrackPublication,
      participant: RemoteParticipant
    ) => {
      if (publication.source === Track.Source.ScreenShare) {
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

    // Handle local track unpublished (Story 3.9 - AC-3.9.6)
    // This can be triggered by system events (network issues, LiveKit disconnect)
    // We need to ensure cleanup happens (destroy overlay, restore window)
    const handleLocalTrackUnpublished = async (
      publication: LocalTrackPublication
    ) => {
      if (publication.source === Track.Source.ScreenShare) {
        console.log('[ScreenShare] LocalTrackUnpublished - performing cleanup')
        setScreenTrack(null)
        stopSharingStore()
        setCanShare(true)

        // Cleanup overlay and restore window (Story 3.9)
        try {
          await destroyOverlay()
        } catch (e) {
          console.warn('[ScreenShare] Failed to destroy overlay on unpublish:', e)
        }
        setSharedScreenBounds(null)
        try {
          await restoreMainWindow()
        } catch (e) {
          console.warn('[ScreenShare] Failed to restore window on unpublish:', e)
        }
      }
    }

    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
    room.on(RoomEvent.TrackUnpublished, handleTrackUnpublished)
    room.on(RoomEvent.LocalTrackPublished, handleLocalTrackPublished)
    room.on(RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished)

    // Scan for already-subscribed screen share tracks (late-joiner sync)
    // TrackSubscribed events fire during room.connect() before this effect runs,
    // so we need to manually check for existing tracks
    room.remoteParticipants.forEach((participant) => {
      participant.trackPublications.forEach((publication) => {
        if (
          publication.track &&
          publication.source === Track.Source.ScreenShare &&
          publication.kind === Track.Kind.Video
        ) {
          // Simulate the TrackSubscribed event for this existing track
          handleTrackSubscribed(
            publication.track,
            publication as RemoteTrackPublication,
            participant
          )
        }
      })
    })

    return () => {
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed)
      room.off(RoomEvent.TrackUnpublished, handleTrackUnpublished)
      room.off(RoomEvent.LocalTrackPublished, handleLocalTrackPublished)
      room.off(RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished)
    }
  }, [room, setRemoteSharer, stopSharingStore, updateParticipant, destroyOverlay, setSharedScreenBounds])

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
    // Same-screen detection for transform mode (Story 3.7 - ADR-010)
    sharedScreenBounds,
    checkIsSameScreen,
  }
}
