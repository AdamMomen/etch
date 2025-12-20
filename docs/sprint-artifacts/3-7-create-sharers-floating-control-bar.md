# Story 3.7: Create Sharer's Floating Control Bar (Vertical Design)

Status: in-progress

## Architecture Change Notice

**ADR-009 (2025-12-18):** Redesigned from separate floating window to Transform Mode (main window transforms).

**ADR-010 (2025-12-20):** Redesigned from horizontal bar to **Vertical Layout** with:
- Smart same-screen detection for bandwidth optimization
- Oval video frames (Around-style)
- 4 circular control buttons with dropdowns
- View mode toggles (single/multi/hide)

## Story

As a **screen sharer**,
I want **the main window to transform into a compact vertical control bar with my camera preview and meeting controls**,
So that **I can manage my meeting presence while sharing, with minimal screen footprint and optimized bandwidth**.

## Acceptance Criteria

1. **AC-3.7.1: Window transforms on share start (same screen)**
   - Given I start sharing my screen
   - When the shared screen is on the SAME monitor as the Nameless window
   - Then the main window transforms:
     - Resizes to compact vertical dimensions (~200x380px)
     - Removes window decorations (borderless floating pill)
     - Sets always-on-top
     - Enables content protection (excluded from capture)
     - Repositions to right edge of screen (or saved position)

2. **AC-3.7.2: Window stays full on different screen**
   - Given I start sharing my screen
   - When the shared screen is on a DIFFERENT monitor than the Nameless window
   - Then the main window stays full-size on the other monitor
   - And I can view the meeting normally while sharing

3. **AC-3.7.3: Vertical layout with video previews**
   - Given the window is in floating control bar mode
   - Then it displays vertically:
     - Top bar with view toggle icons (40px)
     - Self camera preview in large oval frame (~140px)
     - Participant preview(s) in oval frames (~140px, scrollable if >2)
     - Bottom control bar with 4 circular buttons (60px)
   - And has semi-transparent dark background (`rgba(0,0,0,0.85)`)
   - And has rounded corners (16px border radius)

4. **AC-3.7.4: Top bar view controls**
   - Given the floating control bar is visible
   - Then the top bar shows 3 toggle icons (left to right):
     1. **Single view** (👤) — Show only self camera preview
     2. **Multi view** (👥) — Show self + participant previews
     3. **Hide videos** (⊘) — Collapse video section, show only controls (~120px total height)

5. **AC-3.7.5: Bottom control bar with 4 circular buttons**
   - Given the floating control bar is visible
   - Then the bottom bar shows 4 circular buttons (left to right):
     1. **Annotation** (✏️) — Opens annotation tools
     2. **Camera** (📹) — Toggle camera + dropdown for device selection
     3. **Mic** (🎤) — Toggle mic + dropdown for device selection
     4. **Stop** (⏹) — Stops sharing with confirmation popup
   - And buttons are 44px diameter with 12px gap

6. **AC-3.7.6: Camera/Mic dropdowns for device selection**
   - Given I click the dropdown indicator on Camera or Mic button
   - Then a menu appears listing available devices
   - And I can switch devices without leaving the control bar
   - And the dropdown closes after selection

7. **AC-3.7.7: Stop sharing confirmation popup**
   - Given I click the Stop button
   - Then a confirmation popup appears: "Stop sharing?"
   - And I must confirm to stop (prevents accidental clicks)
   - And on confirm, sharing stops and window restores

8. **AC-3.7.8: Conditional unsubscribe (bandwidth optimization)**
   - Given I am sharing on the SAME screen as the Nameless window
   - Then I am unsubscribed from my own screen share track
   - And bandwidth is saved (I see my actual screen, not the feed)
   - Note: Uses monitor comparison to detect same-screen scenario

9. **AC-3.7.9: Resubscribe on restore**
   - Given I stop sharing (or move to different screen)
   - Then I am resubscribed to remote screen share tracks
   - And the window restores to previous size/position/decorations

10. **AC-3.7.10: Window is draggable**
    - Given the floating control bar is visible
    - When I drag on non-interactive areas (top bar, between elements)
    - Then I can reposition anywhere on screen
    - And position is persisted for next session

11. **AC-3.7.11: Oval video frames (Around-style)**
    - Given video previews are displayed
    - Then they use soft oval/rounded frames (border-radius: 50%)
    - And show colored avatar placeholder when camera is off
    - And self video is mirrored (scaleX: -1)

12. **AC-3.7.12: Content protection**
    - Given the window is in transform mode
    - Then the window is NOT visible in the screen capture
    - Note: macOS `NSWindow.sharingType = .none`, Windows `WDA_EXCLUDEFROMCAPTURE`

13. **AC-3.7.13: Window always on top**
    - Given the window is in transform mode
    - Then it appears above all other windows including fullscreen apps
    - And it works across all screens/desktops (multi-monitor)

## Visual Spec

```
┌──────────────────────┐
│  [👤] [👥] [⊘]      │  ← Top bar: view toggles (40px)
├──────────────────────┤
│  ╭────────────────╮  │
│  │                │  │
│  │   👤 Self      │  │  ← Self camera oval (140px)
│  │                │  │
│  ╰────────────────╯  │
├──────────────────────┤
│  ╭────────────────╮  │
│  │                │  │
│  │  👤 Participant│  │  ← Participant oval (140px)
│  │                │  │
│  ╰────────────────╯  │
├──────────────────────┤
│   ◯    ◯    ◯    ◯   │  ← Bottom controls (60px)
│   ✏️   📹   🎤   ⏹   │
│        ▾    ▾        │  ← Dropdown indicators
└──────────────────────┘
     ~200px wide
     ~380px tall (multi view)
     ~280px tall (single view)
     ~120px tall (hide videos)
```

[Source: User sketch 2025-12-20]
[Supersedes: Horizontal bar design from ADR-009]

## Tasks / Subtasks

### Completed (Previous Implementation)

- [x] **Task 0: Remove old floating bar code** — Done 2025-12-18
- [x] **Task 1: Add window transform Tauri commands** — Done 2025-12-18
- [x] **Task 2: Implement content protection** — Done 2025-12-18
- [x] **Task 8: Fix window decorations** — Done 2025-12-20

### Vertical Design Implementation (ADR-010) — 2025-12-20

- [x] **Task 9: Same-screen detection** (AC: 3.7.1, 3.7.2, 3.7.8)
  - [x] Compare window monitor to shared screen bounds via `checkIsSameScreen()`
  - [x] Store `sharedScreenBounds` in useScreenShare hook
  - [x] Export `checkIsSameScreen` function from hook
  - [x] Only transform window if on same screen
  - [x] Keep full UI if sharing on different monitor

- [ ] **Task 10: Conditional track unsubscribe** (AC: 3.7.8, 3.7.9) — Deferred
  - [ ] When `isSameScreen && isLocalSharing`: unsubscribe from own screen track
  - [ ] When stopping share: resubscribe to remote tracks
  - [ ] Use `track.setSubscribed(false/true)` LiveKit API
  - Note: Deferred to post-v1 — bandwidth optimization, not critical for UX

- [x] **Task 11: Create SharerControlBarVertical component** (AC: 3.7.3, 3.7.11)
  - [x] Create `packages/client/src/components/ScreenShare/SharerControlBarVertical.tsx`
  - [x] Vertical layout: 200px wide, variable height
  - [x] Semi-transparent dark background (`rgba(0,0,0,0.85)`)
  - [x] Border radius 16px
  - [x] Draggable via `data-tauri-drag-region`

- [x] **Task 12: Top bar view toggles** (AC: 3.7.4)
  - [x] 3 toggle buttons: Single (👤), Multi (👥), Hide (⊘)
  - [x] State management for view mode
  - [x] Dynamic height based on view mode:
    - Multi: ~420px
    - Single: ~280px
    - Hide: ~120px

- [x] **Task 13: Oval video frames** (AC: 3.7.11)
  - [x] Self camera preview with oval frame (border-radius: 50%)
  - [x] Participant previews with oval frames (stacked circles for multiple)
  - [x] Avatar placeholder when camera off
  - [x] Mirror self video (scaleX: -1)

- [x] **Task 14: Bottom control bar with 4 buttons** (AC: 3.7.5)
  - [x] Annotation button (✏️) — disabled placeholder
  - [x] Camera button (📹) with toggle state
  - [x] Mic button (🎤) with toggle state
  - [x] Stop button (⏹) with red background
  - [x] 44px diameter buttons, 12px gap

- [x] **Task 15: Device selection dropdowns** (AC: 3.7.6)
  - [x] Dropdown on Camera button (ChevronDown indicator)
  - [x] Dropdown on Mic button (ChevronDown indicator)
  - [x] List available devices from `useDevices` hook
  - [x] Switch device on selection

- [x] **Task 16: Stop confirmation popup** (AC: 3.7.7)
  - [x] AlertDialog with "Stop sharing?" message
  - [x] Cancel/Stop buttons
  - [x] On confirm: calls `onStopShare` prop

- [x] **Task 17: Update transform dimensions** (AC: 3.7.1)
  - [x] Change `CONTROL_BAR_WIDTH` from 450 to 200
  - [x] Change `CONTROL_BAR_HEIGHT` from 80 to 420
  - [x] Update default position to right edge of screen, vertically centered

- [x] **Task 18: Update MeetingRoom integration**
  - [x] Replace `SharerControlBar` with `SharerControlBarVertical`
  - [x] Add same-screen detection logic via `checkIsSameScreen`
  - [x] Conditional transform: only transform if on same screen
  - [x] Remove auto-minimize from useScreenShare (let MeetingRoom handle)

- [ ] **Task 19: Write tests for new components** — Pending
  - [ ] Unit test: SharerControlBarVertical renders correctly
  - [ ] Unit test: View mode toggles work
  - [ ] Unit test: Device dropdowns work
  - [ ] Unit test: Stop confirmation works
  - [ ] Integration test: Same-screen detection

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
| 2025-12-20 | **Bug Fix**: Added `set_decorations(false)` and `set_shadow(false)` to transform mode for proper borderless floating pill UI. Window was showing title bar/borders. | Claude Opus 4.5 |
| 2025-12-20 | **ADR-010**: Complete redesign to **Vertical Layout**. New spec includes: same-screen detection for conditional transform, bandwidth optimization via track unsubscribe, oval video frames, 4 circular control buttons with dropdowns, view mode toggles (single/multi/hide), stop confirmation popup. 13 new acceptance criteria. | Claude Opus 4.5 |
| 2025-12-20 | **Implementation**: Created `SharerControlBarVertical.tsx` with full vertical design. Implemented same-screen detection in `useScreenShare` hook. Updated MeetingRoom to use new component with conditional transform. Updated Rust dimensions (200x420px, right-edge position). Tasks 9, 11-18 complete. Task 10 (bandwidth optimization) deferred. | Claude Opus 4.5 |
