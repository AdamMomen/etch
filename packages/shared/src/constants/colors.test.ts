import { describe, it, expect } from 'vitest'
import { PARTICIPANT_COLORS } from './colors'

describe('PARTICIPANT_COLORS', () => {
  it('should have exactly 5 colors', () => {
    expect(PARTICIPANT_COLORS).toHaveLength(5)
  })

  it('should contain valid hex color codes', () => {
    const hexColorRegex = /^#[0-9a-fA-F]{6}$/
    PARTICIPANT_COLORS.forEach((color) => {
      expect(color).toMatch(hexColorRegex)
    })
  })

  it('should contain the expected colors in order', () => {
    expect(PARTICIPANT_COLORS[0]).toBe('#f97316') // Orange
    expect(PARTICIPANT_COLORS[1]).toBe('#06b6d4') // Cyan
    expect(PARTICIPANT_COLORS[2]).toBe('#a855f7') // Purple
    expect(PARTICIPANT_COLORS[3]).toBe('#22c55e') // Green
    expect(PARTICIPANT_COLORS[4]).toBe('#ec4899') // Pink
  })

  it('should be an array (readonly enforced by TypeScript at compile time)', () => {
    // `as const` provides compile-time immutability via TypeScript
    // At runtime, it's still a regular array but TypeScript prevents mutations
    expect(Array.isArray(PARTICIPANT_COLORS)).toBe(true)
  })
})
