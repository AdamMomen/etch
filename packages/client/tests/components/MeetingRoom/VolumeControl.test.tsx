import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VolumeControl } from '@/components/MeetingRoom/VolumeControl'

describe('VolumeControl', () => {
  const mockOnVolumeChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('AC-2.11.2: Volume Slider Display', () => {
    it('renders slider with correct initial value', () => {
      render(
        <VolumeControl
          volume={1.0}
          onVolumeChange={mockOnVolumeChange}
        />
      )

      // Should show 100% - could appear multiple times (current value + marker)
      const percentElements = screen.getAllByText('100%')
      expect(percentElements.length).toBeGreaterThanOrEqual(1)
    })

    it('displays volume percentage correctly', () => {
      render(
        <VolumeControl
          volume={0.5}
          onVolumeChange={mockOnVolumeChange}
        />
      )

      // 50% only appears once (as current value)
      expect(screen.getByText('50%')).toBeInTheDocument()
    })

    it('renders slider element', () => {
      render(
        <VolumeControl
          volume={1.0}
          onVolumeChange={mockOnVolumeChange}
        />
      )

      expect(screen.getByRole('slider')).toBeInTheDocument()
    })

    it('shows visual markers at 0%, 100%, 200%', () => {
      render(
        <VolumeControl
          volume={0.5}
          onVolumeChange={mockOnVolumeChange}
        />
      )

      // When volume is 50%, markers should be visible
      // 0% marker and current 50% should be present
      expect(screen.getAllByText(/0%/).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText(/100%/).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText(/200%/).length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('AC-2.11.4: Mute via Volume', () => {
    it('shows mute indicator when volume is 0', () => {
      render(
        <VolumeControl
          volume={0}
          onVolumeChange={mockOnVolumeChange}
        />
      )

      // 0% appears in both current value and marker
      expect(screen.getAllByText('0%').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByLabelText('Muted')).toBeInTheDocument()
      expect(screen.getByText('Participant is muted for you')).toBeInTheDocument()
    })

    it('shows normal volume icon when not muted', () => {
      render(
        <VolumeControl
          volume={0.5}
          onVolumeChange={mockOnVolumeChange}
        />
      )

      expect(screen.getByLabelText('Volume')).toBeInTheDocument()
    })
  })

  describe('AC-2.11.5: Volume Boost', () => {
    it('shows boost indicator when volume > 100%', () => {
      render(
        <VolumeControl
          volume={1.5}
          onVolumeChange={mockOnVolumeChange}
        />
      )

      expect(screen.getByText('150%')).toBeInTheDocument()
      expect(screen.getByLabelText('Volume boosted')).toBeInTheDocument()
      expect(screen.getByText('Audio boosted')).toBeInTheDocument()
    })

    it('applies boost styling to percentage text', () => {
      render(
        <VolumeControl
          volume={1.5}
          onVolumeChange={mockOnVolumeChange}
        />
      )

      const percentageText = screen.getByText('150%')
      expect(percentageText).toHaveClass('text-orange-500')
    })

    it('shows max boost at 200%', () => {
      render(
        <VolumeControl
          volume={2.0}
          onVolumeChange={mockOnVolumeChange}
        />
      )

      // 200% appears in both current value and marker
      expect(screen.getAllByText('200%').length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('AC-2.11.3: Volume Adjustment callback', () => {
    it('has correct min/max attributes on slider', () => {
      render(
        <VolumeControl
          volume={1.0}
          onVolumeChange={mockOnVolumeChange}
        />
      )

      const slider = screen.getByRole('slider')
      expect(slider).toHaveAttribute('aria-valuemin', '0')
      expect(slider).toHaveAttribute('aria-valuemax', '200')
    })

    it('slider has correct current value', () => {
      render(
        <VolumeControl
          volume={0.75}
          onVolumeChange={mockOnVolumeChange}
        />
      )

      const slider = screen.getByRole('slider')
      // 0.75 * 100 = 75%
      expect(slider).toHaveAttribute('aria-valuenow', '75')
    })
  })

  describe('accessibility', () => {
    it('has proper aria-label on slider', () => {
      render(
        <VolumeControl
          volume={1.0}
          onVolumeChange={mockOnVolumeChange}
        />
      )

      expect(screen.getByLabelText('Participant volume')).toBeInTheDocument()
    })

    it('shows Volume label text', () => {
      render(
        <VolumeControl
          volume={1.0}
          onVolumeChange={mockOnVolumeChange}
        />
      )

      expect(screen.getByText('Volume')).toBeInTheDocument()
    })
  })
})
