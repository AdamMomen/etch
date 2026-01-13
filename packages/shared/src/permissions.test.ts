import { describe, it, expect } from 'vitest'
import {
  canAnnotate,
  canDeleteStroke,
  canClearAll,
  canModerateUsers,
  canToggleRoomAnnotations,
} from './permissions'
import { createMockStroke } from './test-utils'

describe('canAnnotate (AC-5.1.2)', () => {
  describe('viewer role', () => {
    it('viewer cannot annotate when annotations enabled', () => {
      expect(canAnnotate('viewer', true)).toBe(false)
    })

    it('viewer cannot annotate when annotations disabled', () => {
      expect(canAnnotate('viewer', false)).toBe(false)
    })
  })

  describe('host role', () => {
    it('host can annotate when annotations enabled', () => {
      expect(canAnnotate('host', true)).toBe(true)
    })

    it('host can annotate even when annotations disabled (override)', () => {
      expect(canAnnotate('host', false)).toBe(true)
    })
  })

  describe('annotator role', () => {
    it('annotator can annotate when annotations enabled', () => {
      expect(canAnnotate('annotator', true)).toBe(true)
    })

    it('annotator cannot annotate when annotations disabled', () => {
      expect(canAnnotate('annotator', false)).toBe(false)
    })
  })

  describe('sharer role', () => {
    it('sharer can annotate when annotations enabled', () => {
      expect(canAnnotate('sharer', true)).toBe(true)
    })

    it('sharer cannot annotate when annotations disabled', () => {
      expect(canAnnotate('sharer', false)).toBe(false)
    })
  })
})

describe('canDeleteStroke (AC-5.1.2, AC-5.1.6)', () => {
  const ownStroke = createMockStroke({ participantId: 'user-123' })
  const otherStroke = createMockStroke({ participantId: 'user-456' })

  describe('host role', () => {
    it('host can delete own stroke', () => {
      expect(canDeleteStroke('host', ownStroke, 'user-123', false)).toBe(true)
    })

    it('host can delete any stroke', () => {
      expect(canDeleteStroke('host', otherStroke, 'user-123', false)).toBe(true)
    })

    it('host can delete any stroke even when sharing', () => {
      expect(canDeleteStroke('host', otherStroke, 'user-123', true)).toBe(true)
    })
  })

  describe('sharer role (when actively sharing)', () => {
    it('sharer can delete own stroke when sharing', () => {
      expect(canDeleteStroke('sharer', ownStroke, 'user-123', true)).toBe(true)
    })

    it('sharer can delete any stroke when sharing', () => {
      expect(canDeleteStroke('sharer', otherStroke, 'user-123', true)).toBe(
        true
      )
    })
  })

  describe('sharer role (not actively sharing)', () => {
    it('sharer can delete own stroke when not sharing', () => {
      expect(canDeleteStroke('sharer', ownStroke, 'user-123', false)).toBe(true)
    })

    it('sharer cannot delete other stroke when not sharing', () => {
      expect(canDeleteStroke('sharer', otherStroke, 'user-123', false)).toBe(
        false
      )
    })
  })

  describe('annotator role', () => {
    it('annotator can delete own stroke', () => {
      expect(canDeleteStroke('annotator', ownStroke, 'user-123', false)).toBe(
        true
      )
    })

    it('annotator cannot delete other stroke', () => {
      expect(canDeleteStroke('annotator', otherStroke, 'user-123', false)).toBe(
        false
      )
    })
  })

  describe('viewer role', () => {
    it('viewer cannot delete own stroke', () => {
      expect(canDeleteStroke('viewer', ownStroke, 'user-123', false)).toBe(
        false
      )
    })

    it('viewer cannot delete other stroke', () => {
      expect(canDeleteStroke('viewer', otherStroke, 'user-123', false)).toBe(
        false
      )
    })

    it('viewer cannot delete any stroke even when sharing', () => {
      expect(canDeleteStroke('viewer', otherStroke, 'user-123', true)).toBe(
        false
      )
    })
  })
})

describe('canClearAll (AC-5.1.2)', () => {
  it('host can clear all', () => {
    expect(canClearAll('host')).toBe(true)
  })

  it('sharer cannot clear all', () => {
    expect(canClearAll('sharer')).toBe(false)
  })

  it('annotator cannot clear all', () => {
    expect(canClearAll('annotator')).toBe(false)
  })

  it('viewer cannot clear all', () => {
    expect(canClearAll('viewer')).toBe(false)
  })
})

describe('canModerateUsers (AC-5.1.2)', () => {
  it('host can moderate users', () => {
    expect(canModerateUsers('host')).toBe(true)
  })

  it('sharer cannot moderate users', () => {
    expect(canModerateUsers('sharer')).toBe(false)
  })

  it('annotator cannot moderate users', () => {
    expect(canModerateUsers('annotator')).toBe(false)
  })

  it('viewer cannot moderate users', () => {
    expect(canModerateUsers('viewer')).toBe(false)
  })
})

describe('canToggleRoomAnnotations (AC-5.1.2)', () => {
  it('host can toggle room annotations', () => {
    expect(canToggleRoomAnnotations('host')).toBe(true)
  })

  it('sharer cannot toggle room annotations', () => {
    expect(canToggleRoomAnnotations('sharer')).toBe(false)
  })

  it('annotator cannot toggle room annotations', () => {
    expect(canToggleRoomAnnotations('annotator')).toBe(false)
  })

  it('viewer cannot toggle room annotations', () => {
    expect(canToggleRoomAnnotations('viewer')).toBe(false)
  })
})

describe('Permission hierarchy (AC-5.1.6)', () => {
  it('enforces Host > Sharer > Annotator > Viewer hierarchy for annotations', () => {
    // Host can always annotate
    expect(canAnnotate('host', false)).toBe(true)

    // Sharer/Annotator depend on room setting
    expect(canAnnotate('sharer', true)).toBe(true)
    expect(canAnnotate('annotator', true)).toBe(true)

    // Viewer can never annotate
    expect(canAnnotate('viewer', true)).toBe(false)
  })

  it('enforces hierarchy for moderation capabilities', () => {
    // Only host can moderate
    expect(canModerateUsers('host')).toBe(true)
    expect(canModerateUsers('sharer')).toBe(false)
    expect(canModerateUsers('annotator')).toBe(false)
    expect(canModerateUsers('viewer')).toBe(false)

    // Only host can clear all
    expect(canClearAll('host')).toBe(true)
    expect(canClearAll('sharer')).toBe(false)
    expect(canClearAll('annotator')).toBe(false)
    expect(canClearAll('viewer')).toBe(false)
  })
})
