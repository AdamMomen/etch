import type { Stroke, Point, Participant, Role } from '../types'
import { PARTICIPANT_COLORS } from '../constants'

/**
 * Creates a mock Stroke with sensible defaults.
 * Override any properties by passing a partial Stroke object.
 */
export function createMockStroke(overrides?: Partial<Stroke>): Stroke {
  return {
    id: 'stroke-1',
    participantId: 'participant-1',
    tool: 'pen',
    color: PARTICIPANT_COLORS[0],
    points: [{ x: 0.5, y: 0.5 }],
    createdAt: Date.now(),
    isComplete: false,
    ...overrides,
  }
}

/**
 * Creates a mock Point with sensible defaults.
 * Override any properties by passing a partial Point object.
 */
export function createMockPoint(overrides?: Partial<Point>): Point {
  return {
    x: 0.5,
    y: 0.5,
    ...overrides,
  }
}

/**
 * Creates a mock Participant with sensible defaults.
 * Defaults to 'annotator' role.
 * Override any properties by passing a partial Participant object.
 */
export function createMockParticipant(
  overrides?: Partial<Participant>
): Participant {
  return {
    id: 'participant-1',
    name: 'Test User',
    role: 'annotator',
    color: PARTICIPANT_COLORS[0],
    isLocal: false,
    ...overrides,
  }
}

/**
 * Creates a mock host participant.
 * Shorthand for createMockParticipant({ role: 'host' })
 */
export function createMockHost(
  overrides?: Partial<Omit<Participant, 'role'>>
): Participant {
  return createMockParticipant({
    role: 'host',
    name: 'Host User',
    ...overrides,
  })
}

/**
 * Creates a mock viewer participant.
 * Shorthand for createMockParticipant({ role: 'viewer' })
 */
export function createMockViewer(
  overrides?: Partial<Omit<Participant, 'role'>>
): Participant {
  return createMockParticipant({
    role: 'viewer',
    name: 'Viewer User',
    ...overrides,
  })
}

/**
 * Creates a mock sharer participant.
 * Shorthand for createMockParticipant({ role: 'sharer' })
 */
export function createMockSharer(
  overrides?: Partial<Omit<Participant, 'role'>>
): Participant {
  return createMockParticipant({
    role: 'sharer',
    name: 'Sharer User',
    ...overrides,
  })
}
