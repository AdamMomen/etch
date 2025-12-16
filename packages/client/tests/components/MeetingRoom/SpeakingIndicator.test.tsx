import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { SpeakingIndicator } from '@/components/MeetingRoom/SpeakingIndicator'

describe('SpeakingIndicator', () => {
  describe('AC-2.9.2: Speaking Indicator Visual States', () => {
    it('renders nothing when isSpeaking is false', () => {
      const { container } = render(
        <SpeakingIndicator isSpeaking={false} color="#3b82f6" />
      )

      expect(container.firstChild).toBeNull()
    })

    it('renders indicator when isSpeaking is true', () => {
      const { container } = render(
        <SpeakingIndicator isSpeaking={true} color="#3b82f6" />
      )

      expect(container.firstChild).toBeInTheDocument()
    })

    it('has animate-speaking-pulse class for animation', () => {
      const { container } = render(
        <SpeakingIndicator isSpeaking={true} color="#3b82f6" />
      )

      expect(container.firstChild).toHaveClass('animate-speaking-pulse')
    })

    it('sets speaking color as CSS variable', () => {
      const { container } = render(
        <SpeakingIndicator isSpeaking={true} color="#3b82f6" />
      )

      expect(container.firstChild).toHaveStyle({
        '--speaking-color': '#3b82f6',
      })
    })

    it('has rounded-full class for circular shape', () => {
      const { container } = render(
        <SpeakingIndicator isSpeaking={true} color="#3b82f6" />
      )

      expect(container.firstChild).toHaveClass('rounded-full')
    })

    it('has pointer-events-none to not interfere with interactions', () => {
      const { container } = render(
        <SpeakingIndicator isSpeaking={true} color="#3b82f6" />
      )

      expect(container.firstChild).toHaveClass('pointer-events-none')
    })

    it('has appropriate accessibility attributes', () => {
      const { container } = render(
        <SpeakingIndicator isSpeaking={true} color="#3b82f6" />
      )

      expect(container.firstChild).toHaveAttribute('aria-label', 'Speaking')
      expect(container.firstChild).toHaveAttribute('role', 'status')
    })

    it('applies custom className', () => {
      const { container } = render(
        <SpeakingIndicator isSpeaking={true} color="#3b82f6" className="custom-class" />
      )

      expect(container.firstChild).toHaveClass('custom-class')
    })
  })
})
