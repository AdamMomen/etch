import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TooltipButton } from '@/components/ui/tooltip-button'

describe('TooltipButton', () => {
  describe('rendering', () => {
    it('should render button without tooltip when no tooltip prop', () => {
      render(<TooltipButton>Click me</TooltipButton>)

      expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
      // Should not have tooltip wrapper
      expect(screen.queryByRole('button')?.closest('.relative.inline-block')).not.toBeInTheDocument()
    })

    it('should render button with tooltip when tooltip prop provided', async () => {
      const user = userEvent.setup()
      render(<TooltipButton tooltip="Save changes">Save</TooltipButton>)

      const button = screen.getByRole('button', { name: /save/i })
      expect(button).toBeInTheDocument()

      // Hover to show tooltip
      await user.hover(button)
      expect(screen.getByText('Save changes')).toBeInTheDocument()
    })

    it('should be disabled when disabled prop is true', () => {
      render(<TooltipButton disabled>Submit</TooltipButton>)

      expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled()
    })
  })

  describe('disabled tooltip', () => {
    it('should show disabledTooltip when disabled', async () => {
      const user = userEvent.setup()
      render(
        <TooltipButton
          disabled
          tooltip="Share your screen"
          disabledTooltip="Someone else is sharing"
        >
          Share
        </TooltipButton>
      )

      const button = screen.getByRole('button', { name: /share/i })
      expect(button).toBeDisabled()

      // Find the span wrapper and hover it
      const spanWrapper = button.parentElement
      expect(spanWrapper?.tagName).toBe('SPAN')

      if (spanWrapper) {
        await user.hover(spanWrapper)
      }

      // Should show disabled tooltip, not regular tooltip
      expect(screen.getByText('Someone else is sharing')).toBeInTheDocument()
      expect(screen.queryByText('Share your screen')).not.toBeInTheDocument()
    })

    it('should fall back to tooltip when disabledTooltip not provided', async () => {
      const user = userEvent.setup()
      render(
        <TooltipButton disabled tooltip="Share your screen">
          Share
        </TooltipButton>
      )

      const button = screen.getByRole('button', { name: /share/i })
      const spanWrapper = button.parentElement

      if (spanWrapper) {
        await user.hover(spanWrapper)
      }

      // Should show regular tooltip as fallback
      expect(screen.getByText('Share your screen')).toBeInTheDocument()
    })

    it('should use span wrapper for disabled buttons to capture hover', () => {
      render(
        <TooltipButton disabled tooltip="Disabled action">
          Action
        </TooltipButton>
      )

      const button = screen.getByRole('button', { name: /action/i })
      const spanWrapper = button.parentElement

      // Disabled buttons should be wrapped in span
      expect(spanWrapper?.tagName).toBe('SPAN')
      expect(spanWrapper?.className).toContain('inline-block')
    })
  })

  describe('enabled tooltip', () => {
    it('should show tooltip on hover when enabled', async () => {
      const user = userEvent.setup()
      render(<TooltipButton tooltip="Click to submit">Submit</TooltipButton>)

      const button = screen.getByRole('button', { name: /submit/i })
      await user.hover(button)

      expect(screen.getByText('Click to submit')).toBeInTheDocument()
    })

    it('should hide tooltip on mouse leave', async () => {
      const user = userEvent.setup()
      render(<TooltipButton tooltip="Click to submit">Submit</TooltipButton>)

      const button = screen.getByRole('button', { name: /submit/i })
      await user.hover(button)

      expect(screen.getByText('Click to submit')).toBeInTheDocument()

      await user.unhover(button)

      expect(screen.queryByText('Click to submit')).not.toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('should call onClick when enabled button is clicked', async () => {
      const handleClick = vi.fn()
      const user = userEvent.setup()

      render(
        <TooltipButton onClick={handleClick} tooltip="Click me">
          Action
        </TooltipButton>
      )

      await user.click(screen.getByRole('button', { name: /action/i }))

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should not call onClick when disabled button is clicked', async () => {
      const handleClick = vi.fn()
      const user = userEvent.setup()

      render(
        <TooltipButton disabled onClick={handleClick} tooltip="Disabled">
          Action
        </TooltipButton>
      )

      await user.click(screen.getByRole('button', { name: /action/i }))

      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('tooltip positioning', () => {
    it('should support tooltipSide prop', async () => {
      const user = userEvent.setup()
      render(
        <TooltipButton tooltip="Right tooltip" tooltipSide="right">
          Button
        </TooltipButton>
      )

      const button = screen.getByRole('button', { name: /button/i })
      await user.hover(button)

      const tooltip = screen.getByText('Right tooltip')
      // Check tooltip has right positioning class
      expect(tooltip.className).toContain('left-full')
    })
  })

  describe('button variants', () => {
    it('should pass through variant prop', () => {
      render(
        <TooltipButton variant="destructive" tooltip="Delete">
          Delete
        </TooltipButton>
      )

      const button = screen.getByRole('button', { name: /delete/i })
      expect(button.className).toContain('bg-destructive')
    })

    it('should pass through size prop', () => {
      render(
        <TooltipButton size="icon" tooltip="Icon button">
          X
        </TooltipButton>
      )

      const button = screen.getByRole('button')
      expect(button.className).toContain('h-10')
      expect(button.className).toContain('w-10')
    })
  })
})
