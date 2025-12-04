import { useEffect, useRef } from 'react'
import type { RemoteTrackPublication } from 'livekit-client'
import { Track } from 'livekit-client'

interface RemoteParticipantAudioProps {
  trackPublication: RemoteTrackPublication | undefined
  participantId: string
}

/**
 * Hidden audio element for playing remote participant audio.
 * Audio tracks auto-play when attached to an audio element.
 */
export function RemoteParticipantAudio({
  trackPublication,
  participantId,
}: RemoteParticipantAudioProps) {
  const audioRef = useRef<HTMLAudioElement>(null)

  // Attach audio track to audio element
  useEffect(() => {
    const audioElement = audioRef.current
    if (!audioElement || !trackPublication?.track) {
      return
    }

    const track = trackPublication.track
    if (track.kind === Track.Kind.Audio) {
      track.attach(audioElement)
    }

    return () => {
      track.detach(audioElement)
    }
  }, [trackPublication?.track])

  // Don't render if no track
  if (!trackPublication?.isSubscribed) {
    return null
  }

  return (
    <audio
      ref={audioRef}
      autoPlay
      // Remote audio should NOT be muted (unlike local preview)
      data-participant-id={participantId}
    />
  )
}
