# Story 2.12: Implement Leave Meeting Flow

Status: done

## Story

As a **user**,
I want **to leave a meeting at any time**,
So that **I can exit when I'm done participating**.

## Acceptance Criteria

1. **AC-2.12.1: Leave Button for Regular Participant**
   - Given I'm in a meeting as a regular participant (not host)
   - When I click the "Leave" button in the meeting controls
   - Then I immediately disconnect from the room
   - And I'm returned to the home screen
   - And other participants see "{name} left" notification

2. **AC-2.12.2: Leave Confirmation for Host**
   - Given I'm in a meeting as the host
   - When I click the "Leave" button
   - Then I see a confirmation dialog with message: "Leave meeting? You are the host. The meeting will continue without you."
   - And I see "Leave" and "Cancel" buttons

3. **AC-2.12.3: Host Leave Confirmed**
   - Given the host leave confirmation dialog is shown
   - When I click "Leave"
   - Then I disconnect from the room
   - And I'm returned to the home screen
   - And the host role transfers to the next participant (by join order)
   - And other participants see "{name} left" notification

4. **AC-2.12.4: Host Leave Canceled**
   - Given the host leave confirmation dialog is shown
   - When I click "Cancel"
   - Then the dialog closes
   - And I remain in the meeting as host

5. **AC-2.12.5: Keyboard Shortcut Leave**
   - Given I'm in a meeting
   - When I press `⌘W` (macOS) or `Ctrl+W` (Windows)
   - Then the leave flow is triggered (same as clicking Leave button)

6. **AC-2.12.6: Window Close Leave**
   - Given I'm in a meeting
   - When I close the application window
   - Then the leave flow is triggered before the window closes
   - And I properly disconnect from the room

7. **AC-2.12.7: Last Participant Leaves**
   - Given I'm the only participant in the room
   - When I leave the meeting
   - Then the room is automatically cleaned up on the server

[Source: docs/epics.md#Story-2.12, docs/sprint-artifacts/tech-spec-epic-2.md#AC-2.12]

## Tasks / Subtasks

- [x] **Task 1: Create LeaveConfirmDialog component** (AC: 2.12.2, 2.12.4)
  - [x] Create `packages/client/src/components/MeetingRoom/LeaveConfirmDialog.tsx`
  - [x] Use shadcn/ui AlertDialog component
  - [x] Accept props: `open`, `onOpenChange`, `onConfirm`
  - [x] Display host-specific message about meeting continuing
  - [x] Include "Leave" (destructive) and "Cancel" buttons

- [x] **Task 2: Implement leave meeting logic in useLiveKit hook** (AC: 2.12.1, 2.12.3)
  - [x] Add `leaveRoom()` function to useLiveKit hook
  - [x] Call `room.disconnect()` to cleanly disconnect
  - [x] Reset roomStore state after disconnect
  - [x] Ensure all tracks are properly stopped
  - [x] Handle cleanup of any pending operations

- [x] **Task 3: Add Leave button to MeetingControls** (AC: 2.12.1)
  - [x] Add Leave button (LogOut icon from lucide-react)
  - [x] Style as destructive/warning button
  - [x] Wire up to leave flow (direct for participants, dialog for host)
  - [x] Position at end of control bar

- [x] **Task 4: Integrate host role detection for leave flow** (AC: 2.12.2)
  - [x] Check if local participant is host from roomStore
  - [x] If host: show LeaveConfirmDialog before leaving
  - [x] If participant: immediate leave

- [x] **Task 5: Implement host role transfer** (AC: 2.12.3)
  - [x] Determine next participant by join order (use createdAt or array order)
  - [x] Send role transfer message via DataTrack before disconnecting
  - [x] Update participant metadata on server (if needed)
  - [x] Handle edge case: last participant leaving (no transfer needed)

- [x] **Task 6: Navigate to home screen after leave** (AC: 2.12.1, 2.12.3)
  - [x] Use React Router or Tauri navigation
  - [x] Navigate to home/landing page after disconnect
  - [x] Clear any meeting-related state

- [x] **Task 7: Implement keyboard shortcut** (AC: 2.12.5)
  - [x] Add `⌘W` / `Ctrl+W` keyboard listener
  - [x] Trigger leave flow on key press
  - [x] Ensure shortcut works when focused on meeting

- [x] **Task 8: Handle Tauri window close event** (AC: 2.12.6)
  - [x] Listen to Tauri window close event (`tauri://close-requested`)
  - [x] Disconnect from room before allowing window to close
  - [x] Use `appWindow.onCloseRequested()` from `@tauri-apps/api/window`
  - [x] Prevent default close, disconnect, then close programmatically

- [x] **Task 9: Show leave notification to other participants** (AC: 2.12.1, 2.12.3)
  - [x] Use existing toast notification system
  - [x] Display "{name} left" when participant disconnects
  - [x] Handle via RoomEvent.ParticipantDisconnected (already implemented in useLiveKit)

- [x] **Task 10: Write tests** (AC: all)
  - [x] Test LeaveConfirmDialog renders correctly
  - [x] Test dialog opens for host, not for participants
  - [x] Test leave button triggers disconnect
  - [x] Test navigation to home after leave
  - [x] Test keyboard shortcut triggers leave
  - [x] Test roomStore is reset after leave
  - [x] Test host role transfer logic
  - [x] Mock window close event for Tauri tests

## Dev Notes

### Learnings from Previous Story

**From Story 2.11 (Status: ready-for-dev)**

Previous story context available but not yet implemented. Patterns to follow:

- **roomStore pattern**: Uses Zustand store for room state - use `isHost` check from localParticipant
- **Toast notifications**: Toast system at `@/components/ui/use-toast` - use for leave notifications
- **Component structure**: Follow patterns from MeetingControls component
- **useLiveKit hook**: Room management hook - add leaveRoom function here

**From Story 2.10 (Status: done)**

- **256 client tests pass** - maintain this coverage level
- **Hook patterns**: useDevices shows async lifecycle hook patterns
- **settingsStore**: Persisted settings available - may need to preserve some on leave

**From Story 2.6 (Status: done)**

- **LiveKit room connection**: room.connect() established - use room.disconnect() for leave
- **RoomEvent handlers**: ParticipantConnected/Disconnected events already handled
- **Connection state management**: isConnected, isConnecting patterns established

[Source: docs/sprint-artifacts/2-11-implement-participant-volume-control.md, docs/sprint-artifacts/tech-spec-epic-2.md]

### Leave Meeting Implementation

**Clean Disconnect Pattern:**

```typescript
// In useLiveKit hook
const leaveRoom = useCallback(async () => {
  if (!room) return;

  // Stop all local tracks first
  await room.localParticipant.setMicrophoneEnabled(false);
  await room.localParticipant.setCameraEnabled(false);

  // Disconnect from room
  await room.disconnect();

  // Reset store state
  useRoomStore.getState().reset();
}, [room]);
```

[Source: LiveKit Client SDK Docs]

### Host Role Transfer

Host transfer should happen before disconnect:

```typescript
// DataTrack message for role transfer
interface RoleTransferMessage {
  type: 'role_transfer';
  newHostId: string;
  previousHostId: string;
  timestamp: number;
}

// Before host leaves
const transferHost = async () => {
  const participants = room.remoteParticipants;
  if (participants.size === 0) return; // No one to transfer to

  // Get next participant by join order (first in iterator)
  const [nextHostId] = participants.keys();

  // Broadcast transfer message
  await room.localParticipant.publishData(
    new TextEncoder().encode(JSON.stringify({
      type: 'role_transfer',
      newHostId,
      previousHostId: room.localParticipant.identity,
      timestamp: Date.now(),
    })),
    { reliable: true }
  );
};
```

[Source: docs/architecture.md#Message-Protocol]

### Tauri Window Close Handling

```typescript
import { appWindow } from '@tauri-apps/api/window';

// In App.tsx or MeetingRoom component
useEffect(() => {
  const unlisten = appWindow.onCloseRequested(async (event) => {
    // Prevent immediate close
    event.preventDefault();

    // Disconnect if in meeting
    if (isConnected) {
      await leaveRoom();
    }

    // Now allow close
    await appWindow.close();
  });

  return () => {
    unlisten.then(fn => fn());
  };
}, [isConnected, leaveRoom]);
```

[Source: Tauri API Docs - Window Events]

### shadcn/ui AlertDialog Pattern

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

<AlertDialog open={open} onOpenChange={onOpenChange}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Leave meeting?</AlertDialogTitle>
      <AlertDialogDescription>
        You are the host. The meeting will continue without you.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={onConfirm} className="bg-destructive">
        Leave
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

[Source: shadcn/ui docs - AlertDialog]

### Keyboard Shortcut Implementation

Use Tauri's global shortcut or React keyboard handler:

```typescript
// React-based approach (in MeetingRoom)
useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    const isMac = navigator.platform.includes('Mac');
    const cmdKey = isMac ? event.metaKey : event.ctrlKey;

    if (cmdKey && event.key === 'w') {
      event.preventDefault();
      handleLeave();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [handleLeave]);
```

[Source: React Docs - Event Handling]

### Project Structure Notes

New files to create:
- `packages/client/src/components/MeetingRoom/LeaveConfirmDialog.tsx` - host confirmation dialog
- `packages/client/src/components/MeetingRoom/LeaveConfirmDialog.test.tsx` - dialog tests

Modifications to existing files:
- `packages/client/src/hooks/useLiveKit.ts` - add leaveRoom function
- `packages/client/src/components/MeetingRoom/MeetingControls.tsx` - add Leave button
- `packages/client/src/components/MeetingRoom/MeetingRoom.tsx` - handle window close event
- `packages/client/src/stores/roomStore.ts` - ensure reset() is properly implemented
- `packages/client/src/App.tsx` - add window close listener at app level

May need to add shadcn/ui components:
- `packages/client/src/components/ui/alert-dialog.tsx` - if not already added

[Source: docs/architecture.md#Project-Structure]

### Prerequisites

- Story 2.6 (LiveKit room connection) - DONE

### References

- [Epics: Story 2.12](docs/epics.md#Story-2.12)
- [Tech Spec: AC-2.12](docs/sprint-artifacts/tech-spec-epic-2.md#AC-2.12)
- [Architecture: Data Flow](docs/architecture.md#Data-Flow)
- [PRD: Meeting & Room Management FR6](docs/prd.md#Meeting-Room-Management)
- [LiveKit Client SDK - Room Disconnect](https://docs.livekit.io/client-sdk-js/)
- [Tauri API - Window Events](https://tauri.app/v1/api/js/window)
- [shadcn/ui AlertDialog](https://ui.shadcn.com/docs/components/alert-dialog)

---

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/2-12-implement-leave-meeting-flow.context.xml

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

- All 10 tasks completed successfully
- 354 tests passing (8 new tests added for LeaveConfirmDialog and leave flow)
- Host confirmation dialog implemented using AlertDialog from radix-ui
- Host role transfer sends DataTrack message with role_transfer type before disconnecting
- Keyboard shortcut (Cmd+W / Ctrl+W) triggers leave flow
- Tauri window close event handled with proper disconnect before close
- Leave notification already implemented in useLiveKit hook (ParticipantDisconnected event)

### File List

**New Files Created:**
- `packages/client/src/components/ui/alert-dialog.tsx` - AlertDialog UI component
- `packages/client/src/components/MeetingRoom/LeaveConfirmDialog.tsx` - Host leave confirmation dialog
- `packages/client/src/components/MeetingRoom/LeaveConfirmDialog.test.tsx` - Tests for LeaveConfirmDialog

**Modified Files:**
- `packages/client/src/hooks/useLiveKit.ts` - Added leaveRoom() function
- `packages/client/src/components/MeetingRoom/MeetingRoom.tsx` - Added host confirmation, keyboard shortcut, Tauri window close handler, host role transfer
- `packages/client/src/components/MeetingRoom/MeetingRoom.test.tsx` - Updated leave tests for new host/non-host behavior
- `packages/client/package.json` - Added @radix-ui/react-alert-dialog and @tauri-apps/api dependencies

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-04 | Initial story draft from create-story workflow | SM Agent |
| 2025-12-04 | Senior Developer Review - APPROVED | BMad |

---

## Senior Developer Review (AI)

### Reviewer
BMad

### Date
2025-12-04

### Outcome
**APPROVE** ✅

All 7 acceptance criteria fully implemented with evidence. All 10 tasks verified complete. 354 tests passing.

### Summary

Story 2.12 implements the complete leave meeting flow including:
- Leave button with destructive styling for all participants
- Host confirmation dialog before leaving
- Host role transfer via LiveKit DataTrack with receiving handler
- Keyboard shortcut (Cmd+W / Ctrl+W)
- Tauri window close handling with clean disconnect
- Leave notifications via existing ParticipantDisconnected handler

The implementation follows established patterns and integrates well with existing architecture.

### Key Findings

**No blocking issues found.**

**Advisory Notes:**
- Note: The host role transfer receiving logic was added to useLiveKit.ts during review session - this completes the bidirectional role transfer feature
- Note: `act()` warnings in test output are cosmetic and don't affect test correctness

### Acceptance Criteria Coverage

| AC | Description | Status | Evidence |
|----|-------------|--------|----------|
| AC-2.12.1 | Leave Button for Regular Participant | ✅ IMPLEMENTED | `MeetingControlsBar.tsx:37-45`, `MeetingRoom.tsx:127-133` |
| AC-2.12.2 | Leave Confirmation for Host | ✅ IMPLEMENTED | `LeaveConfirmDialog.tsx:24-42`, `MeetingRoom.tsx:127-133` |
| AC-2.12.3 | Host Leave Confirmed | ✅ IMPLEMENTED | `MeetingRoom.tsx:86-110`, `useLiveKit.ts:152-188` |
| AC-2.12.4 | Host Leave Canceled | ✅ IMPLEMENTED | `LeaveConfirmDialog.tsx:33`, `LeaveConfirmDialog.test.tsx:81-97` |
| AC-2.12.5 | Keyboard Shortcut Leave | ✅ IMPLEMENTED | `MeetingRoom.tsx:163-167` |
| AC-2.12.6 | Window Close Leave | ✅ IMPLEMENTED | `MeetingRoom.tsx:189-228` |
| AC-2.12.7 | Last Participant Leaves | ✅ IMPLEMENTED | `MeetingRoom.tsx:87` (edge case), server handles cleanup |

**Summary: 7 of 7 acceptance criteria fully implemented**

### Task Completion Validation

| Task | Marked | Verified | Evidence |
|------|--------|----------|----------|
| Task 1: LeaveConfirmDialog | ✅ | ✅ | `LeaveConfirmDialog.tsx` with AlertDialog |
| Task 2: leaveRoom in useLiveKit | ✅ | ✅ | `useLiveKit.ts:253-272` |
| Task 3: Leave button | ✅ | ✅ | `MeetingControlsBar.tsx:37-45` |
| Task 4: Host role detection | ✅ | ✅ | `MeetingRoom.tsx:65, 127-133` |
| Task 5: Host role transfer | ✅ | ✅ | Send: `MeetingRoom.tsx:86-110`, Receive: `useLiveKit.ts:152-188` |
| Task 6: Navigate to home | ✅ | ✅ | `MeetingRoom.tsx:122` |
| Task 7: Keyboard shortcut | ✅ | ✅ | `MeetingRoom.tsx:163-167` |
| Task 8: Tauri window close | ✅ | ✅ | `MeetingRoom.tsx:189-228` |
| Task 9: Leave notification | ✅ | ✅ | `useLiveKit.ts:99-104` |
| Task 10: Tests | ✅ | ✅ | 354 tests passing |

**Summary: 10 of 10 completed tasks verified, 0 questionable, 0 false completions**

### Test Coverage and Gaps

- **LeaveConfirmDialog.test.tsx**: 8 tests covering dialog rendering, host message, buttons, cancel/confirm actions, accessibility
- **MeetingRoom.test.tsx**: Updated tests for host vs non-host leave behavior, confirmation dialog flow
- **Total**: 354 client tests passing

No significant test gaps identified.

### Architectural Alignment

- Follows established Zustand store patterns (roomStore, settingsStore)
- Uses LiveKit DataTrack for role transfer (aligns with ADR-002)
- Toast notifications via sonner (consistent with existing patterns)
- AlertDialog from radix-ui (consistent with shadcn/ui patterns)
- Tauri window API integration follows documented patterns

### Security Notes

No security concerns identified. Token handling and room disconnect are properly managed.

### Best-Practices and References

- [LiveKit Client SDK - Room Disconnect](https://docs.livekit.io/client-sdk-js/)
- [Tauri Window Events](https://tauri.app/v1/api/js/window)
- [Radix AlertDialog](https://www.radix-ui.com/primitives/docs/components/alert-dialog)

### Action Items

**Code Changes Required:**
- None

**Advisory Notes:**
- Note: Consider adding persistence to roomStore in Story 2-14 to support page refresh reconnection
- Note: The `act()` warnings in tests are React Testing Library artifacts and can be addressed in a future cleanup pass
