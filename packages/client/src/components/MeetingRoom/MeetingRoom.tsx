import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useSettingsStore } from '@/stores/settingsStore'
import { useRoomStore } from '@/stores/roomStore'
import { useVolumeStore } from '@/stores/volumeStore'
import { useLiveKit } from '@/hooks/useLiveKit'
import { useVideo } from '@/hooks/useVideo'
import { useScreenShare } from '@/hooks/useScreenShare'
import { useDevices } from '@/hooks/useDevices'
import { useDeviceDisconnection } from '@/hooks/useDeviceDisconnection'
import { Sidebar } from './Sidebar'
import { MeetingControlsBar } from './MeetingControlsBar'
import { ConnectionStatusIndicator } from './ConnectionStatusIndicator'
import { LocalVideoPreview } from './LocalVideoPreview'
import { ParticipantGrid } from './ParticipantGrid'
import { ParticipantBubbles } from './ParticipantBubbles'
import { LeaveConfirmDialog } from './LeaveConfirmDialog'
import { InviteModal } from './InviteModal'
import { ScreenShareViewer, SourcePickerDialog } from '@/components/ScreenShare'
import { generateInviteLink, copyToClipboard } from '@/lib/invite'
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

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false)

  // Track if auto-copy has been done (to prevent duplicates)
  const hasAutoCopiedRef = useRef(false)

  // Track if we're in the process of leaving (to handle window close)
  const isLeavingRef = useRef(false)

  // Video state and controls
  const { isVideoOff, videoTrack } = useVideo({ room })

  // Device enumeration for disconnection detection
  const { audioDevices, videoDevices } = useDevices()

  // Handle device disconnection - auto fallback to default
  useDeviceDisconnection({ room, audioDevices, videoDevices })

  // Screen share state and controls
  const {
    isSharing: isScreenSharing,
    isLocalSharing,
    canShare,
    sharerName,
    remoteScreenTrack,
    startScreenShare,
    stopScreenShare,
    sourcePicker,
    onSourcePickerClose,
    onSourceSelect,
  } = useScreenShare({
    room,
    livekitUrl: currentRoom?.livekitUrl,
    token: currentRoom?.token,
    screenShareToken: currentRoom?.screenShareToken,
  })

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

  const handleInvite = useCallback(() => {
    setShowInviteModal(true)
  }, [])

  // Keyboard shortcuts - must be after handleLeave is defined
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

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
      // Cmd+I or Ctrl+I for invite modal (AC-2.13.4)
      if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
        e.preventDefault()
        setShowInviteModal(true)
      }
      // Cmd+S or Ctrl+S for screen share toggle (AC-3.1.6, AC-3.3.9)
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (isLocalSharing) {
          stopScreenShare()
        } else {
          startScreenShare()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleSidebar, handleLeave, startScreenShare, stopScreenShare, isLocalSharing])

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

  // Auto-copy invite link on room creation for host (AC-2.13.3)
  useEffect(() => {
    // Only run once when host first connects to a newly created room
    if (
      isConnected &&
      isHost &&
      roomId &&
      !hasAutoCopiedRef.current
    ) {
      hasAutoCopiedRef.current = true
      const inviteLink = generateInviteLink(roomId)
      copyToClipboard(inviteLink).then((success) => {
        if (success) {
          toast.success('Invite link copied!')
        }
      })
    }
  }, [isConnected, isHost, roomId])

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
          {isScreenSharing && !isLocalSharing ? (
            // Viewing remote screen share - display ScreenShareViewer with floating bubbles
            <>
              {/* Remote screen share viewer (AC-3.2.1, AC-3.2.2, AC-3.2.4) */}
              <ScreenShareViewer
                track={remoteScreenTrack}
                sharerName={sharerName}
                className="flex-1"
              />

              {/* Floating participant bubbles in corner (AC-3.2.3) */}
              <ParticipantBubbles
                room={room}
                remoteParticipants={remoteParticipants}
                className="absolute bottom-20 right-4"
              />

              {/* Local Video Preview - positioned above bubbles */}
              {localParticipant && (
                <LocalVideoPreview
                  videoTrack={videoTrack}
                  isVideoOff={isVideoOff}
                  participantName={localParticipant.name}
                  participantColor={localParticipant.color}
                  className="absolute bottom-4 right-4 h-24 w-32"
                />
              )}
            </>
          ) : isScreenSharing && isLocalSharing ? (
            // Local user is sharing - show placeholder (actual screen visible on desktop)
            <>
              {/* Local share placeholder - user sees their actual screen */}
              <div className="flex flex-1 items-center justify-center bg-background p-4">
                <div
                  className={cn(
                    'flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-8',
                    'border-muted-foreground/25 bg-muted/10'
                  )}
                >
                  <span className="text-sm text-muted-foreground">
                    You are sharing your screen
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Others can see your shared content
                  </span>
                </div>
              </div>

              {/* Floating participant bubbles in corner */}
              <ParticipantBubbles
                room={room}
                remoteParticipants={remoteParticipants}
                className="absolute bottom-20 right-4"
              />

              {/* Local Video Preview */}
              {localParticipant && (
                <LocalVideoPreview
                  videoTrack={videoTrack}
                  isVideoOff={isVideoOff}
                  participantName={localParticipant.name}
                  participantColor={localParticipant.color}
                  className="absolute bottom-4 right-4 h-24 w-32"
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
        onLeave={handleLeave}
        onInvite={handleInvite}
        isLocalSharing={isLocalSharing}
        canShare={canShare}
        sharerName={sharerName}
        onStartScreenShare={startScreenShare}
        onStopScreenShare={stopScreenShare}
      />

      {/* Host Leave Confirmation Dialog */}
      <LeaveConfirmDialog
        open={showLeaveConfirm}
        onOpenChange={setShowLeaveConfirm}
        onConfirm={handleLeaveConfirm}
      />

      {/* Invite Modal */}
      <InviteModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        roomId={roomId || currentRoom?.roomId || ''}
      />

      {/* Source Picker Dialog for native screen share (macOS/Linux) */}
      <SourcePickerDialog
        open={sourcePicker.isOpen}
        onOpenChange={(open) => !open && onSourcePickerClose()}
        screens={sourcePicker.screens}
        windows={sourcePicker.windows}
        isLoading={sourcePicker.isLoading}
        onSelect={onSourceSelect}
      />
    </div>
  )
}
