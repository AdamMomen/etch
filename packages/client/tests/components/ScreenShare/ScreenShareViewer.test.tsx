import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ScreenShareViewer } from '@/components/ScreenShare/ScreenShareViewer'
import type { RemoteVideoTrack } from 'livekit-client'
import { Track } from 'livekit-client'

// Mock livekit-client Track enum
vi.mock('livekit-client', async () => {
  const actual = await vi.importActual('livekit-client')
  return {
    ...actual,
    Track: {
      Kind: {
        Video: 'video',
        Audio: 'audio',
      },
      Source: {
        Camera: 'camera',
        Microphone: 'microphone',
        ScreenShare: 'screen_share',
      },
    },
  }
})

// Create a mock track
const createMockTrack = (overrides: Partial<RemoteVideoTrack> = {}): RemoteVideoTrack => ({
  kind: Track.Kind.Video as unknown as RemoteVideoTrack['kind'],
  source: Track.Source.ScreenShare as unknown as RemoteVideoTrack['source'],
  sid: 'track-123',
  attach: vi.fn(),
  detach: vi.fn(),
  ...overrides,
} as unknown as RemoteVideoTrack)

describe('ScreenShareViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('rendering', () => {
    it('should return null when track is null (AC-cleanup)', () => {
      const { container } = render(
        <ScreenShareViewer track={null} sharerName="Test User" />
      )

      expect(container.firstChild).toBeNull()
    })

    it('should render when track is provided (AC-3.2.1)', () => {
      const mockTrack = createMockTrack()

      render(<ScreenShareViewer track={mockTrack} sharerName="Test User" />)

      expect(screen.getByTestId('screen-share-viewer')).toBeInTheDocument()
    })

    it('should render video element for screen share (AC-3.2.1)', () => {
      const mockTrack = createMockTrack()

      render(<ScreenShareViewer track={mockTrack} sharerName="Test User" />)

      const video = screen.getByTestId('screen-share-video')
      expect(video).toBeInTheDocument()
      expect(video.tagName).toBe('VIDEO')
    })

    it('should apply object-contain class for aspect ratio preservation (AC-3.2.1)', () => {
      const mockTrack = createMockTrack()

      render(<ScreenShareViewer track={mockTrack} sharerName="Test User" />)

      const video = screen.getByTestId('screen-share-video')
      expect(video).toHaveClass('object-contain')
    })

    it('should apply 16px padding via p-4 class (AC-3.2.2)', () => {
      const mockTrack = createMockTrack()

      render(<ScreenShareViewer track={mockTrack} sharerName="Test User" />)

      const container = screen.getByTestId('screen-share-viewer')
      expect(container).toHaveClass('p-4')
    })

    it('should apply dark background via bg-background class (AC-3.2.2)', () => {
      const mockTrack = createMockTrack()

      render(<ScreenShareViewer track={mockTrack} sharerName="Test User" />)

      const container = screen.getByTestId('screen-share-viewer')
      expect(container).toHaveClass('bg-background')
    })

    it('should apply custom className', () => {
      const mockTrack = createMockTrack()

      render(
        <ScreenShareViewer
          track={mockTrack}
          sharerName="Test User"
          className="custom-class"
        />
      )

      const container = screen.getByTestId('screen-share-viewer')
      expect(container).toHaveClass('custom-class')
    })
  })

  describe('sharer indicator (AC-3.2.4)', () => {
    it('should display sharer name in indicator', () => {
      const mockTrack = createMockTrack()

      render(<ScreenShareViewer track={mockTrack} sharerName="John Doe" />)

      expect(screen.getByText('John Doe is sharing')).toBeInTheDocument()
    })

    it('should display fallback text when sharerName is null', () => {
      const mockTrack = createMockTrack()

      render(<ScreenShareViewer track={mockTrack} sharerName={null} />)

      expect(screen.getByText('Someone is sharing')).toBeInTheDocument()
    })

    it('should position indicator in top-left corner', () => {
      const mockTrack = createMockTrack()

      render(<ScreenShareViewer track={mockTrack} sharerName="Test User" />)

      const indicator = screen.getByTestId('sharer-indicator')
      expect(indicator).toHaveClass('left-4', 'top-4')
    })

    it('should render MonitorUp icon in indicator', () => {
      const mockTrack = createMockTrack()

      render(<ScreenShareViewer track={mockTrack} sharerName="Test User" />)

      const indicator = screen.getByTestId('sharer-indicator')
      // MonitorUp icon should be rendered as SVG
      const svg = indicator.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })
  })

  describe('track attachment', () => {
    it('should attach track to video element on mount', () => {
      const mockTrack = createMockTrack()

      render(<ScreenShareViewer track={mockTrack} sharerName="Test User" />)

      expect(mockTrack.attach).toHaveBeenCalled()
    })

    it('should detach track from video element on unmount (AC-cleanup)', () => {
      const mockTrack = createMockTrack()

      const { unmount } = render(
        <ScreenShareViewer track={mockTrack} sharerName="Test User" />
      )

      unmount()

      expect(mockTrack.detach).toHaveBeenCalled()
    })

    it('should re-attach when track changes', () => {
      const mockTrack1 = createMockTrack({ sid: 'track-1' })
      const mockTrack2 = createMockTrack({ sid: 'track-2' })

      const { rerender } = render(
        <ScreenShareViewer track={mockTrack1} sharerName="User 1" />
      )

      expect(mockTrack1.attach).toHaveBeenCalledTimes(1)

      rerender(<ScreenShareViewer track={mockTrack2} sharerName="User 2" />)

      // Should detach old track and attach new one
      expect(mockTrack1.detach).toHaveBeenCalled()
      expect(mockTrack2.attach).toHaveBeenCalled()
    })
  })

  describe('video element properties', () => {
    it('should have autoPlay attribute', () => {
      const mockTrack = createMockTrack()

      render(<ScreenShareViewer track={mockTrack} sharerName="Test User" />)

      const video = screen.getByTestId('screen-share-video') as HTMLVideoElement
      expect(video.autoplay).toBe(true)
    })

    it('should have playsInline attribute', () => {
      const mockTrack = createMockTrack()

      render(<ScreenShareViewer track={mockTrack} sharerName="Test User" />)

      const video = screen.getByTestId('screen-share-video') as HTMLVideoElement
      expect(video.playsInline).toBe(true)
    })

    it('should be muted', () => {
      const mockTrack = createMockTrack()

      render(<ScreenShareViewer track={mockTrack} sharerName="Test User" />)

      const video = screen.getByTestId('screen-share-video') as HTMLVideoElement
      expect(video.muted).toBe(true)
    })
  })
})
