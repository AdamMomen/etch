import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { SourcePickerDialog } from '@/components/ScreenShare/SourcePickerDialog'
import type { ScreenInfo } from '@/lib/core'

// Sample base64 JPEG thumbnail (1x1 pixel red image for testing)
const SAMPLE_THUMBNAIL =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAB//2Q=='

// Create mock data helpers
const createMockScreen = (overrides: Partial<ScreenInfo> = {}): ScreenInfo => ({
  id: 'screen:1',
  name: 'Display 1',
  x: 0,
  y: 0,
  width: 1920,
  height: 1080,
  is_primary: true,
  thumbnail: undefined,
  ...overrides,
})

// Note: Window capture is not supported - tests only cover screen capture

const createDefaultProps = (overrides = {}) => ({
  open: true,
  onOpenChange: vi.fn(),
  screens: [] as ScreenInfo[],
  isLoading: false,
  onSelect: vi.fn(),
  ...overrides,
})

describe('SourcePickerDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render dialog when open', () => {
      const props = createDefaultProps()

      render(<SourcePickerDialog {...props} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Share your screen')).toBeInTheDocument()
    })

    it('should show loading state', () => {
      const props = createDefaultProps({ isLoading: true })

      render(<SourcePickerDialog {...props} />)

      expect(screen.getByText('Loading sources...')).toBeInTheDocument()
    })

    it('should show screen count in header', () => {
      const props = createDefaultProps({
        screens: [createMockScreen()],
      })

      render(<SourcePickerDialog {...props} />)

      expect(screen.getByText('Screens (1)')).toBeInTheDocument()
    })
  })

  describe('thumbnail display (AC-3.12.1, AC-3.12.3)', () => {
    it('should display thumbnail image when thumbnail is provided', () => {
      const props = createDefaultProps({
        screens: [createMockScreen({ thumbnail: SAMPLE_THUMBNAIL })],
      })

      render(<SourcePickerDialog {...props} />)

      // Find the image element
      const img = screen.getByRole('img', { name: 'Display 1' })
      expect(img).toBeInTheDocument()
      expect(img).toHaveAttribute(
        'src',
        `data:image/jpeg;base64,${SAMPLE_THUMBNAIL}`
      )
    })

    it('should display icon placeholder when thumbnail is not available', () => {
      const props = createDefaultProps({
        screens: [createMockScreen({ thumbnail: undefined })],
      })

      render(<SourcePickerDialog {...props} />)

      // Should not have an img element
      expect(screen.queryByRole('img')).not.toBeInTheDocument()

      // Should have the Monitor icon (rendered via lucide-react)
      // We check for the button containing the screen name
      const button = screen.getByRole('button', { name: /display 1/i })
      expect(button).toBeInTheDocument()

      // The icon should be an SVG inside the button
      const svg = button.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('should handle mixed sources - some with thumbnails, some without', () => {
      const props = createDefaultProps({
        screens: [
          createMockScreen({
            id: 'screen:1',
            name: 'Display 1',
            thumbnail: SAMPLE_THUMBNAIL,
          }),
          createMockScreen({
            id: 'screen:2',
            name: 'Display 2',
            thumbnail: undefined,
          }),
        ],
      })

      render(<SourcePickerDialog {...props} />)

      // First screen should have image
      expect(screen.getByRole('img', { name: 'Display 1' })).toBeInTheDocument()

      // Second screen should have icon (no img for it)
      const buttons = screen.getAllByRole('button')
      const display2Button = buttons.find((b) =>
        b.textContent?.includes('Display 2')
      )
      expect(display2Button).toBeInTheDocument()

      // There should be exactly one image (for Display 1)
      expect(screen.getAllByRole('img')).toHaveLength(1)
    })

    it('should still allow selection when thumbnail is missing (AC-3.12.3)', async () => {
      const onSelect = vi.fn()
      const props = createDefaultProps({
        screens: [createMockScreen({ thumbnail: undefined })],
        onSelect,
      })

      const user = userEvent.setup()
      render(<SourcePickerDialog {...props} />)

      // Click on the source card
      const sourceButton = screen.getByRole('button', { name: /display 1/i })
      await user.click(sourceButton)

      // Click Share button
      const shareButton = screen.getByRole('button', { name: /share/i })
      await user.click(shareButton)

      expect(onSelect).toHaveBeenCalledWith('screen:1', 'screen')
    })
  })

  describe('interactions', () => {
    it('should call onSelect when screen is selected and Share clicked', async () => {
      const onSelect = vi.fn()
      const props = createDefaultProps({
        screens: [createMockScreen({ thumbnail: SAMPLE_THUMBNAIL })],
        onSelect,
      })

      const user = userEvent.setup()
      render(<SourcePickerDialog {...props} />)

      // Click on the source
      await user.click(screen.getByRole('img', { name: 'Display 1' }))

      // Click Share
      await user.click(screen.getByRole('button', { name: /share$/i }))

      expect(onSelect).toHaveBeenCalledWith('screen:1', 'screen')
    })

    it('should close dialog when Cancel is clicked', async () => {
      const onOpenChange = vi.fn()
      const props = createDefaultProps({ onOpenChange })

      const user = userEvent.setup()
      render(<SourcePickerDialog {...props} />)

      await user.click(screen.getByRole('button', { name: /cancel/i }))

      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('should disable Share button when no source selected', () => {
      const props = createDefaultProps({
        screens: [createMockScreen()],
      })

      render(<SourcePickerDialog {...props} />)

      const shareButton = screen.getByRole('button', { name: /share$/i })
      expect(shareButton).toBeDisabled()
    })
  })

  describe('empty states', () => {
    it('should show "No screens available" when screens array is empty', () => {
      const props = createDefaultProps({
        screens: [],
      })

      render(<SourcePickerDialog {...props} />)

      expect(screen.getByText('No screens available')).toBeInTheDocument()
    })
  })
})
