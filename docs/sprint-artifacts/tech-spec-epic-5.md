# Epic Technical Specification: Permissions & Moderation

Date: 2026-01-04
Author: BMad
Epic ID: 5
Status: Draft

---

## Overview

Epic 5 implements a comprehensive role-based permissions system and moderation tools that enable hosts to manage meetings professionally. This epic addresses the need for controlled collaboration spaces where hosts can manage who can annotate, remove disruptive participants, and maintain order during screen sharing sessions.

The permissions system builds on the existing authentication infrastructure (LiveKit tokens from server) and extends it with role-based access control enforced both client-side (for UX) and server-side (via DataTrack message validation). The architecture follows a distributed permissions model where roles are stored in LiveKit participant metadata (source of truth) and synchronized to client state stores.

This epic transforms ETCH from an open collaboration tool into a professional meeting platform suitable for team environments where control and moderation are essential.

## Objectives and Scope

### In Scope

- **Role System Infrastructure:**
  - Four-tier role hierarchy (Host, Sharer, Annotator, Viewer)
  - Permission checking utility functions
  - Role storage in LiveKit participant metadata
  - Role synchronization to client stores

- **UI Role Indicators:**
  - Role badges in participant list
  - Visual permission indicators
  - Dynamic role display for sharer

- **Permission Enforcement:**
  - Annotation permission checks
  - Selective stroke deletion based on role
  - Clear all annotations (host only)
  - Room-wide annotation toggle

- **Moderation Tools:**
  - Host role assignment/transfer
  - Participant removal
  - Role change notifications

### Out of Scope (Post-Epic)

- Recording permissions
- Persistent room access control lists
- Advanced moderation (mute all, spotlight)
- Audit logging of permission changes
- Breakout rooms with separate permissions
- Guest vs authenticated user distinction

## System Architecture Alignment

This epic integrates with the existing ETCH architecture:

**Components Referenced:**

| Component | Epic 5 Role |
|-----------|-------------|
| `@etch/shared` | Define Role types, permission utilities (new) |
| `packages/server` | Validate role changes via DataTrack (extend) |
| `packages/client/stores/roomStore` | Store participant roles (extend) |
| `packages/client/stores/annotationStore` | Enforce annotation permissions (extend) |
| `packages/client/components/ParticipantList` | Display role badges (extend) |
| `packages/client/components/AnnotationToolbar` | Hide/disable based on role (extend) |
| `packages/client/lib/datatrack.ts` | Handle role_change, participant_remove messages (extend) |
| LiveKit participant metadata | Source of truth for roles (leverage) |

**Architectural Constraints:**

1. **Stateless Server:** No persistent role database - roles exist only in LiveKit metadata during session
2. **DataTrack Protocol:** All role changes and moderation actions use existing DataTrack infrastructure
3. **Token-Based:** Initial role assignment happens at token generation (server-side in `livekit.ts`)
4. **Local-First:** Permission checks happen client-side first for instant UX, validated server-side for security

**Key Architectural Decision:**

Roles are **not** enforced by LiveKit's built-in permissions (which are coarse-grained: publish/subscribe). Instead, we use LiveKit metadata as storage and implement fine-grained permission logic in application code. This gives us flexibility for ETCH-specific rules like "sharer can delete any stroke on their screen."

## Detailed Design

### Services and Modules

| Module | Responsibilities | Inputs | Outputs | Owner |
|--------|------------------|--------|---------|-------|
| `@etch/shared/types/room.ts` | Define `Role` type, `Participant` interface extension | None | TypeScript types | Shared |
| `@etch/shared/permissions.ts` | Permission checking functions | `role: Role`, `userId: string`, `stroke?: Stroke` | `boolean` | Shared |
| `server/src/services/livekit.ts` | Set initial role in token metadata | `hostName`, `participantName`, `role` param | JWT token with role | Server |
| `client/stores/roomStore.ts` | Track participant roles, handle role changes | DataTrack messages, LiveKit events | Role updates, UI notifications | Client |
| `client/stores/annotationStore.ts` | Enforce annotation permissions | User actions, current role | Allow/deny actions | Client |
| `client/lib/datatrack.ts` | Handle permission-related messages | `role_change`, `participant_remove`, `room_settings` | State updates, evictions | Client |
| `client/components/ParticipantListItem.tsx` | Display role badges, context menu | Participant data with role | Rendered UI | Client |
| `client/components/AnnotationToolbar.tsx` | Hide/disable tools based on permissions | Current user role | Conditional rendering | Client |

### Data Models and Contracts

**Type Definitions (in `@etch/shared`):**

```typescript
// Role enum - strict hierarchy
export type Role = 'host' | 'sharer' | 'annotator' | 'viewer';

// Participant interface extension
export interface Participant {
  id: string;
  name: string;
  role: Role;                    // NEW
  color: string;
  isLocal: boolean;
  isSharingScreen?: boolean;     // Exists, relevant for sharer role
}

// Room state extension
export interface RoomState {
  id: string;
  participants: Participant[];
  isScreenSharing: boolean;
  sharerId: string | null;
  annotationsEnabled: boolean;  // NEW - room-wide toggle
}
```

**Permission Utility Functions (in `@etch/shared/permissions.ts`):**

```typescript
/**
 * Check if role can create annotations
 */
export function canAnnotate(role: Role, annotationsEnabled: boolean): boolean {
  // Viewers never annotate
  if (role === 'viewer') return false;

  // Host always can (even if disabled for room)
  if (role === 'host') return true;

  // Others need room-wide flag enabled
  return annotationsEnabled;
}

/**
 * Check if role can delete a specific stroke
 */
export function canDeleteStroke(
  role: Role,
  stroke: Stroke,
  userId: string,
  isSharer: boolean
): boolean {
  // Host can delete any stroke
  if (role === 'host') return true;

  // Sharer can delete any stroke (on their screen)
  if (role === 'sharer' && isSharer) return true;

  // Others can only delete their own
  return stroke.participantId === userId;
}

/**
 * Check if role can clear all annotations
 */
export function canClearAll(role: Role): boolean {
  return role === 'host';
}

/**
 * Check if role can remove participants or change roles
 */
export function canModerateUsers(role: Role): boolean {
  return role === 'host';
}

/**
 * Check if role can toggle room-wide annotation setting
 */
export function canToggleRoomAnnotations(role: Role): boolean {
  return role === 'host';
}
```

**Entity Schemas:**

Roles are stored in **LiveKit participant metadata** as JSON:

```json
{
  "role": "annotator",
  "color": "#f97316"
}
```

Server parses this when generating tokens and clients parse it from LiveKit participant updates.

### APIs and Interfaces

**Server API Extensions (in `packages/server/src/routes/rooms.ts`):**

```typescript
// POST /api/rooms/:roomId/join
// Request body extension:
{
  "participantName": "Alice",
  "role": "annotator"  // NEW - optional, defaults to "annotator"
}

// Response (unchanged):
{
  "token": "eyJ...",  // JWT with role in metadata
  "livekitUrl": "wss://..."
}
```

**DataTrack Message Protocol Extensions:**

```typescript
// 1. Role change (host -> participant)
interface RoleChangeMessage {
  type: 'role_change';
  targetParticipantId: string;
  newRole: Role;
  changedBy: string;  // Host's participant ID
  timestamp: number;
}

// 2. Participant removal (host -> server -> participant)
interface ParticipantRemoveMessage {
  type: 'participant_remove';
  targetParticipantId: string;
  removedBy: string;  // Host's participant ID
  timestamp: number;
}

// 3. Room settings update (host -> all)
interface RoomSettingsMessage {
  type: 'room_settings';
  annotationsEnabled: boolean;
  changedBy: string;
  timestamp: number;
}

// 4. Permission denied (response to unauthorized action)
interface PermissionDeniedMessage {
  type: 'permission_denied';
  action: string;  // e.g., "clear_all", "delete_stroke"
  reason: string;
  timestamp: number;
}
```

**Error Codes:**

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `ROLE_INVALID` | 400 | Requested role is not valid |
| `PERMISSION_DENIED` | 403 | User lacks permission for action |
| `NOT_HOST` | 403 | Only host can perform this action |
| `PARTICIPANT_NOT_FOUND` | 404 | Target participant doesn't exist |

### Workflows and Sequencing

**Flow 1: Role Assignment on Join**

```
1. User clicks join link → Client sends POST /api/rooms/:id/join
2. Server receives request with optional role parameter
3. Server validates room exists
4. Server generates JWT token with:
   - identity: participantId
   - metadata: { role: "annotator", color: "#..." }
5. Client receives token, connects to LiveKit room
6. LiveKit broadcasts participant joined with metadata
7. All clients receive participant update → parse role from metadata
8. roomStore updates participant list with roles
9. UI renders participant with role badge
```

**Flow 2: Host Changes Participant Role**

```
1. Host right-clicks participant → selects "Make Viewer"
2. Client checks canModerateUsers(currentUserRole) → true
3. Client sends role_change message via DataTrack:
   {
     type: 'role_change',
     targetParticipantId: 'alice-123',
     newRole: 'viewer',
     changedBy: 'host-456',
     timestamp: 1234567890
   }
4. Server validates: sender is host → updates LiveKit metadata
5. LiveKit broadcasts metadata change to all clients
6. Target participant (Alice) receives update:
   - roomStore updates her role to 'viewer'
   - annotationStore disables drawing
   - Toast: "You are now a Viewer"
7. Other participants see Alice's badge change to "View only"
```

**Flow 3: Sharer Deletes Any Annotation**

```
1. User starts sharing → role dynamically becomes 'sharer'
2. User selects eraser tool (key 7) → hovers over stroke
3. Client checks canDeleteStroke(role='sharer', stroke, userId, isSharer=true)
   → returns true (sharer can delete any stroke)
4. User clicks → stroke removed locally (optimistic)
5. Client sends stroke_delete message via DataTrack
6. Other participants receive message → delete stroke
7. User stops sharing → role reverts to 'annotator'
8. Now eraser only works on own strokes
```

**Flow 4: Host Removes Participant**

```
1. Host clicks "Remove from meeting" on participant
2. Confirmation dialog: "Remove Bob from meeting?" → Confirm
3. Client sends participant_remove via DataTrack:
   {
     type: 'participant_remove',
     targetParticipantId: 'bob-789',
     removedBy: 'host-456',
     timestamp: 1234567890
   }
4. Server receives message → validates sender is host
5. Server invalidates Bob's token (prevent rejoin with same token)
6. Server sends disconnect command to Bob's LiveKit connection
7. Bob's client receives disconnect → shows "You have been removed"
8. Bob's client redirects to home screen
9. Other participants see toast: "Bob was removed"
```

**Flow 5: Host Toggles Room-Wide Annotations**

```
1. Host clicks "Disable Annotations" toggle in settings
2. Client checks canToggleRoomAnnotations(role) → true
3. Client sends room_settings message:
   {
     type: 'room_settings',
     annotationsEnabled: false,
     changedBy: 'host-456',
     timestamp: 1234567890
   }
4. All clients receive message → update roomStore.annotationsEnabled
5. Annotators see toolbar disabled: "Annotations disabled by host"
6. canAnnotate() checks return false for annotators (but true for host)
7. Host re-enables → all annotators can draw again
```

## Non-Functional Requirements

### Performance

**Permission Check Latency:**

| Check Type | Target | Rationale |
|------------|--------|-----------|
| `canAnnotate()` | < 1ms | Called on every mouse move during drawing |
| `canDeleteStroke()` | < 1ms | Called on eraser hover |
| Role change propagation | < 500ms | Acceptable delay for administrative action |
| Participant removal | < 1s to disconnect | User tolerance for moderation action |

**Memory Impact:**

- Role data per participant: ~20 bytes (negligible)
- Permission functions: Pure, stateless, no memory overhead
- No caching needed (roles change infrequently)

### Security

**Authorization Model:**

1. **Client-side checks:** Fast UX feedback, hide UI elements
2. **Server-side validation:** Prevent malicious clients from bypassing
3. **Token-based initial auth:** Role set at join time in JWT

**Attack Vectors & Mitigations:**

| Attack | Mitigation |
|--------|------------|
| Client spoofs role in DataTrack message | Server validates sender identity against LiveKit metadata before processing |
| Non-host tries to remove participant | Server checks sender role before evicting |
| Removed user rejoins with same token | Token invalidated on removal (future: blacklist) |
| Client modifies local role in store | No impact - server validates all actions, other clients ignore unauthorized messages |

**Security Properties:**

- Roles stored in LiveKit metadata (tamper-resistant)
- Server is source of truth for role changes
- Clients cannot elevate their own privileges
- All moderation actions logged in DataTrack (audit trail)

### Reliability

**Failure Modes:**

| Failure | Behavior | Recovery |
|---------|----------|----------|
| Role change message lost | Role stays unchanged | User retries action |
| Participant removal message lost | Participant remains | Host retries removal |
| Network disconnect during role change | Role reverts on reconnect | Participant requests role from host again |
| Server crashes mid-removal | Participant reconnects with original token | Host removes again after reconnect |

**Consistency Guarantees:**

- **Eventually consistent:** Role changes propagate via DataTrack (reliable mode)
- **Single source of truth:** LiveKit metadata authoritative
- **Idempotent operations:** Role change to same role is no-op
- **Optimistic UI:** Show changes immediately, rollback if validation fails

### Observability

**Logging Requirements:**

| Event | Level | Message |
|-------|-------|---------|
| Role change | `info` | `"Role changed: {targetId} → {newRole} by {hostId}"` |
| Participant removed | `warn` | `"Participant removed: {targetId} by {hostId}"` |
| Unauthorized action | `warn` | `"Permission denied: {userId} attempted {action}"` |
| Room annotations toggled | `info` | `"Annotations {enabled/disabled} by {hostId}"` |

**Metrics:**

- Count of role changes per meeting
- Count of participant removals
- Permission denial rate (indicates attack attempts)

**Tracing:**

- Trace role change from DataTrack send → server validation → metadata update → client sync
- Include `correlationId` in role_change messages for debugging

## Dependencies and Integrations

**Existing Dependencies (from `package.json` in client/server):**

| Dependency | Version | Usage |
|------------|---------|-------|
| `livekit-client` | Latest | Participant metadata access |
| `livekit-server-sdk` | Latest | Token generation with metadata |
| `zustand` | 5.0.8 | Role state in roomStore |
| `@radix-ui/react-dropdown-menu` | Latest | Role assignment context menu |

**New Dependencies:**

None - all functionality uses existing stack.

**Integration Points:**

1. **LiveKit Participant Metadata:**
   - Read: `participant.metadata` (JSON string)
   - Write: Server updates via LiveKit admin SDK or token re-issue

2. **DataTrack Protocol:**
   - Extend existing message types with permission messages
   - Reuse `reliable: true` mode for role changes

3. **Annotation Store:**
   - Check permissions before allowing `addStroke`, `deleteStroke`, `clearAll`

4. **Room Store:**
   - Store `annotationsEnabled` boolean
   - Track participant roles from LiveKit metadata

5. **Server Token Generation:**
   - Add role parameter to token creation functions
   - Embed role in metadata JSON

## Acceptance Criteria (Authoritative)

**AC-1: Role System Infrastructure (Story 5.1)**
- [ ] Four roles defined: Host, Sharer, Annotator, Viewer
- [ ] Permission functions implemented: `canAnnotate()`, `canDeleteStroke()`, `canClearAll()`, `canModerateUsers()`
- [ ] Role stored in LiveKit participant metadata
- [ ] roomStore syncs roles from metadata
- [ ] Unit tests cover all permission checks
- [ ] Permission hierarchy enforced: Host > Sharer > Annotator > Viewer

**AC-2: Display User Role in UI (Story 5.2)**
- [ ] Participant list shows role badges
- [ ] Host badge: crown icon + "Host"
- [ ] Sharer badge: screen icon + "Sharing" (when actively sharing)
- [ ] Viewer badge: eye icon + "View only"
- [ ] Annotator: pen icon or no badge (default)
- [ ] My own role displayed in sidebar header
- [ ] Role badges use correct colors per design system

**AC-3: Enforce Annotation Permissions (Story 5.3)**
- [ ] Viewers cannot draw on canvas
- [ ] Toolbar hidden/disabled for viewers
- [ ] Cursor remains default (not crosshair) for viewers
- [ ] Tooltip on hover: "You don't have permission to annotate"
- [ ] Role change from viewer → annotator enables toolbar
- [ ] Toast notification on role change
- [ ] Keyboard shortcuts disabled for viewers

**AC-4: Host Clear All Annotations (Story 5.4)**
- [ ] Clear All button (key `0`) visible only for host
- [ ] Confirmation toast: "Clear all annotations?" with Undo
- [ ] All annotations removed for all participants
- [ ] Undo available for 5 seconds after clear
- [ ] Restored annotations sync to all participants
- [ ] Toast: "All annotations cleared"

**AC-5: Sharer Delete Any Annotation (Story 5.5)**
- [ ] Sharer can erase any stroke with eraser tool
- [ ] Stroke highlights on hover
- [ ] Tooltip: "Click to remove" or "Your annotation"
- [ ] Deletion syncs to all participants
- [ ] No notification to original stroke author
- [ ] Ability lost when sharing stops

**AC-6: Host Role Assignment (Story 5.6)**
- [ ] Host can right-click participant → see role options
- [ ] Options: Make Annotator, Make Viewer, Make Host, Remove
- [ ] Role change updates immediately
- [ ] Toast: "{name} is now an Annotator"
- [ ] Target participant sees notification
- [ ] Host transfer requires confirmation
- [ ] Only one host at a time
- [ ] Current role shown with checkmark

**AC-7: Remove Participant (Story 5.7)**
- [ ] Host can select "Remove from meeting"
- [ ] Confirmation: "Remove {name} from meeting?"
- [ ] Participant disconnected immediately
- [ ] Removed user sees: "You have been removed"
- [ ] Token invalidated (cannot rejoin with same token)
- [ ] Other participants see toast: "{name} was removed"
- [ ] Removed user returns to home screen
- [ ] Cannot remove self

**AC-8: Room-Wide Annotation Toggle (Story 5.8)**
- [ ] Host can toggle "Disable Annotations" in settings
- [ ] All non-host participants lose annotation ability
- [ ] Toolbar shows: "Annotations disabled by host"
- [ ] Existing annotations remain visible
- [ ] Re-enabling restores annotator abilities
- [ ] Viewers remain viewers
- [ ] Toggle accessible from settings menu and toolbar
- [ ] Host can always annotate (override)

## Traceability Mapping

| AC | Spec Section | Component(s) | Test Idea |
|----|--------------|--------------|-----------|
| AC-1 | Data Models, Workflows | `@etch/shared/permissions.ts`, roomStore | Unit test all permission functions with role matrix |
| AC-2 | UI Components | ParticipantListItem, Sidebar | Visual test: all role badges render correctly |
| AC-3 | Permission Enforcement | AnnotationCanvas, AnnotationToolbar | E2E: viewer joins → cannot draw, promoted → can draw |
| AC-4 | Workflows | AnnotationStore, DataTrack handler | E2E: host clears all → all clients see clear, undo restores |
| AC-5 | Permission Checks | Eraser tool, DataTrack | E2E: sharer erases others' strokes, stop sharing → cannot |
| AC-6 | APIs, Workflows | ParticipantList context menu, DataTrack | E2E: host changes role → target sees update, role enforced |
| AC-7 | APIs, Workflows | Server eviction, DataTrack | E2E: host removes user → user disconnected, cannot rejoin |
| AC-8 | Room State | roomStore, AnnotationToolbar | E2E: toggle off → annotators blocked, toggle on → restored |

## Risks, Assumptions, Open Questions

### Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| **R-1: Race condition on role changes** | User sees stale permissions for 1-2 seconds | Use optimistic UI + rollback on validation failure |
| **R-2: Malicious client bypasses permission checks** | Unauthorized annotations or deletions | Server validates all DataTrack messages before broadcasting |
| **R-3: Host leaves without transferring role** | Meeting becomes unmanageable | Auto-promote longest-joined participant to host |
| **R-4: Network partition during role change** | Role diverges between clients | Reconcile on reconnect using LiveKit metadata as truth |
| **R-5: Sharer role conflicts with annotator** | User has both roles simultaneously | Sharer supersedes annotator (higher privilege) |

### Assumptions

| Assumption | Validation | Fallback |
|------------|------------|----------|
| **A-1: LiveKit metadata updates propagate reliably** | Test in network chaos scenarios | Poll metadata every 10s as backup |
| **A-2: Only one host per room** | Enforce in server logic | First host wins, others demoted to annotator |
| **A-3: Removed users won't attempt DoS by rejoining** | Token invalidation prevents rejoin | Future: IP-based rate limiting |
| **A-4: Permission checks are fast enough (<1ms)** | Benchmark on low-end hardware | Move checks to WebWorker if needed |
| **A-5: Roles don't need persistence beyond session** | Per PRD: no database | Acceptable - meetings are ephemeral |

### Open Questions

| Question | Decision Needed By | Proposed Answer |
|----------|-------------------|-----------------|
| **Q-1: Can there be multiple hosts?** | Story 5.6 implementation | No - single host model for MVP, transferable |
| **Q-2: What happens when host disconnects?** | Story 5.6 implementation | Auto-promote next participant (longest duration) |
| **Q-3: Should viewers see annotation toolbar?** | Story 5.3 implementation | No - hide entirely to avoid confusion |
| **Q-4: Can sharer delete annotations when not actively sharing?** | Story 5.5 implementation | No - sharer role is dynamic, only active while sharing |
| **Q-5: Should role changes be logged for audit?** | Observability planning | Yes - log to console in dev, structured logs in production |
| **Q-6: Can removed participant request to rejoin?** | Story 5.7 implementation | Yes - out of band (ask host for new link), token blacklist needed |

## Test Strategy Summary

### Unit Testing

**Target: 90% code coverage for permission logic**

Files to test:
- `@etch/shared/permissions.ts` - All permission functions
- `client/stores/roomStore.ts` - Role state management
- `client/stores/annotationStore.ts` - Permission enforcement

Example test matrix for `canDeleteStroke()`:

| Role | Stroke Owner | Is Sharer | Expected Result |
|------|--------------|-----------|-----------------|
| host | self | false | ✅ true |
| host | other | false | ✅ true |
| sharer | other | true | ✅ true |
| sharer | other | false | ❌ false |
| annotator | self | false | ✅ true |
| annotator | other | false | ❌ false |
| viewer | self | false | ❌ false |

### Integration Testing

**Focus: DataTrack message flow + LiveKit metadata sync**

Test scenarios:
1. Host sends role_change → server validates → metadata updated → clients sync
2. Non-host sends role_change → server rejects → clients ignore
3. Role change during network partition → reconnect → metadata reconciliation
4. Participant removal → token invalidated → rejoin attempt fails

### E2E Testing (Vitest + Playwright)

**Critical user flows:**

1. **Happy path - Role assignment:**
   - Host joins → promote user to annotator → user can draw
   - Host demote user to viewer → user cannot draw

2. **Moderation flow:**
   - Disruptive user joins → host removes → user disconnected
   - User cannot rejoin with same link

3. **Annotation toggle:**
   - Host disables annotations → annotators blocked
   - Host re-enables → annotators can draw again

4. **Sharer permissions:**
   - User starts sharing → gains sharer role → can delete any stroke
   - User stops sharing → loses sharer privileges

**Edge cases:**
- Host transfers role mid-annotation
- Multiple role changes in quick succession
- Room-wide toggle during active drawing

### Performance Testing

**Benchmarks:**

| Test | Target | Pass Criteria |
|------|--------|---------------|
| Permission check speed | < 1ms | 95th percentile < 1ms |
| Role change latency | < 500ms | End-to-end propagation |
| Participant removal time | < 1s | User disconnected |
| Memory usage per participant | < 100 bytes | Role data overhead |

### Accessibility Testing

**WCAG 2.1 AA compliance:**
- [ ] Role badges have sufficient color contrast
- [ ] Screen reader announces role changes
- [ ] Disabled toolbar buttons announce reason ("Annotations disabled by host")
- [ ] Context menu keyboard accessible (Tab, Arrow keys, Enter)

---

**Test Coverage Goals:**
- Unit tests: 90% coverage
- Integration tests: All DataTrack message types
- E2E tests: 8 critical user flows
- Performance: All benchmarks pass
- Accessibility: WCAG AA validated
