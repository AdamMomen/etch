import { useEffect, useRef, useState, useMemo } from 'react'
import type { RemoteVideoTrack, Room } from 'livekit-client'
import { Track } from 'livekit-client'
import { MonitorUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AnnotationCanvas } from '@/components/AnnotationCanvas'
import { AnnotationToolbar } from '@/components/AnnotationToolbar'
import { useAnnotations } from '@/hooks/useAnnotations'
import { useAnnotationKeyboard } from '@/hooks/useAnnotationKeyboard'
import type { SyncState } from '@/hooks/useAnnotationSync'
import type { Stroke, Point } from '@nameless/shared'

interface ScreenShareViewerProps {
  track: RemoteVideoTrack | null
  sharerName: string | null
  /** LiveKit room for DataTrack sync (Story 4.7) */
  room: Room | null
  /** Sync state from parent (Story 4.11 - moved to MeetingRoom level) */
  syncState: SyncState
  /** Publish completed stroke */
  publishStroke: (stroke: Stroke) => void
  /** Publish incremental stroke updates */
  publishStrokeUpdate: (
    strokeId: string,
    participantId: string,
    tool: 'pen' | 'highlighter',
    color: string,
    points: Point[]
  ) => void
  /** Publish stroke deletion */
  publishDelete: (strokeId: string) => void
  /** Publish clear all */
  publishClearAll: () => void
  className?: string
}

/**
 * Display component for viewing a remote participant's shared screen.
 *
 * Per UX spec:
 * - Shared screen fills content area with aspect ratio preservation (object-fit: contain)
 * - Minimum 16px padding on all sides
 * - Letterbox/pillarbox with dark background if aspect ratio doesn't match
 * - "{name} is sharing" indicator in top-left corner
 */
export function ScreenShareViewer({
  track,
  sharerName,
  room,
  syncState,
  publishStroke,
  publishStrokeUpdate,
  publishDelete,
  publishClearAll,
  className,
}: ScreenShareViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isVideoReady, setIsVideoReady] = useState(false)
  const isScreenShareActive = track !== null

  // Create sync callbacks object for useAnnotations
  // Sync is now managed at MeetingRoom level (Story 4.11)
  const sync = useMemo(
    () =>
      room
        ? {
            publishStroke,
            publishStrokeUpdate,
            publishDelete,
            publishClearAll,
          }
        : null,
    [room, publishStroke, publishStrokeUpdate, publishDelete, publishClearAll]
  )

  // Use annotation hook for drawing functionality with sync integration
  const {
    strokes,
    activeStroke,
    activeTool,
    canAnnotate,
    startStroke,
    continueStroke,
    endStroke,
    // Eraser functionality (Story 4.5)
    eraseStrokeAt,
    updateHoveredStroke,
    clearHoveredStroke,
    hoveredStrokeId,
    // Remote strokes (Story 4.7)
    remoteActiveStrokes,
  } = useAnnotations({ sync })

  // Register keyboard shortcuts for annotation tools
  useAnnotationKeyboard()

  // Attach screen share track to video element
  useEffect(() => {
    const videoElement = videoRef.current
    console.log('[ScreenShareViewer] useEffect for track attachment:', {
      hasVideoElement: !!videoElement,
      hasTrack: !!track,
      trackSid: track?.sid,
      timestamp: Date.now(),
    })

    // If track is null, ensure video element is cleared
    if (!track && videoElement) {
      console.log('[ScreenShareViewer] Clearing video element (no track)', { timestamp: Date.now() })
      videoElement.srcObject = null
      videoElement.src = ''
      setIsVideoReady(false)
      return
    }

    if (!videoElement || !track) {
      setIsVideoReady(false)
      return
    }

    if (track.kind === Track.Kind.Video) {
      console.log('[ScreenShareViewer] Attaching track to video element', { trackSid: track.sid, timestamp: Date.now() })
      track.attach(videoElement)
      setIsVideoReady(true)
    }

    return () => {
      console.log('[ScreenShareViewer] Cleanup - detaching track from video element', { trackSid: track.sid, timestamp: Date.now() })
      track.detach(videoElement)
      // Also explicitly clear the video source to prevent showing last frame
      videoElement.srcObject = null
      videoElement.src = ''
      setIsVideoReady(false)
    }
  }, [track])

  // Log track changes for debugging
  useEffect(() => {
    console.log('[ScreenShareViewer] Track changed:', {
      hasTrack: track !== null,
      trackSid: track?.sid,
      timestamp: Date.now(),
    })
  }, [track])

  // Don't render if no track
  if (!track) {
    console.log('[ScreenShareViewer] No track, returning null')
    return null
  }

  return (
    <div
      className={cn(
        'relative flex flex-1 items-center justify-center bg-background p-4',
        className
      )}
      data-testid="screen-share-viewer"
    >
      {/* Sharer indicator - top-left corner (AC-3.2.4) */}
      <div
        className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-md bg-black/60 px-3 py-1.5 text-sm text-white"
        data-testid="sharer-indicator"
      >
        <MonitorUp className="h-4 w-4" />
        <span>{sharerName || 'Someone'} is sharing</span>
      </div>

      {/* Annotation toolbar - top center (AC-4.6.1) */}
      <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2">
        <AnnotationToolbar isScreenShareActive={isScreenShareActive} />
      </div>

      {/* Video container with annotation overlay */}
      <div className="relative flex max-h-full max-w-full items-center justify-center">
        {/* Screen share video - object-fit: contain for aspect ratio preservation (AC-3.2.1) */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            'max-h-full max-w-full object-contain transition-opacity duration-300',
            isVideoReady ? 'opacity-100' : 'opacity-0'
          )}
          data-testid="screen-share-video"
        />

        {/* Annotation canvas overlay - positioned over video content area (AC-4.1.1) */}
        {isVideoReady && (
          <AnnotationCanvas
            videoRef={videoRef}
            isScreenShareActive={isScreenShareActive}
            strokes={strokes}
            activeStroke={activeStroke}
            remoteActiveStrokes={remoteActiveStrokes}
            canAnnotate={canAnnotate}
            activeTool={activeTool}
            onStrokeStart={startStroke}
            onStrokeMove={continueStroke}
            onStrokeEnd={endStroke}
            // Eraser functionality (Story 4.5)
            onEraseAt={eraseStrokeAt}
            onEraserHover={updateHoveredStroke}
            onEraserHoverEnd={clearHoveredStroke}
            hoveredStrokeId={hoveredStrokeId}
            // Late-joiner sync state (Story 4.8)
            syncState={syncState}
          />
        )}
      </div>

      {/* Loading placeholder while video is attaching */}
      {!isVideoReady && (
        <div className="flex items-center justify-center text-muted-foreground">
          <span className="text-sm">Loading screen share...</span>
        </div>
      )}
    </div>
  )
}
