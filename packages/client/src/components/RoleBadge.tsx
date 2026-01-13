import { Crown, MonitorUp, Pen, Eye } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { Role } from '@etch/shared'

interface RoleBadgeProps {
  role: Role
  isSharingScreen?: boolean
  className?: string
}

export function RoleBadge({
  role,
  isSharingScreen,
  className,
}: RoleBadgeProps) {
  // Dynamic sharer badge: show when actively sharing, regardless of role
  const isActiveSharer = isSharingScreen === true

  // Determine display based on role and sharing status
  const getRoleBadgeInfo = () => {
    if (isActiveSharer) {
      return {
        icon: MonitorUp,
        text: 'Sharing',
        color: 'text-info',
        bgColor: 'bg-info/10',
        tooltip: 'Currently sharing screen',
      }
    }

    switch (role) {
      case 'host':
        return {
          icon: Crown,
          text: 'Host',
          color: 'text-accent',
          bgColor: '',
          tooltip: 'Meeting host - Full control',
        }
      case 'viewer':
        return {
          icon: Eye,
          text: 'View only',
          color: 'text-muted-foreground',
          bgColor: '',
          tooltip: 'View only - cannot annotate',
        }
      case 'annotator':
      case 'sharer': // sharer role when not actively sharing shows as annotator
      default:
        return {
          icon: Pen,
          text: null, // Annotator has no text label, icon only
          color: 'text-primary',
          bgColor: '',
          tooltip: 'Can draw annotations',
        }
    }
  }

  const { icon: Icon, text, color, bgColor, tooltip } = getRoleBadgeInfo()

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-flex items-center gap-1 text-xs',
              bgColor && `rounded px-1.5 py-0.5 ${bgColor}`,
              color,
              className
            )}
            role="status"
            aria-label={`${role} role badge`}
          >
            <Icon className="h-3 w-3" aria-hidden="true" />
            {text && <span>{text}</span>}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
