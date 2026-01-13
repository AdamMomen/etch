# Story 4.5: Implement Eraser Tool

Status: done

## Story

As an **annotator**,
I want **to erase my own annotation strokes**,
so that **I can correct mistakes or clean up the shared screen**.

## Acceptance Criteria

| AC ID | Criterion | Verification |
|-------|-----------|--------------|
| AC-4.5.1 | Key `7` activates eraser tool | Unit test: keyboard shortcut handler activates 'eraser' |
| AC-4.5.2 | Click on own stroke deletes it | Unit test: verify deleteStroke action called for user's stroke |
| AC-4.5.3 | Drag over own strokes deletes them | Unit test: continuous erase while dragging |
| AC-4.5.4 | Cannot erase others' strokes (unless host/sharer) | Unit test: permission check filters by participantId and role |
| AC-4.5.5 | Entire stroke deleted on touch (not partial) | Unit test: full stroke removed from store, not point-by-point |
| AC-4.5.6 | Visual feedback before deletion (highlight) | Manual test: stroke briefly highlights before removal |
| AC-4.5.7 | Cursor changes to eraser icon | Unit test: cursor style changes when eraser tool active |

## Tasks / Subtasks

- [x] **Task 1: Add eraser keyboard shortcut** (AC: 4.5.1)
  - [x] Update `useAnnotationKeyboard` hook to handle key `7` for eraser
  - [x] Call `annotationStore.setActiveTool('eraser')` on keypress
  - [x] Fix comment at line 43-44 (currently says key '4', should be '7' per spec)
  - [x] Add unit test for `7` key activating eraser tool

- [x] **Task 2: Implement hit-testing for strokes** (AC: 4.5.2, 4.5.5)
  - [x] Create `isPointOnStroke(point, stroke, threshold)` utility in `lib/canvas.ts`
  - [x] Use stroke bounding box for fast rejection
  - [x] Calculate point-to-path distance for precise detection
  - [x] Add unit tests for hit-testing logic

- [x] **Task 3: Implement eraseStrokeAt in useAnnotations** (AC: 4.5.2, 4.5.3, 4.5.4, 4.5.5)
  - [x] Add `eraseStrokeAt(point: Point)` function to useAnnotations hook
  - [x] Implement permission check: filter strokes by `participantId === myParticipantId`
  - [x] Add host/sharer bypass: allow erasing any stroke if `role === 'host' || role === 'sharer'`
  - [x] Call `annotationStore.deleteStroke(strokeId)` when match found
  - [x] Add unit tests for erasing own strokes
  - [x] Add unit tests for permission denied on others' strokes
  - [x] Add unit tests for host/sharer elevated permissions

- [x] **Task 4: Wire eraser to pointer events in AnnotationCanvas** (AC: 4.5.2, 4.5.3)
  - [x] Update `handlePointerDown` to check if `activeTool === 'eraser'`
  - [x] If eraser: call `eraseStrokeAt(point)` instead of `startStroke(point)`
  - [x] Update `handlePointerMove` to continuously erase during drag when eraser active
  - [x] Add unit tests for eraser pointer event handling

- [x] **Task 5: Implement visual feedback for eraser hover** (AC: 4.5.6)
  - [x] Add `hoveredStrokeId` state to track stroke under cursor
  - [x] Update render logic to draw highlighted stroke differently (e.g., brighter/pulsing)
  - [x] Clear `hoveredStrokeId` when stroke is deleted or cursor moves away
  - [x] Add unit test for hover state management

- [x] **Task 6: Update cursor style for eraser tool** (AC: 4.5.7)
  - [x] Modify cursor logic in AnnotationCanvas: `cursor: pointer` when eraser over deletable stroke
  - [x] Use `cursor: crosshair` when eraser active and not hovering over a stroke
  - [x] Add unit test verifying cursor style when activeTool === 'eraser'

- [x] **Task 7: Write integration tests** (AC: all)
  - [x] Test complete eraser flow: select tool (key 7) -> click stroke -> verify deletion
  - [x] Test drag-to-erase: multiple strokes deleted in single drag
  - [x] Test permission enforcement: cannot erase others' strokes as regular annotator
  - [x] Test host can erase any stroke
  - [x] Test sharer can erase any stroke
  - [x] Test eraser does not affect pen/highlighter strokes during drawing

## Dev Notes

### Architecture Alignment

- **ADR-003:** Hybrid Rendering - Eraser uses same canvas pipeline, removes strokes from store
- **ADR-004:** Zustand - Uses existing `deleteStroke` action in annotationStore
- **Pattern:** Local-first deletion - stroke removed immediately, sync via DataTrack (Story 4.7)

### Learnings from Previous Story

**From Story 4-4-implement-highlighter-tool (Status: done)**

- **Keyboard Shortcuts:** Extended `useAnnotationKeyboard` hook - follow same pattern for key `7`
- **Comment Fix Needed:** Line 43-44 in `useAnnotationKeyboard.ts` has comment `// case '4': setActiveTool('eraser')` but tech spec uses key `7` (AC-4.5.1) - update comment when adding eraser
- **Cursor Handling:** Cursor style logic established at `AnnotationCanvas.tsx:451-452` - extend for eraser
- **Tool State:** `annotationStore.setActiveTool('eraser')` action already available
- **Test Patterns:** Follow 23-test pattern from Story 4.4 (8 keyboard, 3 store, 4 integration, 8 rendering)
- **Export Pattern:** Constants exported for testing - follow for any new eraser constants

[Source: docs/sprint-artifacts/4-4-implement-highlighter-tool.md#Dev-Agent-Record]

### Project Structure Notes

**Files to Modify:**
- `packages/client/src/hooks/useAnnotationKeyboard.ts` - Add key `7` handler, fix comment
- `packages/client/src/hooks/useAnnotations.ts` - Add `eraseStrokeAt()` function
- `packages/client/src/components/AnnotationCanvas/AnnotationCanvas.tsx` - Wire eraser to pointer events, cursor style
- `packages/client/src/lib/canvas.ts` - Add `isPointOnStroke()` hit-testing utility (NEW FUNCTION)
- `packages/client/tests/hooks/useAnnotationKeyboard.test.ts` - Add key `7` tests
- `packages/client/tests/hooks/useAnnotations.test.ts` - Add eraser function tests
- `packages/client/tests/components/AnnotationCanvas/AnnotationCanvas.test.tsx` - Add eraser interaction tests

**May Need New Files:**
- `packages/client/src/utils/hitTest.ts` - If hit-testing utilities grow complex (OR add to existing `lib/canvas.ts`)
- `packages/client/tests/utils/hitTest.test.ts` - Tests for hit-testing

### Implementation Approach

1. **Keyboard shortcut first** - Add key `7` mapping (simplest, validates setup)
2. **Hit-testing utility** - Create `isPointOnStroke()` for precise stroke detection
3. **eraseStrokeAt function** - Core logic with permission checks
4. **Wire to pointer events** - Connect eraser to click/drag handling
5. **Visual feedback** - Add hover highlight state
6. **Cursor styling** - Show appropriate cursor for eraser mode
7. **Tests throughout** - Follow TDD pattern established in Stories 4.3-4.4

### Eraser Flow (from Tech Spec)

```
User selects eraser tool (press 7)
         │
         ▼
User clicks/drags on canvas
         │
         ▼
┌─────────────────────────┐
│ Hit-test point against  │
│ all strokes             │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Find strokes under      │
│ cursor position         │
│ (use stroke bounds +    │
│  point distance)        │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Filter: only own strokes│
│ (unless host/sharer)    │
└───────────┬─────────────┘
            │ found match
            ▼
┌─────────────────────────┐
│ Delete from store       │
│ Highlight briefly       │
│ then remove from render │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Publish stroke_delete   │
│ via DataTrack           │
└─────────────────────────┘
```

### Hit-Testing Algorithm

```typescript
function isPointOnStroke(point: Point, stroke: Stroke, threshold: number): boolean {
  // 1. Fast rejection: check bounding box first
  const bounds = getStrokeBounds(stroke);
  if (!isPointInBounds(point, bounds, threshold)) {
    return false;
  }

  // 2. Precise check: minimum distance to stroke path
  for (let i = 0; i < stroke.points.length - 1; i++) {
    const p1 = stroke.points[i];
    const p2 = stroke.points[i + 1];
    const distance = pointToLineSegmentDistance(point, p1, p2);
    if (distance <= threshold) {
      return true;
    }
  }

  return false;
}
```

### Permission Logic

```typescript
// In eraseStrokeAt:
const canDeleteStroke = (stroke: Stroke): boolean => {
  // Own strokes: always deletable
  if (stroke.participantId === myParticipantId) {
    return true;
  }

  // Host or sharer: can delete any stroke (per FR32)
  if (role === 'host' || role === 'sharer') {
    return true;
  }

  return false;
};
```

### Dependencies

- **Story 4.1:** AnnotationCanvas with render loop - DONE
- **Story 4.2:** annotationStore with deleteStroke action - DONE
- **Story 4.3:** useAnnotations hook, keyboard shortcuts, pointer handling - DONE
- **Story 4.4:** Highlighter tool (same patterns to follow) - DONE
- **Story 4.7:** DataTrack sync for stroke_delete (future - local-first for now)

### Testing Standards

- **Framework:** Vitest + React Testing Library
- **Location:** Co-located tests in `tests/` directory
- **Pattern:** Follow test structure from Stories 4.3-4.4
- **Coverage:** All ACs must have corresponding unit tests
- **Hit-testing:** Use mock strokes with known geometry for deterministic tests

### References

- [Source: docs/sprint-artifacts/tech-spec-epic-4.md#Story 4.5: Implement Eraser Tool]
- [Source: docs/sprint-artifacts/tech-spec-epic-4.md#Eraser Flow]
- [Source: docs/sprint-artifacts/tech-spec-epic-4.md#Canvas Rendering Utilities]
- [Source: docs/epics/epic-4-real-time-annotations.md#Story 4.5]
- [Source: docs/architecture.md#Canvas Rendering Pipeline]
- [Source: docs/prd.md#FR30 - Eraser to remove own strokes]
- [Source: docs/prd.md#FR32 - Sharers can delete any annotation]

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/4-5-implement-eraser-tool.context.xml

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

**2025-12-18 Implementation Plan:**
1. Task 1: Add key `7` handler to useAnnotationKeyboard, fix comment at line 43-44
2. Task 2: Create lib/canvas.ts with isPointOnStroke hit-testing utility
3. Task 3: Add eraseStrokeAt to useAnnotations hook with permission checks
4. Task 4: Wire eraser to pointer events in AnnotationCanvas
5. Task 5: Add hoveredStrokeId state for visual feedback
6. Task 6: Update cursor styles for eraser tool
7. Task 7: Write comprehensive tests following 23-test pattern from Story 4.4

### Completion Notes List

**2025-12-18 Implementation Complete:**

1. **Keyboard Shortcut (AC-4.5.1):** Added key `7` handler to `useAnnotationKeyboard.ts` with 7 new tests
2. **Hit-Testing (AC-4.5.2, AC-4.5.5):** Created `lib/canvas.ts` with full hit-testing suite:
   - `getStrokeBounds()` - bounding box calculation
   - `isPointInBounds()` - fast rejection check
   - `pointToLineSegmentDistance()` - precise distance calculation
   - `isPointOnStroke()` - combined hit-test with threshold
   - `findStrokesAtPoint()` - find all strokes at point
   - `findTopmostStrokeAtPoint()` - find topmost (most recent) stroke
   - 34 unit tests for hit-testing logic
3. **Eraser Functions (AC-4.5.2, AC-4.5.3, AC-4.5.4):** Added to `useAnnotations.ts`:
   - `eraseStrokeAt(point)` - delete stroke at point with permission check
   - `canEraseStroke(stroke)` - permission validation
   - `updateHoveredStroke(point)` - update hover state for visual feedback
   - `clearHoveredStroke()` - clear hover state
   - 25+ new tests for eraser functionality
4. **Pointer Events (AC-4.5.2, AC-4.5.3):** Updated `AnnotationCanvas.tsx`:
   - `onEraseAt` prop for click-to-erase
   - `onEraserHover` prop for hover tracking
   - `onEraserHoverEnd` prop for hover cleanup
   - `hoveredStrokeId` prop for visual feedback
5. **Visual Feedback (AC-4.5.6):** Implemented hover highlight:
   - `ERASER_HOVER_COLOR = 'rgba(255, 0, 0, 0.3)'` - red glow
   - `ERASER_HOVER_STROKE_WIDTH = 4` - highlight stroke width
   - `renderStroke()` updated to accept `isHovered` parameter
6. **Cursor Style (AC-4.5.7):** Updated cursor logic with useMemo:
   - `crosshair` when eraser active (no hover)
   - `pointer` when hovering over erasable stroke

**Test Results:** 195 tests passing across annotation modules

### File List

**Modified Files:**
- `packages/client/src/hooks/useAnnotationKeyboard.ts` - Added key `7` for eraser
- `packages/client/src/hooks/useAnnotations.ts` - Added eraser functions and hover state
- `packages/client/src/components/AnnotationCanvas/AnnotationCanvas.tsx` - Added eraser props, hover rendering, cursor style
- `packages/client/tests/hooks/useAnnotationKeyboard.test.ts` - Added 7 eraser shortcut tests
- `packages/client/tests/hooks/useAnnotations.test.ts` - Added 25+ eraser tests
- `packages/client/tests/components/AnnotationCanvas/AnnotationCanvas.test.tsx` - Updated cursor tests for eraser

**New Files:**
- `packages/client/src/lib/canvas.ts` - Hit-testing utilities
- `packages/client/tests/lib/canvas.test.ts` - 34 hit-testing unit tests

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2025-12-18 | SM Agent | Initial draft created from Epic 4 tech spec with learnings from Story 4.4 |
