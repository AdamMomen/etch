# Story 2.10: Implement Device Selection for Microphone and Camera

Status: done

## Story

As a **user**,
I want **to select which microphone and camera to use**,
So that **I can use my preferred devices for the meeting**.

## Acceptance Criteria

1. **AC-2.10.1: Microphone Device List**
   - Given I'm in a meeting
   - When I click a dropdown arrow next to the microphone button
   - Then I see a list of available microphones with device names
   - And a checkmark indicates the currently selected device
   - And "System Default" option appears at top of the list

2. **AC-2.10.2: Microphone Device Switching**
   - Given the microphone dropdown is open
   - When I select a different microphone
   - Then the device switches immediately
   - And a brief toast shows "Switched to {device}"
   - And the selection persists for future meetings

3. **AC-2.10.3: Camera Device List**
   - Given I'm in a meeting
   - When I click a dropdown arrow next to the camera button
   - Then I see a list of available cameras with device names
   - And a checkmark indicates the currently selected device
   - And "System Default" option appears at top of the list

4. **AC-2.10.4: Camera Device Switching**
   - Given the camera dropdown is open
   - When I select a different camera
   - Then the device switches immediately
   - And a brief toast shows "Switched to {device}"
   - And the selection persists for future meetings

5. **AC-2.10.5: Device Disconnection Handling**
   - Given I have a non-default device selected
   - When that device is disconnected mid-meeting
   - Then the system falls back to the default device
   - And a toast shows "Device disconnected, switched to {default}"

6. **AC-2.10.6: Device List Updates**
   - Given the device dropdown is closed
   - When I connect or disconnect a device
   - Then the device list updates on next dropdown open

[Source: docs/epics.md#Story-2.10]

## Tasks / Subtasks

- [x] **Task 1: Create useDevices hook** (AC: 2.10.1, 2.10.3, 2.10.6)
  - [x] Create `packages/client/src/hooks/useDevices.ts`
  - [x] Use `navigator.mediaDevices.enumerateDevices()` to list devices
  - [x] Filter by device kind (audioinput, videoinput)
  - [x] Listen for `devicechange` event to refresh list
  - [x] Handle permission edge cases (empty labels before permission granted)
  - [x] Return `{ audioDevices, videoDevices, refresh }`

- [x] **Task 2: Create DeviceSelector component** (AC: 2.10.1, 2.10.3)
  - [x] Create `packages/client/src/components/MeetingRoom/DeviceSelector.tsx`
  - [x] Use shadcn/ui DropdownMenu component
  - [x] Accept props: `devices`, `selectedDeviceId`, `onSelect`, `type` (audio/video)
  - [x] Display "System Default" as first option with `deviceId: 'default'`
  - [x] Show checkmark icon next to currently selected device
  - [x] Truncate long device names with ellipsis

- [x] **Task 3: Integrate DeviceSelector with MicrophoneButton** (AC: 2.10.1, 2.10.2)
  - [x] Update `MicrophoneButton.tsx` to include dropdown trigger
  - [x] Add small dropdown arrow indicator next to mic icon
  - [x] Connect to useDevices hook for audio devices
  - [x] Wire onSelect to device switching logic

- [x] **Task 4: Integrate DeviceSelector with CameraButton** (AC: 2.10.3, 2.10.4)
  - [x] Update `CameraButton.tsx` (or create if needed) to include dropdown trigger
  - [x] Add small dropdown arrow indicator next to camera icon
  - [x] Connect to useDevices hook for video devices
  - [x] Wire onSelect to device switching logic

- [x] **Task 5: Implement device switching via LiveKit** (AC: 2.10.2, 2.10.4)
  - [x] Update `useLiveKit.ts` or create `useDeviceSwitch` hook
  - [x] Use `room.switchActiveDevice(kind, deviceId)` for switching
  - [x] Handle switch success/failure states
  - [x] Update local state to reflect new device selection

- [x] **Task 6: Create settingsStore for device preferences** (AC: 2.10.2, 2.10.4)
  - [x] Create `packages/client/src/stores/settingsStore.ts`
  - [x] Use Zustand with `persist` middleware for localStorage
  - [x] Store `preferredMicrophoneId` and `preferredCameraId`
  - [x] Load preferences on room join and apply if device available

- [x] **Task 7: Implement toast notifications** (AC: 2.10.2, 2.10.4, 2.10.5)
  - [x] Add toast component if not already present (shadcn/ui toast)
  - [x] Show "Switched to {device}" on successful switch
  - [x] Show "Device disconnected, switched to {default}" on disconnect fallback
  - [x] Toast auto-dismiss after 3 seconds

- [x] **Task 8: Handle device disconnection** (AC: 2.10.5)
  - [x] Listen for `devicechange` event
  - [x] Detect when current device is no longer in list
  - [x] Trigger fallback to default device
  - [x] Show disconnect toast notification

- [x] **Task 9: Write tests** (AC: all)
  - [x] Test useDevices hook with mocked navigator.mediaDevices
  - [x] Test DeviceSelector component renders device list
  - [x] Test device selection updates state correctly
  - [x] Test device disconnection triggers fallback
  - [x] Test preferences persist to localStorage
  - [x] Test toast notifications appear on device changes

## Dev Notes

### Learnings from Previous Story

**From Story 2.9 (Status: done)**

- **All 256 client tests pass** - Maintain this coverage level for Story 2.10
- **Component pattern established**: RemoteParticipantVideo, ParticipantBubble follow existing patterns
- **useLiveKit hook**: Contains room connection and track management - may need extension for device switching
- **Speaking indicator CSS**: Animation added to `index.css:95-106` - use similar pattern for dropdown styling
- **Zustand store pattern**: `roomStore.ts` uses `create<StateType>((set) => ({}))` pattern - follow for `settingsStore`
- **Files created in 2.9 for reference**:
  - `packages/client/src/components/MeetingRoom/ParticipantBubble.tsx` - component structure pattern
  - `packages/client/src/hooks/useLiveKit.ts` - hook extension point

[Source: docs/sprint-artifacts/2-9-display-remote-participant-audio-video-streams.md#Completion-Notes-List]

### Web Audio/Video Device APIs

Device enumeration and management use standard Web APIs:

```typescript
// Enumerate devices
const devices = await navigator.mediaDevices.enumerateDevices();
const audioInputs = devices.filter(d => d.kind === 'audioinput');
const videoInputs = devices.filter(d => d.kind === 'videoinput');

// Listen for device changes
navigator.mediaDevices.addEventListener('devicechange', async () => {
  const updatedDevices = await navigator.mediaDevices.enumerateDevices();
  // Update state
});

// Note: Device labels may be empty until permissions granted
// Always request permissions first before showing device list
```

[Source: MDN Web Docs, Architecture doc]

### LiveKit Device Switching

LiveKit provides device switching via the Room object:

```typescript
import { Room } from 'livekit-client';

// Switch microphone
await room.switchActiveDevice('audioinput', newDeviceId);

// Switch camera
await room.switchActiveDevice('videoinput', newDeviceId);

// The 'default' deviceId uses system default
await room.switchActiveDevice('audioinput', 'default');
```

Important: `switchActiveDevice` replaces the current track with a new one from the selected device.

[Source: LiveKit Client SDK Docs]

### Settings Store Pattern

Use Zustand persist middleware for localStorage:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  preferredMicrophoneId: string | null;
  preferredCameraId: string | null;
  setPreferredMicrophone: (id: string) => void;
  setPreferredCamera: (id: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      preferredMicrophoneId: null,
      preferredCameraId: null,
      setPreferredMicrophone: (id) => set({ preferredMicrophoneId: id }),
      setPreferredCamera: (id) => set({ preferredCameraId: id }),
    }),
    {
      name: 'etch-settings',
    }
  )
);
```

[Source: docs/architecture.md#Zustand-Store-Pattern]

### shadcn/ui DropdownMenu Usage

```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Check, ChevronDown } from 'lucide-react';

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon">
      <ChevronDown className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    {devices.map((device) => (
      <DropdownMenuItem
        key={device.deviceId}
        onClick={() => onSelect(device.deviceId)}
      >
        {selectedId === device.deviceId && <Check className="h-4 w-4 mr-2" />}
        {device.label || 'Unknown Device'}
      </DropdownMenuItem>
    ))}
  </DropdownMenuContent>
</DropdownMenu>
```

[Source: shadcn/ui docs, docs/ux-design-specification.md#Component-Library]

### Toast Notifications

Per UX spec, use toast system for device feedback:

```tsx
import { toast } from '@/components/ui/use-toast';

// Success toast
toast({
  title: `Switched to ${device.label}`,
  duration: 3000,
});

// Warning toast
toast({
  title: 'Device disconnected',
  description: `Switched to ${defaultDevice.label}`,
  variant: 'warning',
  duration: 5000,
});
```

Toast placement: bottom-right corner per UX spec.

[Source: docs/ux-design-specification.md#Feedback-Patterns]

### Project Structure Notes

New files to create following established patterns:
- `packages/client/src/hooks/useDevices.ts` - device enumeration hook
- `packages/client/src/components/MeetingRoom/DeviceSelector.tsx` - dropdown component
- `packages/client/src/stores/settingsStore.ts` - preferences persistence

Modifications to existing files:
- `packages/client/src/components/MeetingRoom/MicrophoneButton.tsx` - add dropdown trigger
- `packages/client/src/components/MeetingRoom/CameraButton.tsx` - add dropdown trigger (or create if needed)
- `packages/client/src/hooks/useLiveKit.ts` - add switchDevice method if needed

May need to add shadcn/ui components:
- `packages/client/src/components/ui/dropdown-menu.tsx` - if not already added
- `packages/client/src/components/ui/toast.tsx` - if not already added

[Source: docs/architecture.md#Project-Structure]

### References

- [Epics: Story 2.10](docs/epics.md#Story-2.10)
- [Architecture: Zustand Store Pattern](docs/architecture.md#Zustand-Store-Pattern)
- [UX Spec: Feedback Patterns](docs/ux-design-specification.md#Feedback-Patterns)
- [PRD: Audio & Video Requirements FR12](docs/prd.md#Audio-Video)
- [Story 2.9: Remote Participants](docs/sprint-artifacts/2-9-display-remote-participant-audio-video-streams.md)
- [LiveKit Client SDK - Device Management](https://docs.livekit.io/client-sdk-js/)
- [MDN - enumerateDevices()](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/enumerateDevices)

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/2-10-implement-device-selection-for-microphone-and-camera.context.xml`

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

- Resumed partially completed story with existing implementation in place
- Added device disconnection handling (AC-2.10.5) which was missing from initial implementation
- Added tests for device disconnection scenarios

### Completion Notes List

- **All 298 client tests pass** - increased from 256 tests in Story 2.9
- **Device Selection Feature Complete**: Users can now select microphone and camera devices from dropdown menus
- **Device Persistence**: Device preferences stored in localStorage via Zustand persist middleware
- **Device Disconnection Handling**: Automatic fallback to system default when selected device is disconnected
- **Toast Notifications**: Success toasts on device switch, warning toasts on device disconnection
- **Key Implementation Pattern**: Device switching integrated into useAudio/useVideo hooks rather than creating separate hook

### File List

**New Files:**
- `packages/client/src/hooks/useDevices.ts` - Device enumeration hook with devicechange listener
- `packages/client/src/hooks/useDevices.test.ts` - Tests for useDevices hook
- `packages/client/src/components/MeetingRoom/DeviceSelector.tsx` - Dropdown component for device selection
- `packages/client/src/components/MeetingRoom/DeviceSelector.test.tsx` - Tests for DeviceSelector component

**Modified Files:**
- `packages/client/src/stores/settingsStore.ts` - Added preferredMicrophoneId and preferredCameraId
- `packages/client/src/hooks/useAudio.ts` - Added switchDevice function and device disconnection handling
- `packages/client/src/hooks/useAudio.test.ts` - Added device disconnection tests
- `packages/client/src/hooks/useVideo.ts` - Added switchDevice function and device disconnection handling
- `packages/client/src/hooks/useVideo.test.ts` - Added device disconnection tests
- `packages/client/src/components/MeetingRoom/MicrophoneButton.tsx` - Integrated DeviceSelector
- `packages/client/src/components/MeetingRoom/CameraButton.tsx` - Integrated DeviceSelector

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-03 | Initial story draft from create-story workflow | SM Agent |
| 2025-12-04 | Completed all tasks, added device disconnection handling, all tests pass (298) | Dev Agent |
| 2025-12-04 | Senior Developer Review notes appended - APPROVED | SM Agent |

---

## Senior Developer Review (AI)

### Reviewer
BMad (AI Code Review Agent)

### Date
2025-12-04

### Outcome
**APPROVE** - All acceptance criteria implemented, all tasks verified complete, 298 tests pass.

### Summary
Story 2.10 implements device selection for microphone and camera with full feature parity to the acceptance criteria. The implementation follows project architecture patterns, uses appropriate libraries (LiveKit, Zustand, shadcn/ui), and includes comprehensive test coverage. Device disconnection handling was added as a late enhancement and is properly implemented.

### Key Findings

**No HIGH or MEDIUM severity issues found.**

**LOW severity (advisory):**
- `useDevices.ts:52-53,60-61`: Fallback device labels use deviceId prefix (e.g., "Microphone abc1") which exposes internal IDs. Consider using sequential numbering instead.
- DeviceSelector could show a loading skeleton while devices enumerate.

### Acceptance Criteria Coverage

| AC# | Description | Status | Evidence |
|-----|-------------|--------|----------|
| AC-2.10.1 | Microphone Device List | IMPLEMENTED | `DeviceSelector.tsx:47-50,86-88`, `MicrophoneButton.tsx:65-71` |
| AC-2.10.2 | Microphone Device Switching | IMPLEMENTED | `useAudio.ts:80-93`, `MicrophoneButton.tsx:20-27`, `settingsStore.ts:38` |
| AC-2.10.3 | Camera Device List | IMPLEMENTED | `DeviceSelector.tsx:47-50`, `CameraButton.tsx:65-71` |
| AC-2.10.4 | Camera Device Switching | IMPLEMENTED | `useVideo.ts:99-113`, `CameraButton.tsx:20-27`, `settingsStore.ts:39` |
| AC-2.10.5 | Device Disconnection Handling | IMPLEMENTED | `useAudio.ts:125-152`, `useVideo.ts:134-161` |
| AC-2.10.6 | Device List Updates | IMPLEMENTED | `useDevices.ts:81-97` |

**Summary: 6 of 6 acceptance criteria fully implemented**

### Task Completion Validation

| Task | Marked | Verified | Evidence |
|------|--------|----------|----------|
| Task 1: useDevices hook | [x] | ✓ VERIFIED | `useDevices.ts:1-106` |
| Task 2: DeviceSelector component | [x] | ✓ VERIFIED | `DeviceSelector.tsx:1-103` |
| Task 3: MicrophoneButton integration | [x] | ✓ VERIFIED | `MicrophoneButton.tsx:65-71` |
| Task 4: CameraButton integration | [x] | ✓ VERIFIED | `CameraButton.tsx:65-71` |
| Task 5: LiveKit device switching | [x] | ✓ VERIFIED | `useAudio.ts:80-93`, `useVideo.ts:99-113` |
| Task 6: settingsStore preferences | [x] | ✓ VERIFIED | `settingsStore.ts:10-11,30-31,38-39` |
| Task 7: Toast notifications | [x] | ✓ VERIFIED | `MicrophoneButton.tsx:25`, `CameraButton.tsx:25`, `useAudio.ts:140` |
| Task 8: Device disconnection | [x] | ✓ VERIFIED | `useAudio.ts:125-152`, `useVideo.ts:134-161` |
| Task 9: Tests | [x] | ✓ VERIFIED | 42 new tests across 4 test files |

**Summary: 9 of 9 completed tasks verified, 0 questionable, 0 false completions**

### Test Coverage and Gaps

- **298 total tests pass** (up from 256 in Story 2.9)
- New test files: `useDevices.test.ts` (13 tests), `DeviceSelector.test.tsx` (15 tests)
- Updated: `settingsStore.test.ts` (9 tests), `useAudio.test.ts`, `useVideo.test.ts`
- All ACs have corresponding tests with AC references in describe blocks
- Device disconnection edge cases tested

### Architectural Alignment

- ✅ Zustand with persist middleware for device preferences
- ✅ React functional components with TypeScript
- ✅ Custom hooks pattern (useDevices, useAudio, useVideo)
- ✅ shadcn/ui DropdownMenu component
- ✅ Sonner toast library
- ✅ LiveKit room.switchActiveDevice() API

### Security Notes

No security concerns. Device enumeration uses standard Web APIs. No user input vulnerabilities.

### Best-Practices and References

- [LiveKit Device Management](https://docs.livekit.io/client-sdk-js/)
- [MDN enumerateDevices()](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/enumerateDevices)
- [Zustand Persist Middleware](https://zustand.docs.pmnd.rs/integrations/persisting-store-data)

### Action Items

**Advisory Notes (no blockers):**
- Note: Consider using sequential numbering for fallback device labels instead of deviceId prefix
- Note: Could add loading skeleton to DeviceSelector during device enumeration
