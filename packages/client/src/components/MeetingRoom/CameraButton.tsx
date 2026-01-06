import { useEffect, useCallback } from 'react'
import { Video, VideoOff } from 'lucide-react'
import { Room } from 'livekit-client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useVideo } from '@/hooks/useVideo'
import { useDevices } from '@/hooks/useDevices'
import { DeviceSelector } from './DeviceSelector'
import { cn } from '@/lib/utils'

interface CameraButtonProps {
  room: Room | null
  className?: string
  disabled?: boolean
}

export function CameraButton({ room, className, disabled }: CameraButtonProps) {
  const { isVideoOff, toggleVideo, switchDevice, currentDeviceId } = useVideo({ room })
  const { videoDevices } = useDevices()

  const handleDeviceSelect = useCallback(async (deviceId: string) => {
    const success = await switchDevice(deviceId)
    if (success) {
      const device = videoDevices.find((d) => d.deviceId === deviceId)
      const deviceName = deviceId === 'default' ? 'System Default' : device?.label || 'camera'
      toast.success(`Switched to ${deviceName}`)
    }
  }, [switchDevice, videoDevices])

  // Handle keyboard shortcut (V key)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger when typing in input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      if (e.key === 'v' || e.key === 'V') {
        e.preventDefault()
        toggleVideo()
      }
    },
    [toggleVideo]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div className={cn('relative inline-flex items-center gap-1', className)}>
      <Button
        variant={isVideoOff ? 'secondary' : 'outline'}
        size="icon"
        onClick={() => toggleVideo()}
        disabled={disabled}
        className={cn('h-12 w-12 rounded-full', isVideoOff && 'text-destructive')}
        aria-label={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
        aria-pressed={!isVideoOff}
      >
        {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
      </Button>
      <DeviceSelector
        devices={videoDevices}
        selectedDeviceId={currentDeviceId}
        onSelect={handleDeviceSelect}
        type="video"
        disabled={!room || disabled}
      />
    </div>
  )
}
