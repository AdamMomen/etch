import { useCallback, useEffect, useState } from 'react'
import { Room, ParticipantEvent } from 'livekit-client'
import { toast } from 'sonner'
import { useSettingsStore } from '@/stores/settingsStore'
import { useRoomStore } from '@/stores/roomStore'

export interface UseAudioOptions {
  room: Room | null
}

export interface UseAudioReturn {
  isMuted: boolean
  isPublishing: boolean
  isSpeaking: boolean
  currentDeviceId: string | null
  toggleMute: () => Promise<void>
  enableMicrophone: () => Promise<void>
  disableMicrophone: () => Promise<void>
  switchDevice: (deviceId: string) => Promise<boolean>
}

export function useAudio({ room }: UseAudioOptions): UseAudioReturn {
  const { isMuted, setMuted, preferredMicrophoneId, setPreferredMicrophone } = useSettingsStore()
  const { updateParticipant, localParticipant } = useRoomStore()
  const [isPublishing, setIsPublishing] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(preferredMicrophoneId)

  // Enable microphone (requests permission if needed)
  const enableMicrophone = useCallback(async () => {
    if (!room) return

    try {
      // Optimistic UI update - immediate visual feedback
      setMuted(false)

      await room.localParticipant.setMicrophoneEnabled(true)
      setIsPublishing(true)
    } catch (error) {
      // Revert optimistic update on failure
      setMuted(true)
      setIsPublishing(false)

      if (error instanceof Error && error.name === 'NotAllowedError') {
        toast.error('Microphone access denied. Check system settings.')
      } else {
        toast.error('Failed to enable microphone')
        console.error('Failed to enable microphone:', error)
      }
    }
  }, [room, setMuted])

  // Disable microphone
  const disableMicrophone = useCallback(async () => {
    if (!room) return

    try {
      // Optimistic UI update - immediate visual feedback
      setMuted(true)

      await room.localParticipant.setMicrophoneEnabled(false)
      setIsPublishing(false)
    } catch (error) {
      // Revert optimistic update on failure
      setMuted(false)
      console.error('Failed to disable microphone:', error)
    }
  }, [room, setMuted])

  // Toggle mute state
  const toggleMute = useCallback(async () => {
    if (isMuted) {
      await enableMicrophone()
    } else {
      await disableMicrophone()
    }
  }, [isMuted, enableMicrophone, disableMicrophone])

  // Switch audio input device
  const switchDevice = useCallback(async (deviceId: string): Promise<boolean> => {
    if (!room) return false

    try {
      await room.switchActiveDevice('audioinput', deviceId)
      setCurrentDeviceId(deviceId)
      setPreferredMicrophone(deviceId)
      return true
    } catch (error) {
      console.error('Failed to switch microphone:', error)
      toast.error('Failed to switch microphone')
      return false
    }
  }, [room, setPreferredMicrophone])

  // Listen for speaking state changes
  useEffect(() => {
    if (!room) return

    const handleSpeakingChanged = (speaking: boolean) => {
      setIsSpeaking(speaking)

      // Update the local participant's speaking state in the store
      if (localParticipant?.id) {
        updateParticipant(localParticipant.id, { isSpeaking: speaking })
      }
    }

    room.localParticipant.on(ParticipantEvent.IsSpeakingChanged, handleSpeakingChanged)

    return () => {
      room.localParticipant.off(ParticipantEvent.IsSpeakingChanged, handleSpeakingChanged)
    }
  }, [room, localParticipant?.id, updateParticipant])

  // Sync publishing state with LiveKit's actual state
  useEffect(() => {
    if (!room) {
      setIsPublishing(false)
      return
    }

    setIsPublishing(room.localParticipant.isMicrophoneEnabled)
  }, [room])

  // Handle device disconnection - fall back to default when current device is removed
  useEffect(() => {
    if (!room || !currentDeviceId || currentDeviceId === 'default') return

    const handleDeviceChange = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const audioDevices = devices.filter((d) => d.kind === 'audioinput')
        const currentDeviceExists = audioDevices.some((d) => d.deviceId === currentDeviceId)

        if (!currentDeviceExists) {
          // Current device was disconnected, fall back to default
          await room.switchActiveDevice('audioinput', 'default')
          setCurrentDeviceId('default')
          setPreferredMicrophone('default')
          toast.warning('Device disconnected, switched to System Default')
        }
      } catch (error) {
        console.error('Error handling device change:', error)
      }
    }

    navigator.mediaDevices?.addEventListener('devicechange', handleDeviceChange)

    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', handleDeviceChange)
    }
  }, [room, currentDeviceId, setPreferredMicrophone])

  return {
    isMuted,
    isPublishing,
    isSpeaking,
    currentDeviceId,
    toggleMute,
    enableMicrophone,
    disableMicrophone,
    switchDevice,
  }
}
