import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Track } from 'livekit-client'
import type { RemoteTrackPublication, RemoteTrack } from 'livekit-client'
import { RemoteParticipantVideo } from './RemoteParticipantVideo'

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

describe('RemoteParticipantVideo', () => {
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

  describe('AC-2.9.1: Remote Video Display', () => {
    it('renders video element when track is available and subscribed', () => {
      render(
        <RemoteParticipantVideo
          trackPublication={mockTrackPublication as RemoteTrackPublication}
          participantName="Jane Doe"
          participantColor="#3b82f6"
        />
      )

      const video = document.querySelector('video')
      expect(video).toBeInTheDocument()
    })

    it('attaches track to video element', () => {
      render(
        <RemoteParticipantVideo
          trackPublication={mockTrackPublication as RemoteTrackPublication}
          participantName="Jane Doe"
          participantColor="#3b82f6"
        />
      )

      expect(mockAttach).toHaveBeenCalled()
    })

    it('video element is NOT mirrored (unlike local preview)', () => {
      render(
        <RemoteParticipantVideo
          trackPublication={mockTrackPublication as RemoteTrackPublication}
          participantName="Jane Doe"
          participantColor="#3b82f6"
        />
      )

      const video = document.querySelector('video')
      // Remote videos should NOT have mirrored transform
      expect(video).not.toHaveStyle({ transform: 'scaleX(-1)' })
    })

    it('displays participant name overlay', () => {
      render(
        <RemoteParticipantVideo
          trackPublication={mockTrackPublication as RemoteTrackPublication}
          participantName="Jane Doe"
          participantColor="#3b82f6"
        />
      )

      expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    })

    it('has autoplay and playsInline attributes', () => {
      render(
        <RemoteParticipantVideo
          trackPublication={mockTrackPublication as RemoteTrackPublication}
          participantName="Jane Doe"
          participantColor="#3b82f6"
        />
      )

      const video = document.querySelector('video')
      expect(video).toHaveAttribute('autoplay')
      expect(video).toHaveAttribute('playsinline')
    })
  })

  describe('AC-2.9.3: Video Disable Transition', () => {
    it('shows avatar placeholder when no video track', () => {
      render(
        <RemoteParticipantVideo
          trackPublication={undefined}
          participantName="Jane Doe"
          participantColor="#3b82f6"
        />
      )

      // Avatar should show first letter of name
      expect(screen.getByText('J')).toBeInTheDocument()
    })

    it('shows avatar placeholder when track is not subscribed', () => {
      const unsubscribedPublication: Partial<RemoteTrackPublication> = {
        isSubscribed: false,
        track: mockTrack as RemoteTrack,
      }

      render(
        <RemoteParticipantVideo
          trackPublication={unsubscribedPublication as RemoteTrackPublication}
          participantName="Jane Doe"
          participantColor="#3b82f6"
        />
      )

      // Avatar should be visible (opacity-100)
      const avatar = screen.getByText('J')
      expect(avatar.parentElement).toHaveClass('opacity-100')
    })

    it('avatar has participant color as background', () => {
      render(
        <RemoteParticipantVideo
          trackPublication={undefined}
          participantName="Jane Doe"
          participantColor="#3b82f6"
        />
      )

      const avatar = screen.getByText('J')
      expect(avatar).toHaveStyle({ backgroundColor: '#3b82f6' })
    })

    it('has smooth transition classes for fade effect', () => {
      const { container } = render(
        <RemoteParticipantVideo
          trackPublication={mockTrackPublication as RemoteTrackPublication}
          participantName="Jane Doe"
          participantColor="#3b82f6"
        />
      )

      // Check for transition classes
      const video = container.querySelector('video')
      expect(video).toHaveClass('transition-opacity')
      expect(video).toHaveClass('duration-300')
    })
  })

  describe('AC-2.9.2: Speaking Indicator', () => {
    it('shows speaking indicator ring when participant is speaking', () => {
      const { container } = render(
        <RemoteParticipantVideo
          trackPublication={mockTrackPublication as RemoteTrackPublication}
          participantName="Jane Doe"
          participantColor="#3b82f6"
          isSpeaking={true}
        />
      )

      // Should have speaking indicator element
      const speakingIndicator = container.querySelector('.animate-pulse')
      expect(speakingIndicator).toBeInTheDocument()
    })

    it('does not show speaking indicator when not speaking', () => {
      const { container } = render(
        <RemoteParticipantVideo
          trackPublication={mockTrackPublication as RemoteTrackPublication}
          participantName="Jane Doe"
          participantColor="#3b82f6"
          isSpeaking={false}
        />
      )

      const speakingIndicator = container.querySelector('.animate-pulse')
      expect(speakingIndicator).not.toBeInTheDocument()
    })

    it('has ring styling when speaking', () => {
      const { container } = render(
        <RemoteParticipantVideo
          trackPublication={mockTrackPublication as RemoteTrackPublication}
          participantName="Jane Doe"
          participantColor="#3b82f6"
          isSpeaking={true}
        />
      )

      // Main container should have ring classes when speaking
      expect(container.firstChild).toHaveClass('ring-2')
    })
  })

  describe('cleanup', () => {
    it('detaches track on unmount', () => {
      const { unmount } = render(
        <RemoteParticipantVideo
          trackPublication={mockTrackPublication as RemoteTrackPublication}
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
        <RemoteParticipantVideo
          trackPublication={mockTrackPublication as RemoteTrackPublication}
          participantName="Jane Doe"
          participantColor="#3b82f6"
          className="custom-class h-full w-full"
        />
      )

      expect(container.firstChild).toHaveClass('custom-class')
      expect(container.firstChild).toHaveClass('h-full')
      expect(container.firstChild).toHaveClass('w-full')
    })
  })
})
