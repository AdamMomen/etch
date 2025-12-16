import { useState, useEffect } from 'react'
import { Monitor, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ScreenInfo } from '@/lib/core'

// Note: Window capture is not supported - only screen capture is available.
// This simplifies the picker to only show screens.

interface SourcePickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  screens: ScreenInfo[]
  isLoading?: boolean
  onSelect: (sourceId: string, sourceType: 'screen') => void
}

export function SourcePickerDialog({
  open,
  onOpenChange,
  screens,
  isLoading = false,
  onSelect,
}: SourcePickerDialogProps) {
  const [selectedSource, setSelectedSource] = useState<string | null>(null)

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedSource(null)
    }
  }, [open])

  const handleShare = () => {
    if (selectedSource) {
      onSelect(selectedSource, 'screen')
      onOpenChange(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Share your screen</DialogTitle>
          <DialogDescription>
            Choose a screen to share with participants
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading sources...</span>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-2 border-b pb-2">
              <Monitor className="h-4 w-4" />
              <span className="text-sm font-medium">
                Screens ({screens.length})
              </span>
            </div>

            {/* Source grid */}
            <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto py-2">
              {screens.length > 0 ? (
                screens.map((screen) => (
                  <SourceCard
                    key={screen.id}
                    id={screen.id}
                    name={screen.name}
                    subtitle={`${screen.width} x ${screen.height}${screen.is_primary ? ' (Primary)' : ''}`}
                    icon={<Monitor className="h-12 w-12" />}
                    thumbnail={screen.thumbnail}
                    isSelected={selectedSource === screen.id}
                    onClick={() => setSelectedSource(screen.id)}
                  />
                ))
              ) : (
                <div className="col-span-2 text-center py-8 text-muted-foreground">
                  No screens available
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleShare} disabled={!selectedSource}>
                Share
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

interface SourceCardProps {
  id: string
  name: string
  subtitle: string
  icon: React.ReactNode
  thumbnail?: string
  isSelected: boolean
  onClick: () => void
}

function SourceCard({ name, subtitle, icon, thumbnail, isSelected, onClick }: SourceCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
        'hover:bg-accent hover:border-accent-foreground/20',
        isSelected
          ? 'border-primary bg-primary/10'
          : 'border-transparent bg-muted/50'
      )}
    >
      <div className={cn(
        'flex items-center justify-center w-full h-20 rounded bg-muted overflow-hidden',
        isSelected && 'bg-primary/20'
      )}>
        {thumbnail ? (
          <img
            src={`data:image/jpeg;base64,${thumbnail}`}
            alt={name}
            className="w-full h-full object-contain"
          />
        ) : (
          icon
        )}
      </div>
      <div className="w-full text-center">
        <div className="text-sm font-medium truncate" title={name}>
          {name}
        </div>
        <div className="text-xs text-muted-foreground truncate" title={subtitle}>
          {subtitle}
        </div>
      </div>
    </button>
  )
}
