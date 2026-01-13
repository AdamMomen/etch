import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Room } from 'livekit-client'
import { MicrophoneButton } from '@/components/MeetingRoom/MicrophoneButton'
import { useSettingsStore } from '@/stores/settingsStore'
import { useRoomStore } from '@/stores/roomStore'

// Mock livekit-client
vi.mock('livekit-client', async () => {
  const actual = await vi.importActual('livekit-client')
  return {
    ...actual,
    Room: vi.fn(),
    ParticipantEvent: {
      IsSpeakingChanged: 'participantIsSpeakingChanged',
    },
  }
})

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}))

// Mock useDevices hook
vi.mock('@/hooks/useDevices', () => ({
  useDevices: () => ({
    audioDevices: [
      { deviceId: 'device1', label: 'Test Microphone' },
    ],
    videoDevices: [],
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  }),
}))

describe('MicrophoneButton', () => {
  const mockSetMicrophoneEnabled = vi.fn()
  const mockOn = vi.fn()
  const mockOff = vi.fn()
  let mockRoom: Partial<Room>

  beforeEach(() => {
    vi.clearAllMocks()

    mockRoom = {
      localParticipant: {
        setMicrophoneEnabled: mockSetMicrophoneEnabled,
        isMicrophoneEnabled: false,
        on: mockOn,
        off: mockOff,
      } as unknown as Room['localParticipant'],
    }

    // Reset stores
    useSettingsStore.setState({
      isMuted: true,
      displayName: 'Test User',
      apiBaseUrl: 'http://localhost:3000/api',
      sidebarCollapsed: false,
    })

    useRoomStore.setState({
      localParticipant: {
        id: 'local-user',
        name: 'Test User',
        role: 'host',
        color: '#f97316',
        isLocal: true,
      },
      remoteParticipants: [],
    })
  })

  afterEach(() => {
    useSettingsStore.setState({
      isMuted: true,
      displayName: '',
      apiBaseUrl: 'http://localhost:3000/api',
      sidebarCollapsed: false,
    })
    useRoomStore.setState({
      localParticipant: null,
      remoteParticipants: [],
    })
  })

  describe('rendering', () => {
    it('renders muted state with MicOff icon', () => {
      render(<MicrophoneButton room={mockRoom as Room} />)

      const button = screen.getByLabelText('Unmute microphone')
      expect(button).toBeInTheDocument()
    })

    it('renders unmuted state with Mic icon', () => {
      useSettingsStore.setState({ isMuted: false })
      render(<MicrophoneButton room={mockRoom as Room} />)

      const button = screen.getByLabelText('Mute microphone')
      expect(button).toBeInTheDocument()
    })

    it('has destructive style when muted', () => {
      render(<MicrophoneButton room={mockRoom as Room} />)

      const button = screen.getByLabelText('Unmute microphone')
      expect(button).toHaveClass('text-destructive')
    })

    it('has correct aria-pressed attribute', () => {
      render(<MicrophoneButton room={mockRoom as Room} />)

      const button = screen.getByLabelText('Unmute microphone')
      // aria-pressed=false means muted (not actively pressed/unmuted)
      expect(button).toHaveAttribute('aria-pressed', 'false')
    })
  })

  describe('click behavior (AC-2.7.2, AC-2.7.3)', () => {
    it('toggles mute state on click', async () => {
      mockSetMicrophoneEnabled.mockResolvedValue(undefined)
      const user = userEvent.setup()

      render(<MicrophoneButton room={mockRoom as Room} />)

      const button = screen.getByLabelText('Unmute microphone')
      await user.click(button)

      // Should now be unmuted
      expect(screen.getByLabelText('Mute microphone')).toBeInTheDocument()
    })

    it('calls setMicrophoneEnabled with correct value', async () => {
      mockSetMicrophoneEnabled.mockResolvedValue(undefined)
      const user = userEvent.setup()

      render(<MicrophoneButton room={mockRoom as Room} />)

      await user.click(screen.getByLabelText('Unmute microphone'))

      expect(mockSetMicrophoneEnabled).toHaveBeenCalledWith(true)
    })
  })

  describe('keyboard shortcut (AC-2.7.5)', () => {
    it('toggles mute when M key is pressed', async () => {
      mockSetMicrophoneEnabled.mockResolvedValue(undefined)

      render(<MicrophoneButton room={mockRoom as Room} />)

      // Simulate M key press
      await act(async () => {
        fireEvent.keyDown(window, { key: 'M' })
      })

      expect(mockSetMicrophoneEnabled).toHaveBeenCalledWith(true)
    })

    it('toggles mute when lowercase m key is pressed', async () => {
      mockSetMicrophoneEnabled.mockResolvedValue(undefined)

      render(<MicrophoneButton room={mockRoom as Room} />)

      // Simulate m key press
      await act(async () => {
        fireEvent.keyDown(window, { key: 'm' })
      })

      expect(mockSetMicrophoneEnabled).toHaveBeenCalledWith(true)
    })

    it('does not toggle when M is pressed in input field', async () => {
      render(
        <>
          <MicrophoneButton room={mockRoom as Room} />
          <input type="text" data-testid="test-input" />
        </>
      )

      const input = screen.getByTestId('test-input')
      input.focus()

      await act(async () => {
        fireEvent.keyDown(input, { key: 'M' })
      })

      expect(mockSetMicrophoneEnabled).not.toHaveBeenCalled()
    })

    it('does not toggle when M is pressed in textarea', async () => {
      render(
        <>
          <MicrophoneButton room={mockRoom as Room} />
          <textarea data-testid="test-textarea" />
        </>
      )

      const textarea = screen.getByTestId('test-textarea')
      textarea.focus()

      await act(async () => {
        fireEvent.keyDown(textarea, { key: 'M' })
      })

      expect(mockSetMicrophoneEnabled).not.toHaveBeenCalled()
    })
  })

  describe('visual feedback (AC-2.7.4)', () => {
    it('updates button state after successful toggle', async () => {
      mockSetMicrophoneEnabled.mockResolvedValue(undefined)

      const user = userEvent.setup()
      render(<MicrophoneButton room={mockRoom as Room} />)

      // Initially muted
      expect(screen.getByLabelText('Unmute microphone')).toBeInTheDocument()

      // Click to unmute
      await user.click(screen.getByLabelText('Unmute microphone'))

      // After successful toggle, should show mute button
      expect(screen.getByLabelText('Mute microphone')).toBeInTheDocument()
    })

    it('updates settingsStore isMuted immediately on click', async () => {
      mockSetMicrophoneEnabled.mockResolvedValue(undefined)

      const user = userEvent.setup()
      render(<MicrophoneButton room={mockRoom as Room} />)

      expect(useSettingsStore.getState().isMuted).toBe(true)

      await user.click(screen.getByLabelText('Unmute microphone'))

      // Store should be updated
      expect(useSettingsStore.getState().isMuted).toBe(false)
    })
  })

  describe('without room connection', () => {
    it('renders even when room is null', () => {
      render(<MicrophoneButton room={null} />)

      expect(screen.getByLabelText('Unmute microphone')).toBeInTheDocument()
    })

    it('does not call setMicrophoneEnabled when room is null', async () => {
      const user = userEvent.setup()

      render(<MicrophoneButton room={null} />)

      await user.click(screen.getByLabelText('Unmute microphone'))

      expect(mockSetMicrophoneEnabled).not.toHaveBeenCalled()
    })
  })
})
