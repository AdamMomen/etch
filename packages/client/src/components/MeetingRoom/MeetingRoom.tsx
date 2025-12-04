import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useSettingsStore } from '@/stores/settingsStore'
import { useRoomStore } from '@/stores/roomStore'
import { useLiveKit } from '@/hooks/useLiveKit'
import { useVideo } from '@/hooks/useVideo'
import { useDevices } from '@/hooks/useDevices'
import { useDeviceDisconnection } from '@/hooks/useDeviceDisconnection'
import { Sidebar } from './Sidebar'
import { MeetingControlsBar } from './MeetingControlsBar'
import { ConnectionStatusIndicator } from './ConnectionStatusIndicator'
import { LocalVideoPreview } from './LocalVideoPreview'
import { ParticipantGrid } from './ParticipantGrid'
import { ParticipantBubbles } from './ParticipantBubbles'
import { cn } from '@/lib/utils'

const RESPONSIVE_BREAKPOINT = 1000

export function MeetingRoom() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { sidebarCollapsed, toggleSidebar, setSidebarCollapsed } = useSettingsStore()
  const {
    currentRoom,
    clearRoom,
    isConnecting,
    isConnected,
    connectionError,
    localParticipant,
    remoteParticipants,
  } = useRoomStore()

  // Connect to LiveKit using room info
  const { room, retry } = useLiveKit({
    token: currentRoom?.token ?? null,
    livekitUrl: currentRoom?.livekitUrl ?? null,
  })

  // Video state and controls
  const { isVideoOff, videoTrack } = useVideo({ room })

  // Device enumeration for disconnection detection
  const { audioDevices, videoDevices } = useDevices()

  // Handle device disconnection - auto fallback to default
  useDeviceDisconnection({ room, audioDevices, videoDevices })

  // Screen sharing state (placeholder - will be fully implemented in Epic 3)
  const [isScreenSharing] = useState(false)

  // Combine local and remote participants for display
  const participants = useMemo(() => {
    const all = []
    if (localParticipant) {
      all.push(localParticipant)
    }
    all.push(...remoteParticipants)

    // Sort: host first, then by join order (local first among same role)
    return all.sort((a, b) => {
      if (a.role === 'host' && b.role !== 'host') return -1
      if (b.role === 'host' && a.role !== 'host') return 1
      if (a.isLocal && !b.isLocal) return -1
      if (b.isLocal && !a.isLocal) return 1
      return 0
    })
  }, [localParticipant, remoteParticipants])

  // Keyboard shortcut for sidebar toggle (Cmd+\ or Ctrl+\)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault()
        toggleSidebar()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleSidebar])

  // Responsive sidebar collapse
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < RESPONSIVE_BREAKPOINT) {
        setSidebarCollapsed(true)
      }
    }

    // Check on mount
    handleResize()

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [setSidebarCollapsed])

  const handleScreenShare = () => {
    toast.info('Screen sharing will be available in a future update')
  }

  const handleLeave = () => {
    clearRoom()
    navigate('/')
    toast.success('Left the meeting')
  }

  const handleInvite = () => {
    // Copy room link to clipboard (placeholder - full implementation in Story 2.13)
    const roomLink = `${window.location.origin}/join/${roomId}`
    navigator.clipboard.writeText(roomLink).then(() => {
      toast.success('Room link copied to clipboard')
    }).catch(() => {
      toast.error('Failed to copy room link')
    })
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top Toolbar */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b px-4">
        <div className="flex items-center gap-3">
          {/* Connection status indicator */}
          <ConnectionStatusIndicator
            isConnecting={isConnecting}
            isConnected={isConnected}
            error={connectionError}
            onRetry={retry}
          />
          {/* Room ID */}
          <span className="font-mono text-sm text-muted-foreground">
            {roomId || currentRoom?.roomId || 'Unknown Room'}
          </span>
        </div>

        {/* Annotation tools placeholder */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Annotation tools available when screen sharing
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          isCollapsed={sidebarCollapsed}
          participants={participants}
          localParticipantId={localParticipant?.id || ''}
          onInviteClick={handleInvite}
          onToggle={toggleSidebar}
        />

        {/* Center Content */}
        <main className="relative flex flex-1 flex-col bg-background/50">
          {isScreenSharing ? (
            // Screen sharing layout with floating bubbles
            <>
              {/* Screen share content placeholder */}
              <div className="flex flex-1 items-center justify-center">
                <div
                  className={cn(
                    'flex h-48 w-80 items-center justify-center rounded-lg border-2 border-dashed',
                    'border-muted-foreground/25 bg-muted/10'
                  )}
                >
                  <span className="text-sm text-muted-foreground">
                    Screen share content
                  </span>
                </div>
              </div>

              {/* Floating participant bubbles in corner */}
              <ParticipantBubbles
                room={room}
                remoteParticipants={remoteParticipants}
                className="absolute right-4 top-4"
              />

              {/* Local Video Preview - positioned in bottom right corner */}
              {localParticipant && (
                <LocalVideoPreview
                  videoTrack={videoTrack}
                  isVideoOff={isVideoOff}
                  participantName={localParticipant.name}
                  participantColor={localParticipant.color}
                  className="absolute bottom-4 right-4 h-36 w-48"
                />
              )}
            </>
          ) : (
            // Grid layout when no screen share
            <>
              {remoteParticipants.length > 0 ? (
                // Show participant grid when there are remote participants
                <ParticipantGrid
                  room={room}
                  localParticipant={localParticipant}
                  remoteParticipants={remoteParticipants}
                  localVideoTrack={videoTrack}
                  isLocalVideoOff={isVideoOff}
                  className="flex-1"
                />
              ) : (
                // Empty state when alone in the room
                <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
                  <div
                    className={cn(
                      'flex h-48 w-80 items-center justify-center rounded-lg border-2 border-dashed',
                      'border-muted-foreground/25 bg-muted/10'
                    )}
                  >
                    <span className="text-sm text-muted-foreground">
                      Waiting for others to join...
                    </span>
                  </div>
                  <p className="max-w-md text-sm text-muted-foreground">
                    Share the room link to invite participants, or wait for
                    others to join.
                  </p>

                  {/* Local Video Preview when alone - centered preview */}
                  {localParticipant && (
                    <LocalVideoPreview
                      videoTrack={videoTrack}
                      isVideoOff={isVideoOff}
                      participantName={localParticipant.name}
                      participantColor={localParticipant.color}
                      className="mt-4 h-48 w-64"
                    />
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Bottom Controls Bar */}
      <MeetingControlsBar
        room={room}
        onScreenShare={handleScreenShare}
        onLeave={handleLeave}
      />
    </div>
  )
}
