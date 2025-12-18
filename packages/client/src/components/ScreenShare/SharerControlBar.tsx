/**
 * SharerControlBar - Compact control bar for screen sharers (Story 3.7 - ADR-009)
 *
 * Displays when the main window transforms into control bar mode during screen sharing.
 * Provides quick access to meeting controls without separate window IPC.
 *
 * Features:
 * - Self camera preview (circular)
 * - Optional participant previews
 * - Mic/camera toggle controls
 * - Sharing status indicator
 * - Stop Share and Leave buttons
 * - Draggable via data-tauri-drag-region
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { Room, Track } from 'livekit-client'
import {
  Mic,
  MicOff,
  Camera,
  CameraOff,
  MonitorOff,
  LogOut,
  GripVertical,
  Pencil,
  Users,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useSettingsStore } from '@/stores/settingsStore'
import { useRoomStore } from '@/stores/roomStore'

interface SharerControlBarProps {
  room: Room | null
  videoTrack: Track | null
  onStopShare: () => void
  onLeave: () => void
  className?: string
}

export function SharerControlBar({
  room,
  videoTrack,
  onStopShare,
  onLeave,
  className,
}: SharerControlBarProps) {
  // State from stores
  const isMuted = useSettingsStore((s) => s.isMuted)
  const isVideoOff = useSettingsStore((s) => s.isVideoOff)
  const setMuted = useSettingsStore((s) => s.setMuted)
  const setVideoOff = useSettingsStore((s) => s.setVideoOff)
  const remoteParticipants = useRoomStore((s) => s.remoteParticipants)
  const localParticipant = useRoomStore((s) => s.localParticipant)

  // Local state for view mode toggle
  const [showMultiView, setShowMultiView] = useState(false)

  // Video refs
  const selfVideoRef = useRef<HTMLVideoElement>(null)

  // Attach video track to self preview
  useEffect(() => {
    if (!selfVideoRef.current || !videoTrack) return

    videoTrack.attach(selfVideoRef.current)

    return () => {
      if (selfVideoRef.current) {
        videoTrack.detach(selfVideoRef.current)
      }
    }
  }, [videoTrack])

  // Mic toggle handler
  const handleMicToggle = useCallback(async () => {
    if (!room) return
    const newMuted = !isMuted
    setMuted(newMuted)
    try {
      await room.localParticipant.setMicrophoneEnabled(!newMuted)
    } catch (error) {
      console.error('[SharerControlBar] Failed to toggle mic:', error)
      setMuted(isMuted) // Revert on error
    }
  }, [room, isMuted, setMuted])

  // Camera toggle handler
  const handleCameraToggle = useCallback(async () => {
    if (!room) return
    const newVideoOff = !isVideoOff
    setVideoOff(newVideoOff)
    try {
      await room.localParticipant.setCameraEnabled(!newVideoOff)
    } catch (error) {
      console.error('[SharerControlBar] Failed to toggle camera:', error)
      setVideoOff(isVideoOff) // Revert on error
    }
  }, [room, isVideoOff, setVideoOff])

  // Toggle view mode
  const handleViewToggle = useCallback(() => {
    setShowMultiView((prev) => !prev)
  }, [])

  const showVideo = !isVideoOff && videoTrack

  // Get participant avatars for multi-view
  const participantAvatars = remoteParticipants.slice(0, 3).map((p) => ({
    id: p.id,
    name: p.name || 'Guest',
    color: p.color || '#6366f1',
  }))
  const overflowCount = Math.max(0, remoteParticipants.length - 3)

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2',
        'bg-black/90 rounded-xl',
        'select-none cursor-grab',
        'shadow-2xl border border-white/10',
        className
      )}
      data-tauri-drag-region
      data-testid="sharer-control-bar"
    >
      {/* Drag Handle */}
      <div
        className="flex items-center justify-center w-5 h-full text-white/40 hover:text-white/60"
        title="Drag to move"
        data-tauri-drag-region
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Self Camera Preview (Circular) */}
      <div className="relative w-12 h-12 rounded-full overflow-hidden bg-muted shrink-0">
        {showVideo ? (
          <video
            ref={selfVideoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
        ) : (
          <div
            className="h-full w-full flex items-center justify-center text-white font-medium"
            style={{ backgroundColor: localParticipant?.color || '#6366f1' }}
          >
            {localParticipant?.name?.charAt(0).toUpperCase() || '?'}
          </div>
        )}
        {/* Camera off indicator */}
        {isVideoOff && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <CameraOff className="w-4 h-4 text-white/80" />
          </div>
        )}
      </div>

      {/* Multi-view participant previews (optional) */}
      {showMultiView && participantAvatars.length > 0 && (
        <div className="flex items-center -space-x-2">
          {participantAvatars.map((p) => (
            <div
              key={p.id}
              className="w-8 h-8 rounded-full border-2 border-black/80 flex items-center justify-center text-xs font-medium text-white"
              style={{ backgroundColor: p.color }}
              title={p.name}
            >
              {p.name.charAt(0).toUpperCase()}
            </div>
          ))}
          {overflowCount > 0 && (
            <div className="w-8 h-8 rounded-full border-2 border-black/80 bg-gray-600 flex items-center justify-center text-xs font-medium text-white">
              +{overflowCount}
            </div>
          )}
        </div>
      )}

      {/* Separator */}
      <div className="w-px h-8 bg-white/20" />

      {/* Sharing Status Indicator */}
      <div className="flex items-center gap-1.5 px-2">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-white text-xs font-medium">Sharing</span>
      </div>

      {/* Separator */}
      <div className="w-px h-8 bg-white/20" />

      {/* View Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'h-8 w-8 rounded-full',
          showMultiView
            ? 'bg-white/20 text-white'
            : 'text-white/60 hover:bg-white/10 hover:text-white'
        )}
        onClick={handleViewToggle}
        aria-label={showMultiView ? 'Show single view' : 'Show multi view'}
      >
        {showMultiView ? <Users className="h-4 w-4" /> : <User className="h-4 w-4" />}
      </Button>

      {/* Mic Toggle */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'h-8 w-8 rounded-full',
          isMuted
            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
            : 'text-white/80 hover:bg-white/10 hover:text-white'
        )}
        onClick={handleMicToggle}
        aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
      >
        {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </Button>

      {/* Camera Toggle */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'h-8 w-8 rounded-full',
          isVideoOff
            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
            : 'text-white/80 hover:bg-white/10 hover:text-white'
        )}
        onClick={handleCameraToggle}
        aria-label={isVideoOff ? 'Enable camera' : 'Disable camera'}
      >
        {isVideoOff ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
      </Button>

      {/* Annotate Button (placeholder) */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full text-white/40 cursor-not-allowed"
        disabled
        aria-label="Annotate (coming soon)"
        title="Annotation coming in Epic 4"
      >
        <Pencil className="h-4 w-4" />
      </Button>

      {/* Separator before action buttons */}
      <div className="w-px h-8 bg-white/20" />
      <div className="w-1" />

      {/* Stop Share Button - Accent color, filled */}
      <Button
        size="sm"
        className="h-8 px-3 bg-primary text-primary-foreground hover:bg-primary/90"
        onClick={onStopShare}
        aria-label="Stop sharing"
      >
        <MonitorOff className="h-3.5 w-3.5 mr-1.5" />
        Stop
      </Button>

      {/* Leave Button - Destructive outline style */}
      <Button
        variant="outline"
        size="sm"
        className="h-8 px-3 border-red-500/50 text-red-400 hover:bg-red-500/20 hover:text-red-300"
        onClick={onLeave}
        aria-label="Leave meeting"
      >
        <LogOut className="h-3.5 w-3.5 mr-1.5" />
        Leave
      </Button>
    </div>
  )
}
