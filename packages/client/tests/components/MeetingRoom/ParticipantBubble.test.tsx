import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Track } from 'livekit-client'
import type { RemoteTrackPublication, RemoteTrack } from 'livekit-client'
import { ParticipantBubble } from '@/components/MeetingRoom/ParticipantBubble'

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

describe('ParticipantBubble', () => {
  const mockAttach = vi.fn()
  const mockDetach = vi.fn()
  let mockTrack: Partial<RemoteTrack>
  let mockTrackPublication: Partial<RemoteTrackPublication>

  beforeEach(() => {
    vi.clearAllMocks()

    mockTrack = {
      kind: Track.Kind.Video as any,
      attach: mockAttach,
      detach: mockDetach,
    }

    mockTrackPublication = {
      isSubscribed: true,
      track: mockTrack as RemoteTrack,
    }
  })

  describe('AC-2.9.4: Floating Bubbles Layout', () => {
    it('renders circular bubble with correct size classes', () => {
      const { container } = render(
        <ParticipantBubble
          videoTrackPublication={mockTrackPublication as RemoteTrackPublication}
          participantName="Jane Doe"
          participantColor="#3b82f6"
          size="md"
        />
      )

      // The actual bubble is nested inside Tooltip components
      const bubble = container.querySelector('.rounded-full')
      expect(bubble).toBeInTheDocument()
      expect(bubble).toHaveClass('h-10')
      expect(bubble).toHaveClass('w-10')
    })

    it('renders small size correctly', () => {
      const { container } = render(
        <ParticipantBubble
          videoTrackPublication={mockTrackPublication as RemoteTrackPublication}
          participantName="Jane Doe"
          participantColor="#3b82f6"
          size="sm"
        />
      )

      const bubble = container.querySelector('.rounded-full.overflow-hidden')
      expect(bubble).toHaveClass('h-8')
      expect(bubble).toHaveClass('w-8')
    })

    it('renders large size correctly', () => {
      const { container } = render(
        <ParticipantBubble
          videoTrackPublication={mockTrackPublication as RemoteTrackPublication}
          participantName="Jane Doe"
          participantColor="#3b82f6"
          size="lg"
        />
      )

      const bubble = container.querySelector('.rounded-full.overflow-hidden')
      expect(bubble).toHaveClass('h-12')
      expect(bubble).toHaveClass('w-12')
    })

    it('has border ring with participant color', () => {
      const { container } = render(
        <ParticipantBubble
          videoTrackPublication={mockTrackPublication as RemoteTrackPublication}
          participantName="Jane Doe"
          participantColor="#3b82f6"
        />
      )

      const bubble = container.querySelector('.rounded-full.overflow-hidden')
      expect(bubble).toHaveClass('ring-2')
      expect(bubble).toHaveStyle({
        '--tw-ring-color': '#3b82f6',
      })
    })

    it('shows hover scale effect', () => {
      const { container } = render(
        <ParticipantBubble
          videoTrackPublication={mockTrackPublication as RemoteTrackPublication}
          participantName="Jane Doe"
          participantColor="#3b82f6"
        />
      )

      const bubble = container.querySelector('.rounded-full.overflow-hidden')
      expect(bubble).toHaveClass('hover:scale-110')
    })
  })

  describe('avatar and video display', () => {
    it('shows avatar with initial when no video track', () => {
      render(
        <ParticipantBubble
          videoTrackPublication={undefined}
          participantName="Jane Doe"
          participantColor="#3b82f6"
        />
      )

      expect(screen.getByText('J')).toBeInTheDocument()
    })

    it('avatar has participant color background', () => {
      render(
        <ParticipantBubble
          videoTrackPublication={undefined}
          participantName="Jane Doe"
          participantColor="#3b82f6"
        />
      )

      const avatar = screen.getByText('J')
      expect(avatar).toHaveStyle({ backgroundColor: '#3b82f6' })
    })

    it('renders video element when track is available', () => {
      const { container } = render(
        <ParticipantBubble
          videoTrackPublication={mockTrackPublication as RemoteTrackPublication}
          participantName="Jane Doe"
          participantColor="#3b82f6"
        />
      )

      const video = container.querySelector('video')
      expect(video).toBeInTheDocument()
    })

    it('video element is muted', () => {
      const { container } = render(
        <ParticipantBubble
          videoTrackPublication={mockTrackPublication as RemoteTrackPublication}
          participantName="Jane Doe"
          participantColor="#3b82f6"
        />
      )

      const video = container.querySelector('video') as HTMLVideoElement
      expect(video?.muted).toBe(true)
    })
  })

  describe('speaking indicator', () => {
    it('shows speaking pulse animation when speaking', () => {
      const { container } = render(
        <ParticipantBubble
          videoTrackPublication={mockTrackPublication as RemoteTrackPublication}
          participantName="Jane Doe"
          participantColor="#3b82f6"
          isSpeaking={true}
        />
      )

      const speakingIndicator = container.querySelector('.animate-speaking-pulse')
      expect(speakingIndicator).toBeInTheDocument()
    })

    it('does not show speaking animation when not speaking', () => {
      const { container } = render(
        <ParticipantBubble
          videoTrackPublication={mockTrackPublication as RemoteTrackPublication}
          participantName="Jane Doe"
          participantColor="#3b82f6"
          isSpeaking={false}
        />
      )

      const speakingIndicator = container.querySelector('.animate-speaking-pulse')
      expect(speakingIndicator).not.toBeInTheDocument()
    })
  })

  describe('tooltip', () => {
    it('renders tooltip components', () => {
      const { container } = render(
        <ParticipantBubble
          videoTrackPublication={mockTrackPublication as RemoteTrackPublication}
          participantName="Jane Doe"
          participantColor="#3b82f6"
        />
      )

      // The Tooltip wraps the bubble
      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe('cleanup', () => {
    it('detaches video track on unmount', () => {
      const { unmount } = render(
        <ParticipantBubble
          videoTrackPublication={mockTrackPublication as RemoteTrackPublication}
          participantName="Jane Doe"
          participantColor="#3b82f6"
        />
      )

      expect(mockAttach).toHaveBeenCalled()
      unmount()
      expect(mockDetach).toHaveBeenCalled()
    })
  })

  describe('custom styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <ParticipantBubble
          videoTrackPublication={mockTrackPublication as RemoteTrackPublication}
          participantName="Jane Doe"
          participantColor="#3b82f6"
          className="custom-class"
        />
      )

      // The custom class should be on the inner bubble element
      const bubble = container.querySelector('.custom-class')
      expect(bubble).toBeInTheDocument()
    })
  })
})
