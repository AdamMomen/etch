import { useMemo } from 'react'
import { useRoomStore } from '@/stores/roomStore'
import type { Participant } from '@etch/shared'

export interface UseParticipantsResult {
  /** The local participant, or null when not connected */
  localParticipant: Participant | null
  /** Remote participants (screen-share companions already filtered at ingestion) */
  remoteParticipants: Participant[]
  /** All participants sorted: host first, then local participant first */
  participants: Participant[]
  /** Total number of human participants (local + remote) */
  participantCount: number
  /** Whether the local participant has the host role */
  isHost: boolean
}

/**
 * Hook exposing the room's participants in display order.
 * Sort logic: host first, then local participant first among same role.
 */
export function useParticipants(): UseParticipantsResult {
  const localParticipant = useRoomStore((state) => state.localParticipant)
  const remoteParticipants = useRoomStore((state) => state.remoteParticipants)

  const participants = useMemo(() => {
    const all: Participant[] = []
    if (localParticipant) {
      all.push(localParticipant)
    }
    all.push(...remoteParticipants)

    // Sort: host first, then by join order (local first among same role)
    return all.sort((a, b) => {
      if (a.role === 'host' && b.role !== 'host') return -1
      if (b.role === 'host' && a.role !== 'host') return 1
      if (a.isLocal && !b.isLocal) return -1
      if (b.isLocal && !a.isLocal) return 1
      return 0
    })
  }, [localParticipant, remoteParticipants])

  const isHost = localParticipant?.role === 'host'

  return {
    localParticipant,
    remoteParticipants,
    participants,
    participantCount: participants.length,
    isHost,
  }
}
