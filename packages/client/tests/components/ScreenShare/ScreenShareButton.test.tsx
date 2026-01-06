import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ScreenShareButton } from '@/components/ScreenShare/ScreenShareButton'

// Default props for testing
const createDefaultProps = (overrides = {}) => ({
  isLocalSharing: false,
  canShare: true,
  sharerName: null as string | null,
  onStartShare: vi.fn(),
  onStopShare: vi.fn(),
  ...overrides,
})

describe('ScreenShareButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render with outline variant when not sharing', () => {
      const props = createDefaultProps()

      render(<ScreenShareButton {...props} />)

      const button = screen.getByRole('button', { name: /share screen/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('rounded-full')
    })

    it('should render with default variant when sharing', () => {
      const props = createDefaultProps({ isLocalSharing: true })

      render(<ScreenShareButton {...props} />)

      const button = screen.getByRole('button', { name: /stop sharing/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('bg-primary')
    })

    it('should be disabled when canShare is false and not sharing', () => {
      const props = createDefaultProps({ canShare: false })

      render(<ScreenShareButton {...props} />)

      const button = screen.getByRole('button', { name: /share screen/i })
      expect(button).toBeDisabled()
    })

    it('should not be disabled when sharing (even if canShare is false)', () => {
      const props = createDefaultProps({ isLocalSharing: true, canShare: false })

      render(<ScreenShareButton {...props} />)

      const button = screen.getByRole('button', { name: /stop sharing/i })
      expect(button).not.toBeDisabled()
    })

    it('should apply custom className', () => {
      const props = createDefaultProps()

      render(<ScreenShareButton {...props} className="custom-class" />)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('custom-class')
    })
  })

  describe('interactions', () => {
    it('should call onStartShare when clicked and not sharing', async () => {
      const mockStartShare = vi.fn()
      const props = createDefaultProps({ onStartShare: mockStartShare })

      const user = userEvent.setup()
      render(<ScreenShareButton {...props} />)

      const button = screen.getByRole('button', { name: /share screen/i })
      await user.click(button)

      expect(mockStartShare).toHaveBeenCalledTimes(1)
    })

    it('should call onStopShare when clicked and sharing', async () => {
      const mockStopShare = vi.fn()
      const props = createDefaultProps({
        isLocalSharing: true,
        onStopShare: mockStopShare,
      })

      const user = userEvent.setup()
      render(<ScreenShareButton {...props} />)

      const button = screen.getByRole('button', { name: /stop sharing/i })
      await user.click(button)

      expect(mockStopShare).toHaveBeenCalledTimes(1)
    })

    it('should not call any function when disabled', async () => {
      const mockStartShare = vi.fn()
      const props = createDefaultProps({
        canShare: false,
        onStartShare: mockStartShare,
      })

      const user = userEvent.setup()
      render(<ScreenShareButton {...props} />)

      const button = screen.getByRole('button', { name: /share screen/i })
      await user.click(button)

      expect(mockStartShare).not.toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('should have correct aria-label when not sharing', () => {
      const props = createDefaultProps()

      render(<ScreenShareButton {...props} />)

      expect(screen.getByLabelText('Share screen')).toBeInTheDocument()
    })

    it('should have correct aria-label when sharing', () => {
      const props = createDefaultProps({ isLocalSharing: true })

      render(<ScreenShareButton {...props} />)

      expect(screen.getByLabelText('Stop sharing')).toBeInTheDocument()
    })
  })

  describe('tooltip (AC-3.4.2)', () => {
    it('should render with tooltip wrapper when disabled and sharer name exists', () => {
      const props = createDefaultProps({
        canShare: false,
        sharerName: 'Alice',
      })

      render(<ScreenShareButton {...props} />)

      // Button should be disabled
      const button = screen.getByRole('button', { name: /share screen/i })
      expect(button).toBeDisabled()

      // The tooltip wrapper should exist (span.inline-block wrapping the button for Radix)
      const spanWrapper = button.parentElement
      expect(spanWrapper?.tagName).toBe('SPAN')
      expect(spanWrapper?.className).toContain('inline-block')
    })

    it('should show tooltip content on hover when disabled', async () => {
      const props = createDefaultProps({
        canShare: false,
        sharerName: 'Alice',
      })

      const user = userEvent.setup()
      render(<ScreenShareButton {...props} />)

      const button = screen.getByRole('button', { name: /share screen/i })

      // Find the span wrapper that receives hover events (not the disabled button)
      const spanWrapper = button.parentElement
      expect(spanWrapper?.tagName).toBe('SPAN')

      if (spanWrapper) {
        await user.hover(spanWrapper)
      }

      // Tooltip should show sharer name
      const tooltip = await screen.findByRole('tooltip', { hidden: true })
      expect(tooltip).toHaveTextContent('Alice is sharing. Ask them to stop first.')
    })

    it('should not have tooltip wrapper when button is enabled', () => {
      const props = createDefaultProps({
        canShare: true,
        sharerName: null,
      })

      render(<ScreenShareButton {...props} />)

      const button = screen.getByRole('button', { name: /share screen/i })

      // Button should not have TooltipButton wrapper when enabled (no tooltip prop)
      // Just verify the button exists without span wrapper
      expect(button.parentElement?.tagName).not.toBe('SPAN')
    })

    it('should not have tooltip wrapper when user is sharing themselves', () => {
      const props = createDefaultProps({
        isLocalSharing: true,
        canShare: false,
        sharerName: null,
      })

      render(<ScreenShareButton {...props} />)

      const button = screen.getByRole('button', { name: /stop sharing/i })

      // Button should not have tooltip wrapper when user is local sharer
      // Just verify the button exists without span wrapper
      expect(button.parentElement?.tagName).not.toBe('SPAN')
    })
  })
})
