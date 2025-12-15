import { MonitorUp, MonitorOff } from 'lucide-react'
import { TooltipButton } from '@/components/ui/tooltip-button'
import { cn } from '@/lib/utils'

interface ScreenShareButtonProps {
  isLocalSharing: boolean
  canShare: boolean
  sharerName: string | null
  onStartShare: () => void
  onStopShare: () => void
  className?: string
}

export function ScreenShareButton({
  isLocalSharing,
  canShare,
  sharerName,
  onStartShare,
  onStopShare,
  className,
}: ScreenShareButtonProps) {
  const handleClick = () => {
    if (isLocalSharing) {
      onStopShare()
    } else {
      onStartShare()
    }
  }

  const isDisabled = !canShare && !isLocalSharing

  // Build disabled tooltip message (AC-3.4.2)
  const disabledTooltip = sharerName
    ? `${sharerName} is sharing. Ask them to stop first.`
    : undefined

  return (
    <TooltipButton
      variant={isLocalSharing ? 'default' : 'outline'}
      size="icon"
      onClick={handleClick}
      disabled={isDisabled}
      disabledTooltip={disabledTooltip}
      tooltipSide="top"
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
    </TooltipButton>
  )
}
