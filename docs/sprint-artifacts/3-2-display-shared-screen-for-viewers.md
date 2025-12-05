# Story 3.2: Display Shared Screen for Viewers

Status: done

## Story

As a **meeting participant**,
I want **to see the shared screen clearly in the meeting**,
So that **I can follow along with what the sharer is presenting**.

## Acceptance Criteria

1. **AC-3.2.1: Shared Screen Fills Content Area with Aspect Ratio**
   - Given another participant is sharing their screen
   - When the screen share track is received
   - Then the shared screen displays in the main content area
   - And screen content fills available space while maintaining aspect ratio
   - And letterbox/pillarbox with dark background (`--background`) if aspect doesn't match
   - And object-fit: contain is used for CSS rendering

2. **AC-3.2.2: Minimum 16px Padding on All Sides**
   - Given the shared screen is displayed
   - When the content area has any size
   - Then there is at least 16px padding between screen content and container edges
   - And padding is applied consistently on all four sides

3. **AC-3.2.3: Participant Videos Switch to Floating Bubbles**
   - Given screen sharing has started
   - When viewing the meeting room
   - Then participant videos switch to Around-style floating bubbles
   - And bubbles are small circular avatars (32-40px)
   - And bubbles are stacked in a corner (bottom-right default)
   - And bubbles don't obscure shared screen content

4. **AC-3.2.4: Sharer Name Displayed**
   - Given someone is sharing their screen
   - When viewing the shared screen
   - Then "{name} is sharing" is displayed
   - And the indicator is positioned where it doesn't block content (e.g., top-left corner)

5. **AC-3.2.5: Quality Adapts to Network Conditions**
   - Given a screen share is active
   - When network conditions change
   - Then video quality adapts automatically
   - And quality prefers resolution over framerate for screen content

[Source: docs/epics.md#Story-3.2, docs/sprint-artifacts/tech-spec-epic-3.md#AC-3.2]

## Tasks / Subtasks

- [x] **Task 1: Create ScreenShareViewer component** (AC: 3.2.1, 3.2.2, 3.2.4)
  - [x] Create `packages/client/src/components/ScreenShare/ScreenShareViewer.tsx`
  - [x] Subscribe to remote screen share track from LiveKit room
  - [x] Use native video element with track.attach/detach (follows existing pattern)
  - [x] Apply object-fit: contain for aspect ratio preservation
  - [x] Apply min 16px padding on all sides
  - [x] Display "{name} is sharing" indicator
  - [x] Export from barrel file

- [x] **Task 2: Enhance useScreenShare hook for viewer subscription** (AC: 3.2.1, 3.2.5)
  - [x] Update `packages/client/src/hooks/useScreenShare.ts`
  - [x] Add `remoteScreenTrack` state to track subscribed screen share
  - [x] Listen for `RoomEvent.TrackSubscribed` for screen share source
  - [x] Listen for `RoomEvent.TrackUnsubscribed` for cleanup
  - [x] Return `remoteScreenTrack` and `sharerName` for viewer display

- [x] **Task 3: Update MeetingRoom layout for screen share mode** (AC: 3.2.1, 3.2.3, 3.2.4)
  - [x] Update `packages/client/src/components/MeetingRoom/MeetingRoom.tsx`
  - [x] Conditionally render ScreenShareViewer when `isSharing && !isLocalSharing`
  - [x] Switch participant layout from grid to floating bubbles
  - [x] Use existing ParticipantBubbles component for bubble layout
  - [x] Ensure smooth transition between layouts

- [x] **Task 4: Style shared screen container** (AC: 3.2.1, 3.2.2)
  - [x] Add dark background for letterbox/pillarbox effect (bg-background)
  - [x] Ensure responsive sizing with aspect ratio preservation (object-contain)
  - [x] Add transition animations for layout changes (transition-opacity)
  - [x] CSS classes support various aspect ratios

- [x] **Task 5: Add sharer indicator overlay** (AC: 3.2.4)
  - [x] Create indicator component showing "{name} is sharing"
  - [x] Position in top-left corner to not obscure content
  - [x] Style with semi-transparent background (bg-black/60)
  - [x] Include sharing icon (MonitorUp from lucide-react)

- [x] **Task 6: Write tests** (AC: all)
  - [x] Test ScreenShareViewer renders when remote track present
  - [x] Test padding/aspect ratio CSS classes
  - [x] Test sharer name display
  - [x] Test layout switch to bubbles during share
  - [x] Test cleanup when share stops

## Dev Notes

### Learnings from Previous Story

**From Story 3-1-implement-screen-share-initiation-hybrid-capture (Status: done)**

- **screenShareStore available**: Use existing store for `isSharing`, `sharerName`, `isLocalSharing` state at `stores/screenShareStore.ts`
- **useScreenShare hook exists**: Already listens for `RoomEvent.TrackSubscribed` and `RoomEvent.TrackUnsubscribed` - extend for viewer track management
- **ParticipantBubbles component exists**: Already created at `components/MeetingRoom/ParticipantBubbles.tsx` - reuse for viewer layout
- **Sidebar badge exists**: "Sharing" badge already shows in participant list (`Sidebar.tsx:139-144`)
- **MeetingRoom conditional rendering**: Placeholder for screen share layout exists at `MeetingRoom.tsx:303-337`
- **Tauri commands registered**: `screen_share.rs` ready for additional commands if needed
- **Tests passing**: 444 tests, 31 from Story 3.1

**Files to REUSE (do not recreate):**
- `stores/screenShareStore.ts` - existing screen share state
- `hooks/useScreenShare.ts` - extend for viewer subscription
- `components/MeetingRoom/ParticipantBubbles.tsx` - floating bubble layout
- `components/MeetingRoom/ParticipantBubble.tsx` - individual bubble component

[Source: docs/sprint-artifacts/3-1-implement-screen-share-initiation-hybrid-capture.md#Dev-Agent-Record]

### Implementation Approach

**ScreenShareViewer Component:**

```typescript
// ScreenShareViewer.tsx
import { Track, RemoteVideoTrack, RemoteTrackPublication } from 'livekit-client'
import { VideoTrack } from '@livekit/components-react'
import { MonitorUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScreenShareViewerProps {
  track: RemoteVideoTrack | null
  sharerName: string | null
  className?: string
}

export function ScreenShareViewer({ track, sharerName, className }: ScreenShareViewerProps) {
  if (!track) return null

  return (
    <div className={cn(
      'relative flex flex-1 items-center justify-center bg-background p-4',
      className
    )}>
      {/* Sharer indicator */}
      <div className="absolute left-4 top-4 flex items-center gap-2 rounded-md bg-black/50 px-3 py-1.5 text-sm text-white">
        <MonitorUp className="h-4 w-4" />
        <span>{sharerName || 'Someone'} is sharing</span>
      </div>

      {/* Screen share video */}
      <div className="h-full w-full max-h-full max-w-full">
        <VideoTrack
          trackRef={{ publication: track.publication }}
          className="h-full w-full object-contain"
        />
      </div>
    </div>
  )
}
```

[Source: docs/sprint-artifacts/tech-spec-epic-3.md#Component-Specifications]

**Hook Extension for Viewer:**

```typescript
// In useScreenShare.ts - add to existing hook
const [remoteScreenTrack, setRemoteScreenTrack] = useState<RemoteVideoTrack | null>(null)

// In TrackSubscribed handler (already exists)
if (track.source === Track.Source.ScreenShare) {
  setRemoteScreenTrack(track as RemoteVideoTrack)
  setRemoteSharer(participant.identity, participant.name || participant.identity)
}

// Return additional state
return {
  ...existingReturns,
  remoteScreenTrack, // NEW
}
```

[Source: docs/sprint-artifacts/tech-spec-epic-3.md#APIs-and-Interfaces]

### Project Structure Notes

**New files to create:**
- `packages/client/src/components/ScreenShare/ScreenShareViewer.tsx` - Viewer display component
- `packages/client/src/components/ScreenShare/ScreenShareViewer.test.tsx` - Viewer tests

**Modifications to existing files:**
- `packages/client/src/hooks/useScreenShare.ts` - Add remoteScreenTrack state
- `packages/client/src/hooks/useScreenShare.test.ts` - Add viewer tests
- `packages/client/src/components/ScreenShare/index.ts` - Export ScreenShareViewer
- `packages/client/src/components/MeetingRoom/MeetingRoom.tsx` - Integrate viewer component

**Files to REUSE (already exist):**
- `packages/client/src/components/MeetingRoom/ParticipantBubbles.tsx` - Already handles bubble layout
- `packages/client/src/stores/screenShareStore.ts` - Screen share state management

### Prerequisites

- Story 3.1 (Screen Share Initiation) - **DONE**
- Story 2.9 (Remote Participant Streams) - **DONE**

### Technical Constraints

Per tech spec:
- Use `livekit-client` `Track.Source.ScreenShare` for track identification
- Use `@livekit/components-react` `VideoTrack` for rendering
- Quality adaptation is handled by LiveKit automatically (simulcast layers)
- object-fit: contain for aspect ratio preservation

### References

- [Epics: Story 3.2](docs/epics.md#Story-3.2)
- [Tech Spec: Epic 3](docs/sprint-artifacts/tech-spec-epic-3.md)
- [Previous Story: 3-1](docs/sprint-artifacts/3-1-implement-screen-share-initiation-hybrid-capture.md)
- [LiveKit VideoTrack](https://docs.livekit.io/components-react/VideoTrack)
- [LiveKit Track Sources](https://docs.livekit.io/client-sdk-js/enums/Track.Source.html)

---

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/3-2-display-shared-screen-for-viewers.context.xml

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

**2025-12-05 - Implementation Plan:**
- Task 1: Create ScreenShareViewer.tsx with track attachment, object-contain, 16px padding, sharer indicator
- Task 2: Extend useScreenShare hook to return remoteScreenTrack
- Task 3: Update MeetingRoom to integrate ScreenShareViewer and detect remote vs local share
- Task 4-5: Styling is integrated into Task 1
- Task 6: Write comprehensive tests for all components

**Pattern Notes:**
- Follow ParticipantBubble.tsx pattern for track attachment (track.attach/detach)
- Use cn() utility for className merging
- Export from ScreenShare/index.ts barrel file

### Completion Notes List

- ✅ **Task 1 Complete**: Created ScreenShareViewer component with track.attach/detach pattern (following ParticipantBubble.tsx), object-fit: contain, p-4 padding, bg-background, and sharer indicator with MonitorUp icon
- ✅ **Task 2 Complete**: Extended useScreenShare hook with remoteScreenTrack state, updated TrackSubscribed/TrackUnsubscribed handlers to set/clear the track
- ✅ **Task 3 Complete**: Updated MeetingRoom with conditional rendering for remote share view (isSharing && !isLocalSharing), local share placeholder, and floating bubbles layout
- ✅ **Task 4-5 Complete**: Styling and sharer indicator integrated into ScreenShareViewer component
- ✅ **Task 6 Complete**: Added 17 tests for ScreenShareViewer, 2 tests for remoteScreenTrack handling, updated ScreenShareButton tests with new mock property
- ✅ All 463 tests passing (19 new tests added for this story)

### File List

**New Files:**
- `packages/client/src/components/ScreenShare/ScreenShareViewer.tsx`
- `packages/client/src/components/ScreenShare/ScreenShareViewer.test.tsx`

**Modified Files:**
- `packages/client/src/hooks/useScreenShare.ts` - Added remoteScreenTrack state and return value
- `packages/client/src/hooks/useScreenShare.test.ts` - Added tests for remote screen share events
- `packages/client/src/components/ScreenShare/index.ts` - Export ScreenShareViewer
- `packages/client/src/components/ScreenShare/ScreenShareButton.test.tsx` - Updated mock with remoteScreenTrack
- `packages/client/src/components/MeetingRoom/MeetingRoom.tsx` - Integrated ScreenShareViewer for viewer mode

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-05 | Initial story draft from create-story workflow | SM Agent |
| 2025-12-05 | Story implementation complete - all 6 tasks done, 463 tests passing | Dev Agent |
| 2025-12-05 | Senior Developer Review - APPROVED | BMad |

---

## Senior Developer Review (AI)

### Reviewer: BMad
### Date: 2025-12-05
### Outcome: ✅ APPROVE

All acceptance criteria implemented with evidence. All tasks verified complete. Tests passing (463 total). No blocking issues.

---

### Summary

Story implementation is **complete and high quality**. All 5 acceptance criteria are implemented with evidence. All 6 tasks marked complete are verified as actually completed. The code follows existing patterns (track.attach/detach), has comprehensive tests (17 new component tests + 2 hook tests), and the implementation matches the tech spec requirements.

---

### Acceptance Criteria Coverage

| AC# | Description | Status | Evidence |
|-----|-------------|--------|----------|
| AC-3.2.1 | Shared screen fills content area with aspect ratio | ✅ IMPLEMENTED | `ScreenShareViewer.tsx:78` - `object-contain` class; `MeetingRoom.tsx:314-318` - renders ScreenShareViewer |
| AC-3.2.2 | Minimum 16px padding on all sides | ✅ IMPLEMENTED | `ScreenShareViewer.tsx:57` - `p-4` class (16px); `bg-background` for letterbox |
| AC-3.2.3 | Participant videos switch to floating bubbles | ✅ IMPLEMENTED | `MeetingRoom.tsx:321-324` - ParticipantBubbles rendered at `absolute bottom-20 right-4` |
| AC-3.2.4 | Sharer name displayed | ✅ IMPLEMENTED | `ScreenShareViewer.tsx:62-69` - indicator with `{sharerName} is sharing`, MonitorUp icon, `left-4 top-4` |
| AC-3.2.5 | Quality adapts to network conditions | ✅ IMPLEMENTED | LiveKit simulcast handles automatically; `useScreenShare.ts:232-236` subscribes to remote track |

**Summary: 5 of 5 acceptance criteria fully implemented**

---

### Task Completion Validation

| Task | Marked As | Verified As | Evidence |
|------|-----------|-------------|----------|
| Task 1: Create ScreenShareViewer component | ✅ Complete | ✅ VERIFIED | `ScreenShareViewer.tsx` exists (92 lines), exported from `index.ts:2` |
| Task 2: Enhance useScreenShare hook | ✅ Complete | ✅ VERIFIED | `useScreenShare.ts:27,86,232-248,297` - remoteScreenTrack state and handlers |
| Task 3: Update MeetingRoom layout | ✅ Complete | ✅ VERIFIED | `MeetingRoom.tsx:310-337` - conditional rendering with ScreenShareViewer |
| Task 4: Style shared screen container | ✅ Complete | ✅ VERIFIED | `ScreenShareViewer.tsx:57` - `bg-background p-4` classes |
| Task 5: Add sharer indicator overlay | ✅ Complete | ✅ VERIFIED | `ScreenShareViewer.tsx:62-69` - indicator with MonitorUp icon |
| Task 6: Write tests | ✅ Complete | ✅ VERIFIED | `ScreenShareViewer.test.tsx` (17 tests), `useScreenShare.test.ts` (+2 tests) |

**Summary: 6 of 6 completed tasks verified, 0 questionable, 0 falsely marked complete**

---

### Test Coverage and Gaps

**Tests Added for Story 3.2:**
- `ScreenShareViewer.test.tsx`: 17 tests (rendering, styling, indicator, track attachment)
- `useScreenShare.test.ts`: 2 new tests (TrackSubscribed, TrackUnsubscribed events)

**No test gaps identified.**

---

### Architectural Alignment

✅ Follows existing track.attach/detach pattern from `ParticipantBubble.tsx`
✅ Uses cn() utility for className merging
✅ Exports from barrel file
✅ Uses zustand store for state management
✅ Tech spec compliant (object-fit: contain, bg-background, LiveKit simulcast)

---

### Security Notes

No security concerns. Component is read-only, displays remote video tracks only.

---

### Action Items

**Code Changes Required:**
- None

**Advisory Notes:**
- Note: Consider E2E test for screen share viewer flow when E2E testing infrastructure is added
