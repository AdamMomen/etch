# Story 2.11: Implement Participant Volume Control

Status: ready-for-dev

## Story

As a **user**,
I want **to adjust the volume of individual participants**,
So that **I can balance audio levels to my preference**.

## Acceptance Criteria

1. **AC-2.11.1: Volume Control Trigger**
   - Given I'm in a meeting with other participants
   - When I hover over a participant in the sidebar
   - Then I see a volume slider icon appear

2. **AC-2.11.2: Volume Slider Display**
   - Given the volume icon is visible
   - When I click the volume icon
   - Then a volume slider popover appears (0-200%)
   - And the slider shows the current volume level
   - And the default volume is 100%

3. **AC-2.11.3: Volume Adjustment**
   - Given the volume slider is visible
   - When I drag the slider to a different position
   - Then that participant's audio volume adjusts locally
   - And the change is instant (no delay)

4. **AC-2.11.4: Mute via Volume**
   - Given the volume slider is visible
   - When I set the volume to 0%
   - Then the participant is effectively muted (for me only)
   - And a mute indicator appears on the slider

5. **AC-2.11.5: Volume Boost**
   - Given the volume slider is visible
   - When I set the volume above 100%
   - Then the audio is boosted up to 200%
   - And the slider visually indicates the boost zone

6. **AC-2.11.6: Session Persistence**
   - Given I have adjusted a participant's volume
   - When I continue in the meeting
   - Then the volume setting persists for the session
   - And volume resets to 100% on rejoin

[Source: docs/epics.md#Story-2.11, docs/sprint-artifacts/tech-spec-epic-2.md#AC-2.11]

## Tasks / Subtasks

- [ ] **Task 1: Create VolumeControl component** (AC: 2.11.1, 2.11.2, 2.11.5)
  - [ ] Create `packages/client/src/components/MeetingRoom/VolumeControl.tsx`
  - [ ] Use shadcn/ui Slider component for volume control
  - [ ] Accept props: `participantId`, `volume`, `onVolumeChange`
  - [ ] Implement 0-200% range with visual markers (0%, 100%, 200%)
  - [ ] Show boost zone styling for values > 100%
  - [ ] Include mute indicator (speaker-x icon) when volume is 0%

- [ ] **Task 2: Create VolumePopover wrapper** (AC: 2.11.2)
  - [ ] Create `packages/client/src/components/MeetingRoom/VolumePopover.tsx`
  - [ ] Use shadcn/ui Popover component
  - [ ] Trigger on click of volume icon
  - [ ] Close on click outside or escape key
  - [ ] Position popover to the right of the participant item

- [ ] **Task 3: Integrate volume icon into sidebar ParticipantListItem** (AC: 2.11.1)
  - [ ] Update participant list item component (create if needed)
  - [ ] Add Volume2 icon from lucide-react (show on hover)
  - [ ] Wire up VolumePopover on click
  - [ ] Use CSS hover state for icon visibility
  - [ ] Ensure icon doesn't appear for local participant

- [ ] **Task 4: Implement Web Audio API volume control** (AC: 2.11.3, 2.11.4, 2.11.5)
  - [ ] Create `packages/client/src/hooks/useParticipantVolume.ts`
  - [ ] Use Web Audio API GainNode for per-participant volume control
  - [ ] OR use LiveKit's `setVolume()` method on RemoteTrack (simpler approach)
  - [ ] Handle volume range 0-2 (0% to 200%)
  - [ ] Ensure instant volume changes (no delay)

- [ ] **Task 5: Create volume state management** (AC: 2.11.6)
  - [ ] Add `participantVolumes: Map<string, number>` to roomStore or create volumeStore
  - [ ] Store volume keyed by participantId
  - [ ] Default volume: 1.0 (100%)
  - [ ] Reset volumes when disconnecting from room
  - [ ] Note: Do NOT persist to localStorage (session-only per spec)

- [ ] **Task 6: Connect volume state to audio playback** (AC: 2.11.3)
  - [ ] Update RemoteParticipantAudio component to apply volume
  - [ ] Subscribe to volume changes from store
  - [ ] Apply volume via GainNode or track.setVolume()

- [ ] **Task 7: Add visual feedback for volume states** (AC: 2.11.4, 2.11.5)
  - [ ] Muted state (0%): Show VolumeX icon on slider
  - [ ] Normal state (1-100%): Show Volume2 icon
  - [ ] Boost state (>100%): Show special styling (different color/indicator)
  - [ ] Update slider fill color for boost zone

- [ ] **Task 8: Write tests** (AC: all)
  - [ ] Test VolumeControl component renders slider correctly
  - [ ] Test volume change callback fires on slider drag
  - [ ] Test mute indicator appears at 0%
  - [ ] Test boost styling appears above 100%
  - [ ] Test VolumePopover opens/closes correctly
  - [ ] Test volume state persists in store during session
  - [ ] Test volume resets on disconnect
  - [ ] Mock audio elements for volume application tests

## Dev Notes

### Learnings from Previous Story

**From Story 2.10 (Status: review)**

- **useDevices hook pattern**: Established hook pattern for browser APIs - use similar approach for volume
- **settingsStore pattern**: Uses Zustand with `persist` middleware - but volume should NOT persist (session-only)
- **Toast notifications**: Toast system available at `@/components/ui/use-toast` - may use for volume feedback
- **Dropdown/Popover pattern**: DropdownMenu used for device selection - VolumePopover follows similar pattern
- **Component structure**: DeviceSelector shows pattern for control components with callbacks
- **Files created to reference**:
  - `packages/client/src/hooks/useDevices.ts` - hook patterns
  - `packages/client/src/components/MeetingRoom/DeviceSelector.tsx` - component structure
  - `packages/client/src/stores/settingsStore.ts` - store pattern (but don't persist volume)

**From Story 2.9 (Status: done)**

- **RemoteParticipantAudio**: Audio playback component at `packages/client/src/components/MeetingRoom/RemoteParticipantAudio.tsx` - this is where volume will be applied
- **256 client tests pass** - maintain this coverage level
- **useLiveKit hook**: Contains room and track management - audio volume may be applied here
- **Participant tracking**: roomStore tracks participants with hasVideo, isSpeaking - add volume to this

[Source: docs/sprint-artifacts/2-10-implement-device-selection-for-microphone-and-camera.md, docs/sprint-artifacts/2-9-display-remote-participant-audio-video-streams.md]

### Volume Implementation Options

Two approaches for per-participant volume control:

**Option 1: LiveKit Track Volume (Recommended - Simpler)**

```typescript
import { RemoteTrack } from 'livekit-client';

// LiveKit tracks have a setVolume method
// Range: 0.0 to 1.0+ (can boost beyond 1.0)
audioTrack.setVolume(volumeLevel); // e.g., 0.5 for 50%, 1.5 for 150%

// In RemoteParticipantAudio component:
const { volume } = useVolumeStore(participantId);
useEffect(() => {
  if (audioTrack) {
    audioTrack.setVolume(volume);
  }
}, [audioTrack, volume]);
```

**Option 2: Web Audio API GainNode (More Control)**

```typescript
// Create audio context and gain node
const audioContext = new AudioContext();
const gainNode = audioContext.createGain();

// Connect: audio element -> gain node -> speakers
const source = audioContext.createMediaElementSource(audioElement);
source.connect(gainNode);
gainNode.connect(audioContext.destination);

// Set volume (0.0 to 2.0 for 0-200%)
gainNode.gain.value = volumeLevel;
```

LiveKit's `setVolume()` is recommended for MVP due to simplicity and direct integration.

[Source: LiveKit Client SDK Docs, Web Audio API MDN]

### shadcn/ui Slider Component

The Slider component works well for volume control:

```tsx
import { Slider } from '@/components/ui/slider';

<Slider
  value={[volume * 100]} // Convert 0-2 to 0-200
  onValueChange={([val]) => onChange(val / 100)} // Convert back
  min={0}
  max={200}
  step={1}
  className="w-32"
/>
```

For boost zone styling, use custom CSS or conditional classes:

```tsx
<Slider
  className={cn(
    "w-32",
    volume > 1 && "slider-boost" // Custom class for boost zone
  )}
/>
```

[Source: shadcn/ui docs]

### Volume State Pattern

Session-only storage (NOT persisted to localStorage):

```typescript
// In roomStore.ts or new volumeStore.ts
interface VolumeState {
  volumes: Record<string, number>; // participantId -> volume (0-2)
  setVolume: (participantId: string, volume: number) => void;
  getVolume: (participantId: string) => number;
  resetVolumes: () => void;
}

export const useVolumeStore = create<VolumeState>((set, get) => ({
  volumes: {},
  setVolume: (participantId, volume) =>
    set((state) => ({
      volumes: { ...state.volumes, [participantId]: volume }
    })),
  getVolume: (participantId) => get().volumes[participantId] ?? 1.0,
  resetVolumes: () => set({ volumes: {} }),
}));
```

Call `resetVolumes()` on room disconnect.

[Source: docs/architecture.md#Zustand-Store-Pattern]

### UI Pattern for Hover + Click

```tsx
// ParticipantListItem with hover volume icon
<div className="group flex items-center gap-2 px-2 py-1 hover:bg-accent">
  <Avatar />
  <span>{participant.name}</span>
  <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
    <VolumePopover participantId={participant.id} />
  </div>
</div>
```

Volume icon only appears on hover (Tailwind `group-hover`).

[Source: Tailwind CSS docs]

### Project Structure Notes

New files to create:
- `packages/client/src/components/MeetingRoom/VolumeControl.tsx` - slider component
- `packages/client/src/components/MeetingRoom/VolumePopover.tsx` - popover wrapper
- `packages/client/src/hooks/useParticipantVolume.ts` - volume application hook

Modifications to existing files:
- `packages/client/src/stores/roomStore.ts` - add volume state OR create separate volumeStore.ts
- `packages/client/src/components/MeetingRoom/RemoteParticipantAudio.tsx` - apply volume
- Sidebar participant list component - add volume icon trigger

May need to add shadcn/ui components:
- `packages/client/src/components/ui/slider.tsx` - if not already added
- `packages/client/src/components/ui/popover.tsx` - if not already added

[Source: docs/architecture.md#Project-Structure]

### Prerequisites

- Story 2.9 (Remote participant audio) - DONE
- Story 2.10 (Device selection) - In Review (patterns available)

### References

- [Epics: Story 2.11](docs/epics.md#Story-2.11)
- [Tech Spec: AC-2.11](docs/sprint-artifacts/tech-spec-epic-2.md#AC-2.11)
- [Architecture: Zustand Store Pattern](docs/architecture.md#Zustand-Store-Pattern)
- [PRD: Audio & Video Requirements FR14](docs/prd.md#Audio-Video)
- [Story 2.9: Remote Participant Audio](docs/sprint-artifacts/2-9-display-remote-participant-audio-video-streams.md)
- [Story 2.10: Device Selection](docs/sprint-artifacts/2-10-implement-device-selection-for-microphone-and-camera.md)
- [LiveKit Client SDK - RemoteTrack](https://docs.livekit.io/client-sdk-js/)
- [shadcn/ui Slider](https://ui.shadcn.com/docs/components/slider)
- [Web Audio API - GainNode](https://developer.mozilla.org/en-US/docs/Web/API/GainNode)

---

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/2-11-implement-participant-volume-control.context.xml

### Agent Model Used

Claude Opus 4.5

### Debug Log References

**2025-12-04 Implementation Plan:**
1. Add @radix-ui/react-slider and @radix-ui/react-popover packages
2. Create shadcn/ui Slider and Popover components
3. Create volumeStore.ts for session-only volume state
4. Create VolumeControl.tsx with slider (0-200% range, boost zone styling)
5. Create VolumePopover.tsx wrapper with popover trigger
6. Integrate into Sidebar ParticipantListItem with hover visibility
7. Update RemoteParticipantAudio to apply volume via track.setVolume()
8. Write comprehensive tests

### Completion Notes List

**Implementation Complete - 2025-12-04**

All acceptance criteria met:
- AC 2.11.1: Volume icon appears on hover for remote participants in sidebar
- AC 2.11.2: Clicking icon opens popover with volume slider (0-200% range)
- AC 2.11.3: Volume changes are instant via LiveKit RemoteAudioTrack.setVolume()
- AC 2.11.4: Volume at 0% acts as mute, shows VolumeX icon
- AC 2.11.5: Boost zone >100% styled with orange color, shows "Audio boosted" indicator
- AC 2.11.6: Session-only persistence in volumeStore, resets on room leave

Test coverage: 343 tests pass including new tests for:
- volumeStore.test.ts (15 tests)
- VolumeControl.test.tsx (12 tests)
- VolumePopover.test.tsx (12 tests)
- RemoteParticipantAudio.test.tsx (12 tests including 5 new volume tests)

### File List

**New Files Created:**
- packages/client/src/components/ui/slider.tsx - shadcn/ui Slider component
- packages/client/src/components/ui/popover.tsx - shadcn/ui Popover component
- packages/client/src/stores/volumeStore.ts - Session-only volume state management
- packages/client/src/components/MeetingRoom/VolumeControl.tsx - Slider component (0-200%)
- packages/client/src/components/MeetingRoom/VolumePopover.tsx - Popover trigger wrapper
- packages/client/src/components/MeetingRoom/VolumeControl.test.tsx - VolumeControl tests
- packages/client/src/components/MeetingRoom/VolumePopover.test.tsx - VolumePopover tests
- packages/client/src/stores/volumeStore.test.ts - Volume store tests

**Modified Files:**
- packages/client/src/components/MeetingRoom/Sidebar.tsx - Added VolumePopover to ParticipantListItem
- packages/client/src/components/MeetingRoom/RemoteParticipantAudio.tsx - Added volume control via setVolume
- packages/client/src/components/MeetingRoom/RemoteParticipantAudio.test.tsx - Added volume tests
- packages/client/src/components/MeetingRoom/MeetingRoom.tsx - Added volume reset on room leave
- packages/client/package.json - Added @radix-ui/react-slider, @radix-ui/react-popover

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-04 | Initial story draft from create-story workflow | SM Agent |
