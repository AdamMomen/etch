import { describe, it, expect } from 'vitest'
import {
  ANNOTATION_MESSAGE_TYPES,
  ANNOTATION_TOPIC,
  isStrokeUpdateMessage,
  isStrokeCompleteMessage,
  isStrokeDeleteMessage,
  isClearAllMessage,
  isStateRequestMessage,
  isStateSnapshotMessage,
  isValidAnnotationMessage,
  encodeAnnotationMessage,
  decodeAnnotationMessage,
  type StrokeUpdateMessage,
  type StrokeCompleteMessage,
  type StrokeDeleteMessage,
  type ClearAllMessage,
  type StateRequestMessage,
  type StateSnapshotMessage,
  type AnnotationMessage,
} from './annotation'
import type { Stroke } from './stroke'

// ─────────────────────────────────────────────────────────
// TEST HELPERS
// ─────────────────────────────────────────────────────────

const createStrokeUpdateMessage = (
  overrides?: Partial<StrokeUpdateMessage>
): StrokeUpdateMessage => ({
  type: ANNOTATION_MESSAGE_TYPES.STROKE_UPDATE,
  strokeId: 'stroke-1',
  participantId: 'participant-1',
  tool: 'pen',
  color: '#f97316',
  points: [{ x: 0.5, y: 0.5 }],
  timestamp: Date.now(),
  ...overrides,
})

const createStrokeCompleteMessage = (
  overrides?: Partial<StrokeCompleteMessage>
): StrokeCompleteMessage => ({
  type: ANNOTATION_MESSAGE_TYPES.STROKE_COMPLETE,
  strokeId: 'stroke-1',
  participantId: 'participant-1',
  tool: 'pen',
  color: '#f97316',
  points: [
    { x: 0.1, y: 0.1 },
    { x: 0.5, y: 0.5 },
    { x: 0.9, y: 0.9 },
  ],
  timestamp: Date.now(),
  ...overrides,
})

const createStrokeDeleteMessage = (
  overrides?: Partial<StrokeDeleteMessage>
): StrokeDeleteMessage => ({
  type: ANNOTATION_MESSAGE_TYPES.STROKE_DELETE,
  strokeId: 'stroke-1',
  deletedBy: 'participant-1',
  timestamp: Date.now(),
  ...overrides,
})

const createClearAllMessage = (
  overrides?: Partial<ClearAllMessage>
): ClearAllMessage => ({
  type: ANNOTATION_MESSAGE_TYPES.CLEAR_ALL,
  clearedBy: 'host-1',
  timestamp: Date.now(),
  ...overrides,
})

const createStateRequestMessage = (
  overrides?: Partial<StateRequestMessage>
): StateRequestMessage => ({
  type: ANNOTATION_MESSAGE_TYPES.STATE_REQUEST,
  requesterId: 'new-participant-1',
  ...overrides,
})

const createMockStroke = (overrides?: Partial<Stroke>): Stroke => ({
  id: 'stroke-1',
  participantId: 'participant-1',
  tool: 'pen',
  color: '#f97316',
  points: [
    { x: 0.1, y: 0.1 },
    { x: 0.5, y: 0.5 },
  ],
  createdAt: Date.now(),
  isComplete: true,
  ...overrides,
})

const createStateSnapshotMessage = (
  overrides?: Partial<StateSnapshotMessage>
): StateSnapshotMessage => ({
  type: ANNOTATION_MESSAGE_TYPES.STATE_SNAPSHOT,
  requesterId: 'new-participant-1',
  strokes: [createMockStroke()],
  timestamp: Date.now(),
  ...overrides,
})

// ─────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────

describe('annotation message types', () => {
  describe('constants', () => {
    it('ANNOTATION_TOPIC is "annotations"', () => {
      expect(ANNOTATION_TOPIC).toBe('annotations')
    })

    it('ANNOTATION_MESSAGE_TYPES has expected values', () => {
      expect(ANNOTATION_MESSAGE_TYPES.STROKE_UPDATE).toBe('stroke_update')
      expect(ANNOTATION_MESSAGE_TYPES.STROKE_COMPLETE).toBe('stroke_complete')
      expect(ANNOTATION_MESSAGE_TYPES.STROKE_DELETE).toBe('stroke_delete')
      expect(ANNOTATION_MESSAGE_TYPES.CLEAR_ALL).toBe('clear_all')
      expect(ANNOTATION_MESSAGE_TYPES.STATE_REQUEST).toBe('state_request')
      expect(ANNOTATION_MESSAGE_TYPES.STATE_SNAPSHOT).toBe('state_snapshot')
    })
  })

  describe('type guards', () => {
    describe('isStrokeUpdateMessage', () => {
      it('returns true for stroke_update messages', () => {
        const msg = createStrokeUpdateMessage()
        expect(isStrokeUpdateMessage(msg)).toBe(true)
      })

      it('returns false for other message types', () => {
        const msg = createStrokeCompleteMessage()
        expect(isStrokeUpdateMessage(msg)).toBe(false)
      })
    })

    describe('isStrokeCompleteMessage', () => {
      it('returns true for stroke_complete messages', () => {
        const msg = createStrokeCompleteMessage()
        expect(isStrokeCompleteMessage(msg)).toBe(true)
      })

      it('returns false for other message types', () => {
        const msg = createStrokeUpdateMessage()
        expect(isStrokeCompleteMessage(msg)).toBe(false)
      })
    })

    describe('isStrokeDeleteMessage', () => {
      it('returns true for stroke_delete messages', () => {
        const msg = createStrokeDeleteMessage()
        expect(isStrokeDeleteMessage(msg)).toBe(true)
      })

      it('returns false for other message types', () => {
        const msg = createStrokeUpdateMessage()
        expect(isStrokeDeleteMessage(msg)).toBe(false)
      })
    })

    describe('isClearAllMessage', () => {
      it('returns true for clear_all messages', () => {
        const msg = createClearAllMessage()
        expect(isClearAllMessage(msg)).toBe(true)
      })

      it('returns false for other message types', () => {
        const msg = createStrokeUpdateMessage()
        expect(isClearAllMessage(msg)).toBe(false)
      })
    })

    describe('isStateRequestMessage (Story 4.8)', () => {
      it('returns true for state_request messages', () => {
        const msg = createStateRequestMessage()
        expect(isStateRequestMessage(msg)).toBe(true)
      })

      it('returns false for other message types', () => {
        const msg = createStrokeUpdateMessage()
        expect(isStateRequestMessage(msg)).toBe(false)
      })

      it('returns false for state_snapshot messages', () => {
        const msg = createStateSnapshotMessage()
        expect(isStateRequestMessage(msg)).toBe(false)
      })
    })

    describe('isStateSnapshotMessage (Story 4.8)', () => {
      it('returns true for state_snapshot messages', () => {
        const msg = createStateSnapshotMessage()
        expect(isStateSnapshotMessage(msg)).toBe(true)
      })

      it('returns false for other message types', () => {
        const msg = createStrokeUpdateMessage()
        expect(isStateSnapshotMessage(msg)).toBe(false)
      })

      it('returns false for state_request messages', () => {
        const msg = createStateRequestMessage()
        expect(isStateSnapshotMessage(msg)).toBe(false)
      })
    })
  })

  describe('isValidAnnotationMessage', () => {
    it('validates stroke_update message', () => {
      const msg = createStrokeUpdateMessage()
      expect(isValidAnnotationMessage(msg)).toBe(true)
    })

    it('validates stroke_complete message', () => {
      const msg = createStrokeCompleteMessage()
      expect(isValidAnnotationMessage(msg)).toBe(true)
    })

    it('validates stroke_delete message', () => {
      const msg = createStrokeDeleteMessage()
      expect(isValidAnnotationMessage(msg)).toBe(true)
    })

    it('validates clear_all message', () => {
      const msg = createClearAllMessage()
      expect(isValidAnnotationMessage(msg)).toBe(true)
    })

    it('validates state_request message (Story 4.8)', () => {
      const msg = createStateRequestMessage()
      expect(isValidAnnotationMessage(msg)).toBe(true)
    })

    it('validates state_snapshot message (Story 4.8)', () => {
      const msg = createStateSnapshotMessage()
      expect(isValidAnnotationMessage(msg)).toBe(true)
    })

    it('validates state_snapshot with empty strokes array (Story 4.8)', () => {
      const msg = createStateSnapshotMessage({ strokes: [] })
      expect(isValidAnnotationMessage(msg)).toBe(true)
    })

    it('validates state_snapshot with multiple strokes (Story 4.8)', () => {
      const msg = createStateSnapshotMessage({
        strokes: [
          createMockStroke({ id: 'stroke-1' }),
          createMockStroke({ id: 'stroke-2' }),
          createMockStroke({ id: 'stroke-3' }),
        ],
      })
      expect(isValidAnnotationMessage(msg)).toBe(true)
    })

    it('validates highlighter tool in messages', () => {
      const msg = createStrokeUpdateMessage({ tool: 'highlighter' })
      expect(isValidAnnotationMessage(msg)).toBe(true)
    })

    it('rejects null', () => {
      expect(isValidAnnotationMessage(null)).toBe(false)
    })

    it('rejects undefined', () => {
      expect(isValidAnnotationMessage(undefined)).toBe(false)
    })

    it('rejects non-object values', () => {
      expect(isValidAnnotationMessage('string')).toBe(false)
      expect(isValidAnnotationMessage(123)).toBe(false)
      expect(isValidAnnotationMessage(true)).toBe(false)
    })

    it('rejects messages without type', () => {
      expect(isValidAnnotationMessage({ strokeId: 'test' })).toBe(false)
    })

    it('rejects messages with unknown type', () => {
      expect(isValidAnnotationMessage({ type: 'unknown_type' })).toBe(false)
    })

    it('rejects stroke_update with invalid tool', () => {
      const msg = {
        ...createStrokeUpdateMessage(),
        tool: 'eraser', // Invalid for stroke messages
      }
      expect(isValidAnnotationMessage(msg)).toBe(false)
    })

    it('rejects stroke_update with missing points', () => {
      const msg = {
        type: ANNOTATION_MESSAGE_TYPES.STROKE_UPDATE,
        strokeId: 'stroke-1',
        participantId: 'participant-1',
        tool: 'pen',
        color: '#f97316',
        timestamp: Date.now(),
        // points missing
      }
      expect(isValidAnnotationMessage(msg)).toBe(false)
    })

    it('rejects stroke_delete with missing strokeId', () => {
      const msg = {
        type: ANNOTATION_MESSAGE_TYPES.STROKE_DELETE,
        deletedBy: 'participant-1',
        timestamp: Date.now(),
        // strokeId missing
      }
      expect(isValidAnnotationMessage(msg)).toBe(false)
    })

    it('rejects state_request with missing requesterId (Story 4.8)', () => {
      const msg = {
        type: ANNOTATION_MESSAGE_TYPES.STATE_REQUEST,
        // requesterId missing
      }
      expect(isValidAnnotationMessage(msg)).toBe(false)
    })

    it('rejects state_snapshot with missing requesterId (Story 4.8)', () => {
      const msg = {
        type: ANNOTATION_MESSAGE_TYPES.STATE_SNAPSHOT,
        strokes: [],
        timestamp: Date.now(),
        // requesterId missing
      }
      expect(isValidAnnotationMessage(msg)).toBe(false)
    })

    it('rejects state_snapshot with missing strokes (Story 4.8)', () => {
      const msg = {
        type: ANNOTATION_MESSAGE_TYPES.STATE_SNAPSHOT,
        requesterId: 'participant-1',
        timestamp: Date.now(),
        // strokes missing
      }
      expect(isValidAnnotationMessage(msg)).toBe(false)
    })

    it('rejects state_snapshot with missing timestamp (Story 4.8)', () => {
      const msg = {
        type: ANNOTATION_MESSAGE_TYPES.STATE_SNAPSHOT,
        requesterId: 'participant-1',
        strokes: [],
        // timestamp missing
      }
      expect(isValidAnnotationMessage(msg)).toBe(false)
    })

    it('rejects state_snapshot with non-array strokes (Story 4.8)', () => {
      const msg = {
        type: ANNOTATION_MESSAGE_TYPES.STATE_SNAPSHOT,
        requesterId: 'participant-1',
        strokes: 'not-an-array',
        timestamp: Date.now(),
      }
      expect(isValidAnnotationMessage(msg)).toBe(false)
    })
  })

  describe('encode/decode', () => {
    it('encodes and decodes stroke_update message', () => {
      const original = createStrokeUpdateMessage()
      const encoded = encodeAnnotationMessage(original)
      const decoded = decodeAnnotationMessage(encoded)

      expect(decoded).toEqual(original)
    })

    it('encodes and decodes stroke_complete message', () => {
      const original = createStrokeCompleteMessage()
      const encoded = encodeAnnotationMessage(original)
      const decoded = decodeAnnotationMessage(encoded)

      expect(decoded).toEqual(original)
    })

    it('encodes and decodes stroke_delete message', () => {
      const original = createStrokeDeleteMessage()
      const encoded = encodeAnnotationMessage(original)
      const decoded = decodeAnnotationMessage(encoded)

      expect(decoded).toEqual(original)
    })

    it('encodes and decodes clear_all message', () => {
      const original = createClearAllMessage()
      const encoded = encodeAnnotationMessage(original)
      const decoded = decodeAnnotationMessage(encoded)

      expect(decoded).toEqual(original)
    })

    it('encodes and decodes state_request message (Story 4.8)', () => {
      const original = createStateRequestMessage()
      const encoded = encodeAnnotationMessage(original)
      const decoded = decodeAnnotationMessage(encoded)

      expect(decoded).toEqual(original)
    })

    it('encodes and decodes state_snapshot message (Story 4.8)', () => {
      const original = createStateSnapshotMessage()
      const encoded = encodeAnnotationMessage(original)
      const decoded = decodeAnnotationMessage(encoded)

      expect(decoded).toEqual(original)
    })

    it('encodes and decodes state_snapshot with multiple strokes (Story 4.8)', () => {
      const original = createStateSnapshotMessage({
        strokes: [
          createMockStroke({ id: 'stroke-1', color: '#ff0000' }),
          createMockStroke({ id: 'stroke-2', color: '#00ff00' }),
          createMockStroke({ id: 'stroke-3', color: '#0000ff' }),
        ],
      })
      const encoded = encodeAnnotationMessage(original)
      const decoded = decodeAnnotationMessage(encoded) as StateSnapshotMessage

      expect(decoded.strokes).toHaveLength(3)
      expect(decoded.strokes[0].id).toBe('stroke-1')
      expect(decoded.strokes[1].id).toBe('stroke-2')
      expect(decoded.strokes[2].id).toBe('stroke-3')
    })

    it('encodes and decodes state_snapshot with empty strokes (Story 4.8)', () => {
      const original = createStateSnapshotMessage({ strokes: [] })
      const encoded = encodeAnnotationMessage(original)
      const decoded = decodeAnnotationMessage(encoded) as StateSnapshotMessage

      expect(decoded.strokes).toHaveLength(0)
    })

    it('returns Uint8Array from encode', () => {
      const msg = createStrokeUpdateMessage()
      const encoded = encodeAnnotationMessage(msg)
      expect(encoded).toBeInstanceOf(Uint8Array)
    })

    it('returns null for invalid JSON', () => {
      const invalidData = new TextEncoder().encode('not valid json {')
      expect(decodeAnnotationMessage(invalidData)).toBeNull()
    })

    it('returns null for valid JSON but invalid message', () => {
      const invalidMsg = new TextEncoder().encode(
        JSON.stringify({ type: 'invalid_type' })
      )
      expect(decodeAnnotationMessage(invalidMsg)).toBeNull()
    })

    it('preserves point precision through encode/decode', () => {
      const original = createStrokeUpdateMessage({
        points: [{ x: 0.123456789, y: 0.987654321, pressure: 0.5 }],
      })
      const encoded = encodeAnnotationMessage(original)
      const decoded = decodeAnnotationMessage(encoded) as StrokeUpdateMessage

      expect(decoded.points[0].x).toBe(0.123456789)
      expect(decoded.points[0].y).toBe(0.987654321)
      expect(decoded.points[0].pressure).toBe(0.5)
    })
  })

  describe('message structure', () => {
    it('StrokeUpdateMessage has required fields', () => {
      const msg = createStrokeUpdateMessage()
      expect(msg.type).toBe(ANNOTATION_MESSAGE_TYPES.STROKE_UPDATE)
      expect(msg.strokeId).toBeDefined()
      expect(msg.participantId).toBeDefined()
      expect(msg.tool).toBeDefined()
      expect(msg.color).toBeDefined()
      expect(msg.points).toBeDefined()
      expect(msg.timestamp).toBeDefined()
    })

    it('StrokeCompleteMessage has required fields', () => {
      const msg = createStrokeCompleteMessage()
      expect(msg.type).toBe(ANNOTATION_MESSAGE_TYPES.STROKE_COMPLETE)
      expect(msg.strokeId).toBeDefined()
      expect(msg.participantId).toBeDefined()
      expect(msg.tool).toBeDefined()
      expect(msg.color).toBeDefined()
      expect(msg.points).toBeDefined()
      expect(msg.timestamp).toBeDefined()
    })

    it('StrokeDeleteMessage has required fields', () => {
      const msg = createStrokeDeleteMessage()
      expect(msg.type).toBe(ANNOTATION_MESSAGE_TYPES.STROKE_DELETE)
      expect(msg.strokeId).toBeDefined()
      expect(msg.deletedBy).toBeDefined()
      expect(msg.timestamp).toBeDefined()
    })

    it('ClearAllMessage has required fields', () => {
      const msg = createClearAllMessage()
      expect(msg.type).toBe(ANNOTATION_MESSAGE_TYPES.CLEAR_ALL)
      expect(msg.clearedBy).toBeDefined()
      expect(msg.timestamp).toBeDefined()
    })

    it('StateRequestMessage has required fields (Story 4.8)', () => {
      const msg = createStateRequestMessage()
      expect(msg.type).toBe(ANNOTATION_MESSAGE_TYPES.STATE_REQUEST)
      expect(msg.requesterId).toBeDefined()
    })

    it('StateSnapshotMessage has required fields (Story 4.8)', () => {
      const msg = createStateSnapshotMessage()
      expect(msg.type).toBe(ANNOTATION_MESSAGE_TYPES.STATE_SNAPSHOT)
      expect(msg.requesterId).toBeDefined()
      expect(msg.strokes).toBeDefined()
      expect(Array.isArray(msg.strokes)).toBe(true)
      expect(msg.timestamp).toBeDefined()
    })
  })
})
