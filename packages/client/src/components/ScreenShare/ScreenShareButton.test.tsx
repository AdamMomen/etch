import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ScreenShareButton } from './ScreenShareButton'
import { useScreenShare } from '@/hooks/useScreenShare'

// Mock the useScreenShare hook
vi.mock('@/hooks/useScreenShare', () => ({
  useScreenShare: vi.fn(),
}))

const createMockScreenShare = (overrides = {}) => ({
  isSharing: false,
  isLocalSharing: false,
  canShare: true,
  sharerName: null,
  screenTrack: null,
  remoteScreenTrack: null,
  startScreenShare: vi.fn(),
  stopScreenShare: vi.fn(),
  ...overrides,
})

describe('ScreenShareButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render with outline variant when not sharing', () => {
      vi.mocked(useScreenShare).mockReturnValue(createMockScreenShare())

      render(<ScreenShareButton room={null} />)

      const button = screen.getByRole('button', { name: /share screen/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('rounded-full')
    })

    it('should render with default variant when sharing', () => {
      vi.mocked(useScreenShare).mockReturnValue(
        createMockScreenShare({ isLocalSharing: true })
      )

      render(<ScreenShareButton room={null} />)

      const button = screen.getByRole('button', { name: /stop sharing/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('bg-primary')
    })

    it('should be disabled when canShare is false and not sharing', () => {
      vi.mocked(useScreenShare).mockReturnValue(
        createMockScreenShare({ canShare: false })
      )

      render(<ScreenShareButton room={null} />)

      const button = screen.getByRole('button', { name: /share screen/i })
      expect(button).toBeDisabled()
    })

    it('should not be disabled when sharing (even if canShare is false)', () => {
      vi.mocked(useScreenShare).mockReturnValue(
        createMockScreenShare({ isLocalSharing: true, canShare: false })
      )

      render(<ScreenShareButton room={null} />)

      const button = screen.getByRole('button', { name: /stop sharing/i })
      expect(button).not.toBeDisabled()
    })

    it('should apply custom className', () => {
      vi.mocked(useScreenShare).mockReturnValue(createMockScreenShare())

      render(<ScreenShareButton room={null} className="custom-class" />)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('custom-class')
    })
  })

  describe('interactions', () => {
    it('should call startScreenShare when clicked and not sharing', async () => {
      const mockStartScreenShare = vi.fn()
      vi.mocked(useScreenShare).mockReturnValue(
        createMockScreenShare({ startScreenShare: mockStartScreenShare })
      )

      const user = userEvent.setup()
      render(<ScreenShareButton room={null} />)

      const button = screen.getByRole('button', { name: /share screen/i })
      await user.click(button)

      expect(mockStartScreenShare).toHaveBeenCalledTimes(1)
    })

    it('should call stopScreenShare when clicked and sharing', async () => {
      const mockStopScreenShare = vi.fn()
      vi.mocked(useScreenShare).mockReturnValue(
        createMockScreenShare({
          isLocalSharing: true,
          stopScreenShare: mockStopScreenShare,
        })
      )

      const user = userEvent.setup()
      render(<ScreenShareButton room={null} />)

      const button = screen.getByRole('button', { name: /stop sharing/i })
      await user.click(button)

      expect(mockStopScreenShare).toHaveBeenCalledTimes(1)
    })

    it('should not call any function when disabled', async () => {
      const mockStartScreenShare = vi.fn()
      vi.mocked(useScreenShare).mockReturnValue(
        createMockScreenShare({
          canShare: false,
          startScreenShare: mockStartScreenShare,
        })
      )

      const user = userEvent.setup()
      render(<ScreenShareButton room={null} />)

      const button = screen.getByRole('button', { name: /share screen/i })
      await user.click(button)

      expect(mockStartScreenShare).not.toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('should have correct aria-label when not sharing', () => {
      vi.mocked(useScreenShare).mockReturnValue(createMockScreenShare())

      render(<ScreenShareButton room={null} />)

      expect(screen.getByLabelText('Share screen')).toBeInTheDocument()
    })

    it('should have correct aria-label when sharing', () => {
      vi.mocked(useScreenShare).mockReturnValue(
        createMockScreenShare({ isLocalSharing: true })
      )

      render(<ScreenShareButton room={null} />)

      expect(screen.getByLabelText('Stop sharing')).toBeInTheDocument()
    })
  })

  describe('tooltip (AC-3.4.2)', () => {
    it('should render with tooltip wrapper when disabled and sharer name exists', () => {
      vi.mocked(useScreenShare).mockReturnValue(
        createMockScreenShare({
          canShare: false,
          sharerName: 'Alice',
        })
      )

      render(<ScreenShareButton room={null} />)

      // Button should be disabled
      const button = screen.getByRole('button', { name: /share screen/i })
      expect(button).toBeDisabled()

      // The tooltip wrapper should exist (relative inline-block div wrapping the button)
      const tooltipWrapper = button.closest('.relative.inline-block')
      expect(tooltipWrapper).toBeInTheDocument()
    })

    it('should show tooltip content on hover when disabled', async () => {
      vi.mocked(useScreenShare).mockReturnValue(
        createMockScreenShare({
          canShare: false,
          sharerName: 'Alice',
        })
      )

      const user = userEvent.setup()
      render(<ScreenShareButton room={null} />)

      const button = screen.getByRole('button', { name: /share screen/i })

      // Find the span wrapper that receives hover events (not the disabled button)
      const spanWrapper = button.parentElement
      expect(spanWrapper?.tagName).toBe('SPAN')

      if (spanWrapper) {
        await user.hover(spanWrapper)
      }

      // Tooltip should show sharer name
      expect(screen.getByText('Alice is sharing. Ask them to stop first.')).toBeInTheDocument()
    })

    it('should not have tooltip wrapper when button is enabled', () => {
      vi.mocked(useScreenShare).mockReturnValue(
        createMockScreenShare({
          canShare: true,
          sharerName: null,
        })
      )

      render(<ScreenShareButton room={null} />)

      const button = screen.getByRole('button', { name: /share screen/i })

      // Button should not have tooltip wrapper when enabled
      const tooltipWrapper = button.closest('.relative.inline-block')
      expect(tooltipWrapper).not.toBeInTheDocument()
    })

    it('should not have tooltip wrapper when user is sharing themselves', () => {
      vi.mocked(useScreenShare).mockReturnValue(
        createMockScreenShare({
          isLocalSharing: true,
          canShare: false,
          sharerName: null,
        })
      )

      render(<ScreenShareButton room={null} />)

      const button = screen.getByRole('button', { name: /stop sharing/i })

      // Button should not have tooltip wrapper when user is local sharer
      const tooltipWrapper = button.closest('.relative.inline-block')
      expect(tooltipWrapper).not.toBeInTheDocument()
    })
  })
})
