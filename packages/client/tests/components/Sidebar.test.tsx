import { describe, test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Sidebar } from '@/components/MeetingRoom/Sidebar'
import type { Participant } from '@etch/shared'

// Mock zustand store
vi.mock('@/stores/roomStore', () => ({
  useRoomStore: vi.fn((selector) => {
    const mockState = {
      annotationsEnabled: true,
    }
    return selector(mockState)
  }),
}))

describe('Sidebar', () => {
  const mockParticipants: Participant[] = [
    {
      id: 'local-1',
      name: 'Alice',
      role: 'host',
      color: '#f97316',
      isLocal: true,
      isSpeaking: false,
      hasVideo: true,
      isScreenSharing: false,
    },
    {
      id: 'remote-1',
      name: 'Bob',
      role: 'annotator',
      color: '#06b6d4',
      isLocal: false,
      isSpeaking: false,
      hasVideo: true,
      isScreenSharing: false,
    },
  ]

  const defaultProps = {
    isCollapsed: false,
    participants: mockParticipants,
    localParticipantId: 'local-1',
    onInviteClick: vi.fn(),
    onToggle: vi.fn(),
  }

  test('renders participant count', () => {
    render(<Sidebar {...defaultProps} />)
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  test('local participant role displayed in header', () => {
    render(<Sidebar {...defaultProps} />)
    expect(screen.getByText('You (Host)')).toBeInTheDocument()
  })

  test('displays role badges for all participants', () => {
    render(<Sidebar {...defaultProps} />)

    // Host badge
    expect(screen.getByText('Host')).toBeInTheDocument()

    // Participant names
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  test('viewer sees "View only mode" banner when annotations enabled but viewer role', () => {
    const viewerParticipants: Participant[] = [
      {
        id: 'local-1',
        name: 'Viewer',
        role: 'viewer',
        color: '#94a3b8',
        isLocal: true,
        isSpeaking: false,
        hasVideo: false,
        isScreenSharing: false,
      },
    ]

    render(<Sidebar {...defaultProps} participants={viewerParticipants} />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('View only mode')).toBeInTheDocument()
    expect(screen.getByText('You cannot annotate')).toBeInTheDocument()
  })

  test('annotator does NOT see view-only banner', () => {
    const annotatorParticipants: Participant[] = [
      {
        id: 'local-1',
        name: 'Annotator',
        role: 'annotator',
        color: '#06b6d4',
        isLocal: true,
        isSpeaking: false,
        hasVideo: true,
        isScreenSharing: false,
      },
    ]

    render(<Sidebar {...defaultProps} participants={annotatorParticipants} />)

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText('View only mode')).not.toBeInTheDocument()
  })

  test('host does NOT see view-only banner', () => {
    render(<Sidebar {...defaultProps} />)

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText('View only mode')).not.toBeInTheDocument()
  })

  test('participant with isSharingScreen=true displays sharing badge', () => {
    const sharingParticipants: Participant[] = [
      {
        id: 'local-1',
        name: 'Alice',
        role: 'host',
        color: '#f97316',
        isLocal: true,
        isSpeaking: false,
        hasVideo: true,
        isScreenSharing: false,
      },
      {
        id: 'remote-1',
        name: 'Bob',
        role: 'annotator',
        color: '#06b6d4',
        isLocal: false,
        isSpeaking: false,
        hasVideo: true,
        isScreenSharing: true, // Actively sharing
      },
    ]

    render(<Sidebar {...defaultProps} participants={sharingParticipants} />)

    expect(screen.getByText('Sharing')).toBeInTheDocument()
  })

  test('collapsed sidebar hides content', () => {
    render(<Sidebar {...defaultProps} isCollapsed={true} />)

    const sidebar = screen.getByRole('complementary')
    expect(sidebar).toHaveClass('w-0')
  })

  test('invite button is present', () => {
    render(<Sidebar {...defaultProps} />)

    expect(screen.getByRole('button', { name: /invite/i })).toBeInTheDocument()
  })
})
