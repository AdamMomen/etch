# Story 4.4: Implement Highlighter Tool

Status: done

## Story

As an **annotator**,
I want **to use a highlighter tool for semi-transparent emphasis**,
so that **I can highlight areas without fully obscuring content**.

## Acceptance Criteria

| AC ID | Criterion | Verification |
|-------|-----------|--------------|
| AC-4.4.1 | Key `3` activates highlighter tool | Unit test: keyboard shortcut handler activates 'highlighter' |
| AC-4.4.2 | Highlighter stroke has 40% opacity | Unit test: verify globalAlpha = 0.4 when rendering highlighter strokes |
| AC-4.4.3 | Highlighter is 3x wider than pen | Unit test: verify HIGHLIGHTER_OPTIONS.size = 24 (vs PEN_OPTIONS.size = 8) |
| AC-4.4.4 | Highlighter uses participant color with alpha | Unit test: verify color application with transparency |
| AC-4.4.5 | Highlighter has flat ends (not rounded) | Unit test: verify lineCap/Perfect Freehand options for flat ends |
| AC-4.4.6 | Toolbar shows highlighter as active when selected | Unit test: verify UI state reflects activeTool === 'highlighter' |
| AC-4.4.7 | Cursor indicates highlighter mode | Unit test: cursor style changes when highlighter tool active |

## Tasks / Subtasks

- [x] **Task 1: Add highlighter keyboard shortcut** (AC: 4.4.1)
  - [x] Update `useAnnotationKeyboard` hook to handle key `3` for highlighter
  - [x] Call `annotationStore.setActiveTool('highlighter')` on keypress
  - [x] Add unit test for `3` key activating highlighter tool

- [x] **Task 2: Update useAnnotations to support highlighter tool** (AC: 4.4.4)
  - [x] Modify `startStroke()` to set `tool: activeTool` (pen or highlighter) instead of hardcoded 'pen'
  - [x] Ensure stroke metadata includes correct tool type for rendering
  - [x] Add unit test verifying highlighter strokes have `tool: 'highlighter'`

- [x] **Task 3: Implement highlighter rendering in AnnotationCanvas** (AC: 4.4.2, 4.4.3, 4.4.5)
  - [x] Verify `HIGHLIGHTER_OPTIONS` constants are correctly configured (size: 24, thinning: 0, flat caps)
  - [x] Update `renderStroke()` to apply `globalAlpha = 0.4` for highlighter tool
  - [x] Apply flat lineCap style (`cap: false` in Perfect Freehand options) for highlighter
  - [x] Reset `globalAlpha = 1.0` after rendering highlighter strokes
  - [x] Add unit tests for highlighter opacity rendering
  - [x] Add unit tests for highlighter width (3x pen)

- [x] **Task 4: Update cursor style for highlighter tool** (AC: 4.4.7)
  - [x] Modify cursor logic in AnnotationCanvas to show appropriate cursor for highlighter
  - [x] Use `cursor: crosshair` or custom highlighter cursor when tool is 'highlighter'
  - [x] Add unit test verifying cursor style when activeTool === 'highlighter'

- [x] **Task 5: Prepare toolbar integration point** (AC: 4.4.6)
  - [x] Document the integration point for AnnotationToolbar (Story 4.6)
  - [x] Verify annotationStore.activeTool state changes trigger re-renders
  - [x] Add test verifying activeTool state change to 'highlighter' is observable

- [x] **Task 6: Write integration tests** (AC: all)
  - [x] Test complete highlighter flow: select tool (key 3) -> draw stroke -> verify visual properties
  - [x] Test switching between pen and highlighter preserves correct tool metadata on strokes
  - [x] Test that existing pen strokes continue to render correctly after highlighter strokes added

## Dev Notes

### Architecture Alignment

- **ADR-003:** Hybrid Rendering - Highlighter rendering uses same canvas pipeline as pen
- **ADR-004:** Zustand - Tool state managed via annotationStore.activeTool
- **Pattern:** Local-first rendering - highlighter strokes render immediately, sync later (Story 4.7)

### Learnings from Previous Story

**From Story 4-3-implement-local-stroke-drawing-pen-tool (Status: done)**

- **New Hooks Created:**
  - `useAnnotations` at `packages/client/src/hooks/useAnnotations.ts` - Use `startStroke()` with tool parameter
  - `useAnnotationKeyboard` at `packages/client/src/hooks/useAnnotationKeyboard.ts` - Extend with key `3` mapping
- **Coordinate System:** Reuse existing `normalizeCoordinates` and `getPointerCoordinates` utilities
- **AnnotationCanvas:** `HIGHLIGHTER_OPTIONS` already defined at lines 45-52, just needs rendering application
- **AnnotationStore:** `setActiveTool('highlighter')` action already available
- **Cursor Behavior:** Crosshair cursor pattern established - extend for highlighter
- **Test Patterns:** Follow established patterns from 69 new tests in Story 4.3

[Source: docs/sprint-artifacts/4-3-implement-local-stroke-drawing-pen-tool.md#Dev-Agent-Record]

### Project Structure Notes

**Files to Modify:**
- `packages/client/src/hooks/useAnnotationKeyboard.ts` - Add key `3` handler
- `packages/client/src/hooks/useAnnotations.ts` - Use activeTool for stroke creation
- `packages/client/src/components/AnnotationCanvas/AnnotationCanvas.tsx` - Add highlighter opacity/width rendering
- `packages/client/tests/hooks/useAnnotationKeyboard.test.ts` - Add key `3` tests
- `packages/client/tests/hooks/useAnnotations.test.ts` - Add highlighter stroke tests
- `packages/client/tests/components/AnnotationCanvas/AnnotationCanvas.test.tsx` - Add highlighter rendering tests

**No New Files Needed:**
- All infrastructure exists from Stories 4.1-4.3
- Just extending existing hooks, components, and tests

### Implementation Approach

1. **Keyboard shortcut first** - Add key `3` mapping to useAnnotationKeyboard (simplest change)
2. **Update stroke creation** - Modify useAnnotations to use activeTool from store
3. **Highlighter rendering** - Apply opacity and width in renderStroke based on tool type
4. **Cursor update** - Extend cursor logic for highlighter tool
5. **Tests throughout** - Follow TDD pattern from Story 4.3

### Perfect Freehand Configuration

```typescript
// Already defined in AnnotationCanvas.tsx
const HIGHLIGHTER_OPTIONS = {
  size: 24,           // 3x pen width (pen = 8)
  thinning: 0,        // No thinning for uniform width
  smoothing: 0.5,
  streamline: 0.3,
  easing: (t: number) => t,
  start: { taper: 0, cap: false },  // Flat ends
  end: { taper: 0, cap: false },    // Flat ends
};
```

### Rendering Logic

```typescript
// Pseudo-code for highlighter rendering
if (stroke.tool === 'highlighter') {
  ctx.globalAlpha = 0.4;  // 40% opacity
  // Use HIGHLIGHTER_OPTIONS for getStroke()
}
// Render stroke path
// Reset globalAlpha after rendering
ctx.globalAlpha = 1.0;
```

### Dependencies

- **Story 4.1:** AnnotationCanvas with render loop - DONE
- **Story 4.2:** annotationStore with activeTool state - DONE
- **Story 4.3:** useAnnotations hook, keyboard shortcuts, cursor handling - DONE
- **perfect-freehand:** ^1.2.2 - already installed

### Testing Standards

- **Framework:** Vitest + React Testing Library
- **Location:** Co-located tests in `tests/` directory
- **Pattern:** Follow test structure from Story 4.3 (69 tests added)
- **Coverage:** All ACs must have corresponding unit tests

### References

- [Source: docs/sprint-artifacts/tech-spec-epic-4.md#Story 4.4: Implement Highlighter Tool]
- [Source: docs/sprint-artifacts/tech-spec-epic-4.md#Perfect Freehand Configuration]
- [Source: docs/epics/epic-4-real-time-annotations.md#Story 4.4]
- [Source: docs/architecture.md#Canvas Rendering Pipeline]
- [Source: docs/prd.md#FR29 - Highlighter tool for semi-transparent emphasis]

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/4-4-implement-highlighter-tool.context.xml

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

**Implementation Plan:**
1. Add key '3' shortcut to useAnnotationKeyboard hook
2. Verify useAnnotations already handles highlighter tool (confirmed at lines 67, 75)
3. Verify AnnotationCanvas already has HIGHLIGHTER_OPTIONS and opacity handling (confirmed at lines 46-57, 107, 123-125)
4. Verify cursor style already handles highlighter (confirmed at line 449)
5. Add comprehensive unit tests for all ACs
6. Add integration tests for complete highlighter flow

**Key Findings:**
- Most highlighter functionality was already implemented in Stories 4.1-4.3
- Primary implementation was adding keyboard shortcut (key '3') in useAnnotationKeyboard
- Exported PEN_OPTIONS, HIGHLIGHTER_OPTIONS, HIGHLIGHTER_OPACITY for testing/reuse

### Completion Notes List

✅ **Task 1:** Added key '3' keyboard shortcut to activate highlighter tool. Added 8 new tests for highlighter keyboard shortcut (AC-4.4.1)

✅ **Task 2:** Verified useAnnotations already uses activeTool correctly (lines 67, 75). Existing test at line 296-310 confirms highlighter strokes work.

✅ **Task 3:** Verified HIGHLIGHTER_OPTIONS (size: 24, cap: false) and HIGHLIGHTER_OPACITY (0.4) are correctly configured. Exported constants for testing. Added 5 unit tests for constants (AC-4.4.2, AC-4.4.3, AC-4.4.5)

✅ **Task 4:** Verified cursor style already handles highlighter (crosshair cursor). Existing test at line 334-348 confirms (AC-4.4.7)

✅ **Task 5:** Added 3 tests for toolbar integration (AC-4.4.6) in annotationStore.test.ts

✅ **Task 6:** Added 4 integration tests for complete highlighter flow, tool switching, and stroke preservation

**Test Results:** All 736 tests pass

### File List

**Modified:**
- `packages/client/src/hooks/useAnnotationKeyboard.ts` - Added key '3' shortcut for highlighter
- `packages/client/src/components/AnnotationCanvas/AnnotationCanvas.tsx` - Exported PEN_OPTIONS, HIGHLIGHTER_OPTIONS, HIGHLIGHTER_OPACITY
- `packages/client/src/components/AnnotationCanvas/index.ts` - Added exports for constants
- `packages/client/tests/hooks/useAnnotationKeyboard.test.ts` - Added 8 highlighter shortcut tests
- `packages/client/tests/hooks/useAnnotations.test.ts` - Added 4 highlighter integration tests
- `packages/client/tests/components/AnnotationCanvas/AnnotationCanvas.test.tsx` - Added 8 highlighter rendering/constant tests
- `packages/client/tests/stores/annotationStore.test.ts` - Added 3 toolbar integration tests

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2025-12-18 | SM Agent | Initial draft created from Epic 4 tech spec and epics |
| 2025-12-18 | Dev Agent | Implemented highlighter keyboard shortcut (key 3), exported constants, added 23 new tests |
| 2025-12-18 | SM Agent | Senior Developer Review notes appended |

---

## Senior Developer Review (AI)

### Reviewer
BMad

### Date
2025-12-18

### Outcome
**APPROVE** ✅

All acceptance criteria fully implemented with evidence. All completed tasks verified. No blocking issues found.

### Summary

Story 4.4 implements the highlighter tool for semi-transparent emphasis annotations. The implementation leverages existing infrastructure from Stories 4.1-4.3, with the primary new code being the keyboard shortcut handler (key `3`) and comprehensive tests. Code quality is excellent with 736 total tests passing.

### Key Findings

**No HIGH or MEDIUM severity findings.**

**Advisory Notes (No action required):**
- Note: Comment at `useAnnotationKeyboard.ts:43-44` mentions `case '4'` for eraser, but tech spec uses `'7'` (AC-4.5.1). This is informational for Story 4.5.
- Note: Consider adding a custom cursor icon for highlighter in a future story to visually differentiate from pen tool.

### Acceptance Criteria Coverage

| AC# | Description | Status | Evidence |
|-----|-------------|--------|----------|
| AC-4.4.1 | Key `3` activates highlighter tool | ✅ IMPLEMENTED | `useAnnotationKeyboard.ts:40-41` |
| AC-4.4.2 | Highlighter stroke has 40% opacity | ✅ IMPLEMENTED | `AnnotationCanvas.tsx:59,126` |
| AC-4.4.3 | Highlighter is 3x wider than pen | ✅ IMPLEMENTED | `AnnotationCanvas.tsx:49` (size:24 vs size:8) |
| AC-4.4.4 | Highlighter uses participant color with alpha | ✅ IMPLEMENTED | `useAnnotations.ts:76`, opacity via `globalAlpha` |
| AC-4.4.5 | Highlighter has flat ends (not rounded) | ✅ IMPLEMENTED | `AnnotationCanvas.tsx:54-55` (`cap: false`) |
| AC-4.4.6 | Toolbar shows highlighter as active when selected | ✅ IMPLEMENTED | `annotationStore.ts` setActiveTool action |
| AC-4.4.7 | Cursor indicates highlighter mode | ✅ IMPLEMENTED | `AnnotationCanvas.tsx:451-452` |

**Summary: 7 of 7 acceptance criteria fully implemented**

### Task Completion Validation

| Task | Marked | Verified | Evidence |
|------|--------|----------|----------|
| Task 1: Add highlighter keyboard shortcut | ✅ | ✅ VERIFIED | `useAnnotationKeyboard.ts:40-41`, 8 tests added |
| Task 2: Update useAnnotations for highlighter | ✅ | ✅ VERIFIED | `useAnnotations.ts:67,75` |
| Task 3: Implement highlighter rendering | ✅ | ✅ VERIFIED | `AnnotationCanvas.tsx:45-59,109,125-127` |
| Task 4: Update cursor for highlighter | ✅ | ✅ VERIFIED | `AnnotationCanvas.tsx:451-452` |
| Task 5: Prepare toolbar integration | ✅ | ✅ VERIFIED | Store actions + 3 tests |
| Task 6: Write integration tests | ✅ | ✅ VERIFIED | `useAnnotations.test.ts:525-681` |

**Summary: 6 of 6 completed tasks verified, 0 questionable, 0 falsely marked complete**

### Test Coverage and Gaps

- **Total Tests:** 736 passing
- **New Tests Added:** 23 tests for highlighter functionality
- **Test Files Modified:**
  - `useAnnotationKeyboard.test.ts` - 8 highlighter shortcut tests
  - `useAnnotations.test.ts` - 4 highlighter integration tests
  - `AnnotationCanvas.test.tsx` - 8 highlighter rendering/constant tests
  - `annotationStore.test.ts` - 3 toolbar integration tests
- **Coverage:** All ACs have corresponding unit tests

### Architectural Alignment

- **ADR-003 (Hybrid Rendering):** ✅ Compliant - Highlighter uses same canvas pipeline as pen
- **ADR-004 (Zustand):** ✅ Compliant - Tool state managed via `annotationStore.activeTool`
- **Perfect Freehand Configuration:** ✅ Matches tech spec exactly

### Security Notes

No security concerns. Keyboard shortcuts properly filter:
- Input/textarea/contenteditable elements
- Modifier keys (Ctrl, Meta, Alt)

### Best-Practices and References

- [Vitest Testing Framework](https://vitest.dev/) - v2.0.0
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) - v16.3.0
- [Perfect Freehand](https://github.com/steveruizok/perfect-freehand) - v1.2.2
- [Zustand](https://github.com/pmndrs/zustand) - v5.0.9

### Action Items

**Code Changes Required:**
_None - all acceptance criteria met_

**Advisory Notes:**
- Note: Comment at `useAnnotationKeyboard.ts:43-44` references eraser as key '4' but tech spec uses key '7' - update comment in Story 4.5 implementation
- Note: Consider custom highlighter cursor icon in future UX polish story
