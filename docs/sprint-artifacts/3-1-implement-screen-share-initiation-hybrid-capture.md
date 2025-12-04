# Story 3.1: Implement Screen Share Initiation (Hybrid Capture)

Status: review

## Story

As a **meeting participant**,
I want **to share my entire screen or a specific window**,
So that **other participants can see what I'm working on**.

## Acceptance Criteria

1. **AC-3.1.1: Share Screen Button Shows Native Picker**
   - Given I'm in a meeting room
   - When I click the "Share Screen" button
   - Then the system shows the native screen/window picker dialog
   - And the picker shows available screens (for multi-monitor setups)
   - And the picker shows open application windows
   - And preview thumbnails are shown where supported

2. **AC-3.1.2: Selection Starts Capture**
   - Given I've selected a screen or window in the picker
   - When I confirm the selection
   - Then screen capture starts immediately
   - And the screen share track is published to LiveKit
   - And encoding uses 1080p/VP9 at 4-6 Mbps

3. **AC-3.1.3: Main Window Minimizes**
   - Given screen capture has started
   - When the track is successfully published
   - Then the main Nameless window automatically minimizes
   - And the selected window/screen is focused (brought to foreground)

4. **AC-3.1.4: Sharing Badge Displayed**
   - Given I'm sharing my screen
   - When viewing the participant list
   - Then my participant entry shows a "Sharing" badge

5. **AC-3.1.5: Cancel Picker Does Nothing**
   - Given I click "Share Screen"
   - When I cancel or dismiss the native picker
   - Then no screen share starts
   - And the main window stays open
   - And the button remains in default state

6. **AC-3.1.6: Keyboard Shortcut**
   - Given I'm in a meeting room
   - When I press ⌘S (Mac) or Ctrl+S (Windows/Linux)
   - Then the share screen flow is triggered (same as button click)

7. **AC-3.1.7: Platform Detection (Hybrid Capture)**
   - Given I'm on Windows
   - When I initiate screen share
   - Then WebView getDisplayMedia API is used
   - Given I'm on macOS or Linux
   - When I initiate screen share
   - Then the Rust sidecar is used for capture (requires Story 3.10)

[Source: docs/epics.md#Story-3.1, docs/sprint-artifacts/tech-spec-epic-3.md#AC-3.1]

## Tasks / Subtasks

- [x] **Task 1: Create screenShareStore** (AC: 3.1.1-3.1.7)
  - [x] Create `packages/client/src/stores/screenShareStore.ts`
  - [x] Add state: `isSharing`, `sharerId`, `sharerName`, `isLocalSharing`, `sharedSource`, `sharedSourceId`
  - [x] Add actions: `startSharing()`, `stopSharing()`, `setRemoteSharer()`
  - [x] Export store and types

- [x] **Task 2: Create useScreenShare hook** (AC: 3.1.1-3.1.3)
  - [x] Create `packages/client/src/hooks/useScreenShare.ts`
  - [x] Implement `startScreenShare()` using getDisplayMedia (Windows)
  - [x] Configure video constraints: 1920x1080, 30fps, VP9 codec
  - [x] Publish track to LiveKit with `Track.Source.ScreenShare`
  - [x] Handle picker cancellation gracefully
  - [x] Add platform detection for hybrid capture (Windows vs macOS/Linux)

- [x] **Task 3: Create ScreenShareButton component** (AC: 3.1.1, 3.1.4, 3.1.5)
  - [x] Create `packages/client/src/components/ScreenShare/ScreenShareButton.tsx`
  - [x] Style: outline variant when not sharing, accent when sharing
  - [x] Show "Share Screen" / "Stop Sharing" icons
  - [x] Add "Sharing" badge in participant list
  - [x] Integrate with useScreenShare hook

- [x] **Task 4: Implement keyboard shortcut** (AC: 3.1.6)
  - [x] Add useEffect in MeetingRoom to listen for ⌘S / Ctrl+S
  - [x] Prevent default browser save behavior
  - [x] Trigger startScreenShare on keypress

- [x] **Task 5: Implement main window minimize** (AC: 3.1.3)
  - [x] Create Tauri command `minimize_main_window` in Rust
  - [x] Create Tauri command `restore_main_window` in Rust
  - [x] Call minimize after successful track publish
  - [x] Restore window when sharing stops

- [x] **Task 6: Integrate into MeetingRoom** (AC: all)
  - [x] Add ScreenShareButton to MeetingControlsBar
  - [x] Wire up screenShareStore state via useScreenShare hook
  - [x] Update participant list in Sidebar to show "Sharing" badge

- [x] **Task 7: Add platform detection stub for sidecar** (AC: 3.1.7)
  - [x] Create Tauri command `get_platform()` returning "windows" | "macos" | "linux"
  - [x] Add conditional logic in useScreenShare to check platform
  - [x] For macOS/Linux: show "Screen sharing on macOS/Linux coming soon" toast
  - [x] For Windows: use getDisplayMedia path

- [x] **Task 8: Write tests** (AC: all)
  - [x] Test screenShareStore state transitions (10 tests)
  - [x] Test useScreenShare hook with mocked getDisplayMedia (11 tests)
  - [x] Test ScreenShareButton renders and interactions correctly (10 tests)
  - [x] Test keyboard shortcut triggers share
  - [x] Test platform detection logic

## Dev Notes

### Learnings from Previous Story

**From Story 2-14 (Status: done)**

- **settingsStore Pattern**: Use Zustand with persist middleware (see `settingsStore.ts:40`)
- **New Component Pattern**: SettingsModal shows Dialog/Modal pattern to follow
- **Test Pattern**: 413 tests passing - maintain coverage
- **Tauri Commands**: See existing patterns in `src-tauri/src/`

**Advisory for this Story:**
- This story implements Windows capture only (getDisplayMedia)
- macOS/Linux capture via Rust sidecar is Story 3.10 (dependency)
- Floating control bar, share border, overlay are separate stories (3.7, 3.8, 3.6)
- Main window minimize/restore is partial implementation (full in 3.9)

[Source: docs/sprint-artifacts/2-14-implement-user-preferences-storage.md#Dev-Agent-Record]

### Implementation Approach

**Screen Share Store:**

```typescript
// screenShareStore.ts
import { create } from 'zustand';

interface ScreenShareState {
  isSharing: boolean;           // Anyone sharing in room
  sharerId: string | null;      // Who is sharing
  sharerName: string | null;
  isLocalSharing: boolean;      // Am I sharing
  sharedSource: 'screen' | 'window' | null;
  sharedSourceId: string | null;

  startSharing: (source: 'screen' | 'window', sourceId: string) => void;
  stopSharing: () => void;
  setRemoteSharer: (id: string | null, name: string | null) => void;
}

export const useScreenShareStore = create<ScreenShareState>((set) => ({
  isSharing: false,
  sharerId: null,
  sharerName: null,
  isLocalSharing: false,
  sharedSource: null,
  sharedSourceId: null,

  startSharing: (source, sourceId) => set({
    isSharing: true,
    isLocalSharing: true,
    sharedSource: source,
    sharedSourceId: sourceId,
  }),

  stopSharing: () => set({
    isSharing: false,
    isLocalSharing: false,
    sharerId: null,
    sharerName: null,
    sharedSource: null,
    sharedSourceId: null,
  }),

  setRemoteSharer: (id, name) => set({
    isSharing: id !== null,
    sharerId: id,
    sharerName: name,
    isLocalSharing: false,
  }),
}));
```

[Source: docs/sprint-artifacts/tech-spec-epic-3.md#Services-and-Modules]

**useScreenShare Hook:**

```typescript
// useScreenShare.ts
import { useCallback, useState } from 'react';
import { Track } from 'livekit-client';
import { useScreenShareStore } from '@/stores/screenShareStore';
import { invoke } from '@tauri-apps/api/core';

export function useScreenShare(room: Room | null) {
  const { isSharing, isLocalSharing, startSharing, stopSharing } = useScreenShareStore();
  const [screenTrack, setScreenTrack] = useState<LocalVideoTrack | null>(null);

  const startScreenShare = useCallback(async () => {
    if (!room) return;

    // Platform detection
    const platform = await invoke<string>('get_platform');
    if (platform !== 'windows') {
      toast.error('Screen sharing on macOS/Linux requires Story 3.10');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30, max: 60 }
        },
        audio: false
      });

      const track = stream.getVideoTracks()[0];
      await room.localParticipant.publishTrack(track, {
        name: 'screen',
        source: Track.Source.ScreenShare,
        videoEncoding: {
          maxBitrate: 6_000_000,
          maxFramerate: 30
        },
        videoCodec: 'vp9'
      });

      // Minimize main window
      await invoke('minimize_main_window');

      startSharing('screen', track.id);
      setScreenTrack(track);

      // Listen for track ended (user clicked "Stop sharing" in browser UI)
      track.onended = () => {
        handleStopShare();
      };
    } catch (err) {
      // User cancelled picker - do nothing
      console.log('Screen share cancelled or failed:', err);
    }
  }, [room, startSharing]);

  // ... stopScreenShare implementation
}
```

[Source: docs/sprint-artifacts/tech-spec-epic-3.md#APIs-and-Interfaces]

**Tauri Commands (Rust):**

```rust
// src-tauri/src/screen_share.rs
#[tauri::command]
pub fn get_platform() -> String {
    #[cfg(target_os = "windows")]
    return "windows".to_string();
    #[cfg(target_os = "macos")]
    return "macos".to_string();
    #[cfg(target_os = "linux")]
    return "linux".to_string();
}

#[tauri::command]
pub async fn minimize_main_window(window: tauri::Window) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn restore_main_window(window: tauri::Window) -> Result<(), String> {
    window.unminimize().map_err(|e| e.to_string())
}
```

[Source: docs/sprint-artifacts/tech-spec-epic-3.md#Tauri-Commands]

### Project Structure Notes

**New files to create:**
- `packages/client/src/stores/screenShareStore.ts` - Screen share state
- `packages/client/src/stores/screenShareStore.test.ts` - Store tests
- `packages/client/src/hooks/useScreenShare.ts` - Screen share hook
- `packages/client/src/hooks/useScreenShare.test.ts` - Hook tests
- `packages/client/src/components/ScreenShare/ScreenShareButton.tsx` - Button component
- `packages/client/src/components/ScreenShare/ScreenShareButton.test.tsx` - Button tests
- `packages/client/src/components/ScreenShare/index.ts` - Barrel export
- `packages/client/src-tauri/src/screen_share.rs` - Tauri commands

**Modifications to existing files:**
- `packages/client/src-tauri/src/lib.rs` - Register new commands
- `packages/client/src/components/MeetingRoom/ControlBar.tsx` - Add ScreenShareButton
- `packages/client/src/components/MeetingRoom/ParticipantList.tsx` - Show "Sharing" badge

### Prerequisites

- Story 2.6 (LiveKit Room Connection) - DONE
- Story 3.10 (Rust Sidecar) - NOT DONE (macOS/Linux will show stub message)

### Dependencies Note

Per tech spec recommended order, Story 3.10 should ideally be implemented before 3.1 for full macOS/Linux support. However, this story can be implemented for Windows-only first, with macOS/Linux showing a "coming soon" message until 3.10 is complete.

### References

- [Epics: Story 3.1](docs/epics.md#Story-3.1)
- [Tech Spec: Epic 3](docs/sprint-artifacts/tech-spec-epic-3.md)
- [Previous Story: 2-14](docs/sprint-artifacts/2-14-implement-user-preferences-storage.md)
- [Architecture: ADR-007 Hybrid Capture](docs/architecture.md#ADR-007)
- [LiveKit Screen Share](https://docs.livekit.io/client-sdk-js/classes/LocalParticipant.html#setScreenShareEnabled)
- [Tauri Window API](https://v2.tauri.app/reference/javascript/api/namespacetauri/#window)

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/3-1-implement-screen-share-initiation-hybrid-capture.context.xml`

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

- Implementation followed tech-spec-epic-3.md patterns closely
- Used Zustand store pattern from settingsStore.ts
- Used hook pattern from useVideo.ts for LiveKit integration

### Completion Notes List

- Story 3.1 implements screen share initiation for Windows using getDisplayMedia API
- macOS/Linux support is stubbed out pending Story 3.10 (Rust sidecar)
- All 8 tasks completed successfully with 31 new tests added (444 total tests passing)
- ScreenShareButton replaces placeholder in MeetingControlsBar
- Sidebar shows "Sharing" badge when participant is sharing
- Keyboard shortcut Cmd/Ctrl+S triggers screen share
- Main window minimizes on share, restores on stop
- Platform detection via Tauri command determines capture method

### File List

**New Files:**
- `packages/client/src/stores/screenShareStore.ts` - Screen share state management
- `packages/client/src/stores/screenShareStore.test.ts` - Store tests (10 tests)
- `packages/client/src/hooks/useScreenShare.ts` - Screen share hook with LiveKit integration
- `packages/client/src/hooks/useScreenShare.test.ts` - Hook tests (11 tests)
- `packages/client/src/components/ScreenShare/ScreenShareButton.tsx` - Share button component
- `packages/client/src/components/ScreenShare/ScreenShareButton.test.tsx` - Component tests (10 tests)
- `packages/client/src/components/ScreenShare/index.ts` - Barrel export
- `packages/client/src-tauri/src/screen_share.rs` - Tauri commands (get_platform, minimize/restore window)

**Modified Files:**
- `packages/client/src-tauri/src/lib.rs` - Register new Tauri commands
- `packages/client/src/components/MeetingRoom/MeetingControlsBar.tsx` - Use ScreenShareButton
- `packages/client/src/components/MeetingRoom/MeetingRoom.tsx` - Add keyboard shortcut, integrate useScreenShare
- `packages/client/src/components/MeetingRoom/Sidebar.tsx` - Add "Sharing" badge to participant list
- `packages/shared/src/types/room.ts` - Add isScreenSharing to Participant interface

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-05 | Initial story draft from create-story workflow | SM Agent |
| 2025-12-05 | Completed all 8 tasks, 31 tests added, ready for review | Dev Agent |
