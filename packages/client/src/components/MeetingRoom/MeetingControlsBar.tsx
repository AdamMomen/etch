import { LogOut, Link } from 'lucide-react'
import { Room } from 'livekit-client'
import { Button } from '@/components/ui/button'
import { MicrophoneButton } from './MicrophoneButton'
import { CameraButton } from './CameraButton'
import { ScreenShareButton } from '@/components/ScreenShare'

interface MeetingControlsBarProps {
  room: Room | null
  onLeave: () => void
  onInvite?: () => void
  // Screen share state and handlers
  isLocalSharing: boolean
  canShare: boolean
  /** Whether screen sharing is supported on this device (false on iOS) */
  isScreenShareSupported: boolean
  sharerName: string | null
  onStartScreenShare: () => void
  onStopScreenShare: () => void
  // Connection state
  isConnecting: boolean
}

export function MeetingControlsBar({
  room,
  onLeave,
  onInvite,
  isLocalSharing,
  canShare,
  isScreenShareSupported,
  sharerName,
  onStartScreenShare,
  onStopScreenShare,
  isConnecting,
}: MeetingControlsBarProps) {
  return (
    <footer className="flex h-16 shrink-0 items-center justify-center gap-3 border-t bg-background px-4">
      {/* Microphone Toggle */}
      <MicrophoneButton room={room} disabled={isConnecting} />

      {/* Camera Toggle */}
      <CameraButton room={room} disabled={isConnecting} />

      {/* Screen Share - hidden on unsupported devices (iOS) */}
      {isScreenShareSupported && (
        <ScreenShareButton
          isLocalSharing={isLocalSharing}
          canShare={canShare}
          sharerName={sharerName}
          onStartShare={onStartScreenShare}
          onStopShare={onStopScreenShare}
          isConnecting={isConnecting}
        />
      )}

      {/* Invite Participants */}
      {onInvite && (
        <Button
          variant="outline"
          size="icon"
          onClick={onInvite}
          disabled={isConnecting}
          className="h-12 w-12 rounded-full"
          aria-label="Invite participants"
        >
          <Link className="h-5 w-5" />
        </Button>
      )}

      {/* Leave Meeting */}
      <Button
        variant="destructive"
        size="icon"
        onClick={onLeave}
        disabled={isConnecting}
        className="h-12 w-12 rounded-full"
        aria-label="Leave meeting"
      >
        <LogOut className="h-5 w-5" />
      </Button>
    </footer>
  )
}
