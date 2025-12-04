import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ConnectionStatusIndicatorProps {
  isConnecting: boolean
  isConnected: boolean
  error: string | null
  onRetry: () => void
}

export function ConnectionStatusIndicator({
  isConnecting,
  isConnected,
  error,
  onRetry,
}: ConnectionStatusIndicatorProps) {
  if (isConnecting) {
    return (
      <div className="flex items-center gap-2">
        <div
          className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"
          aria-label="Connecting"
        />
        <span className="text-sm text-muted-foreground">Connecting...</span>
      </div>
    )
  }

  if (error || !isConnected) {
    return (
      <div className="flex items-center gap-2">
        <div
          className={cn('h-2 w-2 rounded-full bg-red-500')}
          aria-label="Disconnected"
        />
        <span className="text-sm text-muted-foreground">Disconnected</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRetry}
          className="h-6 px-2 text-xs"
        >
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className="h-2 w-2 rounded-full bg-green-500"
        aria-label="Connected"
      />
      <span className="text-sm text-muted-foreground">Connected</span>
    </div>
  )
}
