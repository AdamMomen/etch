import { useEffect, useCallback } from 'react'
import { Mic, MicOff } from 'lucide-react'
import { Room } from 'livekit-client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useAudio } from '@/hooks/useAudio'
import { useDevices } from '@/hooks/useDevices'
import { DeviceSelector } from './DeviceSelector'
import { cn } from '@/lib/utils'

interface MicrophoneButtonProps {
  room: Room | null
  className?: string
  disabled?: boolean
}

export function MicrophoneButton({
  room,
  className,
  disabled,
}: MicrophoneButtonProps) {
  const { isMuted, toggleMute, switchDevice, currentDeviceId } = useAudio({
    room,
  })
  const { audioDevices } = useDevices()

  const handleDeviceSelect = useCallback(
    async (deviceId: string) => {
      const success = await switchDevice(deviceId)
      if (success) {
        const device = audioDevices.find((d) => d.deviceId === deviceId)
        const deviceName =
          deviceId === 'default'
            ? 'System Default'
            : device?.label || 'microphone'
        toast.success(`Switched to ${deviceName}`)
      }
    },
    [switchDevice, audioDevices]
  )

  // Handle keyboard shortcut (M key)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger when typing in input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault()
        toggleMute()
      }
    },
    [toggleMute]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div className={cn('relative inline-flex items-center gap-1', className)}>
      <Button
        variant={isMuted ? 'secondary' : 'outline'}
        size="icon"
        onClick={() => toggleMute()}
        disabled={disabled}
        className={cn('h-12 w-12 rounded-full', isMuted && 'text-destructive')}
        aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        aria-pressed={!isMuted}
      >
        {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </Button>
      <DeviceSelector
        devices={audioDevices}
        selectedDeviceId={currentDeviceId}
        onSelect={handleDeviceSelect}
        type="audio"
        disabled={!room || disabled}
      />
    </div>
  )
}
