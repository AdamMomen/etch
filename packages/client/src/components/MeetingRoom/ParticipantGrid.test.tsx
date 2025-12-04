import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Room, RemoteParticipant } from 'livekit-client'
import { ParticipantGrid } from './ParticipantGrid'
import type { Participant } from '@nameless/shared'

// Mock livekit-client
vi.mock('livekit-client', () => ({
  Track: {
    Kind: {
      Video: 'video',
      Audio: 'audio',
    },
    Source: {
      Camera: 'camera',
      Microphone: 'microphone',
    },
  },
}))

// Mock child components
vi.mock('./RemoteParticipantVideo', () => ({
  RemoteParticipantVideo: ({ participantName }: { participantName: string }) => (
    <div data-testid={`remote-video-${participantName}`}>{participantName}</div>
  ),
}))

vi.mock('./RemoteParticipantAudio', () => ({
  RemoteParticipantAudio: ({ participantId }: { participantId: string }) => (
    <div data-testid={`remote-audio-${participantId}`} />
  ),
}))

vi.mock('./LocalVideoPreview', () => ({
  LocalVideoPreview: ({ participantName }: { participantName: string }) => (
    <div data-testid={`local-video-${participantName}`}>{participantName} (You)</div>
  ),
}))

describe('ParticipantGrid', () => {
  const mockLocalParticipant: Participant = {
    id: 'local-1',
    name: 'Local User',
    role: 'host',
    color: '#3b82f6',
    isLocal: true,
  }

  const createMockRemoteParticipant = (id: string, name: string): Participant => ({
    id,
    name,
    role: 'viewer',
    color: '#f97316',
    isLocal: false,
  })

  const createMockLKRemoteParticipant = (id: string): Partial<RemoteParticipant> => ({
    identity: id,
    getTrackPublication: vi.fn().mockReturnValue(undefined),
  })

  const createMockRoom = (remoteParticipantIds: string[]): Partial<Room> => {
    const remoteParticipants = new Map<string, RemoteParticipant>()
    remoteParticipantIds.forEach((id) => {
      remoteParticipants.set(id, createMockLKRemoteParticipant(id) as RemoteParticipant)
    })
    return { remoteParticipants }
  }

  describe('AC-2.9.5: Grid Layout (No Screen Share)', () => {
    it('renders grid layout container', () => {
      const { container } = render(
        <ParticipantGrid
          room={null}
          localParticipant={mockLocalParticipant}
          remoteParticipants={[]}
          localVideoTrack={null}
          isLocalVideoOff={true}
        />
      )

      // Check that grid is rendered
      expect(container.firstChild).toHaveStyle({ display: 'grid' })
    })

    it('renders 1x1 grid for single participant', () => {
      const { container } = render(
        <ParticipantGrid
          room={null}
          localParticipant={mockLocalParticipant}
          remoteParticipants={[]}
          localVideoTrack={null}
          isLocalVideoOff={true}
        />
      )

      expect(container.firstChild).toHaveStyle({
        gridTemplateColumns: 'repeat(1, 1fr)',
        gridTemplateRows: 'repeat(1, 1fr)',
      })
    })

    it('renders 2x2 grid for 2-4 participants', () => {
      const remoteParticipants = [
        createMockRemoteParticipant('remote-1', 'User 1'),
        createMockRemoteParticipant('remote-2', 'User 2'),
      ]
      const mockRoom = createMockRoom(['remote-1', 'remote-2'])

      const { container } = render(
        <ParticipantGrid
          room={mockRoom as Room}
          localParticipant={mockLocalParticipant}
          remoteParticipants={remoteParticipants}
          localVideoTrack={null}
          isLocalVideoOff={true}
        />
      )

      // 3 total participants = 2x2 grid
      expect(container.firstChild).toHaveStyle({
        gridTemplateColumns: 'repeat(2, 1fr)',
        gridTemplateRows: 'repeat(2, 1fr)',
      })
    })

    it('renders 3x3 grid for 5-9 participants', () => {
      const remoteParticipants = [
        createMockRemoteParticipant('remote-1', 'User 1'),
        createMockRemoteParticipant('remote-2', 'User 2'),
        createMockRemoteParticipant('remote-3', 'User 3'),
        createMockRemoteParticipant('remote-4', 'User 4'),
        createMockRemoteParticipant('remote-5', 'User 5'),
      ]
      const mockRoom = createMockRoom(['remote-1', 'remote-2', 'remote-3', 'remote-4', 'remote-5'])

      const { container } = render(
        <ParticipantGrid
          room={mockRoom as Room}
          localParticipant={mockLocalParticipant}
          remoteParticipants={remoteParticipants}
          localVideoTrack={null}
          isLocalVideoOff={true}
        />
      )

      // 6 total participants = 3x3 grid
      expect(container.firstChild).toHaveStyle({
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: 'repeat(3, 1fr)',
      })
    })

    it('renders 4x3 grid for 10+ participants', () => {
      const remoteParticipants = Array.from({ length: 10 }, (_, i) =>
        createMockRemoteParticipant(`remote-${i}`, `User ${i}`)
      )
      const mockRoom = createMockRoom(remoteParticipants.map((p) => p.id))

      const { container } = render(
        <ParticipantGrid
          room={mockRoom as Room}
          localParticipant={mockLocalParticipant}
          remoteParticipants={remoteParticipants}
          localVideoTrack={null}
          isLocalVideoOff={true}
        />
      )

      // 11 total participants = 4x3 grid
      expect(container.firstChild).toHaveStyle({
        gridTemplateColumns: 'repeat(4, 1fr)',
        gridTemplateRows: 'repeat(3, 1fr)',
      })
    })
  })

  describe('local participant in grid', () => {
    it('renders local video preview', () => {
      render(
        <ParticipantGrid
          room={null}
          localParticipant={mockLocalParticipant}
          remoteParticipants={[]}
          localVideoTrack={null}
          isLocalVideoOff={true}
        />
      )

      expect(screen.getByTestId('local-video-Local User')).toBeInTheDocument()
    })

    it('does not render local preview when localParticipant is null', () => {
      render(
        <ParticipantGrid
          room={null}
          localParticipant={null}
          remoteParticipants={[]}
          localVideoTrack={null}
          isLocalVideoOff={true}
        />
      )

      expect(screen.queryByTestId('local-video-Local User')).not.toBeInTheDocument()
    })
  })

  describe('remote participants in grid', () => {
    it('renders remote participant videos', () => {
      const remoteParticipants = [
        createMockRemoteParticipant('remote-1', 'Remote User 1'),
        createMockRemoteParticipant('remote-2', 'Remote User 2'),
      ]
      const mockRoom = createMockRoom(['remote-1', 'remote-2'])

      render(
        <ParticipantGrid
          room={mockRoom as Room}
          localParticipant={mockLocalParticipant}
          remoteParticipants={remoteParticipants}
          localVideoTrack={null}
          isLocalVideoOff={true}
        />
      )

      expect(screen.getByTestId('remote-video-Remote User 1')).toBeInTheDocument()
      expect(screen.getByTestId('remote-video-Remote User 2')).toBeInTheDocument()
    })

    it('renders remote participant audio elements', () => {
      const remoteParticipants = [createMockRemoteParticipant('remote-1', 'Remote User 1')]
      const mockRoom = createMockRoom(['remote-1'])

      render(
        <ParticipantGrid
          room={mockRoom as Room}
          localParticipant={mockLocalParticipant}
          remoteParticipants={remoteParticipants}
          localVideoTrack={null}
          isLocalVideoOff={true}
        />
      )

      expect(screen.getByTestId('remote-audio-remote-1')).toBeInTheDocument()
    })

    it('shows placeholder for participant not in LiveKit yet', () => {
      const remoteParticipants = [createMockRemoteParticipant('remote-1', 'Remote User 1')]
      // Room with no remote participants yet
      const mockRoom = createMockRoom([])

      render(
        <ParticipantGrid
          room={mockRoom as Room}
          localParticipant={mockLocalParticipant}
          remoteParticipants={remoteParticipants}
          localVideoTrack={null}
          isLocalVideoOff={true}
        />
      )

      // Should show avatar placeholder with initial
      expect(screen.getByText('R')).toBeInTheDocument()
      expect(screen.getByText('Remote User 1')).toBeInTheDocument()
    })
  })

  describe('custom styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <ParticipantGrid
          room={null}
          localParticipant={mockLocalParticipant}
          remoteParticipants={[]}
          localVideoTrack={null}
          isLocalVideoOff={true}
          className="custom-class flex-1"
        />
      )

      expect(container.firstChild).toHaveClass('custom-class')
      expect(container.firstChild).toHaveClass('flex-1')
    })
  })
})
