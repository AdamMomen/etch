import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConnectionStatusIndicator } from './ConnectionStatusIndicator'

describe('ConnectionStatusIndicator', () => {
  describe('connected state', () => {
    it('shows green dot and Connected text', () => {
      render(
        <ConnectionStatusIndicator
          isConnecting={false}
          isConnected={true}
          error={null}
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
          onRetry={() => {}}
        />
      )

      expect(screen.getByText('Connecting...')).toBeInTheDocument()
      expect(screen.getByLabelText('Connecting')).toBeInTheDocument()

      // Should not show retry button
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
          onRetry={() => {}}
        />
      )

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })

    it('calls onRetry when retry button clicked', async () => {
      const user = userEvent.setup()
      const onRetry = vi.fn()

      render(
        <ConnectionStatusIndicator
          isConnecting={false}
          isConnected={false}
          error="Connection failed"
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
          onRetry={() => {}}
        />
      )

      // Connecting should take priority
      expect(screen.getByText('Connecting...')).toBeInTheDocument()
    })
  })
})
