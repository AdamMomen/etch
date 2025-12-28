import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InviteModal } from '@/components/MeetingRoom/InviteModal'
import * as inviteUtils from '@/lib/invite'

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock the copyToClipboard function
const mockCopyToClipboard = vi.fn()
vi.mock('@/lib/invite', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/invite')>()
  return {
    ...actual,
    copyToClipboard: (...args: Parameters<typeof actual.copyToClipboard>) => mockCopyToClipboard(...args),
  }
})

beforeEach(() => {
  mockCopyToClipboard.mockReset()
  mockCopyToClipboard.mockResolvedValue(true)
})

describe('InviteModal', () => {
  const mockOnOpenChange = vi.fn()
  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    roomId: 'abc-123-xyz',
  }

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('AC-2.13.1: Invite Button Opens Modal', () => {
    it('renders when open is true with room link displayed', () => {
      render(<InviteModal {...defaultProps} />)

      expect(screen.getByText('Invite to Meeting')).toBeInTheDocument()
      expect(screen.getByText(/Share this link with others/)).toBeInTheDocument()
      // The link now uses HTTP URL format (landing page)
      const input = screen.getByRole('textbox', { name: 'Invite link' }) as HTMLInputElement
      expect(input.value).toContain('/join/abc-123-xyz')
    })

    it('shows Copy Link button', () => {
      render(<InviteModal {...defaultProps} />)

      expect(screen.getByRole('button', { name: 'Copy link' })).toBeInTheDocument()
    })

    it('does not render when open is false', () => {
      render(<InviteModal {...defaultProps} open={false} />)

      expect(screen.queryByText('Invite to Meeting')).not.toBeInTheDocument()
    })
  })

  describe('AC-2.13.2: Copy Link Functionality', () => {
    it('clicking Copy Link calls copyToClipboard with correct link', async () => {
      const user = userEvent.setup()
      render(<InviteModal {...defaultProps} />)

      const copyButton = screen.getByRole('button', { name: 'Copy link' })
      await user.click(copyButton)

      // Link now uses HTTP URL format (landing page)
      expect(mockCopyToClipboard).toHaveBeenCalledWith(
        expect.stringContaining('/join/abc-123-xyz')
      )
    })

    it('button text changes to "Copied!" after click', async () => {
      const user = userEvent.setup()
      render(<InviteModal {...defaultProps} />)

      const copyButton = screen.getByRole('button', { name: 'Copy link' })
      await user.click(copyButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Link copied' })).toBeInTheDocument()
        expect(screen.getByText('Copied!')).toBeInTheDocument()
      })
    })

    it('toast notification appears on successful copy', async () => {
      const { toast } = await import('sonner')
      const user = userEvent.setup()
      render(<InviteModal {...defaultProps} />)

      const copyButton = screen.getByRole('button', { name: 'Copy link' })
      await user.click(copyButton)

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Link copied!')
      })
    })

    it('error toast appears when clipboard fails', async () => {
      // Set up the mock to return false (copy failed)
      mockCopyToClipboard.mockResolvedValue(false)
      const { toast } = await import('sonner')
      const user = userEvent.setup()
      render(<InviteModal {...defaultProps} />)

      const copyButton = screen.getByRole('button', { name: 'Copy link' })
      await user.click(copyButton)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to copy link')
      })
    })
  })

  describe('AC-2.13.5: Link Format', () => {
    it('generateInviteLink returns HTTP URL to landing page by default', () => {
      const link = inviteUtils.generateInviteLink('abc-123-xyz')
      expect(link).toContain('/join/abc-123-xyz')
    })

    it('generateInviteLink supports custom domain config', () => {
      const link = inviteUtils.generateInviteLink('abc-123-xyz', {
        domain: 'example.com',
      })
      expect(link).toContain('example.com/join/abc-123-xyz')
    })

    it('generateDeepLink returns etch:// protocol link', () => {
      const link = inviteUtils.generateDeepLink('abc-123-xyz')
      expect(link).toBe('etch://room/abc-123-xyz')
    })
  })

  describe('Accessibility', () => {
    it('dialog has proper role="dialog"', () => {
      render(<InviteModal {...defaultProps} />)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('input has accessible label', () => {
      render(<InviteModal {...defaultProps} />)
      expect(screen.getByLabelText('Invite link')).toBeInTheDocument()
    })

    it('close button is accessible', () => {
      render(<InviteModal {...defaultProps} />)
      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
    })

    it('shows keyboard shortcut hint', () => {
      render(<InviteModal {...defaultProps} />)
      // Should show either Cmd+I or Ctrl+I depending on platform
      expect(screen.getByText(/to quickly open this dialog/)).toBeInTheDocument()
    })
  })

  describe('Modal State Management', () => {
    it('calls onOpenChange when closing', async () => {
      const user = userEvent.setup()
      render(<InviteModal {...defaultProps} />)

      const closeButton = screen.getByRole('button', { name: 'Close' })
      await user.click(closeButton)

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('resets copied state when modal closes', async () => {
      const user = userEvent.setup()
      const { rerender } = render(<InviteModal {...defaultProps} />)

      // Copy first
      const copyButton = screen.getByRole('button', { name: 'Copy link' })
      await user.click(copyButton)

      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument()
      })

      // Close modal - this triggers handleOpenChange with false
      rerender(<InviteModal {...defaultProps} open={false} />)

      // Reopen modal
      rerender(<InviteModal {...defaultProps} open={true} />)

      // Should show "Copy Link" again, not "Copied!" after modal reopens
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Copy link' })).toBeInTheDocument()
      })
      expect(screen.queryByText('Copied!')).not.toBeInTheDocument()
    })
  })
})
