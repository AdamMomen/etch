# Story 4.2: Implement Annotation Store with Zustand

Status: drafted

## Story

As a **developer**,
I want **a centralized store for annotation state**,
so that **strokes can be managed consistently across the application**.

## Acceptance Criteria

| AC ID | Criterion | Verification |
|-------|-----------|--------------|
| AC-4.2.1 | Store provides `strokes` array for completed strokes | Unit test: state shape |
| AC-4.2.2 | Store provides `activeStroke` for stroke currently being drawn | Unit test: state shape |
| AC-4.2.3 | Store provides `activeTool` state (`'select' \| 'pen' \| 'highlighter' \| 'eraser'`) | Unit test: state shape |
| AC-4.2.4 | `addStroke(stroke)` action adds stroke to array | Unit test: action |
| AC-4.2.5 | `updateStroke(strokeId, points)` action appends points to existing stroke | Unit test: action |
| AC-4.2.6 | `completeStroke(strokeId)` action marks stroke as complete | Unit test: action |
| AC-4.2.7 | `deleteStroke(strokeId)` action removes stroke from array | Unit test: action |
| AC-4.2.8 | `clearAll()` action empties all strokes | Unit test: action |
| AC-4.2.9 | `setActiveTool(tool)` action updates active tool | Unit test: action |
| AC-4.2.10 | `setActiveStroke(stroke)` action sets the in-progress stroke | Unit test: action |
| AC-4.2.11 | `setStrokes(strokes)` bulk action for late-joiner sync | Unit test: action |
| AC-4.2.12 | All stroke coordinates stored as normalized [0,1] range | Unit test: coordinate validation |
| AC-4.2.13 | Store is optimized for frequent updates (batched renders via Zustand subscriptions) | Manual: no excessive re-renders |

## Tasks / Subtasks

- [ ] **Task 1: Create annotation store file** (AC: 4.2.1-4.2.3)
  - [ ] Create `packages/client/src/stores/annotationStore.ts`
  - [ ] Define `AnnotationState` interface with all required fields
  - [ ] Define `Stroke` interface (import from `@nameless/shared`)
  - [ ] Define `Tool` type: `'select' | 'pen' | 'highlighter' | 'eraser'`
  - [ ] Initialize store with `create<AnnotationState>()` from Zustand

- [ ] **Task 2: Implement stroke management actions** (AC: 4.2.4-4.2.8, 4.2.11)
  - [ ] Implement `addStroke(stroke)` - append to strokes array
  - [ ] Implement `updateStroke(strokeId, points)` - find stroke, append points
  - [ ] Implement `completeStroke(strokeId)` - set `isComplete: true`
  - [ ] Implement `deleteStroke(strokeId)` - filter out by id
  - [ ] Implement `clearAll()` - reset strokes to empty array
  - [ ] Implement `setStrokes(strokes)` - bulk replace for late-joiner sync

- [ ] **Task 3: Implement tool state actions** (AC: 4.2.9-4.2.10)
  - [ ] Implement `setActiveTool(tool)` - update activeTool state
  - [ ] Implement `setActiveStroke(stroke)` - update activeStroke state
  - [ ] Set default `activeTool` to `'pen'`

- [ ] **Task 4: Add selector helpers** (AC: 4.2.1)
  - [ ] Implement `getStrokesByParticipant(participantId)` selector
  - [ ] Implement `getCompletedStrokes()` selector

- [ ] **Task 5: Write comprehensive unit tests** (AC: all)
  - [ ] Create `packages/client/src/stores/annotationStore.test.ts`
  - [ ] Test initial state shape
  - [ ] Test `addStroke` adds to array
  - [ ] Test `updateStroke` appends points correctly
  - [ ] Test `completeStroke` sets isComplete flag
  - [ ] Test `deleteStroke` removes correct stroke
  - [ ] Test `clearAll` empties array
  - [ ] Test `setActiveTool` updates tool
  - [ ] Test `setActiveStroke` updates active stroke
  - [ ] Test `setStrokes` bulk replacement
  - [ ] Test selectors return correct data
  - [ ] Test coordinate values are in [0,1] range (validation)

- [ ] **Task 6: Update shared types if needed** (AC: 4.2.12)
  - [ ] Verify `Stroke` interface in `@nameless/shared` has `isComplete` field
  - [ ] Add `isComplete: boolean` to Stroke type if missing
  - [ ] Ensure `Tool` type is exported from shared (or define locally)

## Dev Notes

### Architecture Alignment

- **ADR-004:** Zustand over Redux - This store implements the annotation state management per architectural decision
- **Location:** `packages/client/src/stores/annotationStore.ts` per project structure in architecture.md
- **Pattern:** Follow existing store patterns from `roomStore.ts`, `screenShareStore.ts`, `settingsStore.ts`

### Existing Code to Reference

- `packages/client/src/stores/roomStore.ts` - existing Zustand store pattern
- `packages/client/src/stores/settingsStore.ts` - persistence pattern (not needed here)
- `packages/shared/src/types/stroke.ts` - existing `Point` and `Stroke` types
- `packages/shared/src/constants/colors.ts` - `PARTICIPANT_COLORS` for reference

### Testing Standards

- Framework: Vitest (configured in Epic 1)
- Location: Co-located with source file (`annotationStore.test.ts`)
- Pattern: Test each action independently, verify state mutations
- Use `createMockStroke()` and `createMockPoint()` from `@nameless/shared/test-utils`

### Performance Considerations

- Use Zustand's subscription model for selective re-renders
- Canvas component should subscribe only to `strokes` and `activeStroke`
- Tool state changes shouldn't trigger canvas re-renders
- Consider `immer` middleware only if mutation patterns become complex

### Interface Definition (from Tech Spec)

```typescript
interface AnnotationState {
  // Stroke data
  strokes: Stroke[];
  activeStroke: Stroke | null;

  // Tool state
  activeTool: Tool;

  // Actions
  addStroke: (stroke: Stroke) => void;
  updateStroke: (strokeId: string, points: Point[]) => void;
  completeStroke: (strokeId: string) => void;
  deleteStroke: (strokeId: string) => void;
  clearAll: () => void;
  setActiveTool: (tool: Tool) => void;
  setActiveStroke: (stroke: Stroke | null) => void;

  // Bulk operations
  setStrokes: (strokes: Stroke[]) => void;

  // Selectors
  getStrokesByParticipant: (participantId: string) => Stroke[];
  getCompletedStrokes: () => Stroke[];
}
```

### Stroke Interface (from @nameless/shared)

```typescript
interface Stroke {
  id: string;
  participantId: string;
  tool: 'pen' | 'highlighter';
  color: string;
  points: Point[];
  createdAt: number;
  isComplete: boolean;  // May need to add this field
}
```

### References

- [Source: docs/sprint-artifacts/tech-spec-epic-4.md#Annotation Store]
- [Source: docs/epics/epic-4-real-time-annotations.md#Story 4.2]
- [Source: docs/architecture.md#Zustand Store Pattern]

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

<!-- To be filled by dev agent -->

### Debug Log References

<!-- To be filled during development -->

### Completion Notes List

<!-- To be filled on completion -->

### File List

<!-- To be filled on completion -->

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2025-12-18 | SM Agent | Initial draft created from Epic 4 tech spec |

