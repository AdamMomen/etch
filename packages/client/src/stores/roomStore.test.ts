import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useRoomStore } from './roomStore'

describe('roomStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    act(() => {
      useRoomStore.setState({
        currentRoom: null,
        isConnecting: false,
        isConnected: false,
        connectionError: null,
        localParticipant: null,
        remoteParticipants: [],
      })
    })
  })

  describe('room management', () => {
    it('sets current room', () => {
      const room = {
        roomId: 'test-room',
        token: 'test-token',
        livekitUrl: 'wss://livekit.example.com',
        screenShareToken: 'test-screen-share-token',
      }

      act(() => {
        useRoomStore.getState().setCurrentRoom(room)
      })

      expect(useRoomStore.getState().currentRoom).toEqual(room)
    })

    it('clears room and resets all state', () => {
      // Set up some state
      act(() => {
        useRoomStore.setState({
          currentRoom: { roomId: 'test', token: 'token', livekitUrl: 'wss://lk.com', screenShareToken: 'screen-token' },
          isConnected: true,
          localParticipant: { id: '1', name: 'Test', role: 'host', color: '#f97316', isLocal: true },
          remoteParticipants: [{ id: '2', name: 'Other', role: 'annotator', color: '#06b6d4', isLocal: false }],
        })
      })

      act(() => {
        useRoomStore.getState().clearRoom()
      })

      const state = useRoomStore.getState()
      expect(state.currentRoom).toBeNull()
      expect(state.isConnected).toBe(false)
      expect(state.localParticipant).toBeNull()
      expect(state.remoteParticipants).toEqual([])
    })
  })

  describe('connection state', () => {
    it('updates connection state - connecting', () => {
      act(() => {
        useRoomStore.getState().setConnectionState({
          isConnecting: true,
          isConnected: false,
        })
      })

      const state = useRoomStore.getState()
      expect(state.isConnecting).toBe(true)
      expect(state.isConnected).toBe(false)
    })

    it('updates connection state - connected', () => {
      act(() => {
        useRoomStore.getState().setConnectionState({
          isConnecting: false,
          isConnected: true,
        })
      })

      const state = useRoomStore.getState()
      expect(state.isConnecting).toBe(false)
      expect(state.isConnected).toBe(true)
    })

    it('sets connection error', () => {
      act(() => {
        useRoomStore.getState().setConnectionState({
          isConnecting: false,
          isConnected: false,
          error: 'Connection failed',
        })
      })

      expect(useRoomStore.getState().connectionError).toBe('Connection failed')
    })

    it('clears connection error', () => {
      // Set error first
      act(() => {
        useRoomStore.setState({ connectionError: 'Some error' })
      })

      // Clear it
      act(() => {
        useRoomStore.getState().setConnectionState({ error: null })
      })

      expect(useRoomStore.getState().connectionError).toBeNull()
    })

    it('preserves other state when updating partial connection state', () => {
      act(() => {
        useRoomStore.setState({
          isConnecting: true,
          isConnected: false,
          connectionError: null,
        })
      })

      act(() => {
        useRoomStore.getState().setConnectionState({ isConnected: true })
      })

      // isConnecting should remain unchanged since we only set isConnected
      const state = useRoomStore.getState()
      expect(state.isConnected).toBe(true)
      expect(state.isConnecting).toBe(true) // unchanged
    })
  })

  describe('local participant', () => {
    it('sets local participant', () => {
      const participant = {
        id: 'local-1',
        name: 'Test User',
        role: 'host' as const,
        color: '#f97316',
        isLocal: true,
      }

      act(() => {
        useRoomStore.getState().setLocalParticipant(participant)
      })

      expect(useRoomStore.getState().localParticipant).toEqual(participant)
    })

    it('clears local participant', () => {
      act(() => {
        useRoomStore.setState({
          localParticipant: { id: '1', name: 'Test', role: 'host', color: '#f97316', isLocal: true },
        })
      })

      act(() => {
        useRoomStore.getState().setLocalParticipant(null)
      })

      expect(useRoomStore.getState().localParticipant).toBeNull()
    })
  })

  describe('remote participants', () => {
    it('adds remote participant', () => {
      const participant = {
        id: 'remote-1',
        name: 'Alice',
        role: 'annotator' as const,
        color: '#06b6d4',
        isLocal: false,
      }

      act(() => {
        useRoomStore.getState().addRemoteParticipant(participant)
      })

      expect(useRoomStore.getState().remoteParticipants).toHaveLength(1)
      expect(useRoomStore.getState().remoteParticipants[0]).toEqual(participant)
    })

    it('does not add duplicate participant', () => {
      const participant = {
        id: 'remote-1',
        name: 'Alice',
        role: 'annotator' as const,
        color: '#06b6d4',
        isLocal: false,
      }

      act(() => {
        useRoomStore.getState().addRemoteParticipant(participant)
        useRoomStore.getState().addRemoteParticipant(participant)
      })

      expect(useRoomStore.getState().remoteParticipants).toHaveLength(1)
    })

    it('removes remote participant by ID', () => {
      act(() => {
        useRoomStore.setState({
          remoteParticipants: [
            { id: 'remote-1', name: 'Alice', role: 'annotator', color: '#06b6d4', isLocal: false },
            { id: 'remote-2', name: 'Bob', role: 'viewer', color: '#a855f7', isLocal: false },
          ],
        })
      })

      act(() => {
        useRoomStore.getState().removeRemoteParticipant('remote-1')
      })

      const participants = useRoomStore.getState().remoteParticipants
      expect(participants).toHaveLength(1)
      expect(participants[0].id).toBe('remote-2')
    })

    it('handles removing non-existent participant', () => {
      act(() => {
        useRoomStore.setState({
          remoteParticipants: [
            { id: 'remote-1', name: 'Alice', role: 'annotator', color: '#06b6d4', isLocal: false },
          ],
        })
      })

      act(() => {
        useRoomStore.getState().removeRemoteParticipant('non-existent')
      })

      expect(useRoomStore.getState().remoteParticipants).toHaveLength(1)
    })
  })

  describe('update participant', () => {
    it('updates local participant when ID matches', () => {
      act(() => {
        useRoomStore.setState({
          localParticipant: { id: 'local-1', name: 'Test', role: 'host', color: '#f97316', isLocal: true },
        })
      })

      act(() => {
        useRoomStore.getState().updateParticipant('local-1', { name: 'Updated Name' })
      })

      expect(useRoomStore.getState().localParticipant?.name).toBe('Updated Name')
    })

    it('updates remote participant when ID matches', () => {
      act(() => {
        useRoomStore.setState({
          remoteParticipants: [
            { id: 'remote-1', name: 'Alice', role: 'annotator', color: '#06b6d4', isLocal: false },
          ],
        })
      })

      act(() => {
        useRoomStore.getState().updateParticipant('remote-1', { role: 'viewer' })
      })

      expect(useRoomStore.getState().remoteParticipants[0].role).toBe('viewer')
    })

    it('does not modify other participants', () => {
      act(() => {
        useRoomStore.setState({
          remoteParticipants: [
            { id: 'remote-1', name: 'Alice', role: 'annotator', color: '#06b6d4', isLocal: false },
            { id: 'remote-2', name: 'Bob', role: 'viewer', color: '#a855f7', isLocal: false },
          ],
        })
      })

      act(() => {
        useRoomStore.getState().updateParticipant('remote-1', { name: 'Updated' })
      })

      const participants = useRoomStore.getState().remoteParticipants
      expect(participants[0].name).toBe('Updated')
      expect(participants[1].name).toBe('Bob')
    })
  })

  describe('clear participants', () => {
    it('clears both local and remote participants', () => {
      act(() => {
        useRoomStore.setState({
          localParticipant: { id: 'local', name: 'Test', role: 'host', color: '#f97316', isLocal: true },
          remoteParticipants: [
            { id: 'remote-1', name: 'Alice', role: 'annotator', color: '#06b6d4', isLocal: false },
          ],
        })
      })

      act(() => {
        useRoomStore.getState().clearParticipants()
      })

      const state = useRoomStore.getState()
      expect(state.localParticipant).toBeNull()
      expect(state.remoteParticipants).toEqual([])
    })
  })
})
