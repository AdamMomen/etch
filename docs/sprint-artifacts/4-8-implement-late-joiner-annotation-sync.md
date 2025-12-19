# Story 4.8: Implement Late-Joiner Annotation Sync

Status: done

## Story

As a **late-joining participant**,
I want **to see all existing annotations when I join**,
so that **I have full context of what's been discussed**.

## Acceptance Criteria

| AC ID | Criterion | Verification |
|-------|-----------|--------------|
| AC-4.8.1 | Late joiner sees all existing annotations | Manual: join mid-session |
| AC-4.8.2 | Sync completes in < 1 second for 100 strokes | Performance: measure |
| AC-4.8.3 | `state_request` message sent on join | Test: message sent |
| AC-4.8.4 | Host (or any participant with state) responds with `state_snapshot` | Test: response |
| AC-4.8.5 | Loading indicator shown while waiting for snapshot | Test: UI state |
| AC-4.8.6 | Retry after 3 seconds if no response | Test: timeout handling |
| AC-4.8.7 | Snapshot includes only completed strokes (not in-progress) | Test: filtering |

## Tasks / Subtasks

- [x] **Task 1: Add late-joiner message types to shared package** (AC: 4.8.3, 4.8.4)
  - [x] Add `StateRequestMessage` interface to `packages/shared/src/types/annotation.ts`
  - [x] Add `StateSnapshotMessage` interface with strokes array and timestamp
  - [x] Add message type constants: `STATE_REQUEST`, `STATE_SNAPSHOT`
  - [x] Add type guards: `isStateRequestMessage()`, `isStateSnapshotMessage()`
  - [x] Export from union type `AnnotationMessage`
  - [x] Add unit tests for new message types

- [x] **Task 2: Implement state request on join** (AC: 4.8.1, 4.8.3)
  - [x] Modify `useAnnotationSync` hook to send `state_request` on connection
  - [x] Add `requesterId` from local participant identity
  - [x] Trigger request when room connected and screen share is active
  - [x] Only request if screen share is active (annotations canvas relevant)
  - [x] Add `syncState` to track pending request ('idle' | 'requesting' | 'synced')

- [x] **Task 3: Implement state snapshot response** (AC: 4.8.4, 4.8.7)
  - [x] Listen for `state_request` messages in existing DataReceived handler
  - [x] All participants respond (with random delay to avoid simultaneous responses)
  - [x] Track responded requesters to avoid duplicate responses
  - [x] Gather completed strokes from annotationStore (filter `isComplete: true`)
  - [x] Send `state_snapshot` via DataTrack with reliable mode
  - [x] Include timestamp for conflict resolution

- [x] **Task 4: Handle incoming state snapshot** (AC: 4.8.1, 4.8.2)
  - [x] Listen for `state_snapshot` messages in DataReceived handler
  - [x] Validate message is directed to requesting participant (compare requesterId)
  - [x] Call `annotationStore.setStrokes()` to bulk-load received strokes
  - [x] Update `syncState` to 'synced' on receipt
  - [x] Log latency measurement in dev mode (time from request to receipt)

- [x] **Task 5: Add loading indicator UI** (AC: 4.8.5)
  - [x] Create loading state in `useAnnotationSync`: `syncState: 'idle' | 'requesting' | 'synced'`
  - [x] Update AnnotationCanvas to show loading indicator when `syncState === 'requesting'`
  - [x] Use spinner with "Syncing annotations..." text overlay
  - [x] Hide loading indicator when snapshot received or no annotations exist

- [x] **Task 6: Implement retry mechanism** (AC: 4.8.6)
  - [x] Set timeout of 3 seconds after sending `state_request`
  - [x] If no `state_snapshot` received, retry request (max 3 attempts)
  - [x] Exponential backoff: 3s, 6s, 12s between retries
  - [x] After max retries, set `syncState: 'synced'` (assume empty state)
  - [x] Clear timeout on successful snapshot receipt

- [x] **Task 7: Handle edge cases** (AC: 4.8.1, 4.8.7)
  - [x] Handle case where no participants have state (first join, no annotations)
  - [x] All participants can respond (no host-only restriction)
  - [x] Ignore duplicate snapshots (use hasReceivedSnapshotRef flag)
  - [x] Strokes arriving during sync are handled normally after sync completes

- [x] **Task 8: Write comprehensive tests** (AC: all)
  - [x] Unit tests for new message types in `annotation.test.ts`
  - [x] Unit tests for late-joiner sync in `useAnnotationSync.test.ts`
  - [x] Integration tests for request/response flow (mock DataTrack)
  - [x] Test timeout and retry logic
  - [x] Test edge cases: no state, duplicate response

## Dev Notes

### Architecture Alignment

- **ADR-002:** LiveKit DataTracks for Annotations - state_request/state_snapshot use reliable mode
- **Architecture spec:** Message protocol defined in architecture.md "Message Protocol" section
- **Tech Spec:** Story 4.8 acceptance criteria from `docs/sprint-artifacts/tech-spec-epic-4.md`

### Message Protocol (from Architecture)

```typescript
// Late-joiner requests state
interface StateRequestMessage {
  type: 'state_request';
  requesterId: string;
}

// Response with snapshot
interface StateSnapshotMessage {
  type: 'state_snapshot';
  strokes: Stroke[];
  timestamp: number;
}
```

### Late-Joiner Sync Flow (from Tech Spec)

```
New participant joins room
         │
         ▼
┌─────────────────────────┐
│ Connect to LiveKit      │
│ Subscribe to DataTrack  │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Send state_request      │
│ message via DataTrack   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Show loading indicator  │
│ on annotation canvas    │
└───────────┬─────────────┘
            │
            ▼
     Existing participant receives request
            │
            ▼
┌─────────────────────────┐
│ Host (or first to see)  │
│ sends state_snapshot    │
│ with all strokes        │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ New participant receives│
│ Populate annotationStore│
│ Render all strokes      │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Start receiving live    │
│ updates normally        │
└─────────────────────────┘
```

### Learnings from Previous Story

**From Story 4-7-implement-datatrack-annotation-sync (Status: done)**

- **Message Types:** Comprehensive DataTrack message types with type guards and validation helpers in `packages/shared/src/types/annotation.ts`
- **Sync Hook:** `useAnnotationSync` hook subscribes to DataReceived events and publishes annotation messages - EXTEND for state request/snapshot
- **Point Batching:** 16ms batching pattern established - not needed for state sync
- **Remote Rendering:** `remoteActiveStrokes` Map in annotationStore - state snapshot uses `strokes` array instead
- **Optimistic UI:** Local strokes render immediately before network publish - apply same pattern
- **Tests:** 89 tests covering message types and store - follow same test patterns
- **Topic Filtering:** `ANNOTATION_TOPIC = 'annotations'` - reuse for state messages

**Key Files from Previous Story:**
- `packages/shared/src/types/annotation.ts` - Add new message types here
- `packages/client/src/hooks/useAnnotationSync.ts` - Extend with request/response logic
- `packages/client/src/stores/annotationStore.ts` - Add `setStrokes()` bulk action

[Source: docs/sprint-artifacts/4-7-implement-datatrack-annotation-sync.md#Dev-Agent-Record]

### Project Structure Notes

**Files to Modify:**
- `packages/shared/src/types/annotation.ts` - Add StateRequestMessage, StateSnapshotMessage
- `packages/shared/src/types/annotation.test.ts` - Add tests for new message types
- `packages/client/src/hooks/useAnnotationSync.ts` - Add request/response logic
- `packages/client/src/stores/annotationStore.ts` - Add setStrokes action
- `packages/client/tests/stores/annotationStore.test.ts` - Add setStrokes tests
- `packages/client/src/components/AnnotationCanvas/AnnotationCanvas.tsx` - Add loading indicator

**Files to Reference:**
- `packages/client/src/stores/roomStore.ts` - For isHost role check
- `packages/client/src/hooks/useAnnotations.ts` - For integration patterns

### Implementation Approach

1. **Define message types first** - StateRequestMessage, StateSnapshotMessage in shared
2. **Add setStrokes action** - Bulk load strokes into store
3. **Build request path** - Send state_request on connection
4. **Build response path** - Host responds with state_snapshot
5. **Add loading UI** - Show indicator during sync
6. **Implement retry** - 3s timeout with exponential backoff
7. **Handle edge cases** - No state, duplicate responses, host disconnect
8. **Test thoroughly** - Unit tests + integration tests

### Performance Considerations

- **Batch loading:** `setStrokes` should replace entire array, not iterate
- **Reliable mode:** Use reliable DataTrack for snapshot (ordered, guaranteed delivery)
- **Message size:** For 100 strokes @ ~1KB each = ~100KB, under 64KB limit may need batching
- **If snapshot too large:** Consider pagination (split into chunks) as future enhancement

### Responder Selection Logic

1. **Primary responder:** Host participant (has most authoritative state)
2. **Fallback:** If host disconnects, any participant with strokes can respond
3. **Duplicate prevention:** Add `respondedTo` Set to track which requesters have been answered
4. **Timing:** Use small random delay (0-100ms) before responding to prevent simultaneous responses

### Dependencies

- **Story 4.7:** DataTrack annotation sync - DONE (provides base messaging infrastructure)
- **Story 2.6:** LiveKit room connection - DONE (provides room events)
- **Story 4.2:** Annotation store - DONE (provides stroke storage)

### References

- [Source: docs/sprint-artifacts/tech-spec-epic-4.md#Story 4.8: Implement Late-Joiner Annotation Sync]
- [Source: docs/epics/epic-4-real-time-annotations.md#Story 4.8]
- [Source: docs/architecture.md#Message Protocol]
- [Source: docs/architecture.md#Late-Joiner Flow]
- [Source: docs/prd.md#FR35] - "Late-joining participants see all existing annotations immediately"

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/4-8-implement-late-joiner-annotation-sync.context.xml`

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

1. **Message Types Added**: Added `StateRequestMessage` and `StateSnapshotMessage` interfaces to shared package with type guards, validation helpers, and comprehensive tests (56 tests in annotation.test.ts)

2. **Late-Joiner Sync Implementation**: Extended `useAnnotationSync` hook with:
   - State request on join when screen share is active
   - State snapshot response with completed strokes filtering
   - Retry mechanism with exponential backoff (3s, 6s, 12s)
   - Duplicate response prevention via `respondedToRequestersRef`
   - Random delay (0-100ms) to prevent simultaneous responses

3. **Loading UI**: Added sync state indicator to AnnotationCanvas with spinner and "Syncing annotations..." text

4. **Edge Cases Handled**:
   - First joiner (no remote participants) - immediately synced
   - Duplicate snapshots ignored via `hasReceivedSnapshotRef`
   - Max retries (3) with graceful fallback to empty state

5. **Test Coverage**: 16 new tests in `useAnnotationSync.test.ts` covering all acceptance criteria:
   - Initial state tests
   - State request on screen share activation
   - State snapshot response with completed strokes filtering
   - Bulk-load strokes on snapshot receipt
   - Retry mechanism scheduling and backoff calculation
   - Timeout clearing on snapshot receipt

### File List

**Modified:**
- `packages/shared/src/types/annotation.ts` - Added StateRequestMessage, StateSnapshotMessage
- `packages/shared/src/types/annotation.test.ts` - Added 20+ tests for new message types
- `packages/shared/src/types/index.ts` - Added exports for new types
- `packages/shared/src/index.ts` - Added annotation exports
- `packages/client/src/hooks/useAnnotationSync.ts` - Late-joiner sync implementation
- `packages/client/src/components/AnnotationCanvas/AnnotationCanvas.tsx` - Loading indicator
- `packages/client/src/components/ScreenShare/ScreenShareViewer.tsx` - Pass isScreenShareActive and syncState
- `packages/client/tests/components/ScreenShare/ScreenShareViewer.test.tsx` - Added room prop

**Created:**
- `packages/client/tests/hooks/useAnnotationSync.test.ts` - 16 tests for late-joiner sync

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2025-12-19 | SM Agent | Initial draft created from Epic 4 tech spec with learnings from Story 4.7 |
