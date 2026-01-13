import { useEffect, useRef, useState } from 'react'
import type { RemoteTrackPublication } from 'livekit-client'
import { Track, TrackEvent } from 'livekit-client'
import { cn } from '@/lib/utils'

interface RemoteParticipantVideoProps {
  trackPublication: RemoteTrackPublication | undefined
  participantName: string
  participantColor: string
  isSpeaking?: boolean
  className?: string
}

export function RemoteParticipantVideo({
  trackPublication,
  participantName,
  participantColor,
  isSpeaking = false,
  className,
}: RemoteParticipantVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isVideoReady, setIsVideoReady] = useState(false)
  const [isMuted, setIsMuted] = useState(trackPublication?.isMuted ?? true)

  // Determine if we have an enabled video track to display
  // Check isSubscribed, track exists, and track is not muted (camera enabled)
  const hasVideoTrack =
    trackPublication?.isSubscribed && trackPublication?.track && !isMuted

  // Listen for mute/unmute events on the track
  useEffect(() => {
    const track = trackPublication?.track
    if (!track) {
      setIsMuted(true)
      return
    }

    // Sync initial muted state
    setIsMuted(trackPublication?.isMuted ?? false)

    const handleMuted = () => {
      setIsMuted(true)
      setIsVideoReady(false)
    }

    const handleUnmuted = () => {
      setIsMuted(false)
    }

    track.on(TrackEvent.Muted, handleMuted)
    track.on(TrackEvent.Unmuted, handleUnmuted)

    return () => {
      track.off(TrackEvent.Muted, handleMuted)
      track.off(TrackEvent.Unmuted, handleUnmuted)
    }
  }, [trackPublication?.track, trackPublication?.isMuted])

  // Attach video track to video element
  useEffect(() => {
    const videoElement = videoRef.current
    if (!videoElement || !trackPublication?.track) {
      setIsVideoReady(false)
      return
    }

    const track = trackPublication.track
    if (track.kind === Track.Kind.Video) {
      track.attach(videoElement)
      // Only set ready if not muted
      if (!trackPublication.isMuted) {
        setIsVideoReady(true)
      }
    }

    return () => {
      track.detach(videoElement)
      setIsVideoReady(false)
    }
  }, [trackPublication?.track, trackPublication?.isMuted])

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg bg-muted transition-shadow duration-300',
        isSpeaking && 'ring-2 ring-offset-2 ring-offset-background',
        className
      )}
      style={
        isSpeaking
          ? ({ '--tw-ring-color': participantColor } as React.CSSProperties)
          : undefined
      }
    >
      {/* Avatar placeholder - visible when no video */}
      <div
        className={cn(
          'absolute inset-0 flex items-center justify-center transition-opacity duration-300',
          hasVideoTrack && isVideoReady ? 'opacity-0' : 'opacity-100'
        )}
      >
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full text-3xl font-medium text-white"
          style={{ backgroundColor: participantColor }}
        >
          {participantName.charAt(0).toUpperCase()}
        </div>
      </div>

      {/* Video element - visible when video is available */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={cn(
          'h-full w-full object-cover transition-opacity duration-300',
          hasVideoTrack && isVideoReady ? 'opacity-100' : 'opacity-0'
        )}
        // Remote videos should NOT be mirrored (unlike local preview)
      />

      {/* Name overlay */}
      <div className="absolute bottom-2 left-2 rounded bg-black/50 px-2 py-1 text-xs text-white">
        {participantName}
      </div>

      {/* Speaking indicator animation */}
      {isSpeaking && (
        <div
          className="absolute inset-0 rounded-lg animate-pulse pointer-events-none"
          style={{
            boxShadow: `inset 0 0 0 2px ${participantColor}`,
          }}
        />
      )}
    </div>
  )
}
