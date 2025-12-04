import { MonitorUp, MonitorOff } from 'lucide-react'
import { Room } from 'livekit-client'
import { Button } from '@/components/ui/button'
import { useScreenShare } from '@/hooks/useScreenShare'
import { cn } from '@/lib/utils'

interface ScreenShareButtonProps {
  room: Room | null
  className?: string
}

export function ScreenShareButton({ room, className }: ScreenShareButtonProps) {
  const { isLocalSharing, canShare, startScreenShare, stopScreenShare } =
    useScreenShare({ room })

  const handleClick = async () => {
    if (isLocalSharing) {
      await stopScreenShare()
    } else {
      await startScreenShare()
    }
  }

  return (
    <Button
      variant={isLocalSharing ? 'default' : 'outline'}
      size="icon"
      onClick={handleClick}
      disabled={!canShare && !isLocalSharing}
      className={cn(
        'h-12 w-12 rounded-full',
        isLocalSharing && 'bg-primary text-primary-foreground',
        className
      )}
      aria-label={isLocalSharing ? 'Stop sharing' : 'Share screen'}
    >
      {isLocalSharing ? (
        <MonitorOff className="h-5 w-5" />
      ) : (
        <MonitorUp className="h-5 w-5" />
      )}
    </Button>
  )
}
