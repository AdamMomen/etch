import { LogOut, Link, Bug } from 'lucide-react'
import { Room } from 'livekit-client'
import { Button } from '@/components/ui/button'
import { MicrophoneButton } from './MicrophoneButton'
import { CameraButton } from './CameraButton'
import { ScreenShareButton } from '@/components/ScreenShare'
import { getCoreClient } from '@/lib/core'

interface MeetingControlsBarProps {
  room: Room | null
  onLeave: () => void
  onInvite?: () => void
  // Screen share state and handlers
  isLocalSharing: boolean
  canShare: boolean
  sharerName: string | null
  onStartScreenShare: () => void
  onStopScreenShare: () => void
}

export function MeetingControlsBar({
  room,
  onLeave,
  onInvite,
  isLocalSharing,
  canShare,
  sharerName,
  onStartScreenShare,
  onStopScreenShare,
}: MeetingControlsBarProps) {
  return (
    <footer className="flex h-16 shrink-0 items-center justify-center gap-3 border-t bg-background px-4">
      {/* Microphone Toggle */}
      <MicrophoneButton room={room} />

      {/* Camera Toggle */}
      <CameraButton room={room} />

      {/* Screen Share */}
      <ScreenShareButton
        isLocalSharing={isLocalSharing}
        canShare={canShare}
        sharerName={sharerName}
        onStartShare={onStartScreenShare}
        onStopShare={onStopScreenShare}
      />

      {/* Invite Participants */}
      {onInvite && (
        <Button
          variant="outline"
          size="icon"
          onClick={onInvite}
          className="h-12 w-12 rounded-full"
          aria-label="Invite participants"
        >
          <Link className="h-5 w-5" />
        </Button>
      )}

      {/* Dev Mode: Test Overlay Button */}
      {import.meta.env.DEV && (
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            const core = getCoreClient()
            if (core.isRunning()) {
              core.testOverlay()
            } else {
              console.warn('Core not running')
            }
          }}
          className="h-12 w-12 rounded-full border-yellow-500 text-yellow-500 hover:bg-yellow-500/10"
          aria-label="Test overlay (dev)"
          title="Test wgpu overlay rendering"
        >
          <Bug className="h-5 w-5" />
        </Button>
      )}

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
