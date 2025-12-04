import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Room } from 'livekit-client'
import { CameraButton } from './CameraButton'
import { useSettingsStore } from '@/stores/settingsStore'
import { useRoomStore } from '@/stores/roomStore'

// Mock livekit-client
vi.mock('livekit-client', async () => {
  const actual = await vi.importActual('livekit-client')
  return {
    ...actual,
    Room: vi.fn(),
    Track: {
      Source: {
        Camera: 'camera',
      },
    },
    VideoPresets: {
      h720: { width: 1280, height: 720 },
    },
    RoomEvent: {
      LocalTrackPublished: 'localTrackPublished',
      LocalTrackUnpublished: 'localTrackUnpublished',
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
    audioDevices: [],
    videoDevices: [
      { deviceId: 'device1', label: 'Test Camera' },
    ],
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  }),
}))

describe('CameraButton', () => {
  const mockSetCameraEnabled = vi.fn()
  const mockGetTrackPublication = vi.fn()
  let mockRoom: Partial<Room>

  beforeEach(() => {
    vi.clearAllMocks()

    mockRoom = {
      localParticipant: {
        setCameraEnabled: mockSetCameraEnabled,
        isCameraEnabled: false,
        getTrackPublication: mockGetTrackPublication,
      } as unknown as Room['localParticipant'],
      on: vi.fn(),
      off: vi.fn(),
    }

    mockSetCameraEnabled.mockResolvedValue(undefined)
    mockGetTrackPublication.mockReturnValue(null)

    // Reset stores
    useSettingsStore.setState({
      isVideoOff: true,
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
      isVideoOff: true,
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
    it('renders video off icon when video is off', () => {
      render(<CameraButton room={mockRoom as Room} />)

      const button = screen.getByRole('button', { name: /turn on camera/i })
      expect(button).toBeInTheDocument()
    })

    it('renders video on icon when video is on', () => {
      useSettingsStore.setState({ isVideoOff: false })
      render(<CameraButton room={mockRoom as Room} />)

      const button = screen.getByRole('button', { name: /turn off camera/i })
      expect(button).toBeInTheDocument()
    })

    it('has correct aria-pressed when video is off', () => {
      render(<CameraButton room={mockRoom as Room} />)

      const button = screen.getByLabelText('Turn on camera')
      expect(button).toHaveAttribute('aria-pressed', 'false')
    })

    it('has correct aria-pressed when video is on', () => {
      useSettingsStore.setState({ isVideoOff: false })
      render(<CameraButton room={mockRoom as Room} />)

      const button = screen.getByLabelText('Turn off camera')
      expect(button).toHaveAttribute('aria-pressed', 'true')
    })

    it('has destructive style when video is off', () => {
      render(<CameraButton room={mockRoom as Room} />)

      const button = screen.getByLabelText('Turn on camera')
      expect(button).toHaveClass('text-destructive')
    })

    it('does not have destructive style when video is on', () => {
      useSettingsStore.setState({ isVideoOff: false })
      render(<CameraButton room={mockRoom as Room} />)

      const button = screen.getByLabelText('Turn off camera')
      expect(button).not.toHaveClass('text-destructive')
    })
  })

  describe('click interaction', () => {
    it('toggles video state on click', async () => {
      render(<CameraButton room={mockRoom as Room} />)

      const button = screen.getByLabelText('Turn on camera')
      fireEvent.click(button)

      expect(mockSetCameraEnabled).toHaveBeenCalledWith(true, expect.any(Object))
    })

    it('aria-label changes after toggle', async () => {
      render(<CameraButton room={mockRoom as Room} />)

      const button = screen.getByRole('button', { name: /turn on camera/i })
      expect(button).toBeInTheDocument()

      fireEvent.click(button)

      // After click, video should be on, so label should say "Turn off camera"
      const updatedButton = await screen.findByRole('button', { name: /turn off camera/i })
      expect(updatedButton).toBeInTheDocument()
    })
  })

  describe('keyboard shortcut (AC-2.8.5)', () => {
    it('toggles video when V key is pressed', () => {
      render(<CameraButton room={mockRoom as Room} />)

      fireEvent.keyDown(window, { key: 'v' })

      expect(mockSetCameraEnabled).toHaveBeenCalledWith(true, expect.any(Object))
    })

    it('toggles video when uppercase V key is pressed', () => {
      render(<CameraButton room={mockRoom as Room} />)

      fireEvent.keyDown(window, { key: 'V' })

      expect(mockSetCameraEnabled).toHaveBeenCalledWith(true, expect.any(Object))
    })

    it('does not toggle when V is pressed in input field', () => {
      render(
        <div>
          <CameraButton room={mockRoom as Room} />
          <input data-testid="text-input" />
        </div>
      )

      const input = screen.getByTestId('text-input')
      fireEvent.keyDown(input, { key: 'v' })

      expect(mockSetCameraEnabled).not.toHaveBeenCalled()
    })

    it('does not toggle when V is pressed in textarea', () => {
      render(
        <div>
          <CameraButton room={mockRoom as Room} />
          <textarea data-testid="text-area" />
        </div>
      )

      const textarea = screen.getByTestId('text-area')
      fireEvent.keyDown(textarea, { key: 'v' })

      expect(mockSetCameraEnabled).not.toHaveBeenCalled()
    })
  })
})
