import type {
  Participant as LKParticipant,
  RemoteParticipant,
  Room,
} from 'livekit-client'
import { parseParticipantMetadata } from '@/utils/participantMetadata'

/**
 * Each desktop user connects to LiveKit twice: the WebView app (identity `id`)
 * and the Core sidecar (identity `id-screenshare`, metadata
 * `{ isScreenShare: true, parentId }`). The companion connection is not a real
 * user — these helpers are the single place that knows about it.
 */

/** True for the Core's `<id>-screenshare` companion connection (not a real user). */
export function isScreenShareParticipant(p: LKParticipant): boolean {
  return parseParticipantMetadata(p.metadata || '').isScreenShare === true
}

/** Identity of the real user behind a screen-share companion participant, else undefined. */
export function getScreenShareParentId(p: LKParticipant): string | undefined {
  const metadata = parseParticipantMetadata(p.metadata || '')
  return metadata.isScreenShare ? metadata.parentId : undefined
}

/** Remote participants that are real users (screen-share companions filtered out). */
export function getHumanRemoteParticipants(room: Room): RemoteParticipant[] {
  const humans: RemoteParticipant[] = []
  room.remoteParticipants.forEach((participant) => {
    if (!isScreenShareParticipant(participant)) {
      humans.push(participant)
    }
  })
  return humans
}
