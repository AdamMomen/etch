import { describe, it, expect } from 'vitest'
import type {
  Participant as LKParticipant,
  RemoteParticipant,
  Room,
} from 'livekit-client'
import {
  isScreenShareParticipant,
  getScreenShareParentId,
  getHumanRemoteParticipants,
} from '@/lib/participants'

// Minimal fake LiveKit participant (identity + metadata are all the helpers read)
const fakeParticipant = (identity: string, metadata?: string): LKParticipant =>
  ({ identity, name: identity, metadata }) as unknown as LKParticipant

const SCREENSHARE_METADATA = JSON.stringify({
  isScreenShare: true,
  parentId: 'user-1',
})

const HUMAN_METADATA = JSON.stringify({
  role: 'annotator',
  color: '#ff0000',
})

describe('isScreenShareParticipant', () => {
  it('returns true for a screen-share companion connection', () => {
    expect(
      isScreenShareParticipant(
        fakeParticipant('user-1-screenshare', SCREENSHARE_METADATA)
      )
    ).toBe(true)
  })

  it('returns false for a real user participant', () => {
    expect(
      isScreenShareParticipant(fakeParticipant('user-1', HUMAN_METADATA))
    ).toBe(false)
  })

  it('returns false for missing metadata', () => {
    expect(isScreenShareParticipant(fakeParticipant('user-1'))).toBe(false)
    expect(isScreenShareParticipant(fakeParticipant('user-1', ''))).toBe(false)
  })

  it('returns false for malformed metadata', () => {
    expect(
      isScreenShareParticipant(fakeParticipant('user-1', 'not-json{{'))
    ).toBe(false)
  })

  it('returns false when isScreenShare is explicitly false', () => {
    expect(
      isScreenShareParticipant(
        fakeParticipant('user-1', JSON.stringify({ isScreenShare: false }))
      )
    ).toBe(false)
  })
})

describe('getScreenShareParentId', () => {
  it('returns parentId for a screen-share companion', () => {
    expect(
      getScreenShareParentId(
        fakeParticipant('user-1-screenshare', SCREENSHARE_METADATA)
      )
    ).toBe('user-1')
  })

  it('returns undefined for a real user even if parentId is present', () => {
    expect(
      getScreenShareParentId(
        fakeParticipant(
          'user-1',
          JSON.stringify({ isScreenShare: false, parentId: 'other' })
        )
      )
    ).toBeUndefined()
  })

  it('returns undefined when parentId is absent', () => {
    expect(
      getScreenShareParentId(
        fakeParticipant('x', JSON.stringify({ isScreenShare: true }))
      )
    ).toBeUndefined()
  })

  it('returns undefined for missing or malformed metadata', () => {
    expect(getScreenShareParentId(fakeParticipant('user-1'))).toBeUndefined()
    expect(
      getScreenShareParentId(fakeParticipant('user-1', 'not-json'))
    ).toBeUndefined()
  })
})

describe('getHumanRemoteParticipants', () => {
  it('filters out screen-share companions', () => {
    const humans = [
      fakeParticipant('user-1', HUMAN_METADATA),
      fakeParticipant('user-2', HUMAN_METADATA),
    ]
    const companions = [
      fakeParticipant('user-1-screenshare', SCREENSHARE_METADATA),
      fakeParticipant(
        'user-2-screenshare',
        JSON.stringify({ isScreenShare: true, parentId: 'user-2' })
      ),
    ]

    const room = {
      remoteParticipants: new Map<string, RemoteParticipant>(
        [...humans, ...companions].map((p) => [
          p.identity,
          p as unknown as RemoteParticipant,
        ])
      ),
    } as unknown as Room

    const result = getHumanRemoteParticipants(room)

    expect(result).toHaveLength(2)
    expect(result.map((p) => p.identity).sort()).toEqual(['user-1', 'user-2'])
  })

  it('returns empty array when only companions are present', () => {
    const room = {
      remoteParticipants: new Map<string, RemoteParticipant>([
        [
          'user-1-screenshare',
          fakeParticipant(
            'user-1-screenshare',
            SCREENSHARE_METADATA
          ) as unknown as RemoteParticipant,
        ],
      ]),
    } as unknown as Room

    expect(getHumanRemoteParticipants(room)).toHaveLength(0)
  })

  it('returns empty array when room has no remote participants', () => {
    const room = {
      remoteParticipants: new Map<string, RemoteParticipant>(),
    } as unknown as Room

    expect(getHumanRemoteParticipants(room)).toEqual([])
  })
})
