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
import { getCoreClient, type ScreenInfo, type WindowInfo } from '@/lib/core'
import { parseParticipantMetadata } from '@/utils/participantMetadata'

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
  windows: WindowInfo[]
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
  onSourceSelect: (sourceId: string, sourceType: 'screen' | 'window') => Promise<void>
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

// Minimize main window via Tauri
const minimizeMainWindow = async (): Promise<void> => {
  try {
    await invoke('minimize_main_window')
  } catch (error) {
    console.error('Failed to minimize window:', error)
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
const startWindowsScreenShare = async (room: Room): Promise<{ track: LocalVideoTrack; stream: MediaStream }> => {
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

// Initialize native screen share - returns available sources
const initNativeScreenShare = async (): Promise<{ screens: ScreenInfo[]; windows: WindowInfo[] }> => {
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
        throw new Error('Screen recording permission denied. Please enable in System Preferences > Privacy > Screen Recording')
      }
    }
  }

  // Enumerate sources
  const sources = await sidecar.enumerateSources()

  if (sources.screens.length === 0 && sources.windows.length === 0) {
    throw new Error('No screens or windows available for capture')
  }

  return sources
}

// Start capture with the selected source
const startNativeCapture = async (
  sourceId: string,
  sourceType: 'screen' | 'window',
  livekitUrl: string,
  token: string
): Promise<void> => {
  const sidecar = getSidecarClient()
  const core = getCoreClient()

  // Have Core join the LiveKit room first (so it can publish the screen share track)
  // We need to wait for the room to actually connect before starting capture
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe()
      reject(new Error('Timeout waiting for room connection'))
    }, 10000) // 10 second timeout

    const unsubscribe = core.onMessage((message) => {
      if (message.type === 'connection_state_changed' && message.state === 'connected') {
        clearTimeout(timeout)
        unsubscribe()
        resolve()
      } else if (message.type === 'error') {
        clearTimeout(timeout)
        unsubscribe()
        reject(new Error(message.message))
      }
    })

    // Send join room command
    core.joinRoom(livekitUrl, token).catch((err) => {
      clearTimeout(timeout)
      unsubscribe()
      reject(err)
    })
  })

  // Start capture - Core will publish the track to LiveKit via RoomService
  await sidecar.startCapture(sourceId, sourceType, {
    width: 1920,
    height: 1080,
    framerate: 30,
    bitrate: 6_000_000,
  })
}

export function useScreenShare({ room, livekitUrl, screenShareToken }: UseScreenShareOptions): UseScreenShareReturn {
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
  const [remoteScreenTrack, setRemoteScreenTrack] = useState<RemoteVideoTrack | null>(null)
  const [canShare, setCanShare] = useState(true)
  const streamRef = useRef<MediaStream | null>(null)

  // Source picker state for native capture (macOS/Linux)
  const [sourcePicker, setSourcePicker] = useState<SourcePickerState>({
    isOpen: false,
    isLoading: false,
    screens: [],
    windows: [],
  })

  // Close source picker
  const onSourcePickerClose = useCallback(() => {
    setSourcePicker((prev) => ({ ...prev, isOpen: false }))
    setCanShare(true)
  }, [])

  // Handle source selection from picker
  const onSourceSelect = useCallback(async (sourceId: string, sourceType: 'screen' | 'window') => {
    if (!room || !livekitUrl || !screenShareToken) {
      toast.error('Not connected to room')
      return
    }

    try {
      // Close picker
      setSourcePicker((prev) => ({ ...prev, isOpen: false }))

      // Start capture with selected source - use screenShareToken for Core connection
      // to avoid disconnecting the WebView's LiveKit connection (different identity)
      await startNativeCapture(sourceId, sourceType, livekitUrl, screenShareToken)

      // Update store state
      startSharing('screen', sourceId)

      // Update local participant's sharing state
      if (localParticipant?.id) {
        updateParticipant(localParticipant.id, { isScreenSharing: true })
      }

      // Minimize main window after successful publish
      await minimizeMainWindow()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start screen share')
      console.error('Screen share error:', error)
      setCanShare(true)
    }
  }, [room, livekitUrl, screenShareToken, startSharing, localParticipant?.id, updateParticipant])

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

        // Minimize main window after successful publish (AC-3.1.3)
        await minimizeMainWindow()

        // Listen for track ended (browser "Stop sharing" button)
        stream.getVideoTracks()[0].onended = () => {
          handleStopShare()
        }
      } else {
        // macOS/Linux: use native sidecar with source picker
        // Requires screenShareToken (separate identity to avoid disconnecting WebView)
        if (!livekitUrl || !screenShareToken) {
          throw new Error('LiveKit connection info not available for native screen share')
        }

        // Show loading state in picker
        setSourcePicker({ isOpen: true, isLoading: true, screens: [], windows: [] })

        try {
          // Initialize and enumerate sources
          const sources = await initNativeScreenShare()

          // Show picker with sources
          setSourcePicker({
            isOpen: true,
            isLoading: false,
            screens: sources.screens,
            windows: sources.windows,
          })
        } catch (error) {
          setSourcePicker({ isOpen: false, isLoading: false, screens: [], windows: [] })
          throw error
        }
      }
    } catch (error) {
      // User cancelled the picker - this is expected, do nothing (AC-3.1.5)
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.message.includes('Permission denied')) {
          // User cancelled - silently fail per AC-3.1.5
          console.log('Screen share cancelled by user')
        } else {
          toast.error(error.message || 'Failed to start screen share')
          console.error('Screen share error:', error)
        }
      }
      setCanShare(true)
    }
  }, [room, isSharing, isLocalSharing, sharerName, startSharing, localParticipant?.id, updateParticipant, livekitUrl, screenShareToken])

  // Internal handler for stopping share
  const handleStopShare = useCallback(async () => {
    if (!room) return

    try {
      // Unpublish the screen share track
      const screenPub = room.localParticipant.getTrackPublication(Track.Source.ScreenShare)
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

      // TODO: Native window cleanup for sharer overlay windows (Stories 3.6, 3.7, 3.8)
      // When implemented, destroy these windows here:
      // - Floating control bar (Story 3.7) - invoke('destroy_floating_window', { label: 'floating-controls' })
      // - Share border indicator (Story 3.8) - invoke('destroy_floating_window', { label: 'share-border' })
      // - Annotation overlay (Story 3.6) - invoke('destroy_floating_window', { label: 'annotation-overlay' })

      // Restore main window
      await restoreMainWindow()
    } catch (error) {
      console.error('Error stopping screen share:', error)
      stopSharingStore()
      setScreenTrack(null)
      setCanShare(true)
    }
  }, [room, stopSharingStore, localParticipant?.id, updateParticipant])

  // Public stop method
  const stopScreenShare = useCallback(async () => {
    await handleStopShare()
  }, [handleStopShare])

  // Listen for remote screen share events
  useEffect(() => {
    if (!room) return

    // Handle remote participant starting screen share
    const handleTrackSubscribed = (
      track: Track,
      _publication: RemoteTrackPublication,
      participant: RemoteParticipant
    ) => {
      if (track.source === Track.Source.ScreenShare && track.kind === Track.Kind.Video) {
        setRemoteScreenTrack(track as RemoteVideoTrack)

        // Parse metadata to find the main participant (parentId)
        const metadata = parseParticipantMetadata(participant.metadata || '')

        if (metadata.isScreenShare && metadata.parentId) {
          // This is a screen share from the sidecar - associate with main participant
          // Find the main participant's name from the room
          const mainParticipant = room.remoteParticipants.get(metadata.parentId)
          const mainParticipantName = mainParticipant?.name || metadata.parentId

          setRemoteSharer(metadata.parentId, mainParticipantName)
          updateParticipant(metadata.parentId, { isScreenSharing: true })
        } else {
          // This is a direct screen share (Windows getDisplayMedia) - use participant directly
          setRemoteSharer(participant.identity, participant.name || participant.identity)
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

        let sharerDisplayName: string
        let sharerParticipantId: string

        if (metadata.isScreenShare && metadata.parentId) {
          // Screen share from sidecar - find main participant's name
          const mainParticipant = room.remoteParticipants.get(metadata.parentId)
          sharerDisplayName = mainParticipant?.name || metadata.parentId
          sharerParticipantId = metadata.parentId
        } else {
          // Direct screen share (Windows)
          sharerDisplayName = participant.name || participant.identity
          sharerParticipantId = participant.identity
        }

        // Notify viewers that the sharer stopped (AC-3.3.8)
        toast.info(`${sharerDisplayName} stopped sharing`)

        setRemoteScreenTrack(null)
        setRemoteSharer(null, null)
        updateParticipant(sharerParticipantId, { isScreenSharing: false })
        // Re-enable local share button when remote participant stops sharing (AC-3.4.3)
        setCanShare(true)
      }
    }

    // Handle local track published
    const handleLocalTrackPublished = (publication: LocalTrackPublication) => {
      if (publication.source === Track.Source.ScreenShare && publication.track) {
        setScreenTrack(publication.track as LocalVideoTrack)
      }
    }

    // Handle local track unpublished
    const handleLocalTrackUnpublished = (publication: LocalTrackPublication) => {
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
