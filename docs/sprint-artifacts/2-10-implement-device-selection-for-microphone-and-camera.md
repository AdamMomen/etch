# Story 2.10: Implement Device Selection for Microphone and Camera

Status: review

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

- [ ] **Task 1: Create useDevices hook** (AC: 2.10.1, 2.10.3, 2.10.6)
  - [ ] Create `packages/client/src/hooks/useDevices.ts`
  - [ ] Use `navigator.mediaDevices.enumerateDevices()` to list devices
  - [ ] Filter by device kind (audioinput, videoinput)
  - [ ] Listen for `devicechange` event to refresh list
  - [ ] Handle permission edge cases (empty labels before permission granted)
  - [ ] Return `{ audioDevices, videoDevices, refresh }`

- [ ] **Task 2: Create DeviceSelector component** (AC: 2.10.1, 2.10.3)
  - [ ] Create `packages/client/src/components/MeetingRoom/DeviceSelector.tsx`
  - [ ] Use shadcn/ui DropdownMenu component
  - [ ] Accept props: `devices`, `selectedDeviceId`, `onSelect`, `type` (audio/video)
  - [ ] Display "System Default" as first option with `deviceId: 'default'`
  - [ ] Show checkmark icon next to currently selected device
  - [ ] Truncate long device names with ellipsis

- [ ] **Task 3: Integrate DeviceSelector with MicrophoneButton** (AC: 2.10.1, 2.10.2)
  - [ ] Update `MicrophoneButton.tsx` to include dropdown trigger
  - [ ] Add small dropdown arrow indicator next to mic icon
  - [ ] Connect to useDevices hook for audio devices
  - [ ] Wire onSelect to device switching logic

- [ ] **Task 4: Integrate DeviceSelector with CameraButton** (AC: 2.10.3, 2.10.4)
  - [ ] Update `CameraButton.tsx` (or create if needed) to include dropdown trigger
  - [ ] Add small dropdown arrow indicator next to camera icon
  - [ ] Connect to useDevices hook for video devices
  - [ ] Wire onSelect to device switching logic

- [ ] **Task 5: Implement device switching via LiveKit** (AC: 2.10.2, 2.10.4)
  - [ ] Update `useLiveKit.ts` or create `useDeviceSwitch` hook
  - [ ] Use `room.switchActiveDevice(kind, deviceId)` for switching
  - [ ] Handle switch success/failure states
  - [ ] Update local state to reflect new device selection

- [ ] **Task 6: Create settingsStore for device preferences** (AC: 2.10.2, 2.10.4)
  - [ ] Create `packages/client/src/stores/settingsStore.ts`
  - [ ] Use Zustand with `persist` middleware for localStorage
  - [ ] Store `preferredMicrophoneId` and `preferredCameraId`
  - [ ] Load preferences on room join and apply if device available

- [ ] **Task 7: Implement toast notifications** (AC: 2.10.2, 2.10.4, 2.10.5)
  - [ ] Add toast component if not already present (shadcn/ui toast)
  - [ ] Show "Switched to {device}" on successful switch
  - [ ] Show "Device disconnected, switched to {default}" on disconnect fallback
  - [ ] Toast auto-dismiss after 3 seconds

- [ ] **Task 8: Handle device disconnection** (AC: 2.10.5)
  - [ ] Listen for `devicechange` event
  - [ ] Detect when current device is no longer in list
  - [ ] Trigger fallback to default device
  - [ ] Show disconnect toast notification

- [ ] **Task 9: Write tests** (AC: all)
  - [ ] Test useDevices hook with mocked navigator.mediaDevices
  - [ ] Test DeviceSelector component renders device list
  - [ ] Test device selection updates state correctly
  - [ ] Test device disconnection triggers fallback
  - [ ] Test preferences persist to localStorage
  - [ ] Test toast notifications appear on device changes

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
      name: 'nameless-settings',
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

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-03 | Initial story draft from create-story workflow | SM Agent |
