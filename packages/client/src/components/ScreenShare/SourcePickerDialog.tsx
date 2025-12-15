import { useState, useEffect } from 'react'
import { Monitor, AppWindow, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ScreenInfo, WindowInfo } from '@/lib/core'

type TabType = 'screens' | 'windows'

interface SourcePickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  screens: ScreenInfo[]
  windows: WindowInfo[]
  isLoading?: boolean
  onSelect: (sourceId: string, sourceType: 'screen' | 'window') => void
}

export function SourcePickerDialog({
  open,
  onOpenChange,
  screens,
  windows,
  isLoading = false,
  onSelect,
}: SourcePickerDialogProps) {
  const [activeTab, setActiveTab] = useState<TabType>('screens')
  const [selectedSource, setSelectedSource] = useState<{ id: string; type: 'screen' | 'window' } | null>(null)

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedSource(null)
      // Default to screens tab, or windows if no screens
      setActiveTab(screens.length > 0 ? 'screens' : 'windows')
    }
  }, [open, screens.length])

  const handleShare = () => {
    if (selectedSource) {
      onSelect(selectedSource.id, selectedSource.type)
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
            Choose a screen or window to share with participants
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading sources...</span>
          </div>
        ) : (
          <>
            {/* Tab buttons */}
            <div className="flex gap-2 border-b pb-2">
              <button
                onClick={() => setActiveTab('screens')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-md transition-colors',
                  activeTab === 'screens'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <Monitor className="h-4 w-4" />
                Screens ({screens.length})
              </button>
              <button
                onClick={() => setActiveTab('windows')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-md transition-colors',
                  activeTab === 'windows'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <AppWindow className="h-4 w-4" />
                Windows ({windows.length})
              </button>
            </div>

            {/* Source grid */}
            <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto py-2">
              {activeTab === 'screens' ? (
                screens.length > 0 ? (
                  screens.map((screen) => (
                    <SourceCard
                      key={screen.id}
                      id={screen.id}
                      name={screen.name}
                      subtitle={`${screen.width} x ${screen.height}${screen.is_primary ? ' (Primary)' : ''}`}
                      icon={<Monitor className="h-12 w-12" />}
                      isSelected={selectedSource?.id === screen.id}
                      onClick={() => setSelectedSource({ id: screen.id, type: 'screen' })}
                    />
                  ))
                ) : (
                  <div className="col-span-2 text-center py-8 text-muted-foreground">
                    No screens available
                  </div>
                )
              ) : windows.length > 0 ? (
                windows.map((window) => (
                  <SourceCard
                    key={window.id}
                    id={window.id}
                    name={window.title}
                    subtitle={window.app_name}
                    icon={<AppWindow className="h-12 w-12" />}
                    isSelected={selectedSource?.id === window.id}
                    onClick={() => setSelectedSource({ id: window.id, type: 'window' })}
                  />
                ))
              ) : (
                <div className="col-span-2 text-center py-8 text-muted-foreground">
                  No windows available
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
  isSelected: boolean
  onClick: () => void
}

function SourceCard({ name, subtitle, icon, isSelected, onClick }: SourceCardProps) {
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
        'flex items-center justify-center w-full h-20 rounded bg-muted',
        isSelected && 'bg-primary/20'
      )}>
        {icon}
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
