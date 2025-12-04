import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generateInviteLink, generateDeepLink, copyToClipboard } from './invite'

describe('invite utilities', () => {
  describe('generateInviteLink', () => {
    beforeEach(() => {
      // Mock window.location for consistent testing
      Object.defineProperty(window, 'location', {
        writable: true,
        configurable: true,
        value: { host: 'localhost:3000', protocol: 'http:' },
      })
    })

    it('generates HTTP URL to landing page by default', () => {
      const link = generateInviteLink('abc-123-xyz')
      expect(link).toBe('http://localhost:3000/join/abc-123-xyz')
    })

    it('uses provided domain when specified', () => {
      const link = generateInviteLink('my-meeting', {
        domain: 'meet.example.com',
      })
      expect(link).toBe('http://meet.example.com/join/my-meeting')
    })

    it('uses https when window.location.protocol is https', () => {
      Object.defineProperty(window, 'location', {
        writable: true,
        configurable: true,
        value: { host: 'secure.example.com', protocol: 'https:' },
      })

      const link = generateInviteLink('room-id')
      expect(link).toBe('https://secure.example.com/join/room-id')
    })

    it('handles various room ID formats', () => {
      expect(generateInviteLink('aaa-bbb-ccc')).toBe('http://localhost:3000/join/aaa-bbb-ccc')
      expect(generateInviteLink('123-456-789')).toBe('http://localhost:3000/join/123-456-789')
      expect(generateInviteLink('a1b-2c3-d4e')).toBe('http://localhost:3000/join/a1b-2c3-d4e')
      expect(generateInviteLink('simple')).toBe('http://localhost:3000/join/simple')
    })
  })

  describe('generateDeepLink', () => {
    it('generates nameless:// protocol link', () => {
      const link = generateDeepLink('abc-123-xyz')
      expect(link).toBe('nameless://room/abc-123-xyz')
    })

    it('handles various room ID formats', () => {
      expect(generateDeepLink('aaa-bbb-ccc')).toBe('nameless://room/aaa-bbb-ccc')
      expect(generateDeepLink('123-456-789')).toBe('nameless://room/123-456-789')
      expect(generateDeepLink('simple')).toBe('nameless://room/simple')
    })
  })

  describe('copyToClipboard', () => {
    const mockWriteText = vi.fn()

    beforeEach(() => {
      vi.clearAllMocks()
      // Mock navigator.clipboard
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      })
    })

    afterEach(() => {
      vi.clearAllMocks()
    })

    it('returns true on successful copy', async () => {
      mockWriteText.mockResolvedValue(undefined)

      const result = await copyToClipboard('test text')

      expect(result).toBe(true)
      expect(mockWriteText).toHaveBeenCalledWith('test text')
    })

    it('returns false on clipboard error', async () => {
      mockWriteText.mockRejectedValue(new Error('Clipboard access denied'))

      const result = await copyToClipboard('test text')

      expect(result).toBe(false)
    })

    it('calls clipboard API with exact text', async () => {
      mockWriteText.mockResolvedValue(undefined)

      await copyToClipboard('nameless://room/abc-123-xyz')

      expect(mockWriteText).toHaveBeenCalledWith('nameless://room/abc-123-xyz')
    })

    it('handles empty string', async () => {
      mockWriteText.mockResolvedValue(undefined)

      const result = await copyToClipboard('')

      expect(result).toBe(true)
      expect(mockWriteText).toHaveBeenCalledWith('')
    })

    it('handles long URLs', async () => {
      mockWriteText.mockResolvedValue(undefined)
      const longUrl = 'https://example.com/join/' + 'a'.repeat(100)

      const result = await copyToClipboard(longUrl)

      expect(result).toBe(true)
      expect(mockWriteText).toHaveBeenCalledWith(longUrl)
    })
  })
})
