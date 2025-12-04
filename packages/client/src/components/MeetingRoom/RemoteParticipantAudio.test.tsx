import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { Track } from 'livekit-client'
import type { RemoteTrackPublication, RemoteTrack } from 'livekit-client'
import { RemoteParticipantAudio } from './RemoteParticipantAudio'

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

describe('RemoteParticipantAudio', () => {
  const mockAttach = vi.fn()
  const mockDetach = vi.fn()
  let mockTrack: Partial<RemoteTrack>
  let mockTrackPublication: Partial<RemoteTrackPublication>

  beforeEach(() => {
    vi.clearAllMocks()

    mockTrack = {
      kind: Track.Kind.Audio as any,
      attach: mockAttach,
      detach: mockDetach,
    }

    mockTrackPublication = {
      isSubscribed: true,
      track: mockTrack as RemoteTrack,
    }
  })

  describe('AC-2.9.2: Remote Audio Playback', () => {
    it('renders audio element when track is subscribed', () => {
      const { container } = render(
        <RemoteParticipantAudio
          trackPublication={mockTrackPublication as RemoteTrackPublication}
          participantId="participant-1"
        />
      )

      const audio = container.querySelector('audio')
      expect(audio).toBeInTheDocument()
    })

    it('attaches track to audio element', () => {
      render(
        <RemoteParticipantAudio
          trackPublication={mockTrackPublication as RemoteTrackPublication}
          participantId="participant-1"
        />
      )

      expect(mockAttach).toHaveBeenCalled()
    })

    it('audio element has autoplay attribute', () => {
      const { container } = render(
        <RemoteParticipantAudio
          trackPublication={mockTrackPublication as RemoteTrackPublication}
          participantId="participant-1"
        />
      )

      const audio = container.querySelector('audio')
      expect(audio).toHaveAttribute('autoplay')
    })

    it('audio element is NOT muted (unlike local audio)', () => {
      const { container } = render(
        <RemoteParticipantAudio
          trackPublication={mockTrackPublication as RemoteTrackPublication}
          participantId="participant-1"
        />
      )

      const audio = container.querySelector('audio') as HTMLAudioElement
      // Remote audio should NOT be muted
      expect(audio?.muted).toBe(false)
    })

    it('includes participant ID as data attribute', () => {
      const { container } = render(
        <RemoteParticipantAudio
          trackPublication={mockTrackPublication as RemoteTrackPublication}
          participantId="participant-1"
        />
      )

      const audio = container.querySelector('audio')
      expect(audio).toHaveAttribute('data-participant-id', 'participant-1')
    })
  })

  describe('when track is not subscribed', () => {
    it('returns null when trackPublication is undefined', () => {
      const { container } = render(
        <RemoteParticipantAudio
          trackPublication={undefined}
          participantId="participant-1"
        />
      )

      expect(container.querySelector('audio')).not.toBeInTheDocument()
    })

    it('returns null when isSubscribed is false', () => {
      const unsubscribedPublication: Partial<RemoteTrackPublication> = {
        isSubscribed: false,
        track: mockTrack as RemoteTrack,
      }

      const { container } = render(
        <RemoteParticipantAudio
          trackPublication={unsubscribedPublication as RemoteTrackPublication}
          participantId="participant-1"
        />
      )

      expect(container.querySelector('audio')).not.toBeInTheDocument()
    })
  })

  describe('cleanup', () => {
    it('detaches track on unmount', () => {
      const { unmount } = render(
        <RemoteParticipantAudio
          trackPublication={mockTrackPublication as RemoteTrackPublication}
          participantId="participant-1"
        />
      )

      expect(mockAttach).toHaveBeenCalled()
      unmount()
      expect(mockDetach).toHaveBeenCalled()
    })
  })
})
