import { describe, it, expect } from 'vitest'
import { parseRoomId } from './roomId'

describe('parseRoomId', () => {
  it('extracts room ID from nameless:// protocol URL', () => {
    expect(parseRoomId('nameless://room/abc-123-xyz')).toBe('abc-123-xyz')
  })

  it('extracts room ID from nameless:// URL with mixed case', () => {
    expect(parseRoomId('nameless://room/ABC-123-XYZ')).toBe('ABC-123-XYZ')
  })

  it('extracts room ID from https:// URL', () => {
    expect(parseRoomId('https://example.com/room/abc-123-xyz')).toBe(
      'abc-123-xyz'
    )
  })

  it('extracts room ID from http:// URL', () => {
    expect(parseRoomId('http://localhost:3000/room/abc-123-xyz')).toBe(
      'abc-123-xyz'
    )
  })

  it('extracts room ID from https:// URL with port', () => {
    expect(parseRoomId('https://example.com:8080/room/abc-123-xyz')).toBe(
      'abc-123-xyz'
    )
  })

  it('returns direct room ID as-is', () => {
    expect(parseRoomId('abc-123-xyz')).toBe('abc-123-xyz')
  })

  it('trims whitespace from input', () => {
    expect(parseRoomId('  abc-123-xyz  ')).toBe('abc-123-xyz')
    expect(parseRoomId('  nameless://room/abc-123-xyz  ')).toBe('abc-123-xyz')
  })

  it('handles empty string', () => {
    expect(parseRoomId('')).toBe('')
  })

  it('handles whitespace-only string', () => {
    expect(parseRoomId('   ')).toBe('')
  })

  it('returns input as-is for unrecognized formats', () => {
    expect(parseRoomId('some-random-text')).toBe('some-random-text')
  })

  it('handles room IDs with only numbers', () => {
    expect(parseRoomId('123456789')).toBe('123456789')
    expect(parseRoomId('nameless://room/123456789')).toBe('123456789')
  })
})
