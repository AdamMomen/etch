# Story 2.7: Implement Audio Publishing and Controls

Status: done

## Story

As a **user**,
I want **to publish my microphone audio and control mute/unmute**,
So that **I can speak to other participants in the meeting**.

## Acceptance Criteria

1. **AC-2.7.1: Microphone Permission Request**
   - Given I'm connected to a LiveKit room
   - When I click the microphone button (currently muted)
   - Then the system prompts for microphone permission (if not granted)

2. **AC-2.7.2: Audio Publishing on Unmute**
   - Given microphone permission is granted
   - When I click unmute
   - Then microphone audio is published to the room
   - And button icon changes from muted (slash) to unmuted
   - And other participants can hear me

3. **AC-2.7.3: Audio Muting**
   - Given I am currently unmuted and publishing audio
   - When I click the microphone button
   - Then audio track is muted (stops publishing)
   - And button icon shows muted state (slash)

4. **AC-2.7.4: Toggle Responsiveness**
   - Given I toggle the mute state
   - When the button is clicked
   - Then visual feedback is instant (< 100ms)

5. **AC-2.7.5: Keyboard Shortcut**
   - Given I am in a meeting
   - When I press the `M` key
   - Then mute state toggles (same as clicking button)

6. **AC-2.7.6: Permission Denied Handling**
   - Given the system prompts for microphone permission
   - When permission is denied by user or system
   - Then a toast shows: "Microphone access denied. Check system settings."
   - And button remains in muted state

7. **AC-2.7.7: Speaking Indicator**
   - Given I am unmuted and speaking
   - When audio is detected from my microphone
   - Then my participant avatar shows a speaking indicator animation

## Tasks / Subtasks

- [x] **Task 1: Create useAudio hook** (AC: 2.7.1, 2.7.2, 2.7.3, 2.7.4)
  - [x] Create `packages/client/src/hooks/useAudio.ts`
  - [x] Accept room instance from useLiveKit hook
  - [x] Implement `enableMicrophone()` function using `room.localParticipant.setMicrophoneEnabled(true)`
  - [x] Implement `disableMicrophone()` function using `room.localParticipant.setMicrophoneEnabled(false)`
  - [x] Return `isMuted`, `isPublishing`, `toggleMute()` state and actions
  - [x] Handle permission request automatically when enabling

- [x] **Task 2: Add audio state to settingsStore** (AC: 2.7.2, 2.7.3)
  - [x] Add `isMuted: boolean` to settingsStore (default: true per UX spec)
  - [x] Add `setMuted(muted: boolean)` action
  - [x] Persist mute preference to localStorage

- [x] **Task 3: Create MicrophoneButton component** (AC: 2.7.1, 2.7.2, 2.7.3, 2.7.4)
  - [x] Create `packages/client/src/components/MeetingRoom/MicrophoneButton.tsx`
  - [x] Use `useAudio` hook for state management
  - [x] Show mic icon when unmuted, mic-off icon when muted
  - [x] Apply immediate visual feedback on click (optimistic UI)
  - [x] Style consistently with existing control bar buttons

- [x] **Task 4: Implement keyboard shortcut** (AC: 2.7.5)
  - [x] Add keyboard event listener for `M` key
  - [x] Toggle mute state when pressed (only when not in text input)
  - [x] Add to existing keyboard shortcut system if present

- [x] **Task 5: Handle permission denied error** (AC: 2.7.6)
  - [x] Catch `NotAllowedError` from setMicrophoneEnabled
  - [x] Show toast notification using sonner: "Microphone access denied. Check system settings."
  - [x] Keep button in muted state
  - [x] Log error for debugging

- [x] **Task 6: Implement speaking indicator** (AC: 2.7.7)
  - [x] Use LiveKit's `isSpeaking` property from LocalParticipant
  - [x] Add speaking state to participant in roomStore
  - [x] Create speaking indicator animation (pulsing ring around avatar)
  - [x] Apply indicator to local participant's avatar

- [x] **Task 7: Update ControlBar to use MicrophoneButton** (AC: all)
  - [x] Replace placeholder microphone control in ControlBar
  - [x] Pass room instance to MicrophoneButton
  - [x] Ensure proper layout and spacing

- [x] **Task 8: Write tests** (AC: all)
  - [x] Test useAudio hook mute/unmute functionality
  - [x] Test MicrophoneButton component states
  - [x] Test keyboard shortcut handler
  - [x] Test permission denied error handling
  - [x] Test speaking indicator display

## Dev Notes

### Learnings from Previous Story

**From Story 2.6 (Status: done)**

- **useLiveKit hook available**: `packages/client/src/hooks/useLiveKit.ts` provides `room` instance and `connectionState`
- **Room instance access**: Get room from useLiveKit hook, use `room.localParticipant` for local audio control
- **ConnectionStatusIndicator pattern**: Use similar component pattern for MicrophoneButton
- **Toast notifications**: Use `sonner` toast (already installed and used for join/leave)
- **roomStore extended**: Has participant management, can add speaking state
- **Test patterns**: Use vi.mock for LiveKit, follow existing test patterns
- **Participant metadata**: `parseParticipantMetadata` utility available for metadata handling

[Source: docs/sprint-artifacts/2-6-integrate-livekit-room-connection.md#Completion-Notes-List]

### LiveKit Audio API

```typescript
// Enable microphone (requests permission if needed)
await room.localParticipant.setMicrophoneEnabled(true);

// Disable microphone
await room.localParticipant.setMicrophoneEnabled(false);

// Check if currently enabled
const isMicEnabled = room.localParticipant.isMicrophoneEnabled;

// Listen for speaking state
room.localParticipant.on(ParticipantEvent.IsSpeakingChanged, (speaking: boolean) => {
  // Update UI indicator
});
```

### Speaking Indicator Design

Per UX spec, speaking indicator should be:
- Subtle pulsing ring around participant avatar
- Color: Use accent color (orange) or green for active speaking
- Animation: Smooth pulse, not distracting
- Only visible when actively speaking (audio detected)

### Keyboard Shortcut Implementation

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Don't trigger when typing in input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }
    if (e.key === 'm' || e.key === 'M') {
      toggleMute();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [toggleMute]);
```

### Default Mute State

Per UX spec: Users start muted by default to avoid accidental audio broadcasting.
- Store preference in settingsStore
- Restore preference on rejoin
- Don't auto-unmute on room connect

### Project Structure Notes

- New hook: `packages/client/src/hooks/useAudio.ts`
- New component: `packages/client/src/components/MeetingRoom/MicrophoneButton.tsx`
- Modify: `packages/client/src/stores/settingsStore.ts` (add muted state)
- Modify: `packages/client/src/stores/roomStore.ts` (add speaking state to Participant)
- Modify: `packages/client/src/components/MeetingRoom/ControlBar.tsx` (if exists) or MeetingRoom.tsx

### References

- [Epics: Story 2.7](docs/epics.md#Story-2.7)
- [Architecture: LiveKit Integration](docs/architecture.md#Integration-Points)
- [UX Spec: Audio Controls](docs/ux-design-specification.md)
- [Story 2.6 Implementation](docs/sprint-artifacts/2-6-integrate-livekit-room-connection.md)
- [LiveKit Client SDK Docs](https://docs.livekit.io/client-sdk-js/)

---

## Dev Agent Record

### Context Reference

- [Story Context XML](./2-7-implement-audio-publishing-and-controls.context.xml)

### Agent Model Used

Claude (claude-opus-4-5-20251101)

### Debug Log References

- Implemented useAudio hook with optimistic UI updates for responsive toggle (<100ms visual feedback)
- Used ParticipantEvent.IsSpeakingChanged from LiveKit for speaking indicator
- Speaking indicator uses boxShadow CSS property with participant color for pulsing ring effect

### Completion Notes List

1. **useAudio hook** - Created comprehensive audio control hook with:
   - `enableMicrophone()` / `disableMicrophone()` / `toggleMute()` functions
   - Optimistic UI updates for instant visual feedback
   - Permission denied error handling with toast notifications
   - Speaking state updates via ParticipantEvent.IsSpeakingChanged
   - Integration with settingsStore for persisted mute preference

2. **MicrophoneButton component** - React component with:
   - Proper aria-label and aria-pressed attributes for accessibility
   - Keyboard shortcut (M key) with input field detection
   - Consistent styling with existing control bar buttons
   - Destructive style when muted

3. **Speaking indicator** - Added to Sidebar participant list:
   - Pulsing ring animation around participant avatar
   - Uses participant's assigned color for visual consistency
   - Updates via isSpeaking property in Participant type

4. **settingsStore updates** - Extended with:
   - `isMuted: boolean` (default: true per UX spec)
   - `setMuted(muted: boolean)` action
   - Persistence via zustand persist middleware

5. **MeetingControlsBar refactored** - Now accepts room prop and uses MicrophoneButton component

6. **Tests** - Added comprehensive test suites:
   - `useAudio.test.ts` - 13 tests covering all audio functionality
   - `MicrophoneButton.test.tsx` - 14 tests covering component behavior
   - Updated `MeetingRoom.test.tsx` with proper room mock

### File List

**New Files:**
- `packages/client/src/hooks/useAudio.ts` - Audio control hook
- `packages/client/src/hooks/useAudio.test.ts` - Hook tests
- `packages/client/src/components/MeetingRoom/MicrophoneButton.tsx` - Mic button component
- `packages/client/src/components/MeetingRoom/MicrophoneButton.test.tsx` - Component tests

**Modified Files:**
- `packages/shared/src/types/room.ts` - Added `isSpeaking?: boolean` to Participant
- `packages/client/src/stores/settingsStore.ts` - Added isMuted state and setMuted action
- `packages/client/src/components/MeetingRoom/MeetingControlsBar.tsx` - Replaced mic button with MicrophoneButton
- `packages/client/src/components/MeetingRoom/MeetingRoom.tsx` - Removed local isMuted state, pass room to controls
- `packages/client/src/components/MeetingRoom/Sidebar.tsx` - Added speaking indicator animation
- `packages/client/src/components/MeetingRoom/index.ts` - Export MicrophoneButton
- `packages/client/src/components/MeetingRoom/MeetingRoom.test.tsx` - Updated mock and tests

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-03 | Initial story draft from create-story workflow | SM Agent |
| 2025-12-03 | Implementation complete - all 8 tasks done, 266 tests passing | Dev Agent |
| 2025-12-03 | Senior Developer Review notes appended | SM Agent |

---

## Senior Developer Review (AI)

### Reviewer
BMad

### Date
2025-12-03

### Outcome
**APPROVE** ✅

All 7 acceptance criteria fully implemented with evidence. All 8 tasks verified complete. Comprehensive test coverage (27 new tests). Code follows architectural patterns and UX specifications.

### Summary

Excellent implementation of audio publishing and controls. The code demonstrates:
- Clean separation of concerns with `useAudio` hook encapsulating LiveKit logic
- Proper optimistic UI updates for <100ms visual feedback
- Comprehensive error handling for permission denied scenarios
- Accessible UI with proper ARIA attributes
- Well-organized test suite covering all acceptance criteria

### Key Findings

**No HIGH or MEDIUM severity issues found.**

**LOW severity observations:**
- Note: The `isSpeaking` state is tracked at the hook level and also stored in `roomStore` - this dual tracking is intentional for supporting remote participant speaking indicators in future stories

### Acceptance Criteria Coverage

| AC# | Description | Status | Evidence |
|-----|-------------|--------|----------|
| AC-2.7.1 | Microphone Permission Request | ✅ IMPLEMENTED | `useAudio.ts:34` - `setMicrophoneEnabled(true)` triggers browser permission prompt |
| AC-2.7.2 | Audio Publishing on Unmute | ✅ IMPLEMENTED | `useAudio.ts:34-35` enables mic + `MicrophoneButton.tsx:48-49` shows Mic icon |
| AC-2.7.3 | Audio Muting | ✅ IMPLEMENTED | `useAudio.ts:58` disables mic + `MicrophoneButton.tsx:49` shows MicOff icon |
| AC-2.7.4 | Toggle Responsiveness (<100ms) | ✅ IMPLEMENTED | `useAudio.ts:32,56` optimistic `setMuted()` before async LiveKit call |
| AC-2.7.5 | Keyboard Shortcut (M key) | ✅ IMPLEMENTED | `MicrophoneButton.tsx:17-33` with input/textarea exclusion |
| AC-2.7.6 | Permission Denied Handling | ✅ IMPLEMENTED | `useAudio.ts:41-42` catches `NotAllowedError`, shows toast, reverts state |
| AC-2.7.7 | Speaking Indicator | ✅ IMPLEMENTED | `useAudio.ts:89` subscribes to `IsSpeakingChanged`, `Sidebar.tsx:112-120` renders pulse animation |

**Summary: 7 of 7 acceptance criteria fully implemented**

### Task Completion Validation

| Task | Description | Marked As | Verified As | Evidence |
|------|-------------|-----------|-------------|----------|
| 1 | Create useAudio hook | ✅ Complete | ✅ VERIFIED | `packages/client/src/hooks/useAudio.ts` (114 lines) |
| 2 | Add audio state to settingsStore | ✅ Complete | ✅ VERIFIED | `settingsStore.ts:8,22,27` - `isMuted` boolean with `setMuted` action |
| 3 | Create MicrophoneButton component | ✅ Complete | ✅ VERIFIED | `packages/client/src/components/MeetingRoom/MicrophoneButton.tsx` (52 lines) |
| 4 | Implement keyboard shortcut | ✅ Complete | ✅ VERIFIED | `MicrophoneButton.tsx:17-38` - M key handler with input field check |
| 5 | Handle permission denied error | ✅ Complete | ✅ VERIFIED | `useAudio.ts:41-46` - NotAllowedError catch, toast, state revert |
| 6 | Implement speaking indicator | ✅ Complete | ✅ VERIFIED | `Sidebar.tsx:112-120`, `room.ts:25` - `isSpeaking` prop with pulse animation |
| 7 | Update ControlBar to use MicrophoneButton | ✅ Complete | ✅ VERIFIED | `MeetingControlsBar.tsx:4,25` - imports and renders MicrophoneButton |
| 8 | Write tests | ✅ Complete | ✅ VERIFIED | `useAudio.test.ts` (13 tests), `MicrophoneButton.test.tsx` (14 tests) |

**Summary: 8 of 8 completed tasks verified, 0 questionable, 0 false completions**

### Test Coverage and Gaps

**Tests Added:**
- `useAudio.test.ts`: 13 tests covering initial state, toggleMute, enable/disable microphone, permission denied handling (AC-2.7.6), speaking indicator (AC-2.7.7)
- `MicrophoneButton.test.tsx`: 14 tests covering rendering, click behavior (AC-2.7.2, AC-2.7.3), keyboard shortcut (AC-2.7.5), visual feedback (AC-2.7.4)
- `MeetingRoom.test.tsx`: Updated to properly mock room for new audio functionality

**Test Coverage Assessment:**
- All acceptance criteria have corresponding tests ✅
- Edge cases covered: null room, input field key events, permission errors
- No gaps identified

### Architectural Alignment

✅ **Zustand Store Pattern**: `settingsStore` extended with `isMuted` state using persist middleware
✅ **Custom Hook Pattern**: `useAudio` hook encapsulates LiveKit audio logic per architecture.md
✅ **Component Pattern**: `MicrophoneButton` follows same pattern as `ConnectionStatusIndicator`
✅ **LiveKit API Usage**: Uses `room.localParticipant.setMicrophoneEnabled()` per Dev Notes
✅ **Naming Conventions**: PascalCase components, camelCase hooks, co-located tests

### Security Notes

No security concerns identified. Audio permissions handled through browser's standard permission API.

### Best-Practices and References

- [LiveKit Client SDK - setMicrophoneEnabled](https://docs.livekit.io/client-sdk-js/classes/LocalParticipant.html#setMicrophoneEnabled)
- [React Testing Library - userEvent](https://testing-library.com/docs/user-event/intro)
- [ARIA Authoring Practices - Toggle Button](https://www.w3.org/WAI/ARIA/apg/patterns/button/)

### Action Items

**Code Changes Required:**
- None - implementation is complete and meets all acceptance criteria

**Advisory Notes:**
- Note: Consider adding remote participant speaking indicators in Story 2.9 (infrastructure is in place with `isSpeaking` property)
