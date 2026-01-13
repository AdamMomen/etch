import { describe, it, expect } from 'vitest'
import { app } from '../app'

describe('Invite Route', () => {
  describe('GET /join/:roomId', () => {
    it('returns HTML landing page', async () => {
      const res = await app.request('/join/abc-123-xyz')

      expect(res.status).toBe(200)
      expect(res.headers.get('content-type')).toContain('text/html')
    })

    it('includes the room ID in the page', async () => {
      const res = await app.request('/join/test-room-id')
      const html = await res.text()

      expect(html).toContain('test-room-id')
    })

    it('includes the deep link in the page', async () => {
      const res = await app.request('/join/my-meeting')
      const html = await res.text()

      expect(html).toContain('etch://room/my-meeting')
    })

    it('includes the web app fallback URL', async () => {
      const res = await app.request('/join/web-fallback-test')
      const html = await res.text()

      expect(html).toContain('/room/web-fallback-test')
    })

    it('includes "Open in Desktop App" button', async () => {
      const res = await app.request('/join/abc-123')
      const html = await res.text()

      expect(html).toContain('Open in Desktop App')
    })

    it('includes "Join in Browser" button', async () => {
      const res = await app.request('/join/abc-123')
      const html = await res.text()

      expect(html).toContain('Join in Browser')
    })

    it('handles various room ID formats', async () => {
      const roomIds = [
        'abc-def-ghi',
        '123-456-789',
        'simple',
        'with-numbers-123',
      ]

      for (const roomId of roomIds) {
        const res = await app.request(`/join/${roomId}`)
        expect(res.status).toBe(200)

        const html = await res.text()
        expect(html).toContain(roomId)
        expect(html).toContain(`etch://room/${roomId}`)
      }
    })
  })
})
