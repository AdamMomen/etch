import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConnectionStatusIndicator } from '@/components/MeetingRoom/ConnectionStatusIndicator'

describe('ConnectionStatusIndicator', () => {
  describe('connected state', () => {
    it('shows green dot and Connected text', () => {
      render(
        <ConnectionStatusIndicator
          isConnecting={false}
          isConnected={true}
          error={null}
          isRetrying={false}
          onRetry={() => {}}
        />
      )

      expect(screen.getByText('Connected')).toBeInTheDocument()
      expect(screen.getByLabelText('Connected')).toBeInTheDocument()

      // Should not show retry button
      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument()
    })
  })

  describe('connecting state', () => {
    it('shows amber dot and Connecting text', () => {
      render(
        <ConnectionStatusIndicator
          isConnecting={true}
          isConnected={false}
          error={null}
          isRetrying={false}
          onRetry={() => {}}
        />
      )

      expect(screen.getByText('Connecting...')).toBeInTheDocument()
      expect(screen.getByLabelText('Connecting')).toBeInTheDocument()

      // Should not show retry button
      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument()
    })
  })

  describe('retrying state (AC-2.16.4)', () => {
    it('shows amber dot and Retrying text when isRetrying is true', () => {
      render(
        <ConnectionStatusIndicator
          isConnecting={false}
          isConnected={false}
          error="Connection failed"
          isRetrying={true}
          onRetry={() => {}}
        />
      )

      expect(screen.getByText('Retrying...')).toBeInTheDocument()
      expect(screen.getByLabelText('Retrying')).toBeInTheDocument()

      // Should not show retry button during retry
      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument()
    })

    it('takes priority over connecting state', () => {
      render(
        <ConnectionStatusIndicator
          isConnecting={true}
          isConnected={false}
          error={null}
          isRetrying={true}
          onRetry={() => {}}
        />
      )

      // Retrying should take priority
      expect(screen.getByText('Retrying...')).toBeInTheDocument()
      expect(screen.queryByText('Connecting...')).not.toBeInTheDocument()
    })

    it('takes priority over disconnected state', () => {
      render(
        <ConnectionStatusIndicator
          isConnecting={false}
          isConnected={false}
          error="Connection failed"
          isRetrying={true}
          onRetry={() => {}}
        />
      )

      // Retrying should take priority
      expect(screen.getByText('Retrying...')).toBeInTheDocument()
      expect(screen.queryByText('Disconnected')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument()
    })
  })

  describe('disconnected state', () => {
    it('shows red dot and Disconnected text when error', () => {
      render(
        <ConnectionStatusIndicator
          isConnecting={false}
          isConnected={false}
          error="Connection failed"
          isRetrying={false}
          onRetry={() => {}}
        />
      )

      expect(screen.getByText('Disconnected')).toBeInTheDocument()
      expect(screen.getByLabelText('Disconnected')).toBeInTheDocument()
    })

    it('shows red dot when not connected (no error)', () => {
      render(
        <ConnectionStatusIndicator
          isConnecting={false}
          isConnected={false}
          error={null}
          isRetrying={false}
          onRetry={() => {}}
        />
      )

      expect(screen.getByText('Disconnected')).toBeInTheDocument()
    })

    it('shows retry button when disconnected', () => {
      render(
        <ConnectionStatusIndicator
          isConnecting={false}
          isConnected={false}
          error="Connection failed"
          isRetrying={false}
          onRetry={() => {}}
        />
      )

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })

    it('disables retry button when isRetrying is true', () => {
      render(
        <ConnectionStatusIndicator
          isConnecting={false}
          isConnected={false}
          error="Connection failed"
          isRetrying={true}
          onRetry={() => {}}
        />
      )

      // Should show retrying state (no button visible at all)
      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument()
    })

    it('calls onRetry when retry button clicked', async () => {
      const user = userEvent.setup()
      const onRetry = vi.fn()

      render(
        <ConnectionStatusIndicator
          isConnecting={false}
          isConnected={false}
          error="Connection failed"
          isRetrying={false}
          onRetry={onRetry}
        />
      )

      const retryButton = screen.getByRole('button', { name: /retry/i })
      await user.click(retryButton)

      expect(onRetry).toHaveBeenCalledTimes(1)
    })
  })

  describe('priority of states', () => {
    it('shows connecting state over connected when both true', () => {
      render(
        <ConnectionStatusIndicator
          isConnecting={true}
          isConnected={true}
          error={null}
          isRetrying={false}
          onRetry={() => {}}
        />
      )

      // Connecting should take priority
      expect(screen.getByText('Connecting...')).toBeInTheDocument()
    })

    it('shows retrying state over all other states', () => {
      render(
        <ConnectionStatusIndicator
          isConnecting={true}
          isConnected={true}
          error="Some error"
          isRetrying={true}
          onRetry={() => {}}
        />
      )

      // Retrying should take highest priority
      expect(screen.getByText('Retrying...')).toBeInTheDocument()
      expect(screen.queryByText('Connected')).not.toBeInTheDocument()
      expect(screen.queryByText('Connecting...')).not.toBeInTheDocument()
      expect(screen.queryByText('Disconnected')).not.toBeInTheDocument()
    })
  })
})
