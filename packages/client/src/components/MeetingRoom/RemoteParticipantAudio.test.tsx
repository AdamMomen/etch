import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { act } from 'react'
import { Track } from 'livekit-client'
import type { RemoteTrackPublication, RemoteTrack } from 'livekit-client'
import { RemoteParticipantAudio } from './RemoteParticipantAudio'
import { useVolumeStore } from '@/stores/volumeStore'

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
  const mockSetVolume = vi.fn()
  let mockTrack: Partial<RemoteTrack> & { setVolume?: ReturnType<typeof vi.fn> }
  let mockTrackPublication: Partial<RemoteTrackPublication>

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset volume store to default state
    useVolumeStore.getState().resetVolumes()

    // Mock track with setVolume method (RemoteAudioTrack method for volume control)
    mockTrack = {
      kind: Track.Kind.Audio as any,
      attach: mockAttach,
      detach: mockDetach,
      setVolume: mockSetVolume, // Required for volume control (AC-2.11.3)
    } as Partial<RemoteTrack> & { setVolume?: ReturnType<typeof vi.fn> }

    mockTrackPublication = {
      isSubscribed: true,
      track: mockTrack as RemoteTrack,
    }
  })

  afterEach(() => {
    // Clean up volume store after each test
    useVolumeStore.getState().resetVolumes()
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

  describe('AC-2.11.3: Volume Adjustment', () => {
    it('applies default volume (1.0) on mount', () => {
      render(
        <RemoteParticipantAudio
          trackPublication={mockTrackPublication as RemoteTrackPublication}
          participantId="participant-1"
        />
      )

      // Default volume should be 1.0 (100%)
      expect(mockSetVolume).toHaveBeenCalledWith(1.0)
    })

    it('applies volume from store when changed', async () => {
      render(
        <RemoteParticipantAudio
          trackPublication={mockTrackPublication as RemoteTrackPublication}
          participantId="participant-1"
        />
      )

      // Change volume to 50%
      await act(async () => {
        useVolumeStore.getState().setVolume('participant-1', 0.5)
      })

      // Should apply the new volume
      expect(mockSetVolume).toHaveBeenCalledWith(0.5)
    })

    it('applies muted volume (0) when set to 0', async () => {
      render(
        <RemoteParticipantAudio
          trackPublication={mockTrackPublication as RemoteTrackPublication}
          participantId="participant-1"
        />
      )

      // Mute participant
      await act(async () => {
        useVolumeStore.getState().setVolume('participant-1', 0)
      })

      expect(mockSetVolume).toHaveBeenCalledWith(0)
    })

    it('applies boosted volume (>1.0) for volume boost', async () => {
      render(
        <RemoteParticipantAudio
          trackPublication={mockTrackPublication as RemoteTrackPublication}
          participantId="participant-1"
        />
      )

      // Boost volume to 150%
      await act(async () => {
        useVolumeStore.getState().setVolume('participant-1', 1.5)
      })

      expect(mockSetVolume).toHaveBeenCalledWith(1.5)
    })

    it('clamps volume to max of 2.0 (200%)', async () => {
      render(
        <RemoteParticipantAudio
          trackPublication={mockTrackPublication as RemoteTrackPublication}
          participantId="participant-1"
        />
      )

      // Try to set volume above 200%
      await act(async () => {
        useVolumeStore.getState().setVolume('participant-1', 3.0)
      })

      // Volume should be clamped to 2.0
      expect(mockSetVolume).toHaveBeenCalledWith(2.0)
    })
  })
})
