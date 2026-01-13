import { Volume2, VolumeX } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'

interface VolumeControlProps {
  /** Current volume (0.0 to 2.0, representing 0% to 200%) */
  volume: number
  /** Callback when volume changes */
  onVolumeChange: (volume: number) => void
  /** Optional className for styling */
  className?: string
}

/**
 * VolumeControl - Slider component for adjusting participant volume.
 *
 * Features:
 * - Range: 0% to 200% (0.0 to 2.0)
 * - Visual markers at 0%, 100%, 200%
 * - Boost zone styling for values > 100%
 * - Mute indicator (VolumeX icon) when volume is 0%
 * - Normal volume indicator (Volume2 icon) otherwise
 *
 * AC: 2.11.1, 2.11.2, 2.11.4, 2.11.5
 */
export function VolumeControl({
  volume,
  onVolumeChange,
  className,
}: VolumeControlProps) {
  const isMuted = volume === 0
  const isBoosted = volume > 1
  const percentValue = Math.round(volume * 100)

  const handleSliderChange = (values: number[]) => {
    // Convert from 0-200 percentage to 0-2 volume
    onVolumeChange(values[0] / 100)
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Header with icon and percentage */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isMuted ? (
            <VolumeX
              className="h-4 w-4 text-muted-foreground"
              aria-label="Muted"
            />
          ) : (
            <Volume2
              className={cn(
                'h-4 w-4',
                isBoosted ? 'text-orange-500' : 'text-muted-foreground'
              )}
              aria-label={isBoosted ? 'Volume boosted' : 'Volume'}
            />
          )}
          <span className="text-xs text-muted-foreground">Volume</span>
        </div>
        <span
          className={cn(
            'text-xs font-medium tabular-nums',
            isMuted && 'text-muted-foreground',
            isBoosted && 'text-orange-500'
          )}
        >
          {percentValue}%
        </span>
      </div>

      {/* Slider */}
      <div className="relative">
        <Slider
          value={[percentValue]}
          onValueChange={handleSliderChange}
          min={0}
          max={200}
          step={1}
          className={cn(
            'w-full',
            // Override track range color for boost zone
            isBoosted && '[&_[data-radix-slider-range]]:bg-orange-500'
          )}
          aria-label="Participant volume"
        />

        {/* Visual markers */}
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground/60">
          <span>0%</span>
          <span>100%</span>
          <span className={cn(isBoosted && 'text-orange-500/80')}>200%</span>
        </div>
      </div>

      {/* Status message */}
      {isMuted && (
        <span className="text-xs text-muted-foreground">
          Participant is muted for you
        </span>
      )}
      {isBoosted && (
        <span className="text-xs text-orange-500/80">Audio boosted</span>
      )}
    </div>
  )
}
