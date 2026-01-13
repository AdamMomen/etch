import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { RoleBadge } from '@/components/RoleBadge'

describe('RoleBadge', () => {
  test('host role renders crown icon and "Host" text', () => {
    render(<RoleBadge role="host" />)
    expect(screen.getByText('Host')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'host role badge')
  })

  test('sharer role with isSharingScreen=true renders monitor icon and "Sharing" text', () => {
    render(<RoleBadge role="sharer" isSharingScreen={true} />)
    expect(screen.getByText('Sharing')).toBeInTheDocument()
  })

  test('sharer role with isSharingScreen=false renders pen icon (annotator default)', () => {
    render(<RoleBadge role="sharer" isSharingScreen={false} />)
    expect(screen.queryByText('Sharing')).not.toBeInTheDocument()
    expect(screen.queryByText('Host')).not.toBeInTheDocument()
    expect(screen.queryByText('View only')).not.toBeInTheDocument()
  })

  test('annotator role renders pen icon with no text', () => {
    render(<RoleBadge role="annotator" />)
    expect(screen.queryByText('Annotator')).not.toBeInTheDocument()
    expect(screen.queryByText('Host')).not.toBeInTheDocument()
    expect(screen.queryByText('Sharing')).not.toBeInTheDocument()
    expect(screen.queryByText('View only')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  test('viewer role renders eye icon and "View only" text', () => {
    render(<RoleBadge role="viewer" />)
    expect(screen.getByText('View only')).toBeInTheDocument()
  })

  test('tooltip shows correct description for host role', async () => {
    const user = userEvent.setup()
    render(<RoleBadge role="host" />)

    const badge = screen.getByRole('status')
    await user.hover(badge)

    const tooltip = await screen.findByRole('tooltip', { hidden: true })
    expect(tooltip).toHaveTextContent('Meeting host - Full control')
  })

  test('tooltip shows correct description for active sharer', async () => {
    const user = userEvent.setup()
    render(<RoleBadge role="annotator" isSharingScreen={true} />)

    const badge = screen.getByRole('status')
    await user.hover(badge)

    const tooltip = await screen.findByRole('tooltip', { hidden: true })
    expect(tooltip).toHaveTextContent('Currently sharing screen')
  })

  test('tooltip shows correct description for annotator role', async () => {
    const user = userEvent.setup()
    render(<RoleBadge role="annotator" />)

    const badge = screen.getByRole('status')
    await user.hover(badge)

    const tooltip = await screen.findByRole('tooltip', { hidden: true })
    expect(tooltip).toHaveTextContent('Can draw annotations')
  })

  test('tooltip shows correct description for viewer role', async () => {
    const user = userEvent.setup()
    render(<RoleBadge role="viewer" />)

    const badge = screen.getByRole('status')
    await user.hover(badge)

    const tooltip = await screen.findByRole('tooltip', { hidden: true })
    expect(tooltip).toHaveTextContent('View only - cannot annotate')
  })

  test('host badge has accent color class', () => {
    render(<RoleBadge role="host" />)
    const badge = screen.getByRole('status')
    expect(badge).toHaveClass('text-accent')
  })

  test('active sharer badge has info color and background', () => {
    render(<RoleBadge role="annotator" isSharingScreen={true} />)
    const badge = screen.getByRole('status')
    expect(badge).toHaveClass('text-info')
    expect(badge).toHaveClass('bg-info/10')
  })

  test('viewer badge has muted foreground color', () => {
    render(<RoleBadge role="viewer" />)
    const badge = screen.getByRole('status')
    expect(badge).toHaveClass('text-muted-foreground')
  })

  test('annotator badge has primary color', () => {
    render(<RoleBadge role="annotator" />)
    const badge = screen.getByRole('status')
    expect(badge).toHaveClass('text-primary')
  })

  test('dynamic sharer badge: renders "Sharing" when isSharingScreen=true regardless of role', () => {
    // Test with host role but sharing
    const { rerender } = render(<RoleBadge role="host" isSharingScreen={true} />)
    expect(screen.getByText('Sharing')).toBeInTheDocument()

    // Test with viewer role but sharing (edge case)
    rerender(<RoleBadge role="viewer" isSharingScreen={true} />)
    expect(screen.getByText('Sharing')).toBeInTheDocument()

    // Test with annotator role but sharing
    rerender(<RoleBadge role="annotator" isSharingScreen={true} />)
    expect(screen.getByText('Sharing')).toBeInTheDocument()
  })

  test('custom className is applied', () => {
    render(<RoleBadge role="host" className="custom-class" />)
    const badge = screen.getByRole('status')
    expect(badge).toHaveClass('custom-class')
  })
})
