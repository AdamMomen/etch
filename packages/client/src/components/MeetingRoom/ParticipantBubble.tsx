import { useEffect, useRef, useState } from 'react'
import type { RemoteTrackPublication } from 'livekit-client'
import { Track } from 'livekit-client'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface ParticipantBubbleProps {
  videoTrackPublication: RemoteTrackPublication | undefined
  participantName: string
  participantColor: string
  isSpeaking?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
}

/**
 * Around-style floating bubble for displaying participant video/avatar
 * during screen sharing mode.
 *
 * Per UX spec: "Circular avatar 32-48px with gradient background and participant initial.
 * Border ring matches annotation color. Speaking state shows subtle pulse animation."
 */
export function ParticipantBubble({
  videoTrackPublication,
  participantName,
  participantColor,
  isSpeaking = false,
  size = 'md',
  className,
}: ParticipantBubbleProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isVideoReady, setIsVideoReady] = useState(false)

  // Determine if we have a video track to display
  const hasVideoTrack = videoTrackPublication?.isSubscribed && videoTrackPublication?.track

  // Attach video track to video element
  useEffect(() => {
    const videoElement = videoRef.current
    if (!videoElement || !videoTrackPublication?.track) {
      setIsVideoReady(false)
      return
    }

    const track = videoTrackPublication.track
    if (track.kind === Track.Kind.Video) {
      track.attach(videoElement)
      setIsVideoReady(true)
    }

    return () => {
      track.detach(videoElement)
      setIsVideoReady(false)
    }
  }, [videoTrackPublication?.track])

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'relative rounded-full overflow-hidden cursor-pointer',
              'ring-2 ring-offset-1 ring-offset-background',
              'transition-all duration-300 hover:scale-110',
              sizeClasses[size],
              className
            )}
            style={{
              '--tw-ring-color': participantColor,
              '--speaking-color': participantColor,
            } as React.CSSProperties}
          >
            {/* Avatar with initial - visible when no video */}
            <div
              className={cn(
                'absolute inset-0 flex items-center justify-center rounded-full font-medium text-white transition-opacity duration-300',
                hasVideoTrack && isVideoReady ? 'opacity-0' : 'opacity-100'
              )}
              style={{ backgroundColor: participantColor }}
            >
              {participantName.charAt(0).toUpperCase()}
            </div>

            {/* Video element - visible when video is available */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={cn(
                'h-full w-full object-cover rounded-full transition-opacity duration-300',
                hasVideoTrack && isVideoReady ? 'opacity-100' : 'opacity-0'
              )}
            />

            {/* Speaking indicator - pulsing border */}
            {isSpeaking && (
              <div
                className="absolute inset-0 rounded-full animate-speaking-pulse pointer-events-none"
                style={{
                  '--speaking-color': participantColor,
                } as React.CSSProperties}
              />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" sideOffset={8}>
          <p>{participantName}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
