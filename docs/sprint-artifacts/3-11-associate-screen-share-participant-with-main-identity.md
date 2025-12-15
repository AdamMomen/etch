# Story 3.11: Associate Screen Share Participant with Main Identity in UI

Status: ready-for-review

## Story

As a **meeting participant**,
I want **the screen share to appear as coming from the actual sharer (not a separate participant)**,
So that **the participant list shows the correct number of people and I can see who is sharing**.

## Acceptance Criteria

1. **AC-3.11.1: Screen Share Participant Hidden from List**
   - Given a participant starts screen sharing on macOS/Linux (using Core sidecar)
   - When the Core connects to LiveKit with a separate identity (e.g., `user-123-screen`)
   - Then the UI does NOT show this as a separate participant in the participant list

2. **AC-3.11.2: Screen Share Track Associated with Main Participant**
   - Given a screen share is active from a `-screen` identity
   - When the UI renders the participant list and screen share
   - Then the main participant shows a "Sharing" badge/indicator
   - And the screen share video displays with the sharer's real name
   - And the participant count remains accurate (doesn't double-count)

3. **AC-3.11.3: Metadata-Based Association**
   - Given the server generates a screen share token
   - When the token is created
   - Then metadata includes `{ parentIdentity: "<main-user-id>", isScreenShare: true }`
   - And the client can filter/associate participants using this metadata

4. **AC-3.11.4: Clean Disconnect on Share Stop**
   - Given a screen share is active
   - When the sharer stops sharing
   - Then the `-screen` participant disconnects automatically
   - And the main participant's "Sharing" badge is removed
   - And no orphaned participants remain in the list

5. **AC-3.11.5: Seamless Viewer Experience**
   - Given I am viewing a screen share
   - When I look at the participant list
   - Then I see one entry for the sharer (not two)
   - And the screen share shows the sharer's display name
   - And stop notifications use the real participant name

[Source: docs/epics.md#Story-3.11]

## Tasks / Subtasks

- [x] **Task 1: Update server to include metadata in screen share token** (AC: 3.11.3)
  - [x] Modify `generateScreenShareToken()` in `packages/server/src/services/livekit.ts`
  - [x] Add metadata: `{ parentIdentity: participantId, isScreenShare: true }`
  - [x] Ensure metadata is JSON-stringified for LiveKit token claims

- [x] **Task 2: Filter screen share participants from participant list** (AC: 3.11.1)
  - [x] Update `MeetingRoom.tsx` or participant list component
  - [x] Filter: `participants.filter(p => !JSON.parse(p.metadata || '{}').isScreenShare)`
  - [x] Ensure remote participant events still process screen share tracks

- [x] **Task 3: Associate screen share track with main participant** (AC: 3.11.2)
  - [x] In `useScreenShare.ts`, find screen share participant by `parentIdentity` metadata
  - [x] Extract screen share track from the `-screen` participant
  - [x] Display track attributed to main participant's name

- [x] **Task 4: Add "Sharing" badge to participant** (AC: 3.11.2)
  - [x] Update participant list item component to show badge when `isScreenSharing: true`
  - [x] Sync badge state with screen share start/stop events

- [x] **Task 5: Handle clean disconnect** (AC: 3.11.4)
  - [x] Verify Core disconnects from LiveKit when screen share stops
  - [x] Ensure participant removal events don't show toast for `-screen` identity
  - [x] Test no orphaned participants after share stop

- [x] **Task 6: Write tests** (AC: all)
  - [x] Test metadata is included in screen share token
  - [x] Test participant list filtering excludes screen share participants
  - [x] Test screen share track is associated with main participant
  - [x] Test "Sharing" badge appears/disappears correctly
  - [x] Test stop notification uses real participant name

## Dev Notes

### Background

On macOS/Linux, the Rust Core sidecar connects to LiveKit with a separate identity (e.g., `user-123-screen`) to publish screen share tracks. This is required because:
- LiveKit enforces unique identity per room (same identity = kicks previous connection)
- WebView and Core cannot share the same connection
- Screen share needs to be published from Core (native capture)

This results in **two participants** appearing in the UI for a single user when they share.

### Solution: Metadata-Based Association

1. **Server generates screen share token with metadata:**
```typescript
const metadata = JSON.stringify({
  parentIdentity: participantId,
  isScreenShare: true
})
// Include in token generation
```

2. **Client filters participant list:**
```typescript
const visibleParticipants = participants.filter(p => {
  const meta = JSON.parse(p.metadata || '{}')
  return !meta.isScreenShare
})
```

3. **Client associates screen track with main participant:**
```typescript
const screenShareParticipant = participants.find(p => {
  const meta = JSON.parse(p.metadata || '{}')
  return meta.parentIdentity === mainParticipantId
})
const screenTrack = screenShareParticipant?.getTrackPublication(Track.Source.ScreenShare)
```

### Files to Modify

- `packages/server/src/services/livekit.ts` - Add metadata to screen share token
- `packages/client/src/components/MeetingRoom/MeetingRoom.tsx` - Filter participants
- `packages/client/src/hooks/useScreenShare.ts` - Associate tracks with main participant
- `packages/client/src/stores/roomStore.ts` - May need participant filtering logic

### Prerequisites

- Story 3.1 (Screen Share Initiation) - **DONE**
- Story 3.10 (Rust Screen Capture Sidecar) - **DONE**

### References

- [LiveKit Participant Metadata](https://docs.livekit.io/home/server/managing-participants/)
- [LiveKit Access Token API](https://docs.livekit.io/home/get-started/authentication/)
- [GitHub Issue: Multiple Room connections for identical user](https://github.com/livekit/livekit/issues/3039)

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/3-11-associate-screen-share-participant-with-main-identity.context.xml`

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

- **Task 1:** Added `isScreenShare: true` to metadata in `generateScreenShareToken()`. Server already had `parentId`, just needed the boolean flag for client filtering.
- **Task 2:** Updated `participantMetadata.ts` to parse `isScreenShare` and `parentId`. Modified `useLiveKit.ts` handlers to skip screen share participants: `handleParticipantConnected`, `handleParticipantDisconnected`, and initial participant loop. Tracks still processed.
- **Task 3:** Modified `handleTrackSubscribed` and `handleTrackUnsubscribed` in `useScreenShare.ts` to parse metadata and use `parentId` to find the main participant. Screen share track now updates main participant's `isScreenSharing` state and toasts use the real participant name (not "(Screen)").
- **Task 4:** Badge already exists in `Sidebar.tsx` (lines 139-144). Task 3 handles updating `isScreenSharing` state for the main participant via `updateParticipant`, which triggers the badge display.
- **Task 5:** Task 2 already handles toast filtering. Added explicit `core.leaveRoom()` call in `handleStopShare()` before stopping Core to ensure clean LiveKit disconnection.
- **Task 6:** Added 7 new tests for `generateScreenShareToken` in server, 7 new tests for screen share metadata parsing in client, and 4 new tests for screen share participant association. All 48 client tests pass.

### Completion Notes List

- All acceptance criteria met via metadata-based filtering and association
- Windows (getDisplayMedia) path unaffected - works as before with direct participant
- macOS/Linux (Core sidecar) path now properly filters screen share participant from UI

### File List

**Modified:**
- `packages/server/src/services/livekit.ts` - Added `isScreenShare: true` to screen share token metadata
- `packages/server/src/services/livekit.test.ts` - Added 7 tests for generateScreenShareToken
- `packages/client/src/utils/participantMetadata.ts` - Added `isScreenShare` and `parentId` parsing
- `packages/client/src/utils/participantMetadata.test.ts` - Added 7 tests for screen share metadata
- `packages/client/src/hooks/useLiveKit.ts` - Filter screen share participants from list/toasts
- `packages/client/src/hooks/useScreenShare.ts` - Associate screen share with main participant via parentId
- `packages/client/src/hooks/useScreenShare.test.ts` - Added 4 tests for participant association

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-14 | Initial story draft | SM Agent |
