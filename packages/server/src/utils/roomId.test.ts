import { describe, it, expect } from 'vitest'
import { generateRoomId, isValidRoomId } from './roomId'

describe('generateRoomId', () => {
  it('should generate a room ID in xxx-xxx-xxx format', () => {
    const roomId = generateRoomId()

    // Check format: 3 chars, dash, 3 chars, dash, 3 chars
    expect(roomId).toMatch(/^[a-z0-9]{3}-[a-z0-9]{3}-[a-z0-9]{3}$/)
  })

  it('should not contain ambiguous characters (0, O, 1, l, I)', () => {
    // Generate multiple IDs to increase chance of catching ambiguous chars
    const ambiguousChars = ['0', 'o', '1', 'l', 'i']

    for (let i = 0; i < 100; i++) {
      const roomId = generateRoomId()
      for (const char of ambiguousChars) {
        expect(roomId.toLowerCase()).not.toContain(char)
      }
    }
  })

  it('should generate unique IDs across multiple calls', () => {
    const ids = new Set<string>()
    const count = 100

    for (let i = 0; i < count; i++) {
      ids.add(generateRoomId())
    }

    // All IDs should be unique
    expect(ids.size).toBe(count)
  })

  it('should have correct total length (11 chars including dashes)', () => {
    const roomId = generateRoomId()
    expect(roomId.length).toBe(11) // 3 + 1 + 3 + 1 + 3 = 11
  })

  it('should only contain lowercase letters and numbers', () => {
    const roomId = generateRoomId()
    const withoutDashes = roomId.replace(/-/g, '')

    // Should only contain lowercase letters and numbers
    expect(withoutDashes).toMatch(/^[a-z0-9]+$/)
    // Should not contain uppercase
    expect(withoutDashes).not.toMatch(/[A-Z]/)
  })
})

describe('isValidRoomId', () => {
  it('should return true for valid room IDs', () => {
    expect(isValidRoomId('abc-def-ghj')).toBe(true)
    expect(isValidRoomId('234-567-89a')).toBe(true)
    expect(isValidRoomId('xyz-abc-def')).toBe(true)
  })

  it('should return false for IDs with ambiguous characters', () => {
    expect(isValidRoomId('abc-0ef-ghi')).toBe(false) // contains 0
    expect(isValidRoomId('abc-1ef-ghi')).toBe(false) // contains 1
    expect(isValidRoomId('abc-lef-ghi')).toBe(false) // contains l
    expect(isValidRoomId('abc-ief-ghi')).toBe(false) // contains i
    expect(isValidRoomId('abc-oef-ghi')).toBe(false) // contains o
  })

  it('should return false for invalid formats', () => {
    expect(isValidRoomId('abc-def')).toBe(false) // too short
    expect(isValidRoomId('abcd-efgh-ijkl')).toBe(false) // segments too long
    expect(isValidRoomId('ab-cde-fgh')).toBe(false) // first segment too short
    expect(isValidRoomId('abc_def_ghi')).toBe(false) // wrong separator
    expect(isValidRoomId('ABC-DEF-GHI')).toBe(false) // uppercase
    expect(isValidRoomId('')).toBe(false) // empty
  })

  it('should return true for generated room IDs', () => {
    for (let i = 0; i < 10; i++) {
      const roomId = generateRoomId()
      expect(isValidRoomId(roomId)).toBe(true)
    }
  })
})
