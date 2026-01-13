# Story 2.8: Implement Video Publishing and Controls

Status: done

## Story

As a **user**,
I want **to publish my camera video and control on/off**,
So that **other participants can see me during the meeting**.

## Acceptance Criteria

1. **AC-2.8.1: Camera Permission Request**
   - Given I'm connected to a LiveKit room
   - When I click the camera button (currently off)
   - Then the system prompts for camera permission (if not granted)

2. **AC-2.8.2: Video Publishing on Enable**
   - Given camera permission is granted
   - When I click to enable the camera
   - Then camera video is published to the room
   - And button icon changes from off (slash) to on
   - And my video appears in the participant area

3. **AC-2.8.3: Video Disabling**
   - Given I am currently showing video
   - When I click the camera button
   - Then video track is stopped
   - And button icon shows off state (slash)
   - And video element shows avatar/placeholder

4. **AC-2.8.4: Toggle Responsiveness**
   - Given I toggle the camera state
   - When the button is clicked
   - Then visual feedback is instant (< 100ms)

5. **AC-2.8.5: Keyboard Shortcut**
   - Given I am in a meeting
   - When I press the `V` key
   - Then camera state toggles (same as clicking button)

6. **AC-2.8.6: Permission Denied Handling**
   - Given the system prompts for camera permission
   - When permission is denied by user or system
   - Then a toast shows: "Camera access denied. Check system settings."
   - And button remains in off state

7. **AC-2.8.7: Local Video Preview**
   - Given my camera is enabled
   - When I look at my participant entry in the sidebar or video area
   - Then I see my own video feed (mirrored for natural self-view)

8. **AC-2.8.8: Video Resolution**
   - Given my camera is enabled
   - When video is published
   - Then the video resolution is 720p by default
   - And the video quality adapts to network conditions

[Source: docs/epics.md#Story-2.8]

## Tasks / Subtasks

- [x] **Task 1: Create useVideo hook** (AC: 2.8.1, 2.8.2, 2.8.3, 2.8.4)
  - [x] Create `packages/client/src/hooks/useVideo.ts`
  - [x] Accept room instance from useLiveKit hook (same pattern as useAudio)
  - [x] Implement `enableCamera()` function using `room.localParticipant.setCameraEnabled(true)`
  - [x] Implement `disableCamera()` function using `room.localParticipant.setCameraEnabled(false)`
  - [x] Return `isVideoOff`, `isPublishingVideo`, `toggleVideo()` state and actions
  - [x] Handle permission request automatically when enabling
  - [x] Use optimistic UI updates for instant visual feedback

- [x] **Task 2: Add video state to settingsStore** (AC: 2.8.2, 2.8.3)
  - [x] Add `isVideoOff: boolean` to settingsStore (default: true per UX spec - video off by default)
  - [x] Add `setVideoOff(videoOff: boolean)` action
  - [x] Persist video preference to localStorage

- [x] **Task 3: Create CameraButton component** (AC: 2.8.1, 2.8.2, 2.8.3, 2.8.4)
  - [x] Create `packages/client/src/components/MeetingRoom/CameraButton.tsx`
  - [x] Use `useVideo` hook for state management
  - [x] Show video icon when on, video-off icon when off
  - [x] Apply immediate visual feedback on click (optimistic UI)
  - [x] Style consistently with MicrophoneButton component

- [x] **Task 4: Implement keyboard shortcut** (AC: 2.8.5)
  - [x] Add keyboard event listener for `V` key
  - [x] Toggle video state when pressed (only when not in text input)
  - [x] Follow same pattern as MicrophoneButton 'M' key handler

- [x] **Task 5: Handle permission denied error** (AC: 2.8.6)
  - [x] Catch `NotAllowedError` from setCameraEnabled
  - [x] Show toast notification using sonner: "Camera access denied. Check system settings."
  - [x] Keep button in off state
  - [x] Log error for debugging

- [x] **Task 6: Create LocalVideoPreview component** (AC: 2.8.7, 2.8.8)
  - [x] Create `packages/client/src/components/MeetingRoom/LocalVideoPreview.tsx`
  - [x] Use LiveKit's `<VideoTrack>` component or native video element
  - [x] Mirror the video horizontally for natural self-view (CSS transform: scaleX(-1))
  - [x] Show avatar placeholder when video is off
  - [x] Configure 720p default resolution with adaptive quality

- [x] **Task 7: Add video state to Participant type** (AC: 2.8.7)
  - [x] Add `hasVideo?: boolean` to Participant type in shared package
  - [x] Update roomStore to track video publication state
  - [x] Update Sidebar to show video indicator on participant list item

- [x] **Task 8: Update MeetingControlsBar to use CameraButton** (AC: all)
  - [x] Replace placeholder camera control in MeetingControlsBar
  - [x] Pass room instance to CameraButton
  - [x] Ensure proper layout and spacing next to MicrophoneButton

- [x] **Task 9: Add LocalVideoPreview to MeetingRoom layout** (AC: 2.8.7)
  - [x] Add LocalVideoPreview component to center content area or participant display
  - [x] Position appropriately relative to remote participant videos (to be added in 2.9)
  - [x] Handle layout when video is off (show avatar)

- [x] **Task 10: Write tests** (AC: all)
  - [x] Test useVideo hook enable/disable functionality
  - [x] Test CameraButton component states
  - [x] Test keyboard shortcut handler
  - [x] Test permission denied error handling
  - [x] Test LocalVideoPreview rendering

## Dev Notes

### Learnings from Previous Story

**From Story 2.7 (Status: done)**

- **useAudio hook pattern**: Reuse the same architecture for useVideo - optimistic UI updates, permission handling, store integration
- **MicrophoneButton pattern**: CameraButton should mirror this implementation with:
  - Keyboard event listener with input field exclusion
  - Proper aria-label and aria-pressed attributes
  - Destructive style when off
- **settingsStore integration**: Follow same pattern - add `isVideoOff` state with persist middleware
- **Toast notifications**: Use `sonner` toast (already installed and configured)
- **Test patterns**: Follow same mock patterns established in useAudio.test.ts and MicrophoneButton.test.tsx
- **Files created**:
  - `packages/client/src/hooks/useAudio.ts` - Pattern to follow
  - `packages/client/src/components/MeetingRoom/MicrophoneButton.tsx` - Pattern to follow

[Source: docs/sprint-artifacts/2-7-implement-audio-publishing-and-controls.md#Completion-Notes-List]

### LiveKit Video API

```typescript
// Enable camera (requests permission if needed)
await room.localParticipant.setCameraEnabled(true);

// Disable camera
await room.localParticipant.setCameraEnabled(false);

// Check if currently enabled
const isCameraEnabled = room.localParticipant.isCameraEnabled;

// Get local video track for preview
const videoTrack = room.localParticipant.getTrackPublication(Track.Source.Camera);

// Set video quality options
await room.localParticipant.setCameraEnabled(true, {
  resolution: VideoPresets.h720,
  facingMode: 'user'
});
```

[Source: docs/architecture.md#Integration-Points]

### Video Resolution Settings

Per Architecture and PRD specifications:
- Default resolution: 720p (HD) - sufficient for clear video communication
- Adaptive quality via LiveKit Simulcast (automatically adjusts to network)
- Video off by default per UX spec (less intimidating for users)

```typescript
import { VideoPresets } from 'livekit-client';

// 720p preset
VideoPresets.h720 // 1280x720, max 30fps
```

[Source: docs/prd.md#Desktop-Application-Requirements, docs/architecture.md#Performance-Considerations]

### Local Video Preview Design

Per UX spec, local video preview should:
- Mirror horizontally for natural self-view (like looking in a mirror)
- Show gradient avatar with initial when video off
- Fit within participant bubble or dedicated preview area

```css
/* Mirror for self-view */
.local-video {
  transform: scaleX(-1);
}
```

[Source: docs/ux-design-specification.md#Participant-Bubble]

### Avatar Placeholder

When video is off, show avatar placeholder matching UX spec:
- Circular avatar with gradient background
- User's initial in center
- Uses participant's assigned color

```typescript
// From Sidebar.tsx - existing avatar pattern
<div
  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
  style={{ backgroundColor: participant.color }}
>
  {participant.name.charAt(0).toUpperCase()}
</div>
```

[Source: docs/ux-design-specification.md#Participant-Bubble]

### Keyboard Shortcut Implementation

Follow pattern from MicrophoneButton:

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Don't trigger when typing in input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }
    if (e.key === 'v' || e.key === 'V') {
      toggleVideo();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [toggleVideo]);
```

[Source: docs/sprint-artifacts/2-7-implement-audio-publishing-and-controls.md#Keyboard-Shortcut-Implementation]

### Project Structure Notes

Following the established patterns from Story 2.7:
- New hook: `packages/client/src/hooks/useVideo.ts`
- New components:
  - `packages/client/src/components/MeetingRoom/CameraButton.tsx`
  - `packages/client/src/components/MeetingRoom/LocalVideoPreview.tsx`
- Modify: `packages/client/src/stores/settingsStore.ts` (add video state)
- Modify: `packages/shared/src/types/room.ts` (add hasVideo to Participant)
- Modify: `packages/client/src/components/MeetingRoom/MeetingControlsBar.tsx`
- Modify: `packages/client/src/components/MeetingRoom/MeetingRoom.tsx`
- Modify: `packages/client/src/components/MeetingRoom/index.ts` (export new components)

[Source: docs/architecture.md#Project-Structure]

### References

- [Epics: Story 2.8](docs/epics.md#Story-2.8)
- [Architecture: LiveKit Integration](docs/architecture.md#Integration-Points)
- [Architecture: Component Patterns](docs/architecture.md#React-Component-Pattern)
- [UX Spec: Video Controls](docs/ux-design-specification.md#Meeting-Controls-Bar)
- [UX Spec: Participant Bubble](docs/ux-design-specification.md#Participant-Bubble)
- [PRD: Audio & Video Requirements FR8-14](docs/prd.md#Audio-Video)
- [Tech Spec: AC-2.8](docs/sprint-artifacts/tech-spec-epic-2.md#AC-2.8)
- [Story 2.7 Implementation](docs/sprint-artifacts/2-7-implement-audio-publishing-and-controls.md)
- [LiveKit Client SDK Docs](https://docs.livekit.io/client-sdk-js/)

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/2-8-implement-video-publishing-and-controls.context.xml`

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

Implementation followed the patterns established in Story 2.7 (audio publishing). Key decisions:
- Used native video element with track.attach() instead of LiveKit's VideoTrack component for more control
- Mirrored video using CSS transform: scaleX(-1) for natural self-view
- Positioned LocalVideoPreview in bottom-right corner of the main content area
- Added video indicator (Video/VideoOff icons) to Sidebar participant list

### Completion Notes List

- Implemented useVideo hook following useAudio pattern with optimistic UI updates
- Added isVideoOff and setVideoOff to settingsStore with localStorage persistence
- Created CameraButton component with V key shortcut (excludes input/textarea)
- Permission denied errors show toast via sonner: "Camera access denied. Check system settings."
- LocalVideoPreview shows mirrored video when on, avatar placeholder when off
- Added hasVideo field to Participant type in shared package
- Updated Sidebar to show video status indicator per participant
- Simplified MeetingControlsBar by using CameraButton component
- All 201 tests pass, including 40 new tests for video functionality

### File List

**New Files:**
- packages/client/src/hooks/useVideo.ts
- packages/client/src/hooks/useVideo.test.ts
- packages/client/src/components/MeetingRoom/CameraButton.tsx
- packages/client/src/components/MeetingRoom/CameraButton.test.tsx
- packages/client/src/components/MeetingRoom/LocalVideoPreview.tsx
- packages/client/src/components/MeetingRoom/LocalVideoPreview.test.tsx

**Modified Files:**
- packages/client/src/stores/settingsStore.ts (added isVideoOff, setVideoOff)
- packages/shared/src/types/room.ts (added hasVideo to Participant)
- packages/client/src/components/MeetingRoom/MeetingControlsBar.tsx (use CameraButton)
- packages/client/src/components/MeetingRoom/MeetingRoom.tsx (integrate useVideo, LocalVideoPreview)
- packages/client/src/components/MeetingRoom/Sidebar.tsx (video indicator)
- packages/client/src/components/MeetingRoom/index.ts (export new components)
- packages/client/src/hooks/useAudio.test.ts (fix TypeScript error)
- packages/client/src/components/HomeScreen/HomeScreen.test.tsx (fix unused import)
- packages/client/src/components/JoinRoom/JoinRoom.test.tsx (fix unused imports)
- docs/sprint-artifacts/sprint-status.yaml (status update)

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-03 | Initial story draft from create-story workflow | SM Agent |
| 2025-12-03 | Implementation complete - all tasks done, tests passing | Dev Agent (Claude Opus 4.5) |
| 2025-12-03 | Senior Developer Review (AI) - APPROVED | SM Agent (Claude Opus 4.5) |

---

## Senior Developer Review (AI)

### Reviewer
BMad (AI Code Review)

### Date
2025-12-03

### Outcome
**✅ APPROVE** - All acceptance criteria implemented and verified, all tasks completed, comprehensive test coverage, clean implementation following established patterns.

### Summary
Story 2.8 implements video publishing and controls for the Etch meeting application. The implementation follows the patterns established in Story 2.7 (audio) and delivers all 8 acceptance criteria. The code is well-structured, properly tested with 201 tests passing, and aligns with architectural decisions.

### Key Findings

**No HIGH or MEDIUM severity issues found.**

**LOW Severity:**
- `LocalVideoPreview.tsx:30-32`: Minor cleanup race condition - videoRef.current could theoretically be null during effect cleanup. Not blocking; defensive but harmless.
- Test warnings: Several "not wrapped in act(...)" warnings in CameraButton tests. Tests pass correctly; warnings are cosmetic.

### Acceptance Criteria Coverage

| AC# | Description | Status | Evidence |
|-----|-------------|--------|----------|
| AC-2.8.1 | Camera Permission Request | ✅ IMPLEMENTED | `hooks/useVideo.ts:33-37` |
| AC-2.8.2 | Video Publishing on Enable | ✅ IMPLEMENTED | `hooks/useVideo.ts:27-49`, `CameraButton.tsx:49` |
| AC-2.8.3 | Video Disabling | ✅ IMPLEMENTED | `hooks/useVideo.ts:65-85`, `LocalVideoPreview.tsx:43-52` |
| AC-2.8.4 | Toggle Responsiveness (<100ms) | ✅ IMPLEMENTED | `hooks/useVideo.ts:31-32,69-70` - optimistic UI |
| AC-2.8.5 | Keyboard Shortcut (V key) | ✅ IMPLEMENTED | `CameraButton.tsx:17-33` |
| AC-2.8.6 | Permission Denied Handling | ✅ IMPLEMENTED | `hooks/useVideo.ts:50-60` |
| AC-2.8.7 | Local Video Preview (mirrored) | ✅ IMPLEMENTED | `LocalVideoPreview.tsx:61` |
| AC-2.8.8 | Video Resolution (720p) | ✅ IMPLEMENTED | `hooks/useVideo.ts:34-35` |

**Summary: 8 of 8 acceptance criteria fully implemented**

### Task Completion Validation

| Task | Marked | Verified | Evidence |
|------|--------|----------|----------|
| Task 1: Create useVideo hook | ✅ | ✅ VERIFIED | `hooks/useVideo.ts:1-123` |
| Task 2: Add video state to settingsStore | ✅ | ✅ VERIFIED | `stores/settingsStore.ts:9,15,25,31` |
| Task 3: Create CameraButton component | ✅ | ✅ VERIFIED | `components/MeetingRoom/CameraButton.tsx:1-52` |
| Task 4: Implement keyboard shortcut | ✅ | ✅ VERIFIED | `CameraButton.tsx:17-38` |
| Task 5: Handle permission denied error | ✅ | ✅ VERIFIED | `hooks/useVideo.ts:50-60` |
| Task 6: Create LocalVideoPreview component | ✅ | ✅ VERIFIED | `components/MeetingRoom/LocalVideoPreview.tsx:1-71` |
| Task 7: Add video state to Participant type | ✅ | ✅ VERIFIED | `shared/src/types/room.ts:27`, `Sidebar.tsx:141-145` |
| Task 8: Update MeetingControlsBar | ✅ | ✅ VERIFIED | `MeetingControlsBar.tsx:24` |
| Task 9: Add LocalVideoPreview to MeetingRoom | ✅ | ✅ VERIFIED | `MeetingRoom.tsx:162-169` |
| Task 10: Write tests | ✅ | ✅ VERIFIED | 201 tests pass |

**Summary: 10 of 10 completed tasks verified, 0 questionable, 0 falsely marked complete**

### Test Coverage and Gaps

**Test Files:**
- `useVideo.test.ts` - 19 tests covering hook functionality
- `CameraButton.test.tsx` - 12 tests covering component interactions
- `LocalVideoPreview.test.tsx` - 13 tests covering preview states

**Coverage:** All acceptance criteria have corresponding tests. Total: 201 tests pass.

**No test gaps identified for MVP scope.**

### Architectural Alignment

- ✅ Follows Zustand store pattern (ADR-004)
- ✅ Uses LiveKit client SDK correctly (ADR-002)
- ✅ Component structure follows project conventions
- ✅ 720p resolution per PRD performance requirements
- ✅ Co-located tests per architecture guidelines
- ✅ Optimistic UI for < 100ms feedback

### Security Notes

No security issues identified:
- ✅ Proper permission handling via LiveKit SDK
- ✅ No credential exposure
- ✅ No XSS or injection vectors
- ✅ Error messages are user-friendly without exposing internals

### Best-Practices and References

- [LiveKit Client SDK - Camera Controls](https://docs.livekit.io/client-sdk-js/)
- [React Testing Library - Act Warnings](https://kentcdodds.com/blog/fix-the-not-wrapped-in-act-warning)
- Implementation follows patterns from Story 2.7 (audio) for consistency

### Action Items

**Code Changes Required:**
None - story is approved as-is.

**Advisory Notes:**
- Note: Consider wrapping keyboard event tests in act() to eliminate console warnings (cosmetic improvement only)
- Note: LocalVideoPreview cleanup ref check is defensive but harmless - no action needed
