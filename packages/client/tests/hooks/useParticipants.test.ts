import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useParticipants } from '@/hooks/useParticipants'
import { useRoomStore } from '@/stores/roomStore'
import type { Participant } from '@etch/shared'

const makeParticipant = (
  id: string,
  role: Participant['role'],
  isLocal = false
): Participant => ({
  id,
  name: `User ${id}`,
  role,
  color: '#ff0000',
  isLocal,
})

describe('useParticipants', () => {
  beforeEach(() => {
    act(() => {
      useRoomStore.setState({
        localParticipant: null,
        remoteParticipants: [],
      })
    })
  })

  it('returns null localParticipant and empty lists when not connected', () => {
    const { result } = renderHook(() => useParticipants())

    expect(result.current.localParticipant).toBeNull()
    expect(result.current.remoteParticipants).toEqual([])
    expect(result.current.participants).toEqual([])
    expect(result.current.participantCount).toBe(0)
    expect(result.current.isHost).toBe(false)
  })

  it('combines local and remote participants', () => {
    act(() => {
      useRoomStore.setState({
        localParticipant: makeParticipant('local', 'annotator', true),
        remoteParticipants: [makeParticipant('r1', 'annotator')],
      })
    })

    const { result } = renderHook(() => useParticipants())

    expect(result.current.participantCount).toBe(2)
    expect(result.current.remoteParticipants).toHaveLength(1)
  })

  it('sorts host first', () => {
    act(() => {
      useRoomStore.setState({
        localParticipant: makeParticipant('local', 'annotator', true),
        remoteParticipants: [
          makeParticipant('r1', 'annotator'),
          makeParticipant('r2', 'host'),
        ],
      })
    })

    const { result } = renderHook(() => useParticipants())

    expect(result.current.participants[0].id).toBe('r2')
  })

  it('sorts local first among same role', () => {
    act(() => {
      useRoomStore.setState({
        localParticipant: makeParticipant('local', 'annotator', true),
        remoteParticipants: [
          makeParticipant('r1', 'annotator'),
          makeParticipant('r2', 'viewer'),
        ],
      })
    })

    const { result } = renderHook(() => useParticipants())

    expect(result.current.participants[0].id).toBe('local')
  })

  it('sorts remote host before local non-host', () => {
    act(() => {
      useRoomStore.setState({
        localParticipant: makeParticipant('local', 'viewer', true),
        remoteParticipants: [makeParticipant('r1', 'host')],
      })
    })

    const { result } = renderHook(() => useParticipants())

    expect(result.current.participants.map((p) => p.id)).toEqual([
      'r1',
      'local',
    ])
  })

  it('reports isHost when local participant is host', () => {
    act(() => {
      useRoomStore.setState({
        localParticipant: makeParticipant('local', 'host', true),
        remoteParticipants: [makeParticipant('r1', 'annotator')],
      })
    })

    const { result } = renderHook(() => useParticipants())

    expect(result.current.isHost).toBe(true)
  })
})
