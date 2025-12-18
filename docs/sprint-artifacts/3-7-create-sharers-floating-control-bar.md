# Story 3.7: Create Sharer's Control Bar (Transform Mode)

Status: done

## Architecture Change Notice

**ADR-009 (2025-12-18):** This story has been redesigned from "Floating Control Bar" (separate window) to "Transform Mode" (main window transforms). See `docs/architecture.md#ADR-009` for full rationale.

**Key Change:** Instead of creating a separate floating window, the main window transforms into a compact control bar during screen sharing. This eliminates IPC complexity, state sync issues, and extra memory overhead.

## Story

As a **screen sharer**,
I want **the main window to transform into a compact control bar that stays visible on top of all windows**,
So that **I can access meeting controls (mic, camera, stop sharing, leave) with my camera preview visible, without any state sync complexity**.

## Acceptance Criteria

1. **AC-3.7.1: Window transforms on share start**
   - Given I start sharing my screen
   - When the screen share becomes active
   - Then the main window transforms:
     - Resizes to compact bar (~450x80px)
     - Repositions to top-center of screen (below physical camera)
     - Sets always-on-top
     - Enables content protection (excluded from screen capture)

2. **AC-3.7.2: Control bar shows camera preview + controls**
   - Given the window is in transform mode
   - Then it shows:
     - Self camera preview (Around-style circular/rounded)
     - Other participant camera previews (optional, togglable)
     - 🔴 Sharing status indicator
     - Mic toggle button (mute/unmute)
     - Camera toggle button (enable/disable)
     - Annotate button (for future annotation feature)
     - "Stop Share" button (accent color)
     - "Leave" button (destructive style)
   - And has semi-transparent dark background
   - And has rounded corners

3. **AC-3.7.3: Window always on top**
   - Given the window is in transform mode
   - Then it appears above all other windows including fullscreen apps
   - And it works across all screens/desktops (multi-monitor)
   - Note: Platform-specific always-on-top behavior required

4. **AC-3.7.4: Content protection (excluded from capture)**
   - Given the window is in transform mode
   - Then the window is NOT visible in the screen capture
   - Note: macOS `NSWindow.sharingType = .none`, Windows `WDA_EXCLUDEFROMCAPTURE`

5. **AC-3.7.5: Window is draggable**
   - Given the window is in transform mode
   - When I click and drag on non-interactive areas
   - Then I can reposition the bar anywhere on any screen
   - And position is persisted for next session

6. **AC-3.7.6: Mic toggle works directly**
   - Given I click the mic toggle button
   - Then my microphone mutes/unmutes immediately (same React context, no IPC)
   - And the button icon updates to reflect the state

7. **AC-3.7.7: Camera toggle works directly**
   - Given I click the camera toggle button
   - Then my camera enables/disables immediately (same React context, no IPC)
   - And the button icon updates to reflect the state

8. **AC-3.7.8: Stop Share restores window**
   - Given I click "Stop Share"
   - Then screen capture stops
   - And the window RESTORES:
     - Resizes to original dimensions
     - Repositions to original location
     - Disables always-on-top
     - Disables content protection
     - UI switches back to normal meeting view

9. **AC-3.7.9: Leave shows confirmation (host)**
   - Given I am the host
   - When I click "Leave"
   - Then a confirmation dialog appears
   - And on confirm, window restores then leaves meeting

10. **AC-3.7.10: View mode toggle (single/multi)**
    - Given the window is in transform mode
    - Then I can toggle between:
      - Single view: Just my camera preview
      - Multi view: All participants in horizontal strip

11. **AC-3.7.11: Visual separation between actions**
    - Given the window is in transform mode
    - Then Stop Share and Leave buttons have clear visual separation
    - And Stop Share uses accent color (filled)
    - And Leave uses destructive outline style

12. **AC-3.7.12: Position defaults to top-center**
    - Given no saved position exists
    - When window transforms
    - Then it positions at top-center of screen
    - Note: This is below where physical laptop camera typically is

[Source: docs/architecture.md#ADR-009]
[Supersedes: Original floating bar approach from ADR-003]

## Tasks / Subtasks (Transform Mode - ADR-009)

### Cleanup Old Implementation

- [x] **Task 0: Remove old floating bar code**
  - [x] Delete `packages/client/src/components/ScreenShare/FloatingControlBar.tsx`
  - [x] Delete `packages/client/src/components/ScreenShare/FloatingControlBarPage.tsx`
  - [x] Delete `packages/client/src/hooks/useFloatingControlBar.ts`
  - [x] Remove floating bar exports from `ScreenShare/index.ts`
  - [x] Remove `/floating-control-bar` route from `App.tsx`
  - [x] Remove floating bar event listeners from `useScreenShare.ts`
  - [x] Remove floating bar Tauri commands from `screen_share.rs`
  - [x] Remove floating bar tests
  - [x] Update `capabilities/default.json` (remove floating-control-bar window)

### New Transform Mode Implementation

- [x] **Task 1: Add window transform Tauri commands** (AC: 3.7.1, 3.7.3)
  - [x] Add `transform_to_control_bar` command:
    - Save current window size/position
    - Resize to compact dimensions (~450x80px)
    - Reposition to top-center
    - Set always-on-top
    - Enable content protection
  - [x] Add `restore_from_control_bar` command:
    - Restore saved window size/position
    - Disable always-on-top
    - Disable content protection
  - [x] Add `is_transform_mode_active` command for state checking

- [x] **Task 2: Implement content protection** (AC: 3.7.4)
  - [x] macOS: `NSWindow.sharingType = .none`
  - [x] Windows: `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)`
  - [ ] Test that window is NOT visible in screen capture (manual test required)

- [x] **Task 3: Create SharerControlBar component** (AC: 3.7.2, 3.7.11)
  - [x] Create `packages/client/src/components/ScreenShare/SharerControlBar.tsx`
  - [x] Layout:
    - Self camera preview (circular/rounded)
    - Participant previews (horizontal strip, togglable)
    - Sharing status indicator (red dot)
    - Mic toggle button
    - Camera toggle button
    - Annotate button (disabled placeholder for now)
    - Stop Share button (accent, filled)
    - Leave button (destructive, outline)
  - [x] Semi-transparent dark background, rounded corners
  - [x] Make draggable via `data-tauri-drag-region`

- [x] **Task 4: Add transform mode to MeetingRoom** (AC: 3.7.1, 3.7.8)
  - [x] Add `isTransformMode` state to track window mode
  - [x] When sharing starts: call `transform_to_control_bar`, set `isTransformMode = true`
  - [x] When sharing stops: call `restore_from_control_bar`, set `isTransformMode = false`
  - [x] Render `SharerControlBar` when `isTransformMode` is true
  - [x] Render normal meeting view when `isTransformMode` is false

- [x] **Task 5: Implement view mode toggle** (AC: 3.7.10)
  - [x] Add toggle button in SharerControlBar
  - [x] Single view: Show only self camera
  - [x] Multi view: Show all participants in horizontal strip
  - [ ] Persist preference in settings (deferred - uses local state for now)

- [x] **Task 6: Position persistence** (AC: 3.7.5, 3.7.12)
  - [x] Save control bar position on drag end (via onMoved listener)
  - [x] Load saved position on transform
  - [x] Validate position against screen bounds
  - [x] Default to top-center if invalid/no saved position

- [x] **Task 7: Write tests**
  - [x] Unit test: SharerControlBar renders all elements (13 tests passing)
  - [x] Unit test: Transform mode state management (covered by render tests)
  - [x] Unit test: Position persistence (covered in store tests)
  - [ ] Integration test: Window transforms on share start (manual test required)
  - [ ] Integration test: Window restores on share stop (manual test required)

## Dev Notes

### Architecture Context (Updated per ADR-009)

**Transform Mode** replaces the separate floating bar window:
- Main window transforms in-place (resize, reposition, always-on-top)
- Same React context - no IPC needed for controls
- Same Zustand stores - direct state access
- Same LiveKit connection - direct API calls
- Content protection excludes window from screen capture

### Technical Approach

**Window Transform (Rust):**
```rust
#[tauri::command]
async fn transform_to_control_bar(window: tauri::Window) -> Result<(), String> {
    // Save current state
    let current_size = window.outer_size()?;
    let current_position = window.outer_position()?;

    // Transform
    window.set_size(LogicalSize::new(450.0, 80.0))?;
    window.set_position(/* top-center */)?;
    window.set_always_on_top(true)?;
    set_content_protection(&window, true)?;

    Ok(())
}
```

**Content Protection (Rust):**
```rust
fn set_content_protection(window: &tauri::Window, enabled: bool) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use cocoa::appkit::NSWindow;
        let ns_window = window.ns_window()? as cocoa::base::id;
        unsafe {
            let _: () = msg_send![ns_window, setSharingType: if enabled { 0 } else { 1 }];
        }
    }

    #[cfg(target_os = "windows")]
    {
        use windows::Win32::UI::WindowsAndMessaging::*;
        let hwnd = window.hwnd()?;
        unsafe {
            SetWindowDisplayAffinity(hwnd, if enabled { WDA_EXCLUDEFROMCAPTURE } else { WDA_NONE });
        }
    }

    Ok(())
}
```

**React Component Structure:**
```tsx
// MeetingRoom.tsx
function MeetingRoom() {
  const { isSharing } = useScreenShare()
  const [isTransformMode, setIsTransformMode] = useState(false)

  // Transform on share start
  useEffect(() => {
    if (isSharing) {
      invoke('transform_to_control_bar')
      setIsTransformMode(true)
    } else if (isTransformMode) {
      invoke('restore_from_control_bar')
      setIsTransformMode(false)
    }
  }, [isSharing])

  if (isTransformMode) {
    return <SharerControlBar />  // Compact view with camera + controls
  }

  return <NormalMeetingView />  // Full meeting UI
}
```

### Benefits over Previous Approach

| Aspect | Old (Floating Bar) | New (Transform Mode) |
|--------|-------------------|---------------------|
| Windows | 2 separate | 1 transformed |
| State sync | 7 events via IPC | None (same context) |
| Memory | +25MB WebView | No overhead |
| Controls | Event bridge to LiveKit | Direct LiveKit access |
| Debugging | Hard (distributed) | Easy (single window) |

### References

- [ADR-009: Transform Mode](docs/architecture.md#ADR-009)
- Zoom screen sharing UX (inspiration)
- Around app circular avatars (future enhancement)

### Future Enhancement: Face-Tracking Camera Crop

For "Around-style" circular avatars with face focus:

| Approach | Platform | Notes |
|----------|----------|-------|
| Apple Vision framework | macOS | Native, fast, uses Neural Engine |
| MediaPipe Face Detection | WebView | Cross-platform, ~30fps |
| ONNX Runtime in Rust | Core | Cross-platform, need model |
| Windows.Media.FaceAnalysis | Windows | Native |

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Architecture Decision

- **ADR-009 (2025-12-18):** Replaced floating bar approach with Transform Mode
- Eliminates IPC complexity, state sync issues, extra memory overhead
- Main window transforms in-place instead of creating second window

### Files to Create (Transform Mode)

- `packages/client/src/components/ScreenShare/SharerControlBar.tsx` - Compact control bar UI
- Transform commands in `screen_share.rs`

### Files to Delete (Old Floating Bar)

- `packages/client/src/components/ScreenShare/FloatingControlBar.tsx`
- `packages/client/src/components/ScreenShare/FloatingControlBarPage.tsx`
- `packages/client/src/hooks/useFloatingControlBar.ts`
- `packages/client/tests/components/ScreenShare/FloatingControlBar.test.tsx`
- `packages/client/tests/hooks/useFloatingControlBar.test.ts`

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-17 | Initial story draft (floating bar approach) | Dev Agent |
| 2025-12-17 | Enhanced via Advanced Elicitation | Dev Agent |
| 2025-12-18 | Floating bar implementation (v1) | Claude Opus 4.5 |
| 2025-12-18 | **ADR-009**: Redesigned to Transform Mode approach - main window transforms instead of separate floating bar. Eliminates IPC complexity. | Claude Opus 4.5 |
| 2025-12-18 | **Implementation Complete**: Removed old floating bar, implemented transform commands (Rust), content protection (macOS/Windows), SharerControlBar UI, MeetingRoom integration, 13 tests passing. | Claude Opus 4.5 |
