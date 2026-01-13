import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LeaveConfirmDialog } from '@/components/MeetingRoom/LeaveConfirmDialog'

describe('LeaveConfirmDialog', () => {
  describe('AC-2.12.2: Leave Confirmation for Host', () => {
    it('renders dialog with correct title when open', () => {
      render(
        <LeaveConfirmDialog
          open={true}
          onOpenChange={() => {}}
          onConfirm={() => {}}
        />
      )

      expect(screen.getByText('Leave meeting?')).toBeInTheDocument()
    })

    it('shows host-specific message', () => {
      render(
        <LeaveConfirmDialog
          open={true}
          onOpenChange={() => {}}
          onConfirm={() => {}}
        />
      )

      expect(
        screen.getByText('You are the host. The meeting will continue without you.')
      ).toBeInTheDocument()
    })

    it('displays Leave and Cancel buttons', () => {
      render(
        <LeaveConfirmDialog
          open={true}
          onOpenChange={() => {}}
          onConfirm={() => {}}
        />
      )

      expect(screen.getByRole('button', { name: 'Leave' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })

    it('does not render when closed', () => {
      render(
        <LeaveConfirmDialog
          open={false}
          onOpenChange={() => {}}
          onConfirm={() => {}}
        />
      )

      expect(screen.queryByText('Leave meeting?')).not.toBeInTheDocument()
    })
  })

  describe('AC-2.12.3: Host Leave Confirmed', () => {
    it('calls onConfirm when Leave button is clicked', async () => {
      const user = userEvent.setup()
      const onConfirm = vi.fn()

      render(
        <LeaveConfirmDialog
          open={true}
          onOpenChange={() => {}}
          onConfirm={onConfirm}
        />
      )

      const leaveButton = screen.getByRole('button', { name: 'Leave' })
      await user.click(leaveButton)

      expect(onConfirm).toHaveBeenCalledOnce()
    })
  })

  describe('AC-2.12.4: Host Leave Canceled', () => {
    it('calls onOpenChange with false when Cancel is clicked', async () => {
      const user = userEvent.setup()
      const onOpenChange = vi.fn()

      render(
        <LeaveConfirmDialog
          open={true}
          onOpenChange={onOpenChange}
          onConfirm={() => {}}
        />
      )

      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      await user.click(cancelButton)

      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe('Accessibility', () => {
    it('has proper dialog role', () => {
      render(
        <LeaveConfirmDialog
          open={true}
          onOpenChange={() => {}}
          onConfirm={() => {}}
        />
      )

      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    })

    it('has accessible title', () => {
      render(
        <LeaveConfirmDialog
          open={true}
          onOpenChange={() => {}}
          onConfirm={() => {}}
        />
      )

      // AlertDialog title should be associated with the dialog
      const dialog = screen.getByRole('alertdialog')
      expect(dialog).toHaveAccessibleName('Leave meeting?')
    })
  })
})
