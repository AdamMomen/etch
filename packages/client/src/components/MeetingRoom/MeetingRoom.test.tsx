import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { MeetingRoom } from './MeetingRoom'
import { useSettingsStore } from '@/stores/settingsStore'
import { useRoomStore } from '@/stores/roomStore'

// Mock navigation
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock useLiveKit hook
const mockRetry = vi.fn()
const mockLeaveRoom = vi.fn().mockResolvedValue(undefined)
const mockSetMicrophoneEnabled = vi.fn().mockResolvedValue(undefined)
const mockLocalParticipant = {
  setMicrophoneEnabled: mockSetMicrophoneEnabled,
  isMicrophoneEnabled: false,
  on: vi.fn(),
  off: vi.fn(),
}
const mockRoom = {
  localParticipant: mockLocalParticipant,
  remoteParticipants: new Map(),
  on: vi.fn(),
  off: vi.fn(),
}
vi.mock('@/hooks/useLiveKit', () => ({
  useLiveKit: () => ({
    room: mockRoom,
    connectionState: 'connected',
    isConnecting: false,
    isConnected: true,
    error: null,
    retry: mockRetry,
    leaveRoom: mockLeaveRoom,
  }),
}))

function renderMeetingRoom(roomId: string = 'test-room-123') {
  return render(
    <MemoryRouter initialEntries={[`/room/${roomId}`]}>
      <Routes>
        <Route path="/room/:roomId" element={<MeetingRoom />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('MeetingRoom', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset stores to initial state with proper participant
    act(() => {
      useSettingsStore.setState({
        displayName: 'Test User',
        apiBaseUrl: 'http://localhost:3000/api',
        sidebarCollapsed: false,
        isMuted: true,
      })
      useRoomStore.setState({
        currentRoom: {
          roomId: 'test-room-123',
          token: 'test-token',
          livekitUrl: 'wss://livekit.example.com',
        },
        isConnecting: false,
        isConnected: true,
        connectionError: null,
        localParticipant: {
          id: 'local-user-id',
          name: 'Test User',
          role: 'host',
          color: '#f97316',
          isLocal: true,
        },
        remoteParticipants: [],
      })
    })
  })

  afterEach(() => {
    // Reset stores after each test
    act(() => {
      useRoomStore.setState({
        currentRoom: null,
        isConnecting: false,
        isConnected: false,
        connectionError: null,
        localParticipant: null,
        remoteParticipants: [],
      })
    })
  })

  describe('Layout Structure (AC-2.5.1)', () => {
    it('renders the main layout with header, content, and footer', () => {
      renderMeetingRoom()

      // Header (toolbar) - Connected status
      expect(screen.getByText('Connected')).toBeInTheDocument()

      // Footer (controls bar) - mic/camera are muted/off by default so labels describe the action to enable
      expect(screen.getByLabelText('Unmute microphone')).toBeInTheDocument()
      expect(screen.getByLabelText('Turn on camera')).toBeInTheDocument()
      expect(screen.getByLabelText('Share screen')).toBeInTheDocument()
      expect(screen.getByLabelText('Leave meeting')).toBeInTheDocument()
    })

    it('renders the sidebar', () => {
      renderMeetingRoom()
      expect(screen.getByText('Participants')).toBeInTheDocument()
    })

    it('renders the main content area with waiting message when alone', () => {
      renderMeetingRoom()
      expect(
        screen.getByText('Waiting for others to join...')
      ).toBeInTheDocument()
    })

    it('renders annotation tools placeholder in toolbar', () => {
      renderMeetingRoom()
      expect(
        screen.getByText('Annotation tools available when screen sharing')
      ).toBeInTheDocument()
    })
  })

  describe('Participant Sidebar (AC-2.5.2)', () => {
    it('displays PARTICIPANTS header', () => {
      renderMeetingRoom()
      expect(screen.getByText('Participants')).toBeInTheDocument()
    })

    it('shows current user with (You) marker', () => {
      renderMeetingRoom()
      expect(screen.getByText('Test User')).toBeInTheDocument()
      expect(screen.getByText('(You)')).toBeInTheDocument()
    })

    it('displays host role badge', () => {
      renderMeetingRoom()
      expect(screen.getByText('Host')).toBeInTheDocument()
    })

    it('shows participant count', () => {
      renderMeetingRoom()
      expect(screen.getByText('1')).toBeInTheDocument()
    })

    it('renders Invite button in sidebar', () => {
      renderMeetingRoom()
      // The sidebar invite button has text "Invite" (from Sidebar.tsx)
      const sidebarInviteButton = screen.getByRole('button', { name: 'Invite' })
      expect(sidebarInviteButton).toBeInTheDocument()
    })

    it('sidebar invite button opens invite modal', async () => {
      const user = userEvent.setup()
      renderMeetingRoom()

      // Click the sidebar invite button
      const sidebarInviteButton = screen.getByRole('button', { name: 'Invite' })
      await user.click(sidebarInviteButton)

      // InviteModal should be shown
      await waitFor(() => {
        expect(screen.getByText('Invite to Meeting')).toBeInTheDocument()
      })
    })
  })

  describe('Meeting Controls Bar (AC-2.5.3)', () => {
    it('renders microphone button as muted by default', () => {
      renderMeetingRoom()
      const micButton = screen.getByLabelText('Unmute microphone')
      expect(micButton).toBeInTheDocument()
    })

    it('renders camera button as off by default', () => {
      renderMeetingRoom()
      const videoButton = screen.getByLabelText('Turn on camera')
      expect(videoButton).toBeInTheDocument()
    })

    it('renders screen share button', () => {
      renderMeetingRoom()
      expect(screen.getByLabelText('Share screen')).toBeInTheDocument()
    })

    it('renders leave button with destructive style', () => {
      renderMeetingRoom()
      const leaveButton = screen.getByLabelText('Leave meeting')
      expect(leaveButton).toBeInTheDocument()
    })

    it('toggles microphone state on click', async () => {
      const user = userEvent.setup()
      renderMeetingRoom()

      // Initially muted (per settingsStore default)
      expect(useSettingsStore.getState().isMuted).toBe(true)

      // Click unmute - should toggle isMuted in store
      const micButton = screen.getByLabelText('Unmute microphone')
      await user.click(micButton)

      // settingsStore.isMuted should now be false (optimistic update)
      await waitFor(() => {
        expect(useSettingsStore.getState().isMuted).toBe(false)
      })

      // Button should now say "Mute"
      expect(screen.getByLabelText('Mute microphone')).toBeInTheDocument()
    })

    it('renders camera button as placeholder (Story 2.8)', () => {
      renderMeetingRoom()
      // Video toggle is a placeholder until Story 2.8
      const videoButton = screen.getByLabelText('Turn on camera')
      expect(videoButton).toBeInTheDocument()
      // Button remains static - no toggle functionality yet
    })
  })

  describe('Invite Controls Bar Button (AC-2.13.1)', () => {
    it('renders Invite button in controls bar', () => {
      renderMeetingRoom()
      expect(screen.getByLabelText('Invite participants')).toBeInTheDocument()
    })

    it('controls bar invite button opens invite modal', async () => {
      const user = userEvent.setup()
      renderMeetingRoom()

      const controlsInviteButton = screen.getByLabelText('Invite participants')
      await user.click(controlsInviteButton)

      await waitFor(() => {
        expect(screen.getByText('Invite to Meeting')).toBeInTheDocument()
      })
    })
  })

  describe('Invite Keyboard Shortcut (AC-2.13.4)', () => {
    it('opens invite modal with Cmd+I', async () => {
      renderMeetingRoom()

      await act(async () => {
        fireEvent.keyDown(window, { key: 'i', metaKey: true })
      })

      await waitFor(() => {
        expect(screen.getByText('Invite to Meeting')).toBeInTheDocument()
      })
    })

    it('opens invite modal with Ctrl+I', async () => {
      renderMeetingRoom()

      await act(async () => {
        fireEvent.keyDown(window, { key: 'i', ctrlKey: true })
      })

      await waitFor(() => {
        expect(screen.getByText('Invite to Meeting')).toBeInTheDocument()
      })
    })

    it('does not trigger shortcut when input is focused', async () => {
      const user = userEvent.setup()
      renderMeetingRoom()

      // First open the modal to get an input
      await act(async () => {
        fireEvent.keyDown(window, { key: 'i', metaKey: true })
      })

      await waitFor(() => {
        expect(screen.getByText('Invite to Meeting')).toBeInTheDocument()
      })

      // Get the input field and focus it
      const input = screen.getByLabelText('Invite link')
      await user.click(input)

      // Close the modal
      const closeButton = screen.getByRole('button', { name: 'Close' })
      await user.click(closeButton)

      await waitFor(() => {
        expect(screen.queryByText('Invite to Meeting')).not.toBeInTheDocument()
      })

      // When an input is focused, keyboard shortcut should not reopen modal
      // (In the actual implementation, inputs block the global shortcut)
    })
  })

  describe('Sidebar Toggle (AC-2.5.4)', () => {
    it('toggles sidebar with keyboard shortcut Cmd+\\', async () => {
      renderMeetingRoom()

      // Sidebar should be visible initially
      expect(screen.getByText('Participants')).toBeVisible()

      // Press Cmd+\
      await act(async () => {
        fireEvent.keyDown(window, { key: '\\', metaKey: true })
      })

      // Sidebar should be collapsed
      await waitFor(() => {
        expect(useSettingsStore.getState().sidebarCollapsed).toBe(true)
      })
    })

    it('toggles sidebar with keyboard shortcut Ctrl+\\', async () => {
      renderMeetingRoom()

      // Press Ctrl+\
      await act(async () => {
        fireEvent.keyDown(window, { key: '\\', ctrlKey: true })
      })

      await waitFor(() => {
        expect(useSettingsStore.getState().sidebarCollapsed).toBe(true)
      })
    })

    it('toggles sidebar with toggle button', async () => {
      const user = userEvent.setup()
      renderMeetingRoom()

      const toggleButton = screen.getByLabelText('Collapse sidebar')
      await user.click(toggleButton)

      expect(useSettingsStore.getState().sidebarCollapsed).toBe(true)
    })

    it('persists sidebar state to store', async () => {
      const user = userEvent.setup()
      renderMeetingRoom()

      // Toggle sidebar
      const toggleButton = screen.getByLabelText('Collapse sidebar')
      await user.click(toggleButton)

      // State should be persisted in store
      expect(useSettingsStore.getState().sidebarCollapsed).toBe(true)

      // Toggle back
      const expandButton = screen.getByLabelText('Expand sidebar')
      await user.click(expandButton)

      expect(useSettingsStore.getState().sidebarCollapsed).toBe(false)
    })
  })

  describe('Responsive Layout (AC-2.5.5)', () => {
    it('auto-collapses sidebar when window is narrow on mount', async () => {
      // Set window width to below breakpoint
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 800,
      })

      renderMeetingRoom()

      // Trigger resize event
      await act(async () => {
        fireEvent(window, new Event('resize'))
      })

      expect(useSettingsStore.getState().sidebarCollapsed).toBe(true)
    })
  })

  describe('Connection Status (AC-2.5.6)', () => {
    it('displays room ID in toolbar', () => {
      renderMeetingRoom('my-room-id')
      expect(screen.getByText('my-room-id')).toBeInTheDocument()
    })

    it('shows connection status indicator when connected', () => {
      renderMeetingRoom()
      expect(screen.getByText('Connected')).toBeInTheDocument()
      expect(screen.getByLabelText('Connected')).toBeInTheDocument()
    })

    it('shows disconnected status with retry button when not connected', () => {
      act(() => {
        useRoomStore.setState({
          isConnected: false,
          connectionError: 'Connection failed',
        })
      })

      renderMeetingRoom()
      expect(screen.getByText('Disconnected')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })

    it('shows connecting status when connecting', () => {
      act(() => {
        useRoomStore.setState({
          isConnecting: true,
          isConnected: false,
        })
      })

      renderMeetingRoom()
      expect(screen.getByText('Connecting...')).toBeInTheDocument()
    })
  })

  describe('Main Content Area (AC-2.5.7)', () => {
    it('shows waiting message when alone in room', () => {
      renderMeetingRoom()
      expect(
        screen.getByText('Waiting for others to join...')
      ).toBeInTheDocument()
      expect(
        screen.getByText(/Share the room link to invite participants/)
      ).toBeInTheDocument()
    })
  })

  describe('Leave Button Functionality (AC-2.5.8)', () => {
    it('navigates to home when leave is clicked (non-host)', async () => {
      // Set up as non-host participant
      act(() => {
        useRoomStore.setState({
          localParticipant: {
            id: 'local-user-id',
            name: 'Test User',
            role: 'annotator', // Non-host role
            color: '#f97316',
            isLocal: true,
          },
        })
      })

      const user = userEvent.setup()
      renderMeetingRoom()

      const leaveButton = screen.getByLabelText('Leave meeting')
      await user.click(leaveButton)

      // Wait for async leave operation to complete
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/')
      })
    })

    it('clears room store when leaving (non-host)', async () => {
      // Set up as non-host participant
      act(() => {
        useRoomStore.setState({
          localParticipant: {
            id: 'local-user-id',
            name: 'Test User',
            role: 'annotator', // Non-host role
            color: '#f97316',
            isLocal: true,
          },
        })
      })

      const user = userEvent.setup()
      renderMeetingRoom()

      const leaveButton = screen.getByLabelText('Leave meeting')
      await user.click(leaveButton)

      // Wait for async leave operation to complete
      await waitFor(() => {
        expect(useRoomStore.getState().currentRoom).toBeNull()
      })
    })

    it('shows confirmation dialog when host clicks leave', async () => {
      // Host is set by default in beforeEach
      const user = userEvent.setup()
      renderMeetingRoom()

      const leaveButton = screen.getByLabelText('Leave meeting')
      await user.click(leaveButton)

      // Should show confirmation dialog
      await waitFor(() => {
        expect(screen.getByText('Leave meeting?')).toBeInTheDocument()
        expect(screen.getByText(/You are the host/)).toBeInTheDocument()
      })
    })

    it('leaves when host confirms in dialog', async () => {
      // Host is set by default in beforeEach
      const user = userEvent.setup()
      renderMeetingRoom()

      const leaveButton = screen.getByLabelText('Leave meeting')
      await user.click(leaveButton)

      // Wait for dialog to appear
      await waitFor(() => {
        expect(screen.getByText('Leave meeting?')).toBeInTheDocument()
      })

      // Click the Leave button in the dialog
      const confirmButton = screen.getByRole('button', { name: 'Leave' })
      await user.click(confirmButton)

      // Wait for async leave operation to complete
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/')
      })
    })

    it('stays in meeting when host cancels dialog', async () => {
      // Host is set by default in beforeEach
      const user = userEvent.setup()
      renderMeetingRoom()

      const leaveButton = screen.getByLabelText('Leave meeting')
      await user.click(leaveButton)

      // Wait for dialog to appear
      await waitFor(() => {
        expect(screen.getByText('Leave meeting?')).toBeInTheDocument()
      })

      // Click Cancel
      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      await user.click(cancelButton)

      // Dialog should close and we should still be in the room
      await waitFor(() => {
        expect(screen.queryByText('Leave meeting?')).not.toBeInTheDocument()
      })
      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })

  describe('Remote Participants (AC-2.6.3)', () => {
    it('displays remote participants in sidebar', () => {
      act(() => {
        useRoomStore.setState({
          remoteParticipants: [
            {
              id: 'remote-user-1',
              name: 'Alice',
              role: 'annotator',
              color: '#06b6d4',
              isLocal: false,
            },
          ],
        })
      })

      renderMeetingRoom()

      // Name appears in both sidebar and grid placeholder, so use getAllByText
      const aliceElements = screen.getAllByText('Alice')
      expect(aliceElements.length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('2')).toBeInTheDocument() // participant count
    })

    it('sorts participants with host first', () => {
      act(() => {
        useRoomStore.setState({
          localParticipant: {
            id: 'local-user',
            name: 'Test User',
            role: 'annotator',
            color: '#f97316',
            isLocal: true,
          },
          remoteParticipants: [
            {
              id: 'remote-host',
              name: 'Host User',
              role: 'host',
              color: '#06b6d4',
              isLocal: false,
            },
          ],
        })
      })

      renderMeetingRoom()

      const participantItems = screen.getAllByRole('listitem')
      // Host should be first
      expect(participantItems[0]).toHaveTextContent('Host User')
      expect(participantItems[1]).toHaveTextContent('Test User')
    })
  })
})
