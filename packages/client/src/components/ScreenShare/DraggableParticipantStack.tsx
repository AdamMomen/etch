import { useMemo } from 'react'
import type { Room, RemoteParticipant, Track as LKTrack } from 'livekit-client'
import { Track } from 'livekit-client'
import { GripVertical, GripHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDraggablePosition } from '@/hooks/useDraggablePosition'
import { LocalVideoPreview } from '@/components/MeetingRoom/LocalVideoPreview'
import { ParticipantBubble } from '@/components/MeetingRoom/ParticipantBubble'
import { RemoteParticipantAudio } from '@/components/MeetingRoom/RemoteParticipantAudio'
import type { Participant } from '@nameless/shared'

interface DraggableParticipantStackProps {
  room: Room | null
  localParticipant: {
    name: string
    color: string
    videoTrack: LKTrack | null
    isVideoOff: boolean
  }
  remoteParticipants: Participant[]
  className?: string
}

/**
 * Draggable container for participant video bubbles during screen sharing.
 *
 * Features:
 * - All participants displayed as uniform circular bubbles
 * - Drag handle for repositioning
 * - Auto-switches between horizontal/vertical layout based on edge proximity
 * - Position persists to localStorage
 */
export function DraggableParticipantStack({
  room,
  localParticipant,
  remoteParticipants,
  className,
}: DraggableParticipantStackProps) {
  const {
    position,
    isDragging,
    orientation,
    containerRef,
    dragHandleProps,
  } = useDraggablePosition({
    storageKey: 'participant-stack-position',
  })

  // Get LiveKit remote participants for track access
  const liveKitRemoteParticipants = useMemo(() => {
    if (!room) return new Map<string, RemoteParticipant>()
    return room.remoteParticipants
  }, [room])

  const GripIcon = orientation === 'horizontal' ? GripVertical : GripHorizontal

  // Don't render if position hasn't been calculated yet
  if (position.x === -1 || position.y === -1) {
    return null
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'fixed z-50 flex items-center gap-1',
        'rounded-full bg-black/30 backdrop-blur-sm',
        'p-1.5 shadow-lg',
        'transition-[flex-direction] duration-200',
        orientation === 'horizontal' ? 'flex-row' : 'flex-col',
        isDragging && 'cursor-grabbing',
        className
      )}
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      {/* Drag Handle */}
      <div
        {...dragHandleProps}
        className={cn(
          'flex items-center justify-center',
          'rounded-full p-1',
          'text-white/60 hover:text-white hover:bg-white/10',
          'cursor-grab transition-colors',
          isDragging && 'cursor-grabbing text-white bg-white/20'
        )}
        title="Drag to reposition"
      >
        <GripIcon className="h-4 w-4" />
      </div>

      {/* Bubbles Container */}
      <div
        className={cn(
          'flex gap-1.5',
          orientation === 'horizontal' ? 'flex-row' : 'flex-col'
        )}
      >
        {/* Local participant bubble */}
        <LocalVideoPreview
          videoTrack={localParticipant.videoTrack}
          isVideoOff={localParticipant.isVideoOff}
          participantName={localParticipant.name}
          participantColor={localParticipant.color}
          variant="circle"
          size="md"
        />

        {/* Remote participant bubbles */}
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
    </div>
  )
}
