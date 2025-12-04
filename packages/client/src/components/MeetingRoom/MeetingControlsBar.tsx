import { MonitorUp, LogOut } from 'lucide-react'
import { Room } from 'livekit-client'
import { Button } from '@/components/ui/button'
import { MicrophoneButton } from './MicrophoneButton'
import { CameraButton } from './CameraButton'

interface MeetingControlsBarProps {
  room: Room | null
  onScreenShare: () => void
  onLeave: () => void
}

export function MeetingControlsBar({
  room,
  onScreenShare,
  onLeave,
}: MeetingControlsBarProps) {
  return (
    <footer className="flex h-16 shrink-0 items-center justify-center gap-3 border-t bg-background px-4">
      {/* Microphone Toggle */}
      <MicrophoneButton room={room} />

      {/* Camera Toggle */}
      <CameraButton room={room} />

      {/* Screen Share */}
      <Button
        variant="outline"
        size="icon"
        onClick={onScreenShare}
        className="h-12 w-12 rounded-full"
        aria-label="Share screen"
      >
        <MonitorUp className="h-5 w-5" />
      </Button>

      {/* Leave Meeting */}
      <Button
        variant="destructive"
        size="icon"
        onClick={onLeave}
        className="h-12 w-12 rounded-full"
        aria-label="Leave meeting"
      >
        <LogOut className="h-5 w-5" />
      </Button>
    </footer>
  )
}
