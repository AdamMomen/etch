import { useMemo } from 'react'
import type { Room, RemoteParticipant } from 'livekit-client'
import { Track } from 'livekit-client'
import { cn } from '@/lib/utils'
import { ParticipantBubble } from './ParticipantBubble'
import { RemoteParticipantAudio } from './RemoteParticipantAudio'
import type { Participant } from '@nameless/shared'

interface ParticipantBubblesProps {
  room: Room | null
  remoteParticipants: Participant[]
  className?: string
}

/**
 * Floating bubbles layout for displaying participant videos during screen sharing.
 *
 * Per UX spec: "Floating bubbles stacked in corner during screen share.
 * Participant videos are displayed as floating bubbles (Around-style)."
 */
export function ParticipantBubbles({
  room,
  remoteParticipants,
  className,
}: ParticipantBubblesProps) {
  // Get LiveKit remote participants for track access
  const liveKitRemoteParticipants = useMemo(() => {
    if (!room) return new Map<string, RemoteParticipant>()
    return room.remoteParticipants
  }, [room])

  if (remoteParticipants.length === 0) {
    return null
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-2',
        className
      )}
    >
      {remoteParticipants.map((participant) => {
        const lkParticipant = liveKitRemoteParticipants.get(participant.id)

        if (!lkParticipant) {
          // Participant not yet in LiveKit - show avatar placeholder
          return (
            <div
              key={participant.id}
              title={participant.name}
              className={cn(
                'relative h-10 w-10 rounded-full overflow-hidden',
                'ring-2 ring-offset-1 ring-offset-background'
              )}
              style={{
                '--tw-ring-color': participant.color,
              } as React.CSSProperties}
            >
              <div
                className="flex h-full w-full items-center justify-center rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: participant.color }}
              >
                {participant.name.charAt(0).toUpperCase()}
              </div>
            </div>
          )
        }

        const videoTrackPub = lkParticipant.getTrackPublication(Track.Source.Camera)
        const audioTrackPub = lkParticipant.getTrackPublication(Track.Source.Microphone)

        return (
          <div key={participant.id}>
            <ParticipantBubble
              videoTrackPublication={videoTrackPub}
              participantName={participant.name}
              participantColor={participant.color}
              isSpeaking={participant.isSpeaking}
              size="md"
            />
            <RemoteParticipantAudio
              trackPublication={audioTrackPub}
              participantId={participant.id}
            />
          </div>
        )
      })}
    </div>
  )
}
