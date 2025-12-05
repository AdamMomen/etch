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

export interface UseScreenShareOptions {
  room: Room | null
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
}

// Platform type from Tauri command
type Platform = 'windows' | 'macos' | 'linux'

// Check if running in Tauri environment
const isTauriEnvironment = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI__' in window
}

// Get platform from Tauri command
const getPlatform = async (): Promise<Platform> => {
  if (!isTauriEnvironment()) {
    // Fallback for web browser testing
    return 'windows'
  }
  try {
    return await invoke<Platform>('get_platform')
  } catch {
    // Fallback if command fails
    return 'windows'
  }
}

// Minimize main window via Tauri
const minimizeMainWindow = async (): Promise<void> => {
  if (!isTauriEnvironment()) return
  try {
    await invoke('minimize_main_window')
  } catch (error) {
    console.error('Failed to minimize window:', error)
  }
}

// Restore main window via Tauri
const restoreMainWindow = async (): Promise<void> => {
  if (!isTauriEnvironment()) return
  try {
    await invoke('restore_main_window')
  } catch (error) {
    console.error('Failed to restore window:', error)
  }
}

export function useScreenShare({ room }: UseScreenShareOptions): UseScreenShareReturn {
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

    // Platform detection
    const platform = await getPlatform()
    if (platform !== 'windows') {
      toast.info('Screen sharing on macOS/Linux coming soon', {
        description: 'Native capture requires Story 3.10',
      })
      return
    }

    try {
      setCanShare(false)

      // Request screen share using getDisplayMedia
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30, max: 60 },
        },
        audio: false,
      })

      streamRef.current = stream
      const videoTrack = stream.getVideoTracks()[0]

      if (!videoTrack) {
        toast.error('No video track available')
        setCanShare(true)
        return
      }

      // Publish track to LiveKit with screen share settings
      const publication = await room.localParticipant.publishTrack(videoTrack, {
        name: 'screen',
        source: Track.Source.ScreenShare,
        videoEncoding: {
          maxBitrate: 6_000_000,
          maxFramerate: 30,
        },
        videoCodec: 'vp9',
      })

      // Track the published track
      if (publication.track) {
        setScreenTrack(publication.track as LocalVideoTrack)
      }

      // Update store state
      startSharing('screen', videoTrack.id)

      // Update local participant's sharing state
      if (localParticipant?.id) {
        updateParticipant(localParticipant.id, { isScreenSharing: true })
      }

      // Minimize main window after successful publish (AC-3.1.3)
      await minimizeMainWindow()

      // Listen for track ended (browser "Stop sharing" button)
      videoTrack.onended = () => {
        handleStopShare()
      }
    } catch (error) {
      // User cancelled the picker - this is expected, do nothing (AC-3.1.5)
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.message.includes('Permission denied')) {
          // User cancelled - silently fail per AC-3.1.5
          console.log('Screen share cancelled by user')
        } else {
          toast.error('Failed to start screen share')
          console.error('Screen share error:', error)
        }
      }
      setCanShare(true)
    }
  }, [room, isSharing, isLocalSharing, sharerName, startSharing, localParticipant?.id, updateParticipant])

  // Internal handler for stopping share
  const handleStopShare = useCallback(async () => {
    if (!room) return

    try {
      // Unpublish the screen share track
      const screenPub = room.localParticipant.getTrackPublication(Track.Source.ScreenShare)
      if (screenPub?.track) {
        await room.localParticipant.unpublishTrack(screenPub.track)
      }

      // Stop the media stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }

      // Update store state
      stopSharingStore()
      setScreenTrack(null)
      setCanShare(true)

      // Update local participant's sharing state
      if (localParticipant?.id) {
        updateParticipant(localParticipant.id, { isScreenSharing: false })
      }

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
        setRemoteSharer(participant.identity, participant.name || participant.identity)
        updateParticipant(participant.identity, { isScreenSharing: true })
      }
    }

    // Handle remote participant stopping screen share
    const handleTrackUnsubscribed = (
      track: Track,
      _publication: RemoteTrackPublication,
      participant: RemoteParticipant
    ) => {
      if (track.source === Track.Source.ScreenShare) {
        setRemoteScreenTrack(null)
        setRemoteSharer(null, null)
        updateParticipant(participant.identity, { isScreenSharing: false })
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
  }
}
