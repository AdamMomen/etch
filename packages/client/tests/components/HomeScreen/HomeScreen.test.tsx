import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { HomeScreen } from '@/components/HomeScreen/HomeScreen'
import * as api from '@/lib/api'
import { useSettingsStore } from '@/stores/settingsStore'
import { useRoomStore } from '@/stores/roomStore'

// Mock the API module
vi.mock('@/lib/api', () => ({
  createRoom: vi.fn(),
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

// Mock window.prompt
const originalPrompt = window.prompt

function renderHomeScreen() {
  return render(
    <BrowserRouter>
      <HomeScreen />
    </BrowserRouter>
  )
}

describe('HomeScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset stores
    useSettingsStore.setState({ displayName: '', apiBaseUrl: 'http://localhost:3000/api' })
    useRoomStore.setState({ currentRoom: null })
    window.prompt = originalPrompt
  })

  afterEach(() => {
    window.prompt = originalPrompt
  })

  describe('Layout (AC-2.3.1)', () => {
    it('renders Etch logo/title', () => {
      renderHomeScreen()
      expect(screen.getByText('Etch')).toBeInTheDocument()
    })

    it('renders Start Meeting button', () => {
      renderHomeScreen()
      expect(screen.getByRole('button', { name: /start meeting/i })).toBeInTheDocument()
    })

    it('renders room code input field', () => {
      renderHomeScreen()
      expect(screen.getByPlaceholderText(/enter room code or link/i)).toBeInTheDocument()
    })

    it('renders Join button', () => {
      renderHomeScreen()
      expect(screen.getByRole('button', { name: /^join$/i })).toBeInTheDocument()
    })
  })

  describe('Join Meeting Input (AC-2.3.3)', () => {
    it('disables Join button when input is empty', () => {
      renderHomeScreen()
      const joinButton = screen.getByRole('button', { name: /^join$/i })
      expect(joinButton).toBeDisabled()
    })

    it('enables Join button when input has value', async () => {
      const user = userEvent.setup()
      renderHomeScreen()

      const input = screen.getByPlaceholderText(/enter room code or link/i)
      await user.type(input, 'abc-123-xyz')

      const joinButton = screen.getByRole('button', { name: /^join$/i })
      expect(joinButton).not.toBeDisabled()
    })

    it('disables Join button when input is cleared', async () => {
      const user = userEvent.setup()
      renderHomeScreen()

      const input = screen.getByPlaceholderText(/enter room code or link/i)
      await user.type(input, 'abc')
      await user.clear(input)

      const joinButton = screen.getByRole('button', { name: /^join$/i })
      expect(joinButton).toBeDisabled()
    })
  })

  describe('Join Meeting Button Click (AC-2.3.4)', () => {
    it('navigates to join flow with room ID when Join is clicked', async () => {
      const user = userEvent.setup()
      renderHomeScreen()

      const input = screen.getByPlaceholderText(/enter room code or link/i)
      await user.type(input, 'abc-123-xyz')

      const joinButton = screen.getByRole('button', { name: /^join$/i })
      await user.click(joinButton)

      expect(mockNavigate).toHaveBeenCalledWith('/join/abc-123-xyz')
    })

    it('parses etch:// URL and navigates with extracted room ID', async () => {
      const user = userEvent.setup()
      renderHomeScreen()

      const input = screen.getByPlaceholderText(/enter room code or link/i)
      await user.type(input, 'etch://room/my-room-id')

      const joinButton = screen.getByRole('button', { name: /^join$/i })
      await user.click(joinButton)

      expect(mockNavigate).toHaveBeenCalledWith('/join/my-room-id')
    })

    it('parses https:// URL and navigates with extracted room ID', async () => {
      const user = userEvent.setup()
      renderHomeScreen()

      const input = screen.getByPlaceholderText(/enter room code or link/i)
      await user.type(input, 'https://example.com/room/test-room')

      const joinButton = screen.getByRole('button', { name: /^join$/i })
      await user.click(joinButton)

      expect(mockNavigate).toHaveBeenCalledWith('/join/test-room')
    })
  })

  describe('Keyboard Navigation (AC-2.3.7)', () => {
    it('submits join form when Enter is pressed in input with value', async () => {
      const user = userEvent.setup()
      renderHomeScreen()

      const input = screen.getByPlaceholderText(/enter room code or link/i)
      await user.type(input, 'abc-123-xyz')
      await user.keyboard('{Enter}')

      expect(mockNavigate).toHaveBeenCalledWith('/join/abc-123-xyz')
    })

    it('does not submit when Enter is pressed with empty input', async () => {
      const user = userEvent.setup()
      renderHomeScreen()

      const input = screen.getByPlaceholderText(/enter room code or link/i)
      await user.click(input)
      await user.keyboard('{Enter}')

      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })

  describe('Start Meeting Flow (AC-2.3.2)', () => {
    it('shows loading state on Start Meeting button during API call', async () => {
      const user = userEvent.setup()
      // Set display name so prompt is not shown
      useSettingsStore.setState({ displayName: 'Test User' })

      // Make API call hang
      vi.mocked(api.createRoom).mockImplementation(
        () => new Promise(() => {})
      )

      renderHomeScreen()
      const startButton = screen.getByRole('button', { name: /start meeting/i })
      await user.click(startButton)

      expect(screen.getByText(/creating/i)).toBeInTheDocument()
      expect(startButton).toBeDisabled()
    })

    it('prompts for display name if not set', async () => {
      const user = userEvent.setup()
      window.prompt = vi.fn().mockReturnValue('New User')

      vi.mocked(api.createRoom).mockResolvedValue({
        roomId: 'new-room-123',
        token: 'test-token',
        livekitUrl: 'wss://livekit.example.com',
        screenShareToken: 'test-screen-share-token',
      })

      renderHomeScreen()
      const startButton = screen.getByRole('button', { name: /start meeting/i })
      await user.click(startButton)

      expect(window.prompt).toHaveBeenCalledWith('Enter your display name:')
    })

    it('navigates to meeting room on successful room creation', async () => {
      const user = userEvent.setup()
      useSettingsStore.setState({ displayName: 'Test User' })

      vi.mocked(api.createRoom).mockResolvedValue({
        roomId: 'new-room-123',
        token: 'test-token',
        livekitUrl: 'wss://livekit.example.com',
        screenShareToken: 'test-screen-share-token',
      })

      renderHomeScreen()
      const startButton = screen.getByRole('button', { name: /start meeting/i })
      await user.click(startButton)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/room/new-room-123')
      })
    })

    it('stores room info in roomStore on success', async () => {
      const user = userEvent.setup()
      useSettingsStore.setState({ displayName: 'Test User' })

      vi.mocked(api.createRoom).mockResolvedValue({
        roomId: 'new-room-123',
        token: 'test-token',
        livekitUrl: 'wss://livekit.example.com',
        screenShareToken: 'test-screen-share-token',
      })

      renderHomeScreen()
      const startButton = screen.getByRole('button', { name: /start meeting/i })
      await user.click(startButton)

      await waitFor(() => {
        const state = useRoomStore.getState()
        expect(state.currentRoom).toEqual({
          roomId: 'new-room-123',
          token: 'test-token',
          screenShareToken: 'test-screen-share-token',
          livekitUrl: 'wss://livekit.example.com',
        })
      })
    })
  })

  describe('API Error Handling (AC-2.3.8)', () => {
    it('returns button to normal state after error', async () => {
      const user = userEvent.setup()
      useSettingsStore.setState({ displayName: 'Test User' })

      vi.mocked(api.createRoom).mockRejectedValue(new Error('Server error'))

      renderHomeScreen()
      const startButton = screen.getByRole('button', { name: /start meeting/i })
      await user.click(startButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /start meeting/i })).not.toBeDisabled()
      })
    })
  })
})
