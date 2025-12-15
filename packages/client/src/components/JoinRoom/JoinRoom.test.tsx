import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { JoinRoom } from './JoinRoom'
import * as api from '@/lib/api'
import { useSettingsStore } from '@/stores/settingsStore'
import { useRoomStore } from '@/stores/roomStore'

// Mock the API module
vi.mock('@/lib/api', () => ({
  joinRoom: vi.fn(),
}))

// Mock navigation
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function renderJoinRoom(roomId: string = 'abc-123-xyz') {
  return render(
    <MemoryRouter initialEntries={[`/join/${roomId}`]}>
      <Routes>
        <Route path="/join/:roomId" element={<JoinRoom />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('JoinRoom', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset stores
    useSettingsStore.setState({
      displayName: '',
      apiBaseUrl: 'http://localhost:3000/api',
    })
    useRoomStore.setState({ currentRoom: null })
  })

  describe('Layout (AC-2.4.1)', () => {
    it('renders Join Meeting title', () => {
      renderJoinRoom()
      expect(screen.getByText('Join Meeting')).toBeInTheDocument()
    })

    it('displays room ID from URL params', () => {
      renderJoinRoom('my-test-room')
      expect(screen.getByText('my-test-room')).toBeInTheDocument()
    })

    it('renders name input field with label', () => {
      renderJoinRoom()
      expect(screen.getByLabelText(/your name/i)).toBeInTheDocument()
      expect(
        screen.getByPlaceholderText(/enter your name/i)
      ).toBeInTheDocument()
    })

    it('renders Join button', () => {
      renderJoinRoom()
      expect(screen.getByRole('button', { name: /join/i })).toBeInTheDocument()
    })

    it('renders Cancel button', () => {
      renderJoinRoom()
      expect(
        screen.getByRole('button', { name: /cancel/i })
      ).toBeInTheDocument()
    })
  })

  describe('Name Input Validation (AC-2.4.2)', () => {
    it('shows validation error when submitting empty name', async () => {
      const user = userEvent.setup()
      renderJoinRoom()

      const joinButton = screen.getByRole('button', { name: /join/i })
      await user.click(joinButton)

      expect(screen.getByText('Name is required')).toBeInTheDocument()
    })

    it('enforces max length of 50 characters', async () => {
      const user = userEvent.setup()
      renderJoinRoom()

      const input = screen.getByLabelText(/your name/i)
      const longName = 'a'.repeat(60)
      await user.type(input, longName)

      // Should be truncated to 50 chars
      expect(input).toHaveValue('a'.repeat(50))
    })

    it('clears validation error when user starts typing', async () => {
      const user = userEvent.setup()
      renderJoinRoom()

      // Trigger validation error
      const joinButton = screen.getByRole('button', { name: /join/i })
      await user.click(joinButton)
      expect(screen.getByText('Name is required')).toBeInTheDocument()

      // Type something
      const input = screen.getByLabelText(/your name/i)
      await user.type(input, 'A')

      // Error should be cleared
      expect(screen.queryByText('Name is required')).not.toBeInTheDocument()
    })

    it('auto-focuses input on mount', () => {
      renderJoinRoom()
      const input = screen.getByLabelText(/your name/i)
      expect(document.activeElement).toBe(input)
    })
  })

  describe('Name Pre-fill from Storage (AC-2.4.3)', () => {
    it('pre-fills name from settingsStore', () => {
      useSettingsStore.setState({ displayName: 'Saved User' })
      renderJoinRoom()

      const input = screen.getByLabelText(/your name/i)
      expect(input).toHaveValue('Saved User')
    })

    it('allows editing the pre-filled name', async () => {
      const user = userEvent.setup()
      useSettingsStore.setState({ displayName: 'Saved User' })
      renderJoinRoom()

      const input = screen.getByLabelText(/your name/i)
      await user.clear(input)
      await user.type(input, 'New Name')

      expect(input).toHaveValue('New Name')
    })
  })

  describe('Join Button Loading State (AC-2.4.4)', () => {
    it('shows loading spinner during API call', async () => {
      const user = userEvent.setup()
      useSettingsStore.setState({ displayName: 'Test User' })

      // Make API call hang
      vi.mocked(api.joinRoom).mockImplementation(() => new Promise(() => {}))

      renderJoinRoom()
      const joinButton = screen.getByRole('button', { name: /join/i })
      await user.click(joinButton)

      expect(screen.getByText(/joining/i)).toBeInTheDocument()
    })

    it('disables Join button during API call', async () => {
      const user = userEvent.setup()
      useSettingsStore.setState({ displayName: 'Test User' })

      vi.mocked(api.joinRoom).mockImplementation(() => new Promise(() => {}))

      renderJoinRoom()
      const joinButton = screen.getByRole('button', { name: /join/i })
      await user.click(joinButton)

      expect(joinButton).toBeDisabled()
    })

    it('disables input during API call', async () => {
      const user = userEvent.setup()
      useSettingsStore.setState({ displayName: 'Test User' })

      vi.mocked(api.joinRoom).mockImplementation(() => new Promise(() => {}))

      renderJoinRoom()
      const input = screen.getByLabelText(/your name/i)
      const joinButton = screen.getByRole('button', { name: /join/i })
      await user.click(joinButton)

      expect(input).toBeDisabled()
    })

    it('disables Cancel button during API call', async () => {
      const user = userEvent.setup()
      useSettingsStore.setState({ displayName: 'Test User' })

      vi.mocked(api.joinRoom).mockImplementation(() => new Promise(() => {}))

      renderJoinRoom()
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      const joinButton = screen.getByRole('button', { name: /join/i })
      await user.click(joinButton)

      expect(cancelButton).toBeDisabled()
    })
  })

  describe('Successful Join Flow (AC-2.4.5)', () => {
    it('navigates to meeting room on success', async () => {
      const user = userEvent.setup()
      useSettingsStore.setState({ displayName: 'Test User' })

      vi.mocked(api.joinRoom).mockResolvedValue({
        token: 'test-token',
        livekitUrl: 'wss://livekit.example.com',
        screenShareToken: 'test-screen-share-token',
      })

      renderJoinRoom('test-room-id')
      const joinButton = screen.getByRole('button', { name: /join/i })
      await user.click(joinButton)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/room/test-room-id')
      })
    })

    it('saves name to settingsStore on success', async () => {
      const user = userEvent.setup()

      vi.mocked(api.joinRoom).mockResolvedValue({
        token: 'test-token',
        livekitUrl: 'wss://livekit.example.com',
        screenShareToken: 'test-screen-share-token',
      })

      renderJoinRoom()
      const input = screen.getByLabelText(/your name/i)
      await user.type(input, 'New User Name')

      const joinButton = screen.getByRole('button', { name: /join/i })
      await user.click(joinButton)

      await waitFor(() => {
        const state = useSettingsStore.getState()
        expect(state.displayName).toBe('New User Name')
      })
    })

    it('updates roomStore with token and livekitUrl', async () => {
      const user = userEvent.setup()
      useSettingsStore.setState({ displayName: 'Test User' })

      vi.mocked(api.joinRoom).mockResolvedValue({
        token: 'my-jwt-token',
        livekitUrl: 'wss://livekit.example.com',
        screenShareToken: 'test-screen-share-token',
      })

      renderJoinRoom('room-123')
      const joinButton = screen.getByRole('button', { name: /join/i })
      await user.click(joinButton)

      await waitFor(() => {
        const state = useRoomStore.getState()
        expect(state.currentRoom).toEqual({
          roomId: 'room-123',
          token: 'my-jwt-token',
          livekitUrl: 'wss://livekit.example.com',
        })
      })
    })

    it('trims whitespace from name before saving', async () => {
      const user = userEvent.setup()

      vi.mocked(api.joinRoom).mockResolvedValue({
        token: 'test-token',
        livekitUrl: 'wss://livekit.example.com',
        screenShareToken: 'test-screen-share-token',
      })

      renderJoinRoom()
      const input = screen.getByLabelText(/your name/i)
      await user.type(input, '  Spaced Name  ')

      const joinButton = screen.getByRole('button', { name: /join/i })
      await user.click(joinButton)

      await waitFor(() => {
        const state = useSettingsStore.getState()
        expect(state.displayName).toBe('Spaced Name')
      })
    })
  })

  describe('API Error Handling (AC-2.4.6)', () => {
    it('returns button to normal state after error', async () => {
      const user = userEvent.setup()
      useSettingsStore.setState({ displayName: 'Test User' })

      vi.mocked(api.joinRoom).mockRejectedValue(new Error('Room not found'))

      renderJoinRoom()
      const joinButton = screen.getByRole('button', { name: /join/i })
      await user.click(joinButton)

      await waitFor(() => {
        expect(joinButton).not.toBeDisabled()
        expect(screen.queryByText(/joining/i)).not.toBeInTheDocument()
      })
    })

    it('re-enables input after error', async () => {
      const user = userEvent.setup()
      useSettingsStore.setState({ displayName: 'Test User' })

      vi.mocked(api.joinRoom).mockRejectedValue(new Error('Server error'))

      renderJoinRoom()
      const input = screen.getByLabelText(/your name/i)
      const joinButton = screen.getByRole('button', { name: /join/i })
      await user.click(joinButton)

      await waitFor(() => {
        expect(input).not.toBeDisabled()
      })
    })

    it('remains on join dialog after error', async () => {
      const user = userEvent.setup()
      useSettingsStore.setState({ displayName: 'Test User' })

      vi.mocked(api.joinRoom).mockRejectedValue(new Error('Room not found'))

      renderJoinRoom()
      const joinButton = screen.getByRole('button', { name: /join/i })
      await user.click(joinButton)

      await waitFor(() => {
        expect(screen.getByText('Join Meeting')).toBeInTheDocument()
      })
      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })

  describe('Keyboard Navigation (AC-2.4.7)', () => {
    it('submits form when Enter is pressed with valid name', async () => {
      const user = userEvent.setup()

      vi.mocked(api.joinRoom).mockResolvedValue({
        token: 'test-token',
        livekitUrl: 'wss://livekit.example.com',
        screenShareToken: 'test-screen-share-token',
      })

      renderJoinRoom('test-room')
      const input = screen.getByLabelText(/your name/i)
      await user.type(input, 'Test User')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(api.joinRoom).toHaveBeenCalledWith('test-room', 'Test User')
      })
    })

    it('does not submit when Enter is pressed with empty input', async () => {
      const user = userEvent.setup()
      renderJoinRoom()

      const input = screen.getByLabelText(/your name/i)
      await user.click(input)
      await user.keyboard('{Enter}')

      expect(api.joinRoom).not.toHaveBeenCalled()
      expect(screen.getByText('Name is required')).toBeInTheDocument()
    })

    it('does not submit when Enter is pressed during loading', async () => {
      const user = userEvent.setup()
      useSettingsStore.setState({ displayName: 'Test User' })

      vi.mocked(api.joinRoom).mockImplementation(() => new Promise(() => {}))

      renderJoinRoom()
      const joinButton = screen.getByRole('button', { name: /join/i })
      await user.click(joinButton)

      // Try to submit again via Enter
      screen.getByLabelText(/your name/i)
      await user.keyboard('{Enter}')

      // joinRoom should only have been called once
      expect(api.joinRoom).toHaveBeenCalledTimes(1)
    })
  })

  describe('Cancel/Back Navigation (AC-2.4.8)', () => {
    it('navigates back to home when Cancel is clicked', async () => {
      const user = userEvent.setup()
      renderJoinRoom()

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(mockNavigate).toHaveBeenCalledWith('/')
    })

    it('does not save name when canceling', async () => {
      const user = userEvent.setup()
      renderJoinRoom()

      const input = screen.getByLabelText(/your name/i)
      await user.type(input, 'Unsaved Name')

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      const state = useSettingsStore.getState()
      expect(state.displayName).toBe('')
    })
  })
})
