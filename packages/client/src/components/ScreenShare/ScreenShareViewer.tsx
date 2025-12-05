import { useEffect, useRef, useState } from 'react'
import type { RemoteVideoTrack } from 'livekit-client'
import { Track } from 'livekit-client'
import { MonitorUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScreenShareViewerProps {
  track: RemoteVideoTrack | null
  sharerName: string | null
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
  className,
}: ScreenShareViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isVideoReady, setIsVideoReady] = useState(false)

  // Attach screen share track to video element
  useEffect(() => {
    const videoElement = videoRef.current
    if (!videoElement || !track) {
      setIsVideoReady(false)
      return
    }

    if (track.kind === Track.Kind.Video) {
      track.attach(videoElement)
      setIsVideoReady(true)
    }

    return () => {
      track.detach(videoElement)
      setIsVideoReady(false)
    }
  }, [track])

  // Don't render if no track
  if (!track) {
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

      {/* Loading placeholder while video is attaching */}
      {!isVideoReady && (
        <div className="flex items-center justify-center text-muted-foreground">
          <span className="text-sm">Loading screen share...</span>
        </div>
      )}
    </div>
  )
}
