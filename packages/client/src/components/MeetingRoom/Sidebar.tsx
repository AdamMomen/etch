import { Users, UserPlus, ChevronLeft, ChevronRight, Crown, Video, VideoOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Participant } from '@nameless/shared'

interface SidebarProps {
  isCollapsed: boolean
  participants: Participant[]
  localParticipantId: string
  onInviteClick: () => void
  onToggle: () => void
}

export function Sidebar({
  isCollapsed,
  participants,
  localParticipantId,
  onInviteClick,
  onToggle,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        'relative flex flex-col border-r bg-background transition-all duration-200 ease-in-out',
        isCollapsed ? 'w-0 overflow-hidden border-r-0' : 'w-64'
      )}
    >
      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'absolute -right-3 top-4 z-10 h-6 w-6 rounded-full border bg-background shadow-sm',
          isCollapsed && 'right-[-24px]'
        )}
        onClick={onToggle}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </Button>

      {/* Sidebar Content */}
      <div
        className={cn(
          'flex flex-1 flex-col transition-opacity duration-200',
          isCollapsed ? 'opacity-0' : 'opacity-100'
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Participants
          </span>
          <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {participants.length}
          </span>
        </div>

        {/* Participant List */}
        <div className="flex-1 overflow-y-auto p-2">
          <ul className="space-y-1">
            {participants.map((participant) => (
              <ParticipantListItem
                key={participant.id}
                participant={participant}
                isLocal={participant.id === localParticipantId}
              />
            ))}
          </ul>
        </div>

        {/* Invite Button */}
        <div className="border-t p-3">
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={onInviteClick}
          >
            <UserPlus className="h-4 w-4" />
            Invite
          </Button>
        </div>
      </div>
    </aside>
  )
}

interface ParticipantListItemProps {
  participant: Participant
  isLocal: boolean
}

function ParticipantListItem({ participant, isLocal }: ParticipantListItemProps) {
  return (
    <li
      className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/50"
    >
      {/* Avatar with speaking indicator */}
      <div className="relative shrink-0">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium text-white"
          style={{ backgroundColor: participant.color }}
        >
          {participant.name.charAt(0).toUpperCase()}
        </div>
        {/* Speaking indicator ring */}
        {participant.isSpeaking && (
          <div
            className="absolute inset-0 rounded-full animate-pulse"
            style={{
              boxShadow: `0 0 0 2px ${participant.color}`,
            }}
            aria-label="Speaking"
          />
        )}
      </div>

      {/* Name and Role */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <span className="truncate text-sm font-medium">
          {participant.name}
          {isLocal && (
            <span className="ml-1 text-muted-foreground">(You)</span>
          )}
        </span>
        {participant.role === 'host' && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Crown className="h-3 w-3 text-yellow-500" />
            Host
          </span>
        )}
      </div>

      {/* Video indicator */}
      <div className="shrink-0">
        {participant.hasVideo ? (
          <Video className="h-4 w-4 text-muted-foreground" aria-label="Video on" />
        ) : (
          <VideoOff className="h-4 w-4 text-muted-foreground/50" aria-label="Video off" />
        )}
      </div>
    </li>
  )
}
