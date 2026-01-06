import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { useSettingsStore } from '@/stores/settingsStore'
import { useRoomStore } from '@/stores/roomStore'
import { useVolumeStore } from '@/stores/volumeStore'
import { useLiveKit } from '@/hooks/useLiveKit'
import { useVideo } from '@/hooks/useVideo'
import { useScreenShare, showSharingTray, hideSharingTray } from '@/hooks/useScreenShare'
import { useDevices } from '@/hooks/useDevices'
import { useDeviceDisconnection } from '@/hooks/useDeviceDisconnection'
import { useAnnotationSync } from '@/hooks/useAnnotationSync'
import { validateRoomExists, joinRoom } from '@/lib/api'
import { Sidebar } from './Sidebar'
import { MeetingControlsBar } from './MeetingControlsBar'
import { ConnectionStatusIndicator } from './ConnectionStatusIndicator'
import { LocalVideoPreview } from './LocalVideoPreview'
import { ParticipantGrid } from './ParticipantGrid'
import { LeaveConfirmDialog } from './LeaveConfirmDialog'
import { InviteModal } from './InviteModal'
import { ScreenShareViewer, SourcePickerDialog, DraggableParticipantStack } from '@/components/ScreenShare'
import { generateInviteLink, copyToClipboard } from '@/lib/invite'
import { cn } from '@/lib/utils'

const RESPONSIVE_BREAKPOINT = 1000

export function MeetingRoom() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { sidebarCollapsed, toggleSidebar, setSidebarCollapsed, displayName } = useSettingsStore()
  const {
    currentRoom,
    setCurrentRoom,
    clearRoom,
    isConnecting,
    isConnected,
    connectionError,
    localParticipant,
    remoteParticipants,
  } = useRoomStore()

  // Track if we're attempting auto-rejoin to prevent multiple attempts
  const autoRejoinAttemptedRef = useRef(false)

  // Handle page refresh or direct navigation to /room/xxx
  // If no room credentials exist, attempt to rejoin automatically
  useEffect(() => {
    if (!currentRoom && roomId && !autoRejoinAttemptedRef.current) {
      autoRejoinAttemptedRef.current = true

      const attemptAutoRejoin = async () => {
        // If no display name, redirect to join flow to collect it
        if (!displayName) {
          console.log('[MeetingRoom] No display name found, redirecting to join flow')
          navigate(`/join/${roomId}`)
          return
        }

        console.log('[MeetingRoom] Attempting auto-rejoin after refresh')

        try {
          // Validate room still exists first (Story 2.17)
          const exists = await validateRoomExists(roomId)

          if (!exists) {
            console.log('[MeetingRoom] Room no longer exists, redirecting to home')
            toast.error(`Room "${roomId}" no longer exists`)
            navigate('/')
            return
          }

          // Room exists - rejoin it
          const response = await joinRoom(roomId, displayName)

          // Store new credentials
          setCurrentRoom({
            roomId,
            token: response.token,
            screenShareToken: response.screenShareToken,
            livekitUrl: response.livekitUrl,
          })

          console.log('[MeetingRoom] Auto-rejoin successful')
        } catch (error) {
          console.error('[MeetingRoom] Auto-rejoin failed:', error)
          const message = error instanceof Error ? error.message : 'Failed to rejoin room'
          toast.error(message)
          navigate('/')
        }
      }

      attemptAutoRejoin()
    }
  }, [currentRoom, roomId, displayName, navigate, setCurrentRoom])

  // Connect to LiveKit using room info
  const { room, isRetrying, retry, leaveRoom } = useLiveKit({
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

  // Screen share state and controls (Story 3.7 - ADR-011 Menu Bar)
  const {
    isSharing: isScreenSharing,
    isLocalSharing,
    canShare,
    isSupported: isScreenShareSupported,
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

  // Debug logging for screen share state changes
  useEffect(() => {
    console.log('[MeetingRoom] Screen share state changed:', {
      isScreenSharing,
      isLocalSharing,
      hasRemoteTrack: remoteScreenTrack !== null,
      trackSid: remoteScreenTrack?.sid,
      shouldShowViewer: isScreenSharing && !isLocalSharing,
      timestamp: Date.now(),
    })
  }, [isScreenSharing, isLocalSharing, remoteScreenTrack])

  // Annotation sync - runs at MeetingRoom level so both viewers AND sharers receive annotations
  // Story 4.11: Sharer needs to receive annotation DataTrack messages to display on overlay
  const isScreenShareActive = isScreenSharing || remoteScreenTrack !== null
  const {
    syncState,
    publishStroke,
    publishStrokeUpdate,
    publishDelete,
    publishClearAll,
  } = useAnnotationSync(room, isScreenShareActive)

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

  // System tray event listeners (Story 3.7 - ADR-011)
  // Listen for tray://stop-sharing and tray://leave-meeting events
  useEffect(() => {
    let unlistenStopSharing: UnlistenFn | null = null
    let unlistenLeaveMeeting: UnlistenFn | null = null

    const setupTrayListeners = async () => {
      try {
        // AC-3.7.4: Handle "Stop Sharing" from tray menu
        unlistenStopSharing = await listen('tray://stop-sharing', () => {
          console.log('[MeetingRoom] Received tray://stop-sharing event')
          stopScreenShare()
        })

        // AC-3.7.5: Handle "Leave Meeting" from tray menu
        // Story 3.9: Stop sharing first to restore window before leaving
        unlistenLeaveMeeting = await listen('tray://leave-meeting', async () => {
          console.log('[MeetingRoom] Received tray://leave-meeting event')
          if (isLocalSharing) {
            await stopScreenShare()
          }
          performLeave()
        })

        console.log('[MeetingRoom] Tray event listeners set up')
      } catch (error) {
        console.warn('[MeetingRoom] Failed to set up tray listeners:', error)
      }
    }

    setupTrayListeners()

    return () => {
      if (unlistenStopSharing) unlistenStopSharing()
      if (unlistenLeaveMeeting) unlistenLeaveMeeting()
    }
  }, [stopScreenShare, performLeave, isLocalSharing])

  // Tray lifecycle - show/hide tray based on screen share state (AC-3.7.1, AC-3.7.7)
  useEffect(() => {
    if (isLocalSharing) {
      // Show tray when sharing starts
      showSharingTray()
    } else {
      // Hide tray when sharing stops
      hideSharingTray()
    }
  }, [isLocalSharing])

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
            isRetrying={isRetrying}
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
            // Viewing remote screen share - display ScreenShareViewer with draggable bubbles
            <>
              {/* Remote screen share viewer (AC-3.2.1, AC-3.2.2, AC-3.2.4) */}
              <ScreenShareViewer
                track={remoteScreenTrack}
                sharerName={sharerName}
                room={room}
                syncState={syncState}
                publishStroke={publishStroke}
                publishStrokeUpdate={publishStrokeUpdate}
                publishDelete={publishDelete}
                publishClearAll={publishClearAll}
                className="flex-1"
              />

              {/* Draggable participant bubbles (AC-3.2.3) */}
              {localParticipant && (
                <DraggableParticipantStack
                  room={room}
                  localParticipant={{
                    name: localParticipant.name,
                    color: localParticipant.color,
                    videoTrack: videoTrack,
                    isVideoOff: isVideoOff,
                  }}
                  remoteParticipants={remoteParticipants}
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

              {/* Draggable participant bubbles */}
              {localParticipant && (
                <DraggableParticipantStack
                  room={room}
                  localParticipant={{
                    name: localParticipant.name,
                    color: localParticipant.color,
                    videoTrack: videoTrack,
                    isVideoOff: isVideoOff,
                  }}
                  remoteParticipants={remoteParticipants}
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
        isScreenShareSupported={isScreenShareSupported}
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

      {/* Source Picker Dialog for native screen share (macOS/Linux) - screens only */}
      <SourcePickerDialog
        open={sourcePicker.isOpen}
        onOpenChange={(open) => !open && onSourcePickerClose()}
        screens={sourcePicker.screens}
        isLoading={sourcePicker.isLoading}
        onSelect={onSourceSelect}
      />
    </div>
  )
}
