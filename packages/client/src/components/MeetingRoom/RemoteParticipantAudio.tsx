import { useEffect, useRef } from 'react'
import type { RemoteTrackPublication, RemoteAudioTrack } from 'livekit-client'
import { Track } from 'livekit-client'
import { useVolumeStore } from '@/stores/volumeStore'

interface RemoteParticipantAudioProps {
  trackPublication: RemoteTrackPublication | undefined
  participantId: string
}

/**
 * Hidden audio element for playing remote participant audio.
 * Audio tracks auto-play when attached to an audio element.
 * Volume is controlled via the volumeStore.
 *
 * AC: 2.11.3, 2.11.4, 2.11.6
 */
export function RemoteParticipantAudio({
  trackPublication,
  participantId,
}: RemoteParticipantAudioProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const volume = useVolumeStore((state) => state.getVolume(participantId))

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

  // Apply volume changes instantly via LiveKit's setVolume
  useEffect(() => {
    const track = trackPublication?.track
    if (track && track.kind === Track.Kind.Audio) {
      // LiveKit RemoteAudioTrack has setVolume method
      // Volume range: 0.0 to any positive number (>1.0 boosts audio)
      ;(track as RemoteAudioTrack).setVolume(volume)
    }
  }, [trackPublication?.track, volume])

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
