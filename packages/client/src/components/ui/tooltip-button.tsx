import * as React from 'react'
import { Button, type ButtonProps } from './button'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from './tooltip'

export interface TooltipButtonProps extends ButtonProps {
  /**
   * Tooltip content to show when hovering.
   * If not provided, no tooltip will be shown.
   */
  tooltip?: React.ReactNode
  /**
   * Tooltip content to show when the button is disabled.
   * Falls back to `tooltip` if not provided.
   */
  disabledTooltip?: React.ReactNode
  /**
   * Side of the button to show the tooltip on.
   * @default 'top'
   */
  tooltipSide?: 'top' | 'right' | 'bottom' | 'left'
}

/**
 * Button component with integrated tooltip support.
 *
 * Handles the common pattern of showing tooltips on disabled buttons,
 * which normally don't receive hover events due to `pointer-events: none`.
 *
 * @example
 * // Basic tooltip
 * <TooltipButton tooltip="Click to save">Save</TooltipButton>
 *
 * @example
 * // Different tooltip when disabled
 * <TooltipButton
 *   disabled={!canShare}
 *   tooltip="Share your screen"
 *   disabledTooltip="Someone else is sharing"
 * >
 *   Share
 * </TooltipButton>
 */
export const TooltipButton = React.forwardRef<
  HTMLButtonElement,
  TooltipButtonProps
>(
  (
    { tooltip, disabledTooltip, tooltipSide = 'top', disabled, ...buttonProps },
    ref
  ) => {
    const tooltipContent = disabled ? (disabledTooltip ?? tooltip) : tooltip

    // If no tooltip content, just render the button
    if (!tooltipContent) {
      return <Button ref={ref} disabled={disabled} {...buttonProps} />
    }

    const button = <Button ref={ref} disabled={disabled} {...buttonProps} />

    // Wrap disabled buttons in a span to capture hover events
    // since disabled buttons have pointer-events: none
    if (disabled) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-block">{button}</span>
            </TooltipTrigger>
            <TooltipContent side={tooltipSide}>{tooltipContent}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }

    // For enabled buttons, use asChild to avoid extra wrapper
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side={tooltipSide}>{tooltipContent}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }
)
TooltipButton.displayName = 'TooltipButton'
