import { useMemo } from 'react'
import type { Room, RemoteParticipant } from 'livekit-client'
import { Track } from 'livekit-client'
import { cn } from '@/lib/utils'
import { RemoteParticipantVideo } from './RemoteParticipantVideo'
import { RemoteParticipantAudio } from './RemoteParticipantAudio'
import { LocalVideoPreview } from './LocalVideoPreview'
import type { Participant } from '@etch/shared'

interface ParticipantGridProps {
  room: Room | null
  localParticipant: Participant | null
  remoteParticipants: Participant[]
  localVideoTrack: import('livekit-client').Track | null
  isLocalVideoOff: boolean
  className?: string
}

/**
 * Calculate grid dimensions based on participant count.
 * Per UX spec: 2x2 for ≤4, 3x3 for 5-9, 4x3 for 10+
 */
function getGridConfig(count: number): { cols: number; rows: number } {
  if (count <= 1) return { cols: 1, rows: 1 }
  if (count <= 4) return { cols: 2, rows: 2 }
  if (count <= 9) return { cols: 3, rows: 3 }
  return { cols: 4, rows: 3 } // max 12
}

/**
 * Grid layout for displaying participant videos when no screen share is active.
 *
 * Per UX spec: "Grid layout for no screen share (2x2 for ≤4, 3x3 for 5-9).
 * Uses CSS Grid for responsive layout."
 */
export function ParticipantGrid({
  room,
  localParticipant,
  remoteParticipants,
  localVideoTrack,
  isLocalVideoOff,
  className,
}: ParticipantGridProps) {
  // Total participant count including local
  const totalCount = (localParticipant ? 1 : 0) + remoteParticipants.length

  // Get grid configuration
  const gridConfig = useMemo(() => getGridConfig(totalCount), [totalCount])

  // Get LiveKit remote participants for track access
  const liveKitRemoteParticipants = useMemo((): Map<string, RemoteParticipant> => {
    if (!room) return new Map<string, RemoteParticipant>()
    return room.remoteParticipants
  }, [room])

  return (
    <div
      className={cn('h-full w-full p-4', className)}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${gridConfig.cols}, 1fr)`,
        gridTemplateRows: `repeat(${gridConfig.rows}, 1fr)`,
        gap: '1rem',
      }}
    >
      {/* Local participant video */}
      {localParticipant && (
        <LocalVideoPreview
          videoTrack={localVideoTrack}
          isVideoOff={isLocalVideoOff}
          participantName={localParticipant.name}
          participantColor={localParticipant.color}
          className="h-full w-full min-h-0"
        />
      )}

      {/* Remote participant videos */}
      {remoteParticipants.map((participant) => {
        const lkParticipant = liveKitRemoteParticipants.get(participant.id)

        if (!lkParticipant) {
          // Participant not yet in LiveKit - show placeholder
          return (
            <div
              key={participant.id}
              className="relative flex h-full w-full min-h-0 items-center justify-center rounded-lg bg-muted"
            >
              <div
                className="flex h-20 w-20 items-center justify-center rounded-full text-3xl font-medium text-white"
                style={{ backgroundColor: participant.color }}
              >
                {participant.name.charAt(0).toUpperCase()}
              </div>
              <div className="absolute bottom-2 left-2 rounded bg-black/50 px-2 py-1 text-xs text-white">
                {participant.name}
              </div>
            </div>
          )
        }

        const videoTrackPub = lkParticipant.getTrackPublication(Track.Source.Camera)
        const audioTrackPub = lkParticipant.getTrackPublication(Track.Source.Microphone)

        return (
          <div key={participant.id} className="relative h-full w-full min-h-0">
            <RemoteParticipantVideo
              trackPublication={videoTrackPub}
              participantName={participant.name}
              participantColor={participant.color}
              isSpeaking={participant.isSpeaking}
              className="h-full w-full"
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
