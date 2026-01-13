import { useState, useEffect, useCallback, useRef } from 'react'

export interface MediaDeviceInfo {
  deviceId: string
  label: string
  kind: MediaDeviceKind
}

export interface UseDevicesReturn {
  audioDevices: MediaDeviceInfo[]
  videoDevices: MediaDeviceInfo[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/**
 * Hook to enumerate and track available media devices (microphones and cameras).
 *
 * - Uses navigator.mediaDevices.enumerateDevices() to list devices
 * - Listens for devicechange events to keep list updated
 * - Handles permission edge cases (empty labels before permission granted)
 * - Filters devices by kind (audioinput, videoinput)
 */
export function useDevices(): UseDevicesReturn {
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  const enumerateDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setError('Device enumeration not supported in this browser')
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const devices = await navigator.mediaDevices.enumerateDevices()

      if (!isMountedRef.current) return

      // Filter and map audio input devices
      const audioInputs = devices
        .filter((d) => d.kind === 'audioinput')
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${d.deviceId.slice(0, 4)}`,
          kind: d.kind,
        }))

      // Filter and map video input devices
      const videoInputs = devices
        .filter((d) => d.kind === 'videoinput')
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${d.deviceId.slice(0, 4)}`,
          kind: d.kind,
        }))

      setAudioDevices(audioInputs)
      setVideoDevices(videoInputs)
    } catch (err) {
      if (!isMountedRef.current) return

      const message =
        err instanceof Error ? err.message : 'Failed to enumerate devices'
      setError(message)
      console.error('Failed to enumerate devices:', err)
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [])

  // Initial enumeration and device change listener
  useEffect(() => {
    isMountedRef.current = true

    enumerateDevices()

    // Listen for device changes (connect/disconnect)
    const handleDeviceChange = () => {
      enumerateDevices()
    }

    navigator.mediaDevices?.addEventListener('devicechange', handleDeviceChange)

    return () => {
      isMountedRef.current = false
      navigator.mediaDevices?.removeEventListener(
        'devicechange',
        handleDeviceChange
      )
    }
  }, [enumerateDevices])

  return {
    audioDevices,
    videoDevices,
    isLoading,
    error,
    refresh: enumerateDevices,
  }
}
