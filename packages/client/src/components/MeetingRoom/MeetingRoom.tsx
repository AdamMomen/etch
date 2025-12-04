import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useSettingsStore } from '@/stores/settingsStore'
import { useRoomStore } from '@/stores/roomStore'
import { useVolumeStore } from '@/stores/volumeStore'
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
import { LeaveConfirmDialog } from './LeaveConfirmDialog'
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
  const { room, retry, leaveRoom } = useLiveKit({
    token: currentRoom?.token ?? null,
    livekitUrl: currentRoom?.livekitUrl ?? null,
  })

  // Leave confirmation dialog state for host
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)

  // Track if we're in the process of leaving (to handle window close)
  const isLeavingRef = useRef(false)

  // Video state and controls
  const { isVideoOff, videoTrack } = useVideo({ room })

  // Device enumeration for disconnection detection
  const { audioDevices, videoDevices } = useDevices()

  // Handle device disconnection - auto fallback to default
  useDeviceDisconnection({ room, audioDevices, videoDevices })

  // Screen sharing state (placeholder - will be fully implemented in Epic 3)
  const [isScreenSharing] = useState(false)

  // Get resetVolumes from volumeStore for cleanup on leave
  const resetVolumes = useVolumeStore((state) => state.resetVolumes)

  // Check if local participant is the host
  const isHost = localParticipant?.role === 'host'

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

  // Transfer host role to next participant before leaving (if host and others remain)
  const transferHostRole = useCallback(async () => {
    if (!room || !isHost || remoteParticipants.length === 0) return

    // Get next participant by array order (first remote participant)
    const nextHost = remoteParticipants[0]
    if (!nextHost) return

    // Send role transfer message via DataTrack
    const message = {
      type: 'role_transfer',
      newHostId: nextHost.id,
      previousHostId: localParticipant?.id,
      timestamp: Date.now(),
    }

    try {
      await room.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify(message)),
        { reliable: true }
      )
    } catch (err) {
      console.error('Failed to send role transfer message:', err)
      // Continue with leave even if role transfer message fails
    }
  }, [room, isHost, remoteParticipants, localParticipant?.id])

  // Perform the actual leave operation
  const performLeave = useCallback(async () => {
    // If host and there are other participants, transfer host role first
    if (isHost && remoteParticipants.length > 0) {
      await transferHostRole()
    }

    await leaveRoom()
    clearRoom()
    resetVolumes() // Reset per-participant volume settings (AC: 2.11.6)
    navigate('/')
    toast.success('Left the meeting')
  }, [isHost, remoteParticipants.length, transferHostRole, leaveRoom, clearRoom, resetVolumes, navigate])

  // Handle leave button click - show confirmation for host, immediate leave for participants
  const handleLeave = useCallback(() => {
    if (isHost) {
      setShowLeaveConfirm(true)
    } else {
      performLeave()
    }
  }, [isHost, performLeave])

  // Handle host leave confirmation
  const handleLeaveConfirm = useCallback(() => {
    setShowLeaveConfirm(false)
    performLeave()
  }, [performLeave])

  const handleScreenShare = useCallback(() => {
    toast.info('Screen sharing will be available in a future update')
  }, [])

  const handleInvite = useCallback(() => {
    // Copy room link to clipboard (placeholder - full implementation in Story 2.13)
    const roomLink = `${window.location.origin}/join/${roomId}`
    navigator.clipboard.writeText(roomLink).then(() => {
      toast.success('Room link copied to clipboard')
    }).catch(() => {
      toast.error('Failed to copy room link')
    })
  }, [roomId])

  // Keyboard shortcuts - must be after handleLeave is defined
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+\ or Ctrl+\ for sidebar toggle
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault()
        toggleSidebar()
      }
      // Cmd+W or Ctrl+W for leave meeting
      if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
        e.preventDefault()
        handleLeave()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleSidebar, handleLeave])

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

  // Handle Tauri window close event - disconnect before closing
  useEffect(() => {
    // Only set up the listener if we're connected
    if (!isConnected) return

    let unlistenFn: (() => void) | null = null

    const setupCloseHandler = async () => {
      try {
        const appWindow = getCurrentWindow()
        unlistenFn = await appWindow.onCloseRequested(async (event) => {
          // Prevent double-handling
          if (isLeavingRef.current) return

          // Prevent default close behavior
          event.preventDefault()
          isLeavingRef.current = true

          try {
            // Perform clean disconnect
            await leaveRoom()
            clearRoom()
            resetVolumes()
          } finally {
            // Now allow the window to close
            await appWindow.close()
          }
        })
      } catch {
        // Not running in Tauri environment (e.g., web browser), skip
      }
    }

    setupCloseHandler()

    return () => {
      if (unlistenFn) {
        unlistenFn()
      }
    }
  }, [isConnected, leaveRoom, clearRoom, resetVolumes])

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

      {/* Host Leave Confirmation Dialog */}
      <LeaveConfirmDialog
        open={showLeaveConfirm}
        onOpenChange={setShowLeaveConfirm}
        onConfirm={handleLeaveConfirm}
      />
    </div>
  )
}
