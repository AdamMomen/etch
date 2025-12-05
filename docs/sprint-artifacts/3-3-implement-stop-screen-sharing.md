# Story 3.3: Implement Stop Screen Sharing

Status: ready-for-dev

## Story

As a **sharer**,
I want **to stop sharing my screen at any time**,
So that **I can regain privacy when done presenting**.

## Acceptance Criteria

1. **AC-3.3.1: Stop Sharing Button Stops Capture**
   - Given I'm currently sharing my screen
   - When I click "Stop Sharing" on the floating control bar (or meeting controls if no floating bar yet)
   - Then screen capture stops immediately
   - And LiveKit track is unpublished

2. **AC-3.3.2: Floating Control Bar Dismissed**
   - Given the floating control bar is visible during sharing
   - When I stop sharing
   - Then the floating control bar window is destroyed
   - *(Note: Floating bar created in Story 3.7 - this AC may be placeholder)*

3. **AC-3.3.3: Share Border Indicator Dismissed**
   - Given the share border is visible during sharing
   - When I stop sharing
   - Then the share border window is destroyed
   - *(Note: Share border created in Story 3.8 - this AC may be placeholder)*

4. **AC-3.3.4: Annotation Overlay Dismissed**
   - Given the annotation overlay is active during sharing
   - When I stop sharing
   - Then the annotation overlay window is destroyed
   - *(Note: Overlay created in Story 3.6 - this AC may be placeholder)*

5. **AC-3.3.5: Main Window Restores**
   - Given the main Nameless window was minimized when sharing started
   - When I stop sharing
   - Then the main window is restored (unminimized)
   - And the window returns to its previous position and size

6. **AC-3.3.6: Button Returns to Default State**
   - Given I was sharing my screen
   - When I stop sharing
   - Then the "Share Screen" button returns to outline style (not sharing state)
   - And button text shows "Share Screen" (not "Stop Sharing")

7. **AC-3.3.7: Sharing Badge Removed**
   - Given I had a "Sharing" badge in the participant list
   - When I stop sharing
   - Then the "Sharing" badge is removed from my participant entry

8. **AC-3.3.8: Viewers Notified**
   - Given other participants were viewing my shared screen
   - When I stop sharing
   - Then they see a toast: "{name} stopped sharing"
   - And the shared screen disappears
   - And layout returns from floating bubbles to video grid

9. **AC-3.3.9: Keyboard Shortcut Toggle**
   - Given I'm sharing my screen
   - When I press ⌘S (macOS) or Ctrl+S (Windows/Linux)
   - Then sharing stops (toggle behavior - same shortcut starts/stops)

10. **AC-3.3.10: System Stop Detected**
    - Given the browser/OS stops the capture (user clicked "Stop sharing" in system UI)
    - When the track ended event fires
    - Then the app detects this and updates state accordingly
    - And all cleanup happens as if Stop button was clicked

[Source: docs/epics.md#Story-3.3, docs/sprint-artifacts/tech-spec-epic-3.md#AC-3.3]

## Tasks / Subtasks

- [ ] **Task 1: Add Stop Sharing button to MeetingControlsBar** (AC: 3.3.1, 3.3.6)
  - [ ] Update `MeetingControlsBar.tsx` to conditionally show "Stop Sharing" when `isLocalSharing`
  - [ ] Wire button to `stopScreenShare()` from `useScreenShare` hook
  - [ ] Add appropriate styling for active sharing state (filled vs outline)

- [ ] **Task 2: Enhance stopScreenShare in useScreenShare hook** (AC: 3.3.1, 3.3.5, 3.3.10)
  - [ ] Verify `stopScreenShare()` unpublishes track via `room.localParticipant.unpublishTrack()`
  - [ ] Verify media stream tracks are stopped (`streamRef.current.getTracks().forEach(track => track.stop())`)
  - [ ] Verify store state is reset via `stopSharingStore()`
  - [ ] Verify `restoreMainWindow()` is called after stop
  - [ ] Verify `canShare` state is reset to `true`

- [ ] **Task 3: Handle track ended event (system stop)** (AC: 3.3.10)
  - [ ] Verify existing `videoTrack.onended` handler in `useScreenShare.ts` calls `handleStopShare()`
  - [ ] Test that clicking browser's "Stop sharing" button triggers cleanup
  - [ ] Ensure all state is properly reset on system-initiated stop

- [ ] **Task 4: Update keyboard shortcut to toggle** (AC: 3.3.9)
  - [ ] Update `MeetingRoom.tsx` keyboard handler for ⌘S/Ctrl+S
  - [ ] If `isLocalSharing` → call `stopScreenShare()`
  - [ ] If not sharing → call `startScreenShare()` (existing behavior)

- [ ] **Task 5: Add toast notification for viewers** (AC: 3.3.8)
  - [ ] In `useScreenShare.ts` TrackUnsubscribed handler, show toast "{name} stopped sharing"
  - [ ] Toast should only appear for remote participants (not the sharer themselves)
  - [ ] Verify layout returns to grid after share stops

- [ ] **Task 6: Remove sharing badge from sidebar** (AC: 3.3.7)
  - [ ] Verify `updateParticipant(localParticipant.id, { isScreenSharing: false })` is called on stop
  - [ ] Verify sidebar badge logic in `Sidebar.tsx` hides when `isScreenSharing: false`

- [ ] **Task 7: Placeholder for native window cleanup** (AC: 3.3.2, 3.3.3, 3.3.4)
  - [ ] Add placeholder code/comments for future native window cleanup
  - [ ] Note: Actual implementation in Stories 3.6, 3.7, 3.8
  - [ ] Structure code to easily add window destruction calls later

- [ ] **Task 8: Write tests** (AC: all)
  - [ ] Test Stop button appears when sharing
  - [ ] Test stopScreenShare unpublishes track
  - [ ] Test window restore is called on stop
  - [ ] Test keyboard toggle behavior (⌘S while sharing)
  - [ ] Test system-initiated stop via track ended event
  - [ ] Test toast appears for viewers when sharer stops

## Dev Notes

### Learnings from Previous Story

**From Story 3-2-display-shared-screen-for-viewers (Status: done)**

- **ScreenShareViewer component available**: Created at `components/ScreenShare/ScreenShareViewer.tsx` with track.attach/detach pattern
- **remoteScreenTrack state exists**: Already in `useScreenShare.ts:86` - returns `RemoteVideoTrack | null`
- **TrackUnsubscribed handler exists**: At `useScreenShare.ts:240-249` - already clears remote sharer state
- **MeetingRoom conditional rendering**: At `MeetingRoom.tsx:310-337` - detects viewer vs sharer mode
- **stopScreenShare already partially implemented**: At `useScreenShare.ts:181-215` - unpublishes track, stops stream, calls restoreMainWindow
- **Tests passing**: 463 tests, 19 from Story 3.2
- **Pattern established**: track.attach/detach, cn() utility, barrel file exports

**Files to REUSE (do not recreate):**
- `hooks/useScreenShare.ts` - already has `stopScreenShare()` implementation
- `stores/screenShareStore.ts` - has `stopSharing()` action
- `components/ScreenShare/ScreenShareButton.tsx` - toggle state already exists

[Source: docs/sprint-artifacts/3-2-display-shared-screen-for-viewers.md#Dev-Agent-Record]

### Implementation Approach

**Most functionality already exists!** Story 3.3 is primarily:
1. Verification that existing stop functionality works correctly
2. Adding toast notification for viewers
3. Updating keyboard shortcut to toggle
4. Adding Stop button to control bar UI

**Existing stopScreenShare implementation (`useScreenShare.ts:181-215`):**
```typescript
const handleStopShare = useCallback(async () => {
  if (!room) return

  // Unpublish the screen share track
  const screenPub = room.localParticipant.getTrackPublication(Track.Source.ScreenShare)
  if (screenPub?.track) {
    await room.localParticipant.unpublishTrack(screenPub.track)
  }

  // Stop the media stream
  if (streamRef.current) {
    streamRef.current.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  // Update store state
  stopSharingStore()
  setScreenTrack(null)
  setCanShare(true)

  // Restore main window
  await restoreMainWindow()
}, [...])
```

**Key additions needed:**
1. Toast in TrackUnsubscribed handler for remote stop notification
2. Toggle logic in MeetingRoom keyboard handler
3. Conditional Stop button in MeetingControlsBar

### Project Structure Notes

**Files to modify:**
- `packages/client/src/components/MeetingRoom/MeetingControlsBar.tsx` - Add Stop button
- `packages/client/src/components/MeetingRoom/MeetingRoom.tsx` - Update keyboard shortcut
- `packages/client/src/hooks/useScreenShare.ts` - Add toast to TrackUnsubscribed

**Files to verify (already exist):**
- `packages/client/src/hooks/useScreenShare.ts` - stopScreenShare() implementation
- `packages/client/src/stores/screenShareStore.ts` - stopSharing() action
- `packages/client/src/components/MeetingRoom/Sidebar.tsx` - Sharing badge logic

### Prerequisites

- Story 3.1 (Screen Share Initiation) - **DONE**
- Story 3.2 (Display Shared Screen) - **DONE**

### Technical Constraints

Per tech spec:
- Use `room.localParticipant.unpublishTrack()` for track cleanup
- Listen to track ended event for system-initiated stops
- Native window cleanup deferred to Stories 3.6, 3.7, 3.8
- Toast notification via `sonner` (already imported)

### References

- [Epics: Story 3.3](docs/epics.md#Story-3.3)
- [Tech Spec: Epic 3](docs/sprint-artifacts/tech-spec-epic-3.md)
- [Previous Story: 3-2](docs/sprint-artifacts/3-2-display-shared-screen-for-viewers.md)
- [LiveKit unpublishTrack](https://docs.livekit.io/client-sdk-js/classes/LocalParticipant.html#unpublishTrack)

---

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/3-3-implement-stop-screen-sharing.context.xml

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-05 | Initial story draft from create-story workflow | SM Agent |
