import { Volume2, VolumeX } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { VolumeControl } from './VolumeControl'
import { useVolumeStore } from '@/stores/volumeStore'
import { cn } from '@/lib/utils'

interface VolumePopoverProps {
  /** The participant ID to control volume for */
  participantId: string
  /** Participant name for accessibility */
  participantName: string
  /** Optional className for the trigger button */
  className?: string
}

/**
 * VolumePopover - Popover wrapper for the VolumeControl slider.
 *
 * Features:
 * - Click to open volume slider
 * - Close on outside click or Escape key (handled by Radix)
 * - Shows mute icon when volume is 0%
 * - Positions to the right by default
 *
 * AC: 2.11.1, 2.11.2
 */
export function VolumePopover({
  participantId,
  participantName,
  className,
}: VolumePopoverProps) {
  const volume = useVolumeStore((state) => state.getVolume(participantId))
  const setVolume = useVolumeStore((state) => state.setVolume)

  const isMuted = volume === 0
  const isBoosted = volume > 1

  const handleVolumeChange = (newVolume: number) => {
    setVolume(participantId, newVolume)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-6 w-6 rounded-full transition-opacity', className)}
          aria-label={`Adjust volume for ${participantName}`}
        >
          {isMuted ? (
            <VolumeX className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Volume2
              className={cn(
                'h-4 w-4',
                isBoosted ? 'text-orange-500' : 'text-muted-foreground'
              )}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="center"
        className="w-48 p-3"
        sideOffset={8}
      >
        <VolumeControl volume={volume} onVolumeChange={handleVolumeChange} />
      </PopoverContent>
    </Popover>
  )
}
