# Story 5.1: Implement Role System Infrastructure

Status: ready-for-dev

## Story

As a **developer**,
I want **a robust role system that controls participant capabilities**,
so that **permissions can be enforced consistently across the application**.

## Acceptance Criteria

| AC ID | Criterion | Verification |
|-------|-----------|--------------|
| AC-5.1.1 | Four roles defined: Host, Sharer, Annotator, Viewer | Test: Role type exists |
| AC-5.1.2 | Permission functions implemented: `canAnnotate()`, `canDeleteStroke()`, `canClearAll()`, `canModerateUsers()` | Test: All functions exist and return correct boolean |
| AC-5.1.3 | Role stored in LiveKit participant metadata | Test: Parse metadata, extract role |
| AC-5.1.4 | roomStore syncs roles from metadata | Test: LiveKit update → roomStore reflects change |
| AC-5.1.5 | Unit tests cover all permission checks | Test: Coverage ≥ 90% for permissions.ts |
| AC-5.1.6 | Permission hierarchy enforced: Host > Sharer > Annotator > Viewer | Test: Permission matrix matches spec |

## Tasks / Subtasks

- [x] **Task 1: Define Role types in @nameless/shared** (AC: 5.1.1)
  - [x] Create `packages/shared/src/types/permissions.ts` - ALREADY EXISTS in room.ts
  - [x] Define `Role` type as union: `'host' | 'sharer' | 'annotator' | 'viewer'` - DONE
  - [x] Export from `packages/shared/src/index.ts` - DONE
  - [x] Verify TypeScript compilation - DONE

- [x] **Task 2: Implement permission utility functions** (AC: 5.1.2, 5.1.6)
  - [x] Create `packages/shared/src/permissions.ts` - DONE
  - [x] Implement `canAnnotate(role: Role, annotationsEnabled: boolean): boolean` - DONE
    - Viewer: always false ✅
    - Host: always true (override room setting) ✅
    - Others: depends on `annotationsEnabled` ✅
  - [x] Implement `canDeleteStroke(role: Role, stroke: Stroke, userId: string, isSharer: boolean): boolean` - DONE
    - Host: always true ✅
    - Sharer (when actively sharing): true for any stroke ✅
    - Others: true only for own strokes ✅
  - [x] Implement `canClearAll(role: Role): boolean` - DONE
    - Host: true ✅
    - Others: false ✅
  - [x] Implement `canModerateUsers(role: Role): boolean` - DONE
    - Host: true ✅
    - Others: false ✅
  - [x] Implement `canToggleRoomAnnotations(role: Role): boolean` - DONE
    - Host: true ✅
    - Others: false ✅
  - [x] Export all functions from `packages/shared/src/index.ts` - ALREADY DONE

- [x] **Task 3: Extend Participant interface with role** (AC: 5.1.1)
  - [x] Update `packages/shared/src/types/room.ts` - ALREADY DONE
  - [x] Add `role: Role` field to `Participant` interface - DONE
  - [x] Add `annotationsEnabled: boolean` to `RoomState` interface (defaults to true) - DONE
  - [x] Verify no type errors in client/server - DONE

- [x] **Task 4: Update server to embed role in token metadata** (AC: 5.1.3)
  - [x] Modify `packages/server/src/services/livekit.ts` - ALREADY DONE
  - [x] Add `role` parameter to token generation functions (default: 'annotator') - ALREADY DONE
  - [x] Embed role in JWT metadata as JSON: `{ role: "annotator", color: "#..." }` - ALREADY DONE (line 60)
  - [x] First participant (room creator) gets 'host' role - ALREADY DONE (rooms.ts line 71)
  - [x] Subsequent participants get 'annotator' role by default - ALREADY DONE (rooms.ts line 175)
  - [x] Verify token payload contains role in metadata - VERIFIED ✅

- [x] **Task 5: Update roomStore to parse and store roles** (AC: 5.1.4)
  - [x] Modify `packages/client/src/stores/roomStore.ts` - DONE
  - [x] Parse `participant.metadata` JSON to extract role - ALREADY IMPLEMENTED via `parseParticipantMetadata()` ✅
  - [x] Store role in participant object - ALREADY IMPLEMENTED in `useLiveKit.ts` (line 76) ✅
  - [x] Add `annotationsEnabled: boolean` to store state (default: true) - DONE ✅
  - [x] Listen for participant metadata updates (role changes from host) - ALREADY IMPLEMENTED (handleDataReceived, line 183-223) ✅
  - [x] Test: Metadata update triggers store update - VERIFIED (40 tests in participantMetadata.test.ts) ✅

- [x] **Task 6: Write comprehensive unit tests** (AC: 5.1.5, 5.1.6)
  - [x] Create `packages/shared/src/permissions.test.ts` - DONE
  - [x] Test matrix for `canAnnotate()`: - DONE
    - Viewer: false (always) ✅
    - Host: true (even if annotationsEnabled=false) ✅
    - Annotator: true if annotationsEnabled, false otherwise ✅
    - Sharer: true if annotationsEnabled, false otherwise ✅
  - [x] Test matrix for `canDeleteStroke()`: - DONE
    - Host: true for any stroke ✅
    - Sharer (isSharer=true): true for any stroke ✅
    - Sharer (isSharer=false): true only for own strokes ✅
    - Annotator: true only for own strokes ✅
    - Viewer: false (always) ✅
  - [x] Test `canClearAll()`: only host returns true ✅
  - [x] Test `canModerateUsers()`: only host returns true ✅
  - [x] Test `canToggleRoomAnnotations()`: only host returns true ✅
  - [x] Achieve ≥ 90% code coverage for permissions.ts - **100% coverage achieved!** ✅
  - [x] Run tests: `pnpm test:shared` - **134 tests passing** ✅

## Dev Notes

### Architecture Alignment

From **Tech Spec Epic 5** (docs/sprint-artifacts/tech-spec-epic-5.md):

**Architectural Constraints:**
1. Stateless Server: No persistent role database - roles exist only in LiveKit metadata during session
2. DataTrack Protocol: All role changes use existing DataTrack infrastructure (Story 5.6+)
3. Token-Based: Initial role assignment at token generation (server-side)
4. Local-First: Permission checks happen client-side first for instant UX, validated server-side for security

**Key Decision from Architecture Doc:**
> Roles are NOT enforced by LiveKit's built-in permissions (which are coarse-grained: publish/subscribe). Instead, we use LiveKit metadata as storage and implement fine-grained permission logic in application code.

This gives us flexibility for NAMELESS-specific rules like "sharer can delete any stroke on their screen."

### Learnings from Previous Story

**From Story 4-11-render-annotations-on-sharers-overlay (Status: done)**

- **Event-Based Cross-Window Communication:** Tauri event bridge pattern established for overlay ↔ main window sync
  - Use `emit()` for fire-and-forget communication
  - Use `listen()` for event subscriptions
  - Pattern: `packages/client/src/hooks/useOverlayAnnotationBridge.ts`

- **Metadata Parsing Pattern:** Participant metadata is JSON string, parse with error handling
  - Example: `JSON.parse(participant.metadata || '{}')`
  - See color extraction pattern in Story 4-10

- **Store Integration:** Zustand stores update reactively on LiveKit events
  - `roomStore` already handles participant updates
  - Can extend to parse role from metadata

- **Testing Infrastructure:** 928 tests passing baseline
  - Unit tests: `packages/client/tests/hooks/*.test.ts`
  - Shared package tests: Need to add `packages/shared/tests/permissions.test.ts`
  - Vitest configured for both client and shared packages

- **Key Files from Epic 4:**
  - `packages/client/src/stores/annotationStore.ts` - Will need permission checks before allowing actions
  - `packages/client/src/stores/roomStore.ts` - Extend to store participant roles
  - `packages/client/src/hooks/useAnnotations.ts` - Will check `canAnnotate()` before drawing
  - `packages/shared/src/types/room.ts` - Extend Participant interface

[Source: docs/sprint-artifacts/4-11-render-annotations-on-sharers-overlay.md#Dev-Agent-Record]

### Project Structure Notes

**Files to Create:**
- `packages/shared/src/types/permissions.ts` - Role type definition
- `packages/shared/src/permissions.ts` - Permission utility functions
- `packages/shared/tests/permissions.test.ts` - Comprehensive unit tests

**Files to Modify:**
- `packages/shared/src/types/room.ts` - Extend Participant and RoomState interfaces
- `packages/shared/src/index.ts` - Export new types and functions
- `packages/server/src/services/livekit.ts` - Embed role in token metadata
- `packages/client/src/stores/roomStore.ts` - Parse and store participant roles

**Files to Reference:**
- `packages/shared/src/types/room.ts` - Existing type definitions
- `packages/client/src/stores/roomStore.ts` - Participant management patterns
- `packages/server/src/services/livekit.ts` - Token generation logic
- Story 4-10 metadata parsing pattern

### Technical Constraints

**Role Hierarchy (from Tech Spec):**

| Role | Can Annotate | Can Delete Own | Can Delete Any | Can Clear All | Can Remove Users | Can Change Roles |
|------|--------------|----------------|----------------|---------------|------------------|------------------|
| Host | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Sharer | ✅ | ✅ | ✅ (own screen) | ❌ | ❌ | ❌ |
| Annotator | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Viewer | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Sharer Role Special Behavior:**
- Sharer role is **dynamic** - set when user starts sharing, reverted when sharing stops
- "Can Delete Any" only applies while `isSharer === true`
- After sharing stops, sharer reverts to annotator permissions

**LiveKit Metadata Format:**
```json
{
  "role": "annotator",
  "color": "#f97316"
}
```

**Permission Check Performance Targets:**
- `canAnnotate()`: < 1ms (called on every mouse move during drawing)
- `canDeleteStroke()`: < 1ms (called on eraser hover)
- Permission functions must be pure (no side effects)

### Testing Strategy

**Unit Test Coverage (Target: 90%+):**

Test file: `packages/shared/tests/permissions.test.ts`

**Test Matrix for `canAnnotate()`:**
```typescript
describe('canAnnotate', () => {
  // Viewer tests
  test('viewer cannot annotate (annotationsEnabled=true)', () => {
    expect(canAnnotate('viewer', true)).toBe(false);
  });
  test('viewer cannot annotate (annotationsEnabled=false)', () => {
    expect(canAnnotate('viewer', false)).toBe(false);
  });

  // Host tests
  test('host can annotate (annotationsEnabled=true)', () => {
    expect(canAnnotate('host', true)).toBe(true);
  });
  test('host can annotate even when disabled (annotationsEnabled=false)', () => {
    expect(canAnnotate('host', false)).toBe(true);
  });

  // Annotator tests
  test('annotator can annotate (annotationsEnabled=true)', () => {
    expect(canAnnotate('annotator', true)).toBe(true);
  });
  test('annotator cannot annotate (annotationsEnabled=false)', () => {
    expect(canAnnotate('annotator', false)).toBe(false);
  });

  // Sharer tests (same as annotator)
  test('sharer can annotate (annotationsEnabled=true)', () => {
    expect(canAnnotate('sharer', true)).toBe(true);
  });
  test('sharer cannot annotate (annotationsEnabled=false)', () => {
    expect(canAnnotate('sharer', false)).toBe(false);
  });
});
```

**Test Matrix for `canDeleteStroke()`:**
```typescript
describe('canDeleteStroke', () => {
  const ownStroke = { id: '1', participantId: 'user-123', tool: 'pen', points: [], color: '#fff' };
  const otherStroke = { id: '2', participantId: 'user-456', tool: 'pen', points: [], color: '#fff' };

  // Host tests
  test('host can delete own stroke', () => {
    expect(canDeleteStroke('host', ownStroke, 'user-123', false)).toBe(true);
  });
  test('host can delete any stroke', () => {
    expect(canDeleteStroke('host', otherStroke, 'user-123', false)).toBe(true);
  });

  // Sharer tests (active)
  test('sharer (isSharer=true) can delete any stroke', () => {
    expect(canDeleteStroke('sharer', otherStroke, 'user-123', true)).toBe(true);
  });

  // Sharer tests (not active)
  test('sharer (isSharer=false) can only delete own stroke', () => {
    expect(canDeleteStroke('sharer', ownStroke, 'user-123', false)).toBe(true);
    expect(canDeleteStroke('sharer', otherStroke, 'user-123', false)).toBe(false);
  });

  // Annotator tests
  test('annotator can delete own stroke', () => {
    expect(canDeleteStroke('annotator', ownStroke, 'user-123', false)).toBe(true);
  });
  test('annotator cannot delete other stroke', () => {
    expect(canDeleteStroke('annotator', otherStroke, 'user-123', false)).toBe(false);
  });

  // Viewer tests
  test('viewer cannot delete any stroke', () => {
    expect(canDeleteStroke('viewer', ownStroke, 'user-123', false)).toBe(false);
    expect(canDeleteStroke('viewer', otherStroke, 'user-123', false)).toBe(false);
  });
});
```

**Simple Permission Tests:**
```typescript
describe('canClearAll', () => {
  test('only host can clear all', () => {
    expect(canClearAll('host')).toBe(true);
    expect(canClearAll('sharer')).toBe(false);
    expect(canClearAll('annotator')).toBe(false);
    expect(canClearAll('viewer')).toBe(false);
  });
});

describe('canModerateUsers', () => {
  test('only host can moderate users', () => {
    expect(canModerateUsers('host')).toBe(true);
    expect(canModerateUsers('sharer')).toBe(false);
    expect(canModerateUsers('annotator')).toBe(false);
    expect(canModerateUsers('viewer')).toBe(false);
  });
});

describe('canToggleRoomAnnotations', () => {
  test('only host can toggle room annotations', () => {
    expect(canToggleRoomAnnotations('host')).toBe(true);
    expect(canToggleRoomAnnotations('sharer')).toBe(false);
    expect(canToggleRoomAnnotations('annotator')).toBe(false);
    expect(canToggleRoomAnnotations('viewer')).toBe(false);
  });
});
```

**Integration Test Ideas (for later stories):**
- E2E: Host joins → check role='host'
- E2E: Second participant joins → check role='annotator'
- E2E: Viewer tries to draw → canvas blocks action
- E2E: Host changes participant role → metadata updates, UI reflects change

### Dependencies

**Existing Dependencies (from package.json):**
- `livekit-client`: Participant metadata access
- `livekit-server-sdk`: Token generation with metadata
- `zustand`: roomStore state management
- `vitest`: Unit test framework

**Prerequisite Stories (All DONE):**
- Story 1.3: Create Shared Types Package - DONE (provides @nameless/shared)
- Story 2.6: Integrate LiveKit Room Connection - DONE (provides participant metadata parsing)

**Subsequent Stories (Depend on This):**
- Story 5.2: Display User Role in UI (needs role data from store)
- Story 5.3: Enforce Annotation Permissions (needs `canAnnotate()` function)
- Story 5.4+: All moderation features (need permission functions)

### Performance Considerations

From Tech Spec:

| Check Type | Target | Rationale |
|------------|--------|-----------|
| `canAnnotate()` | < 1ms | Called on every mouse move during drawing |
| `canDeleteStroke()` | < 1ms | Called on eraser hover |

**Implementation Notes:**
- All permission functions must be pure (no async, no I/O)
- No caching needed (roles change infrequently, checks are O(1))
- Memory impact: ~20 bytes per participant (negligible)

### Security Notes

From Tech Spec Section "Security":

**Authorization Model:**
1. Client-side checks: Fast UX feedback, hide UI elements
2. Server-side validation: Prevent malicious clients from bypassing (Stories 5.6+)
3. Token-based initial auth: Role set at join time in JWT

**This Story's Scope:**
- Implement client-side permission checks (instant UX)
- Embed role in token metadata (initial role assignment)
- Server-side validation of role changes deferred to Story 5.6 (DataTrack protocol)

**Attack Vector Mitigation:**
- Client cannot modify own role (read-only from metadata)
- Role changes must come from host via DataTrack (Story 5.6)
- Server will validate all role change requests (Story 5.6)

### References

- [Source: docs/sprint-artifacts/tech-spec-epic-5.md#Detailed Design - Data Models and Contracts]
- [Source: docs/sprint-artifacts/tech-spec-epic-5.md#Non-Functional Requirements - Performance]
- [Source: docs/sprint-artifacts/tech-spec-epic-5.md#Non-Functional Requirements - Security]
- [Source: docs/epics/epic-5-permissions-moderation.md#Story 5.1]
- [Source: docs/architecture.md] - Existing LiveKit integration patterns
- [Source: packages/shared/src/types/room.ts] - Participant interface baseline

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/5-1-implement-role-system-infrastructure.context.xml

### Agent Model Used

_Agent model name and version will be recorded when implementation begins_

### Debug Log References

### Completion Notes List

### File List

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-01-04 | SM Agent (Sonnet 4.5) | Initial draft created from Epic 5 tech spec with learnings from Story 4.11 |
