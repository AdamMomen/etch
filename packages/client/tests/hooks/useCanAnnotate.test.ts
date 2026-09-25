import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCanAnnotate } from '@/hooks/useCanAnnotate'
import { useRoomStore } from '@/stores/roomStore'

describe('useCanAnnotate (Story 5.3)', () => {
  beforeEach(() => {
    act(() => {
      useRoomStore.setState({
        localParticipant: {
          id: 'local-1',
          name: 'Test User',
          role: 'annotator',
          color: '#ff0000',
          isLocal: true,
        },
        remoteParticipants: [],
        annotationsEnabled: true,
      })
    })
  })

  it('returns false for viewer role', () => {
    act(() => {
      useRoomStore.setState({
        localParticipant: {
          id: 'local-1',
          name: 'Test Viewer',
          role: 'viewer',
          color: '#ff0000',
          isLocal: true,
        },
      })
    })

    const { result } = renderHook(() => useCanAnnotate())
    expect(result.current).toBe(false)
  })

  it('returns true for annotator when annotationsEnabled is true', () => {
    const { result } = renderHook(() => useCanAnnotate())
    expect(result.current).toBe(true)
  })

  it('returns false for annotator when annotationsEnabled is false', () => {
    act(() => {
      useRoomStore.setState({ annotationsEnabled: false })
    })

    const { result } = renderHook(() => useCanAnnotate())
    expect(result.current).toBe(false)
  })

  it('returns true for sharer when annotationsEnabled is true', () => {
    act(() => {
      useRoomStore.setState({
        localParticipant: {
          id: 'local-1',
          name: 'Test Sharer',
          role: 'sharer',
          color: '#ff0000',
          isLocal: true,
        },
      })
    })

    const { result } = renderHook(() => useCanAnnotate())
    expect(result.current).toBe(true)
  })

  it('returns false for sharer when annotationsEnabled is false', () => {
    act(() => {
      useRoomStore.setState({
        annotationsEnabled: false,
        localParticipant: {
          id: 'local-1',
          name: 'Test Sharer',
          role: 'sharer',
          color: '#ff0000',
          isLocal: true,
        },
      })
    })

    const { result } = renderHook(() => useCanAnnotate())
    expect(result.current).toBe(false)
  })

  it('returns true for host even when annotationsEnabled is false', () => {
    act(() => {
      useRoomStore.setState({
        annotationsEnabled: false,
        localParticipant: {
          id: 'local-1',
          name: 'Test Host',
          role: 'host',
          color: '#ff0000',
          isLocal: true,
        },
      })
    })

    const { result } = renderHook(() => useCanAnnotate())
    expect(result.current).toBe(true)
  })

  it('returns false when there is no local participant', () => {
    act(() => {
      useRoomStore.setState({ localParticipant: null })
    })

    const { result } = renderHook(() => useCanAnnotate())
    expect(result.current).toBe(false)
  })

  it('updates when role changes at runtime', () => {
    const { result } = renderHook(() => useCanAnnotate())
    expect(result.current).toBe(true)

    act(() => {
      useRoomStore.setState({
        localParticipant: {
          id: 'local-1',
          name: 'Test Viewer',
          role: 'viewer',
          color: '#ff0000',
          isLocal: true,
        },
      })
    })

    expect(result.current).toBe(false)
  })
})
