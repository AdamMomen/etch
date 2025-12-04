import { useCallback, useEffect, useState } from 'react'
import { Room, VideoPresets, Track } from 'livekit-client'
import { toast } from 'sonner'
import { useSettingsStore } from '@/stores/settingsStore'
import { useRoomStore } from '@/stores/roomStore'

export interface UseVideoOptions {
  room: Room | null
}

export interface UseVideoReturn {
  isVideoOff: boolean
  isPublishing: boolean
  videoTrack: Track | null
  currentDeviceId: string | null
  toggleVideo: () => Promise<void>
  enableCamera: () => Promise<void>
  disableCamera: () => Promise<void>
  switchDevice: (deviceId: string) => Promise<boolean>
}

export function useVideo({ room }: UseVideoOptions): UseVideoReturn {
  const { isVideoOff, setVideoOff, preferredCameraId, setPreferredCamera } = useSettingsStore()
  const { updateParticipant, localParticipant } = useRoomStore()
  const [isPublishing, setIsPublishing] = useState(false)
  const [videoTrack, setVideoTrack] = useState<Track | null>(null)
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(preferredCameraId)

  // Enable camera (requests permission if needed)
  const enableCamera = useCallback(async () => {
    if (!room) return

    try {
      // Optimistic UI update - immediate visual feedback
      setVideoOff(false)

      await room.localParticipant.setCameraEnabled(true, {
        resolution: VideoPresets.h720,
        facingMode: 'user',
      })
      setIsPublishing(true)

      // Update local participant's video state in store
      if (localParticipant?.id) {
        updateParticipant(localParticipant.id, { hasVideo: true })
      }

      // Get the video track for preview
      const trackPub = room.localParticipant.getTrackPublication(Track.Source.Camera)
      if (trackPub?.track) {
        setVideoTrack(trackPub.track)
      }
    } catch (error) {
      // Revert optimistic update on failure
      setVideoOff(true)
      setIsPublishing(false)

      if (error instanceof Error && error.name === 'NotAllowedError') {
        toast.error('Camera access denied. Check system settings.')
      } else {
        toast.error('Failed to enable camera')
        console.error('Failed to enable camera:', error)
      }
    }
  }, [room, setVideoOff, localParticipant?.id, updateParticipant])

  // Disable camera
  const disableCamera = useCallback(async () => {
    if (!room) return

    try {
      // Optimistic UI update - immediate visual feedback
      setVideoOff(true)

      await room.localParticipant.setCameraEnabled(false)
      setIsPublishing(false)
      setVideoTrack(null)

      // Update local participant's video state in store
      if (localParticipant?.id) {
        updateParticipant(localParticipant.id, { hasVideo: false })
      }
    } catch (error) {
      // Revert optimistic update on failure
      setVideoOff(false)
      console.error('Failed to disable camera:', error)
    }
  }, [room, setVideoOff, localParticipant?.id, updateParticipant])

  // Toggle video state
  const toggleVideo = useCallback(async () => {
    if (isVideoOff) {
      await enableCamera()
    } else {
      await disableCamera()
    }
  }, [isVideoOff, enableCamera, disableCamera])

  // Switch video input device
  const switchDevice = useCallback(async (deviceId: string): Promise<boolean> => {
    if (!room) return false

    try {
      await room.switchActiveDevice('videoinput', deviceId)
      setCurrentDeviceId(deviceId)
      setPreferredCamera(deviceId)
      return true
    } catch (error) {
      console.error('Failed to switch camera:', error)
      toast.error('Failed to switch camera')
      return false
    }
  }, [room, setPreferredCamera])

  // Sync publishing state with LiveKit's actual state
  useEffect(() => {
    if (!room) {
      setIsPublishing(false)
      setVideoTrack(null)
      return
    }

    const isCameraEnabled = room.localParticipant.isCameraEnabled
    setIsPublishing(isCameraEnabled)

    if (isCameraEnabled) {
      const trackPub = room.localParticipant.getTrackPublication(Track.Source.Camera)
      if (trackPub?.track) {
        setVideoTrack(trackPub.track)
      }
    }
  }, [room])

  return {
    isVideoOff,
    isPublishing,
    videoTrack,
    currentDeviceId,
    toggleVideo,
    enableCamera,
    disableCamera,
    switchDevice,
  }
}
