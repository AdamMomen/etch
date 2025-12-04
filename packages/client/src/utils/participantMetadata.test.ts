import { describe, it, expect } from 'vitest'
import { parseParticipantMetadata } from './participantMetadata'
import { PARTICIPANT_COLORS } from '@nameless/shared'

describe('parseParticipantMetadata', () => {
  describe('valid metadata parsing', () => {
    it('parses valid JSON metadata correctly', () => {
      const metadata = JSON.stringify({ role: 'host', color: '#f97316' })
      const result = parseParticipantMetadata(metadata)

      expect(result.role).toBe('host')
      expect(result.color).toBe('#f97316')
    })

    it('parses all valid roles', () => {
      const roles = ['host', 'sharer', 'annotator', 'viewer'] as const

      roles.forEach((role) => {
        const metadata = JSON.stringify({ role, color: '#06b6d4' })
        const result = parseParticipantMetadata(metadata)
        expect(result.role).toBe(role)
      })
    })

    it('parses valid hex colors', () => {
      const colors = ['#f97316', '#06b6d4', '#a855f7', '#22c55e', '#ec4899']

      colors.forEach((color) => {
        const metadata = JSON.stringify({ role: 'annotator', color })
        const result = parseParticipantMetadata(metadata)
        expect(result.color).toBe(color)
      })
    })
  })

  describe('fallback to defaults', () => {
    it('returns defaults for empty string', () => {
      const result = parseParticipantMetadata('')

      expect(result.role).toBe('annotator')
      expect(result.color).toBe(PARTICIPANT_COLORS[0])
    })

    it('returns defaults for whitespace-only string', () => {
      const result = parseParticipantMetadata('   ')

      expect(result.role).toBe('annotator')
      expect(result.color).toBe(PARTICIPANT_COLORS[0])
    })

    it('returns defaults for invalid JSON', () => {
      const result = parseParticipantMetadata('not valid json')

      expect(result.role).toBe('annotator')
      expect(result.color).toBe(PARTICIPANT_COLORS[0])
    })

    it('returns default role for invalid role value', () => {
      const metadata = JSON.stringify({ role: 'invalid-role', color: '#f97316' })
      const result = parseParticipantMetadata(metadata)

      expect(result.role).toBe('annotator')
      expect(result.color).toBe('#f97316')
    })

    it('returns default color for missing color', () => {
      const metadata = JSON.stringify({ role: 'host' })
      const result = parseParticipantMetadata(metadata)

      expect(result.role).toBe('host')
      expect(result.color).toBe(PARTICIPANT_COLORS[0])
    })

    it('returns default color for non-hex color', () => {
      const metadata = JSON.stringify({ role: 'host', color: 'red' })
      const result = parseParticipantMetadata(metadata)

      expect(result.role).toBe('host')
      expect(result.color).toBe(PARTICIPANT_COLORS[0])
    })

    it('returns default color for non-string color', () => {
      const metadata = JSON.stringify({ role: 'host', color: 123 })
      const result = parseParticipantMetadata(metadata)

      expect(result.role).toBe('host')
      expect(result.color).toBe(PARTICIPANT_COLORS[0])
    })
  })

  describe('edge cases', () => {
    it('handles metadata with extra fields', () => {
      const metadata = JSON.stringify({
        role: 'host',
        color: '#f97316',
        extraField: 'should be ignored',
      })
      const result = parseParticipantMetadata(metadata)

      expect(result.role).toBe('host')
      expect(result.color).toBe('#f97316')
    })

    it('handles metadata with only role', () => {
      const metadata = JSON.stringify({ role: 'viewer' })
      const result = parseParticipantMetadata(metadata)

      expect(result.role).toBe('viewer')
      expect(result.color).toBe(PARTICIPANT_COLORS[0])
    })

    it('handles metadata with only color', () => {
      const metadata = JSON.stringify({ color: '#a855f7' })
      const result = parseParticipantMetadata(metadata)

      expect(result.role).toBe('annotator')
      expect(result.color).toBe('#a855f7')
    })

    it('handles empty object', () => {
      const metadata = JSON.stringify({})
      const result = parseParticipantMetadata(metadata)

      expect(result.role).toBe('annotator')
      expect(result.color).toBe(PARTICIPANT_COLORS[0])
    })
  })
})
