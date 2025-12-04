import { useEffect, useRef } from 'react'
import { Track } from 'livekit-client'
import { cn } from '@/lib/utils'

interface LocalVideoPreviewProps {
  videoTrack: Track | null
  isVideoOff: boolean
  participantName: string
  participantColor: string
  className?: string
}

export function LocalVideoPreview({
  videoTrack,
  isVideoOff,
  participantName,
  participantColor,
  className,
}: LocalVideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  // Attach video track to video element
  useEffect(() => {
    if (!videoRef.current || !videoTrack) return

    // Attach the track to the video element
    videoTrack.attach(videoRef.current)

    return () => {
      if (videoRef.current) {
        videoTrack.detach(videoRef.current)
      }
    }
  }, [videoTrack])

  const showVideo = !isVideoOff && videoTrack

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg bg-muted',
        className
      )}
    >
      {/* Avatar placeholder - visible when video is off */}
      <div
        className={cn(
          'absolute inset-0 flex items-center justify-center transition-opacity duration-300',
          showVideo ? 'opacity-0' : 'opacity-100'
        )}
      >
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full text-3xl font-medium text-white"
          style={{ backgroundColor: participantColor }}
        >
          {participantName.charAt(0).toUpperCase()}
        </div>
      </div>

      {/* Video element - always rendered so track can attach, visibility controlled by CSS */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted // Local preview should be muted to avoid echo
        className={cn(
          'h-full w-full object-cover transition-opacity duration-300',
          showVideo ? 'opacity-100' : 'opacity-0'
        )}
        style={{ transform: 'scaleX(-1)' }} // Mirror for natural self-view
      />

      {/* Name overlay */}
      <div className="absolute bottom-2 left-2 rounded bg-black/50 px-2 py-1 text-xs text-white">
        {participantName} (You)
      </div>
    </div>
  )
}
