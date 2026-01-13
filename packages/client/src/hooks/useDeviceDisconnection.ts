import { useEffect, useRef, useCallback } from 'react'
import { Room } from 'livekit-client'
import { toast } from 'sonner'
import { useSettingsStore } from '@/stores/settingsStore'

interface UseDeviceDisconnectionOptions {
  room: Room | null
  audioDevices: { deviceId: string; label: string }[]
  videoDevices: { deviceId: string; label: string }[]
}

/**
 * Hook to handle device disconnection during a meeting.
 *
 * - Detects when the currently selected device is disconnected
 * - Automatically falls back to the default device
 * - Shows a toast notification informing the user
 */
export function useDeviceDisconnection({
  room,
  audioDevices,
  videoDevices,
}: UseDeviceDisconnectionOptions) {
  const {
    preferredMicrophoneId,
    preferredCameraId,
    setPreferredMicrophone,
    setPreferredCamera,
  } = useSettingsStore()

  // Keep refs to avoid stale closures in event handlers
  const audioDevicesRef = useRef(audioDevices)
  const videoDevicesRef = useRef(videoDevices)
  const preferredMicrophoneRef = useRef(preferredMicrophoneId)
  const preferredCameraRef = useRef(preferredCameraId)

  // Update refs when values change
  useEffect(() => {
    audioDevicesRef.current = audioDevices
  }, [audioDevices])

  useEffect(() => {
    videoDevicesRef.current = videoDevices
  }, [videoDevices])

  useEffect(() => {
    preferredMicrophoneRef.current = preferredMicrophoneId
  }, [preferredMicrophoneId])

  useEffect(() => {
    preferredCameraRef.current = preferredCameraId
  }, [preferredCameraId])

  const handleDeviceChange = useCallback(async () => {
    if (!room) return

    const currentAudioDevices = audioDevicesRef.current
    const currentVideoDevices = videoDevicesRef.current
    const currentMicId = preferredMicrophoneRef.current
    const currentCamId = preferredCameraRef.current

    // Check if preferred microphone is still available
    if (currentMicId && currentMicId !== 'default') {
      const micStillAvailable = currentAudioDevices.some(
        (d) => d.deviceId === currentMicId
      )

      if (!micStillAvailable) {
        // Fallback to default
        try {
          await room.switchActiveDevice('audioinput', 'default')
          setPreferredMicrophone('default')
          toast.warning('Microphone disconnected, switched to System Default')
        } catch (error) {
          console.error('Failed to fallback to default microphone:', error)
        }
      }
    }

    // Check if preferred camera is still available
    if (currentCamId && currentCamId !== 'default') {
      const camStillAvailable = currentVideoDevices.some(
        (d) => d.deviceId === currentCamId
      )

      if (!camStillAvailable) {
        // Fallback to default
        try {
          await room.switchActiveDevice('videoinput', 'default')
          setPreferredCamera('default')
          toast.warning('Camera disconnected, switched to System Default')
        } catch (error) {
          console.error('Failed to fallback to default camera:', error)
        }
      }
    }
  }, [room, setPreferredMicrophone, setPreferredCamera])

  // Listen for device changes (this is triggered when useDevices refreshes its list)
  useEffect(() => {
    // Check for disconnection whenever device lists change
    handleDeviceChange()
  }, [audioDevices, videoDevices, handleDeviceChange])
}
