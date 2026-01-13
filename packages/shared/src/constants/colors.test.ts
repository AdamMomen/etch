import { describe, it, expect } from 'vitest'
import { PARTICIPANT_COLORS, getParticipantColor } from './colors'

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

describe('getParticipantColor', () => {
  it('should return first color (orange) for index 0 - host (AC-4.10.2)', () => {
    expect(getParticipantColor(0)).toBe('#f97316')
  })

  it('should return correct colors for indices 0-4 (AC-4.10.2)', () => {
    expect(getParticipantColor(0)).toBe('#f97316') // Orange
    expect(getParticipantColor(1)).toBe('#06b6d4') // Cyan
    expect(getParticipantColor(2)).toBe('#a855f7') // Purple
    expect(getParticipantColor(3)).toBe('#22c55e') // Green
    expect(getParticipantColor(4)).toBe('#ec4899') // Pink
  })

  it('should cycle colors when index >= 5 (AC-4.10.3)', () => {
    // Index 5 should cycle back to orange (index 0)
    expect(getParticipantColor(5)).toBe('#f97316')
    // Index 6 should be cyan (index 1)
    expect(getParticipantColor(6)).toBe('#06b6d4')
  })

  it('should return orange for index 10 (double cycle) (AC-4.10.3)', () => {
    // Index 10 % 5 = 0 -> orange
    expect(getParticipantColor(10)).toBe('#f97316')
  })

  it('should handle large indices correctly', () => {
    // Index 100 % 5 = 0 -> orange
    expect(getParticipantColor(100)).toBe('#f97316')
    // Index 101 % 5 = 1 -> cyan
    expect(getParticipantColor(101)).toBe('#06b6d4')
    // Index 999 % 5 = 4 -> pink
    expect(getParticipantColor(999)).toBe('#ec4899')
  })

  it('should handle negative indices defensively', () => {
    // Negative indices should be treated as positive
    expect(getParticipantColor(-1)).toBe('#06b6d4') // abs(-1) = 1 -> cyan
    expect(getParticipantColor(-5)).toBe('#f97316') // abs(-5) % 5 = 0 -> orange
  })

  it('should handle decimal indices by flooring', () => {
    // 1.9 -> floor to 1 -> cyan
    expect(getParticipantColor(1.9)).toBe('#06b6d4')
    // 2.1 -> floor to 2 -> purple
    expect(getParticipantColor(2.1)).toBe('#a855f7')
  })

  it('should always return a valid participant color type', () => {
    const hexColorRegex = /^#[0-9a-fA-F]{6}$/
    for (let i = 0; i < 20; i++) {
      const color = getParticipantColor(i)
      expect(color).toMatch(hexColorRegex)
      expect(PARTICIPANT_COLORS).toContain(color)
    }
  })
})
