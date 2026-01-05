# Epic 5: Permissions & Moderation

**Goal:** Enable hosts to manage meetings professionally - control who can annotate, remove troublemakers, and maintain order in the collaboration space.

**User Value:** After this epic, hosts have full control over their meetings with role-based permissions and moderation tools.

**FRs Addressed:** FR5, FR25, FR26, FR31, FR32, FR33, FR34, FR35, FR36, FR37

---

## Story 5.1: Implement Role System Infrastructure

**As a** developer,
**I want** a robust role system that controls participant capabilities,
**So that** permissions can be enforced consistently across the application.

**Acceptance Criteria:**

**Given** participants join with different roles
**When** they attempt various actions
**Then** permissions are enforced based on their role

**And** the role hierarchy is:
| Role | Can Annotate | Can Delete Own | Can Delete Any | Can Clear All | Can Remove Users | Can Change Roles |
|------|--------------|----------------|----------------|---------------|------------------|------------------|
| Host | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Sharer | ✅ | ✅ | ✅ (own screen) | ❌ | ❌ | ❌ |
| Annotator | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Viewer | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**And** role information is stored in:
  - LiveKit participant metadata (source of truth)
  - Local roomStore (for UI)

**And** helper functions exist:
```typescript
canAnnotate(role: Role): boolean
canDeleteStroke(role: Role, stroke: Stroke, userId: string): boolean
canClearAll(role: Role): boolean
canModerateUsers(role: Role): boolean
```

**Prerequisites:** Story 1.3, 2.6

**Technical Notes:**
- Implement in `@etch/shared` for use in both client and server
- Role is set at token generation time (server-side)
- Role changes require new token or DataTrack message from host
- Add unit tests for all permission checks

---

## Story 5.2: Display User Role in UI

**As a** user,
**I want** to see my current role and other participants' roles,
**So that** I understand what actions I can take.

**Acceptance Criteria:**

**Given** I'm in a meeting
**When** I look at the participant list
**Then** each participant shows their role as a badge:
  - Host: Crown icon + "Host" badge
  - Sharer: Screen icon + "Sharing" badge (when actively sharing)
  - Annotator: Pen icon (subtle, default role)
  - Viewer: Eye icon + "View only" badge

**And** my own role is prominently displayed:
  - In the sidebar header: "You (Host)" or "You (Viewer)"
  - Clear indication if I cannot annotate: "View only mode"

**And** role badges use appropriate colors:
  - Host: Accent color (`--accent`)
  - Sharer: Info color (`--info`)
  - Viewer: Muted color (`--text-muted`)
  - Annotator: No special color (default)

**Prerequisites:** Story 2.5, 5.1

**Technical Notes:**
- Update ParticipantListItem component
- Add role badge component with icon + text
- Dynamic badge for sharer (appears when sharing starts)
- Tooltip on badge shows full role description

---

## Story 5.3: Enforce Annotation Permissions

**As a** viewer,
**I want** to be prevented from annotating,
**So that** the meeting host maintains control over who can draw.

**Acceptance Criteria:**

**Given** I have the "viewer" role
**When** I try to draw on the canvas
**Then** nothing happens (no stroke appears)

**And** the UI indicates I cannot annotate:
  - Toolbar is hidden or disabled
  - Cursor remains default (not crosshair)
  - Hovering over canvas shows tooltip: "You don't have permission to annotate"

**And** if my role changes from viewer to annotator mid-meeting:
  - Toolbar becomes enabled
  - I can now draw
  - Toast notification: "You can now annotate"

**And** keyboard shortcuts for tools are disabled for viewers

**Prerequisites:** Story 5.1, 4.3

**Technical Notes:**
- Check `canAnnotate(role)` before enabling drawing
- Disable pointer events on canvas for viewers
- Listen for role change in participant metadata
- Role changes broadcast via DataTrack from host

---

## Story 5.4: Implement Host Clear All Annotations

**As a** host,
**I want** to clear all annotations from the screen,
**So that** I can reset the canvas for a fresh discussion.

**Acceptance Criteria:**

**Given** I'm the host and there are annotations on screen
**When** I click "Clear All" (key `0`)
**Then** a confirmation toast appears: "Clear all annotations?" with Undo option

**And** after confirmation (or 3 seconds):
  - All annotations are removed from canvas
  - All participants see annotations cleared
  - Toast: "All annotations cleared"

**And** if I click "Undo" within 5 seconds:
  - Annotations are restored
  - Other participants see restoration

**And** the Clear All button is:
  - Visible and enabled for hosts
  - Hidden for non-hosts (not just disabled)

**Prerequisites:** Story 5.1, 4.7

**Technical Notes:**
- Send `clear_all` message via DataTrack
- Store cleared strokes temporarily for undo
- Undo only available for the host who cleared
- After undo window expires, strokes are permanently removed

---

## Story 5.5: Implement Sharer Delete Any Annotation

**As a** screen sharer,
**I want** to delete any annotation on my shared screen,
**So that** I can remove distracting or inappropriate drawings.

**Acceptance Criteria:**

**Given** I'm sharing my screen
**When** I use the eraser tool (key `7`)
**Then** I can erase ANY stroke, not just my own

**And** visual feedback:
  - Hovering over any stroke shows it can be deleted
  - Stroke highlights on hover (outline glow)
  - Tooltip: "Click to remove" or "Your annotation" (if mine)

**And** when I delete someone else's stroke:
  - It's removed for all participants
  - No notification to the original author (to avoid interruption)

**And** when I stop sharing:
  - I lose the ability to delete others' strokes
  - Can only delete my own again

**Prerequisites:** Story 5.1, 4.5

**Technical Notes:**
- Check `canDeleteStroke(role, stroke, userId)` in eraser handler
- Sharer role is dynamic (set when sharing starts)
- Update role in participant metadata when sharing starts/stops
- Send `stroke_delete` message with authorization

---

## Story 5.6: Implement Host Role Assignment

**As a** host,
**I want** to change other participants' roles,
**So that** I can promote helpers or restrict disruptive users.

**Acceptance Criteria:**

**Given** I'm the host
**When** I click on a participant in the sidebar
**Then** I see a context menu with role options:
  - "Make Annotator" (if currently viewer)
  - "Make Viewer" (if currently annotator)
  - "Make Host" (transfer host role)

**And** selecting a role:
  - Updates the participant's role immediately
  - Shows toast: "{name} is now an Annotator"
  - Participant sees notification of their role change

**And** when transferring host role:
  - Confirmation dialog: "Transfer host to {name}? You will become an Annotator."
  - After transfer, I become Annotator, they become Host
  - Only one host at a time

**And** the context menu shows:
  - Current role checkmark
  - "Remove from meeting" option (red/destructive)

**Prerequisites:** Story 5.1, 5.2

**Technical Notes:**
- Send `role_change` message via DataTrack
- Server validates role changes (only host can change)
- Update participant metadata in LiveKit
- New participant tokens reflect current role

---

## Story 5.7: Implement Remove Participant

**As a** host,
**I want** to remove disruptive participants from the meeting,
**So that** I can maintain a productive environment.

**Acceptance Criteria:**

**Given** I'm the host
**When** I click "Remove from meeting" on a participant
**Then** I see confirmation: "Remove {name} from meeting?"

**And** after confirmation:
  - Participant is disconnected immediately
  - They see message: "You have been removed from this meeting"
  - They cannot rejoin with same token (token invalidated)
  - Other participants see toast: "{name} was removed"

**And** the removed participant:
  - Returns to home screen
  - Can request new join link from host (out of band)

**And** I cannot remove myself (option not shown)

**Prerequisites:** Story 5.6, 2.12

**Technical Notes:**
- Send `participant_remove` message via DataTrack
- Server invalidates their token
- Force disconnect via LiveKit admin API or DataTrack command
- Removed participant's strokes remain (host can clear if needed)

---

## Story 5.8: Implement Room-Wide Annotation Toggle

**As a** host,
**I want** to disable annotations for the entire room,
**So that** I can present without interruption.

**Acceptance Criteria:**

**Given** I'm the host
**When** I toggle "Disable Annotations" in room settings
**Then** all participants (except me) lose annotation ability

**And** the UI updates for all:
  - Toolbar shows "Annotations disabled by host"
  - Canvas becomes view-only
  - Existing annotations remain visible

**And** when I re-enable annotations:
  - All annotators can draw again
  - Viewers remain viewers
  - Toast: "Annotations enabled"

**And** the toggle is accessible from:
  - Room settings menu
  - Quick action in toolbar area (for host)

**Prerequisites:** Story 5.1, 5.3

**Technical Notes:**
- Add `annotationsEnabled` boolean to room state
- Send `room_settings` message via DataTrack
- Check this flag in addition to role permissions
- Host can always annotate (even when disabled for others)

---
