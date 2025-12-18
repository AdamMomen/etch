import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SharerControlBar } from '@/components/ScreenShare/SharerControlBar'

// Mock the stores
vi.mock('@/stores/settingsStore', () => ({
  useSettingsStore: vi.fn((selector) => {
    const state = {
      isMuted: false,
      isVideoOff: false,
      setMuted: vi.fn(),
      setVideoOff: vi.fn(),
    }
    return selector(state)
  }),
}))

vi.mock('@/stores/roomStore', () => ({
  useRoomStore: vi.fn((selector) => {
    const state = {
      remoteParticipants: [],
      localParticipant: {
        id: 'local-1',
        name: 'Test User',
        color: '#6366f1',
      },
    }
    return selector(state)
  }),
}))

// Default props for testing
const createDefaultProps = (overrides = {}) => ({
  room: null,
  videoTrack: null,
  onStopShare: vi.fn(),
  onLeave: vi.fn(),
  ...overrides,
})

describe('SharerControlBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render the control bar container', () => {
      const props = createDefaultProps()

      render(<SharerControlBar {...props} />)

      const controlBar = screen.getByTestId('sharer-control-bar')
      expect(controlBar).toBeInTheDocument()
    })

    it('should have data-tauri-drag-region attribute for dragging', () => {
      const props = createDefaultProps()

      render(<SharerControlBar {...props} />)

      const controlBar = screen.getByTestId('sharer-control-bar')
      expect(controlBar).toHaveAttribute('data-tauri-drag-region')
    })

    it('should render sharing status indicator', () => {
      const props = createDefaultProps()

      render(<SharerControlBar {...props} />)

      expect(screen.getByText('Sharing')).toBeInTheDocument()
    })

    it('should render self camera preview', () => {
      const props = createDefaultProps()

      render(<SharerControlBar {...props} />)

      // When video is off, should show avatar with initial
      expect(screen.getByText('T')).toBeInTheDocument() // 'T' for 'Test User'
    })

    it('should render all control buttons', () => {
      const props = createDefaultProps()

      render(<SharerControlBar {...props} />)

      expect(screen.getByRole('button', { name: /mute microphone/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /disable camera/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /annotate/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /stop sharing/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /leave meeting/i })).toBeInTheDocument()
    })

    it('should have annotate button disabled (placeholder)', () => {
      const props = createDefaultProps()

      render(<SharerControlBar {...props} />)

      const annotateButton = screen.getByRole('button', { name: /annotate/i })
      expect(annotateButton).toBeDisabled()
    })
  })

  describe('button styling (AC-3.7.11)', () => {
    it('should have Stop Share button with accent color', () => {
      const props = createDefaultProps()

      render(<SharerControlBar {...props} />)

      const stopButton = screen.getByRole('button', { name: /stop sharing/i })
      expect(stopButton).toHaveClass('bg-primary')
    })

    it('should have Leave button with destructive outline style', () => {
      const props = createDefaultProps()

      render(<SharerControlBar {...props} />)

      const leaveButton = screen.getByRole('button', { name: /leave meeting/i })
      expect(leaveButton).toHaveClass('border-red-500/50')
      expect(leaveButton).toHaveClass('text-red-400')
    })
  })

  describe('interactions', () => {
    it('should call onStopShare when Stop button is clicked', async () => {
      const mockStopShare = vi.fn()
      const props = createDefaultProps({ onStopShare: mockStopShare })

      const user = userEvent.setup()
      render(<SharerControlBar {...props} />)

      const stopButton = screen.getByRole('button', { name: /stop sharing/i })
      await user.click(stopButton)

      expect(mockStopShare).toHaveBeenCalledTimes(1)
    })

    it('should call onLeave when Leave button is clicked', async () => {
      const mockLeave = vi.fn()
      const props = createDefaultProps({ onLeave: mockLeave })

      const user = userEvent.setup()
      render(<SharerControlBar {...props} />)

      const leaveButton = screen.getByRole('button', { name: /leave meeting/i })
      await user.click(leaveButton)

      expect(mockLeave).toHaveBeenCalledTimes(1)
    })
  })

  describe('view toggle (AC-3.7.10)', () => {
    it('should show single view by default', () => {
      const props = createDefaultProps()

      render(<SharerControlBar {...props} />)

      // View toggle button should be in single view mode initially
      const viewToggle = screen.getByRole('button', { name: /show multi view/i })
      expect(viewToggle).toBeInTheDocument()
    })

    it('should toggle between single and multi view', async () => {
      const props = createDefaultProps()

      const user = userEvent.setup()
      render(<SharerControlBar {...props} />)

      // Initially in single view
      let viewToggle = screen.getByRole('button', { name: /show multi view/i })
      await user.click(viewToggle)

      // Now should be in multi view
      viewToggle = screen.getByRole('button', { name: /show single view/i })
      expect(viewToggle).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have correct aria-labels for all controls', () => {
      const props = createDefaultProps()

      render(<SharerControlBar {...props} />)

      expect(screen.getByLabelText(/microphone/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/camera/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/annotate/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/stop sharing/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/leave meeting/i)).toBeInTheDocument()
    })
  })
})
