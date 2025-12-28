# Story 3.7: Create Sharer's Menu Bar Control

Status: complete

## Architecture Change Notice

**ADR-011 (2025-12-21):** Complete redesign to **Menu Bar approach**. Replaces all previous floating window/transform mode designs (ADR-009, ADR-010) with native macOS menu bar control.

**Design Principle:** Simplest solution wins.

## Story

As a **screen sharer**,
I want **a menu bar icon with quick controls while sharing**,
So that **I can stop sharing or leave the meeting without switching windows**.

## Acceptance Criteria

1. **AC-3.7.1: Tray Icon Appears When Sharing**
   - Given I start sharing my screen
   - When the screen share is active
   - Then a tray icon appears in the macOS menu bar
   - And the icon has a red dot badge indicating active share

2. **AC-3.7.2: Menu Shows on Click**
   - Given the tray icon is visible
   - When I click the tray icon
   - Then a native menu appears with:
     - "Sharing Screen" status header (disabled, with red indicator)
     - Separator
     - "Open Etch" (⌘O)
     - "Stop Sharing" (⌘S)
     - "Leave Meeting" (⌘Q)

3. **AC-3.7.3: Open Etch Works**
   - Given the menu is visible
   - When I click "Open Etch"
   - Then the main Etch window shows and focuses
   - And I can access full meeting controls (mic, camera, etc.)

4. **AC-3.7.4: Stop Sharing Works**
   - Given the menu is visible
   - When I click "Stop Sharing"
   - Then screen sharing stops immediately
   - And the tray icon red dot badge is removed
   - And the main window restores (if minimized)

5. **AC-3.7.5: Leave Meeting Works**
   - Given the menu is visible
   - When I click "Leave Meeting"
   - Then I leave the meeting immediately
   - And the tray icon is hidden
   - And the main window shows the home screen

6. **AC-3.7.6: Keyboard Shortcuts Work**
   - Given the menu is visible
   - When I press ⌘O, ⌘S, or ⌘Q
   - Then the corresponding action executes

7. **AC-3.7.7: Tray Icon Hidden When Not Sharing**
   - Given I am not sharing my screen
   - When I look at the menu bar
   - Then no Etch sharing indicator is visible

## Visual Spec

### Tray Icon States

| State | Icon |
|-------|------|
| In meeting, not sharing | No tray icon |
| In meeting, sharing | App icon + red dot badge |

### Menu Layout

```
┌──────────────────────┐
│ 🔴 Sharing Screen    │  ← status (disabled)
│ ──────────────────── │  ← separator
│ Open Etch   ⌘O   │  ← show main window
│ Stop Sharing    ⌘S   │  ← stop screen share
│ Leave Meeting   ⌘Q   │  ← leave meeting
└──────────────────────┘
```

**That's it. 3 actions.**

## Tasks / Subtasks

- [x] **Task 1: Create Tauri tray icon infrastructure** (AC: 3.7.1, 3.7.7)
  - [x] Add `TrayIconBuilder` setup in `lib.rs` or new `tray.rs` module
  - [x] Create tray icon asset (app icon with red dot variant)
  - [x] Configure `show_menu_on_left_click(true)`
  - [x] Add Tauri commands: `show_share_tray()`, `hide_share_tray()`

- [x] **Task 2: Create native menu** (AC: 3.7.2)
  - [x] Build menu with `MenuBuilder`:
    - Disabled "Sharing Screen" status item
    - Separator
    - "Open Etch" with ⌘O accelerator
    - "Stop Sharing" with ⌘S accelerator
    - "Leave Meeting" with ⌘Q accelerator

- [x] **Task 3: Implement menu actions** (AC: 3.7.3, 3.7.4, 3.7.5, 3.7.6)
  - [x] `open_etch`: Show and focus main window
  - [x] `stop_sharing`: Emit `tray://stop-sharing` event to frontend
  - [x] `leave_meeting`: Emit `tray://leave-meeting` event to frontend
  - [x] Frontend listens and handles events

- [x] **Task 4: Integrate with screen share lifecycle**
  - [x] Call `show_share_tray()` when `startScreenShare` succeeds
  - [x] Call `hide_share_tray()` when sharing stops
  - [x] Listen for tray events in MeetingRoom component
  - [x] Clean up tray on app exit

- [x] **Task 5: Cleanup old implementation**
  - [x] Remove `SharerControlBar.tsx`
  - [x] Remove `SharerControlBarVertical.tsx`
  - [x] Remove `FloatingControlBarPage.tsx`
  - [x] Remove `floatingBarChannel.ts`
  - [x] Remove transform mode commands from `screen_share.rs`
  - [x] Remove related tests
  - [x] Update MeetingRoom to remove transform mode logic

- [x] **Task 6: Write tests**
  - [x] Test tray icon visibility on share start/stop
  - [x] Test menu action event emissions
  - [x] Test frontend event handlers

## Dev Notes

### Architecture Decision: ADR-011

**Decision:** Replace all previous approaches with native macOS menu bar control.

**Previous approaches (superseded):**
- ADR-003: Separate floating window (complex IPC)
- ADR-009: Transform mode (window transforms)
- ADR-010: Vertical layout (elaborate UI)

**Why this is better:**

| Aspect | Previous | Menu Bar |
|--------|----------|----------|
| Lines of code | ~800 | ~80 |
| Custom UI | Complex React components | None (native menu) |
| IPC | BroadcastChannel | Tauri events |
| State sync | Custom hooks | None needed |
| Maintenance | High | Minimal |
| Look & feel | Custom | Native macOS |

### Key Tauri APIs

```rust
use tauri::tray::{TrayIconBuilder};
use tauri::menu::{MenuBuilder, MenuItemBuilder};

pub fn create_share_tray(app: &AppHandle) -> Result<(), String> {
    let menu = MenuBuilder::new(app)
        .text("status", "🔴 Sharing Screen")
        .separator()
        .item(&MenuItemBuilder::new("Open Etch")
            .id("open")
            .accelerator("CmdOrCtrl+O")
            .build(app)?)
        .item(&MenuItemBuilder::new("Stop Sharing")
            .id("stop")
            .accelerator("CmdOrCtrl+S")
            .build(app)?)
        .item(&MenuItemBuilder::new("Leave Meeting")
            .id("leave")
            .accelerator("CmdOrCtrl+Q")
            .build(app)?)
        .build()?;

    TrayIconBuilder::new()
        .icon(/* app icon with red dot */)
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| {
            match event.id.as_ref() {
                "open" => {
                    if let Some(w) = app.get_webview_window("main") {
                        let _ = w.show();
                        let _ = w.set_focus();
                    }
                }
                "stop" => { let _ = app.emit("tray://stop-sharing", ()); }
                "leave" => { let _ = app.emit("tray://leave-meeting", ()); }
                _ => {}
            }
        })
        .build(app)?;

    Ok(())
}
```

### Frontend Integration

```tsx
// In MeetingRoom.tsx or useScreenShare.ts
import { listen } from '@tauri-apps/api/event';

useEffect(() => {
  const unlistenStop = listen('tray://stop-sharing', () => {
    stopScreenShare();
  });

  const unlistenLeave = listen('tray://leave-meeting', () => {
    leaveRoom();
  });

  return () => {
    unlistenStop.then(fn => fn());
    unlistenLeave.then(fn => fn());
  };
}, []);
```

### Icon Design

The tray icon should follow macOS conventions:
- Template image (monochrome, system handles dark/light mode)
- Red dot badge when sharing (similar to recording indicator)
- 22x22 points (44x44 pixels @2x)

### Platform Considerations

| Platform | Support | Notes |
|----------|---------|-------|
| macOS | Full | Native NSStatusItem |
| Windows | Partial | System tray (bottom-right) |
| Linux | Varies | AppIndicator/StatusNotifier |

For MVP, macOS is primary. Windows/Linux use same Tauri APIs.

### Files to Remove (Cleanup)

```
packages/client/src/components/ScreenShare/SharerControlBar.tsx
packages/client/src/components/ScreenShare/SharerControlBarVertical.tsx
packages/client/src/components/ScreenShare/FloatingControlBarPage.tsx
packages/client/src/lib/floatingBarChannel.ts
packages/client/tests/components/ScreenShare/SharerControlBar.test.tsx
```

### Files to Modify

```
packages/client/src-tauri/src/lib.rs  -- Add tray module
packages/client/src-tauri/src/screen_share.rs  -- Add show/hide tray commands
packages/client/src/hooks/useScreenShare.ts  -- Call tray commands
packages/client/src/components/MeetingRoom/MeetingRoom.tsx  -- Listen for tray events
```

### Files to Create

```
packages/client/src-tauri/src/tray.rs  -- Tray icon module
packages/client/src-tauri/resources/tray-icon.png  -- Icon asset
packages/client/src-tauri/resources/tray-icon-sharing.png  -- Icon with red dot
```

## References

- [Tauri System Tray](https://v2.tauri.app/learn/system-tray/)
- [Tauri Menu](https://v2.tauri.app/learn/window-menu/)
- [hopp-main tray implementation](../../../hopp-main/tauri/src-tauri/src/lib.rs)
- [AltTab menu bar design](inspiration)

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-17 | Initial story draft (floating bar approach) | Dev Agent |
| 2025-12-18 | ADR-009: Transform mode | Claude Opus 4.5 |
| 2025-12-20 | ADR-010: Vertical layout | Claude Opus 4.5 |
| 2025-12-21 | **ADR-011: Complete rewrite to Menu Bar approach** - Simplest solution wins. Native macOS menu, 3 actions, ~80 lines of code. | Claude Opus 4.5 |
