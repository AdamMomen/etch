import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsModal } from './SettingsModal'
import { useSettingsStore } from '@/stores/settingsStore'

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('SettingsModal', () => {
  beforeEach(() => {
    localStorage.clear()
    useSettingsStore.setState({
      displayName: '',
      apiBaseUrl: 'http://localhost:3000/api',
      inviteDomain: null,
      sidebarCollapsed: false,
      isMuted: true,
      isVideoOff: true,
      preferredMicrophoneId: null,
      preferredCameraId: null,
      theme: 'dark',
    })
  })

  it('renders when open is true', () => {
    render(<SettingsModal open={true} onOpenChange={() => {}} />)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('does not render when open is false', () => {
    render(<SettingsModal open={false} onOpenChange={() => {}} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  describe('display name field (AC-2.14.5)', () => {
    it('renders display name input field', () => {
      render(<SettingsModal open={true} onOpenChange={() => {}} />)

      expect(screen.getByLabelText('Display Name')).toBeInTheDocument()
    })

    it('shows current display name from store', () => {
      useSettingsStore.setState({ displayName: 'Alice' })

      render(<SettingsModal open={true} onOpenChange={() => {}} />)

      expect(screen.getByLabelText('Display Name')).toHaveValue('Alice')
    })

    it('updates display name on blur', async () => {
      const user = userEvent.setup()
      render(<SettingsModal open={true} onOpenChange={() => {}} />)

      const input = screen.getByLabelText('Display Name')
      await user.clear(input)
      await user.type(input, 'Bob')
      await user.tab() // trigger blur

      expect(useSettingsStore.getState().displayName).toBe('Bob')
    })
  })

  describe('theme toggle (AC-2.14.5)', () => {
    it('renders theme section', () => {
      render(<SettingsModal open={true} onOpenChange={() => {}} />)

      expect(screen.getByText('Theme')).toBeInTheDocument()
    })

    it('shows "Dark mode" when theme is dark', () => {
      useSettingsStore.setState({ theme: 'dark' })

      render(<SettingsModal open={true} onOpenChange={() => {}} />)

      expect(screen.getByText('Dark mode')).toBeInTheDocument()
    })

    it('shows "Light mode" when theme is light', () => {
      useSettingsStore.setState({ theme: 'light' })

      render(<SettingsModal open={true} onOpenChange={() => {}} />)

      expect(screen.getByText('Light mode')).toBeInTheDocument()
    })

    it('toggles theme from dark to light', async () => {
      const user = userEvent.setup()
      useSettingsStore.setState({ theme: 'dark' })

      render(<SettingsModal open={true} onOpenChange={() => {}} />)

      const toggleButton = screen.getByRole('button', { name: /switch to light mode/i })
      await user.click(toggleButton)

      expect(useSettingsStore.getState().theme).toBe('light')
    })

    it('toggles theme from light to dark', async () => {
      const user = userEvent.setup()
      useSettingsStore.setState({ theme: 'light' })

      render(<SettingsModal open={true} onOpenChange={() => {}} />)

      const toggleButton = screen.getByRole('button', { name: /switch to dark mode/i })
      await user.click(toggleButton)

      expect(useSettingsStore.getState().theme).toBe('dark')
    })
  })

  describe('clear preferences button (AC-2.14.5, AC-2.14.6)', () => {
    it('renders clear preferences button', () => {
      render(<SettingsModal open={true} onOpenChange={() => {}} />)

      expect(screen.getByRole('button', { name: /clear all preferences/i })).toBeInTheDocument()
    })

    it('shows confirmation when clear button is clicked', async () => {
      const user = userEvent.setup()
      render(<SettingsModal open={true} onOpenChange={() => {}} />)

      await user.click(screen.getByRole('button', { name: /clear all preferences/i }))

      expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /yes, clear all/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('hides confirmation when cancel is clicked', async () => {
      const user = userEvent.setup()
      render(<SettingsModal open={true} onOpenChange={() => {}} />)

      await user.click(screen.getByRole('button', { name: /clear all preferences/i }))
      await user.click(screen.getByRole('button', { name: /cancel/i }))

      expect(screen.queryByText(/are you sure/i)).not.toBeInTheDocument()
    })

    it('clears preferences when confirmed', async () => {
      const user = userEvent.setup()
      useSettingsStore.setState({
        displayName: 'Test User',
        theme: 'light',
        preferredMicrophoneId: 'mic-123',
      })

      render(<SettingsModal open={true} onOpenChange={() => {}} />)

      await user.click(screen.getByRole('button', { name: /clear all preferences/i }))
      await user.click(screen.getByRole('button', { name: /yes, clear all/i }))

      const state = useSettingsStore.getState()
      expect(state.displayName).toBe('')
      expect(state.theme).toBe('dark')
      expect(state.preferredMicrophoneId).toBeNull()
    })
  })
})
