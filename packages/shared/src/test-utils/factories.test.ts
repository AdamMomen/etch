import { describe, it, expect } from 'vitest'
import {
  createMockStroke,
  createMockPoint,
  createMockParticipant,
  createMockHost,
  createMockViewer,
  createMockSharer,
} from './factories'
import { PARTICIPANT_COLORS } from '../constants'

describe('Test Data Factories', () => {
  describe('createMockStroke', () => {
    it('returns a valid Stroke with default values', () => {
      const stroke = createMockStroke()

      expect(stroke.id).toBe('stroke-1')
      expect(stroke.participantId).toBe('participant-1')
      expect(stroke.tool).toBe('pen')
      expect(stroke.color).toBe(PARTICIPANT_COLORS[0])
      expect(stroke.points).toHaveLength(1)
      expect(stroke.points[0]).toEqual({ x: 0.5, y: 0.5 })
      expect(typeof stroke.createdAt).toBe('number')
    })

    it('allows overriding default values', () => {
      const stroke = createMockStroke({
        id: 'custom-stroke',
        tool: 'highlighter',
        color: '#ff0000',
      })

      expect(stroke.id).toBe('custom-stroke')
      expect(stroke.tool).toBe('highlighter')
      expect(stroke.color).toBe('#ff0000')
      // Other defaults should still be present
      expect(stroke.participantId).toBe('participant-1')
    })
  })

  describe('createMockPoint', () => {
    it('returns a valid Point with default values', () => {
      const point = createMockPoint()

      expect(point.x).toBe(0.5)
      expect(point.y).toBe(0.5)
    })

    it('allows overriding default values', () => {
      const point = createMockPoint({ x: 0.1, y: 0.9, pressure: 0.75 })

      expect(point.x).toBe(0.1)
      expect(point.y).toBe(0.9)
      expect(point.pressure).toBe(0.75)
    })
  })

  describe('createMockParticipant', () => {
    it('returns a valid Participant with default annotator role', () => {
      const participant = createMockParticipant()

      expect(participant.id).toBe('participant-1')
      expect(participant.name).toBe('Test User')
      expect(participant.role).toBe('annotator')
      expect(participant.color).toBe(PARTICIPANT_COLORS[0])
      expect(participant.isLocal).toBe(false)
    })

    it('allows overriding default values', () => {
      const participant = createMockParticipant({
        id: 'custom-id',
        name: 'Custom Name',
        role: 'host',
        isLocal: true,
      })

      expect(participant.id).toBe('custom-id')
      expect(participant.name).toBe('Custom Name')
      expect(participant.role).toBe('host')
      expect(participant.isLocal).toBe(true)
    })
  })

  describe('createMockHost', () => {
    it('returns a Participant with host role', () => {
      const host = createMockHost()

      expect(host.role).toBe('host')
      expect(host.name).toBe('Host User')
    })

    it('allows overriding properties except role', () => {
      const host = createMockHost({ name: 'Admin', isLocal: true })

      expect(host.role).toBe('host')
      expect(host.name).toBe('Admin')
      expect(host.isLocal).toBe(true)
    })
  })

  describe('createMockViewer', () => {
    it('returns a Participant with viewer role', () => {
      const viewer = createMockViewer()

      expect(viewer.role).toBe('viewer')
      expect(viewer.name).toBe('Viewer User')
    })

    it('allows overriding properties except role', () => {
      const viewer = createMockViewer({ name: 'Guest' })

      expect(viewer.role).toBe('viewer')
      expect(viewer.name).toBe('Guest')
    })
  })

  describe('createMockSharer', () => {
    it('returns a Participant with sharer role', () => {
      const sharer = createMockSharer()

      expect(sharer.role).toBe('sharer')
      expect(sharer.name).toBe('Sharer User')
    })

    it('allows overriding properties except role', () => {
      const sharer = createMockSharer({ name: 'Presenter' })

      expect(sharer.role).toBe('sharer')
      expect(sharer.name).toBe('Presenter')
    })
  })
})
