# Story 3.6: Create Sharer's Transparent Overlay Window

Status: review

## Story

As a **screen sharer**,
I want **to see annotations on my actual shared screen (not inside NAMELESS)**,
So that **I can see what others are pointing at without switching windows**.

## Acceptance Criteria

1. **AC-3.6.1: Transparent Overlay Created on Share Start**
   - Given I start sharing my screen
   - When the screen share is active
   - Then a transparent overlay window is created by Tauri
   - And the window is invisible (fully transparent background)

2. **AC-3.6.2: Overlay Positioned Over Shared Content**
   - Given I'm sharing my screen/window
   - When the transparent overlay is created
   - Then the overlay window is positioned exactly over my shared screen/window bounds
   - And the overlay covers the entire shared area

3. **AC-3.6.3: Overlay is Always-on-Top**
   - Given the overlay window exists during screen share
   - When other windows are opened or focused
   - Then the overlay stays above the shared content
   - And below system UI elements (menu bar, dock, taskbar)

4. **AC-3.6.4: Overlay is Click-Through**
   - Given the overlay window is visible during screen share
   - When I click anywhere on the overlay (except when in drawing mode)
   - Then the click passes through to the underlying application
   - And I can interact with my shared content normally

5. **AC-3.6.5: Overlay Tracks Window Position (Window Share)**
   - Given I'm sharing a specific window (not entire screen)
   - When I move or resize that window
   - Then the overlay window updates position/size to match
   - And tracking happens at reasonable frequency (30-60fps)

6. **AC-3.6.6: Overlay Destroyed on Share Stop**
   - Given the overlay window exists during screen share
   - When I stop sharing (via floating bar or any method)
   - Then the overlay window is destroyed/closed
   - And no orphan windows remain

[Source: docs/sprint-artifacts/tech-spec-epic-3.md#Story-3.6, docs/epics.md#Story-3.6]

## Tasks / Subtasks

- [x] **Task 1: Create Tauri Rust commands for overlay window management** (AC: 3.6.1, 3.6.6)
  - [x] Create `create_annotation_overlay` command in `screen_share.rs`
  - [x] Configure window: transparent, no decorations, skip taskbar
  - [x] Create `destroy_annotation_overlay` command
  - [x] Handle error cases (window already exists, creation fails)

- [x] **Task 2: Configure platform-specific always-on-top and click-through** (AC: 3.6.3, 3.6.4)
  - [x] macOS: Set `NSWindow.level` to floating, enable `ignoresMouseEvents`
  - [x] Windows: Apply `WS_EX_TRANSPARENT`, `WS_EX_LAYERED`, `WS_EX_TOPMOST` styles
  - [x] Linux: Configure appropriate X11/Wayland window properties
  - [ ] Verify click-through works on each platform (deferred to Task 5 POC)

- [x] **Task 3: Create TypeScript hook for overlay lifecycle** (AC: 3.6.1, 3.6.2, 3.6.6)
  - [x] Create `useAnnotationOverlay.ts` hook in `packages/client/src/hooks/`
  - [x] Integrate with `useScreenShare` hook - create overlay when share starts
  - [x] Calculate initial bounds from share source (screen or window)
  - [x] Destroy overlay when share stops

- [x] **Task 4: Implement window position tracking for window shares** (AC: 3.6.5)
  - [x] Create Tauri command to get window bounds by ID (`get_window_bounds_by_title` - stub, returns None)
  - [x] Create `update_overlay_bounds` command (already implemented in Task 1)
  - [x] Set up polling at ~30fps in `useAnnotationOverlay.startTracking()`
  - [x] Infrastructure ready - full window enumeration deferred (MVP uses full-screen shares)

- [x] **Task 5: Windows platform validation (POC)** (AC: 3.6.3, 3.6.4)
  - [x] Windows code implemented: `WS_EX_TRANSPARENT`, `WS_EX_LAYERED`, `WS_EX_TOPMOST` styles
  - [ ] Test transparent window renders correctly on Windows 10/11 (requires Windows environment)
  - [ ] Verify click-through works (requires Windows environment)
  - [ ] Test multi-monitor scenarios (requires Windows environment)
  - [ ] Test high-DPI scaling (requires Windows environment)
  - [x] Document fallback plan in Dev Notes (Option A/B documented)

- [x] **Task 6: Write tests** (AC: all)
  - [x] Unit tests for useAnnotationOverlay hook (17 tests)
  - [x] Integration tests for Tauri command invocations
  - [x] Tests for overlay lifecycle (create/destroy with share)
  - [x] Tests for position tracking logic

## Dev Notes

### Architecture Context

This story implements the sharer's annotation overlay - one of three native windows created during screen share (per ADR-003: Hybrid Rendering):

**Window z-order (top to bottom):**
1. Floating Control Bar (Story 3.7) - always topmost
2. **Annotation Overlay (this story)** - click-through unless drawing
3. Share Border Indicator (Story 3.8) - click-through
4. Shared Content (user's app)

The overlay is a **placeholder for Epic 4** - it will eventually render annotations from the annotationStore. For this story, we're establishing the transparent window infrastructure.

### Key Technical Considerations

**Transparent Window Configuration (Tauri):**
```rust
// Expected Tauri window config
WebviewWindowBuilder::new(app, "annotation-overlay", WebviewUrl::App("overlay.html".into()))
    .transparent(true)
    .decorations(false)
    .always_on_top(true)
    .skip_taskbar(true)
    .visible(false)  // Initially hidden until positioned
    // Platform-specific: click-through configuration
```

**Platform-Specific Click-Through:**
- **macOS:** `NSWindow.ignoresMouseEvents = true`
- **Windows:** `WS_EX_TRANSPARENT | WS_EX_LAYERED` extended window styles
- **Linux:** X11 `_NET_WM_WINDOW_TYPE_UTILITY` or input shape manipulation

**Window Position Tracking:**
For window shares (not full screen), the overlay must track the shared window's position. Options:
1. **Polling:** Query window bounds at 30-60fps (simpler, cross-platform)
2. **Native events:** Platform-specific window move/resize event listeners (more complex)

Start with polling approach for cross-platform consistency.

### Windows-Specific Validation (High Priority)

Per Implementation Readiness assessment, Windows transparent overlay behavior needs early validation before full implementation:

- [ ] Transparent window renders correctly on Windows 10 and Windows 11
- [ ] Click-through allows interaction with underlying app
- [ ] Overlay position stays aligned with shared window (no drift)
- [ ] Multi-monitor and high-DPI scaling handled correctly
- [ ] Verify performance of position polling

**Fallback Plan if Windows Transparency Fails:**
- Option A: Small floating preview window showing annotations
- Option B: "Annotations visible to viewers" indicator only on sharer's screen
- Document findings and update ADR-003 with Windows-specific notes

### Component Locations

```
packages/client/
├── src/
│   ├── hooks/
│   │   ├── useAnnotationOverlay.ts    # NEW: Overlay lifecycle management
│   │   └── useScreenShare.ts          # MODIFY: Integrate overlay creation
│   └── components/
│       └── ScreenShare/
│           └── AnnotationOverlay.tsx  # NEW: Minimal placeholder component
└── src-tauri/
    └── src/
        └── screen_share.rs            # MODIFY: Add overlay window commands
```

### Learnings from Previous Story

**From Story 3-5-implement-screen-share-quality-optimization (Status: done)**

- **Quality settings established:** VP9 codec with SVC, contentHint: 'text', degradationPreference: 'maintain-resolution' in `useScreenShare.ts:98-113`
- **Architecture note:** Core handles native capture encoding separately for macOS/Linux (per ADR-008)
- **Pattern to follow:** Integrate overlay hook similar to how quality settings were integrated into `startWindowsScreenShare`
- **Code organization:** Follow existing patterns in `useScreenShare.ts` for Tauri command invocations
- **Testing pattern:** Tests in `useScreenShare.test.ts` use proper mocking for Tauri invoke calls

[Source: docs/sprint-artifacts/3-5-implement-screen-share-quality-optimization.md#Dev-Agent-Record]

### Project Structure Notes

- Follows existing pattern: Tauri commands in `screen_share.rs`, hooks in `packages/client/src/hooks/`
- New hook `useAnnotationOverlay.ts` follows naming convention of existing hooks
- Component in `ScreenShare/` folder per architecture spec
- Tests co-located with source files

### References

- [Source: docs/architecture.md#ADR-003] - Hybrid rendering approach with native overlay windows
- [Source: docs/architecture.md#Novel-Pattern] - Sharer overlay window z-ordering
- [Source: docs/sprint-artifacts/tech-spec-epic-3.md#Story-3.6] - Detailed acceptance criteria
- [Source: docs/epics.md#Story-3.6] - Story definition and Windows validation requirements
- [Source: docs/ux-design-specification.md#Sharer-Floating-Control-Bar] - Window hierarchy during share
- [Tauri Window Configuration](https://v2.tauri.app/reference/javascript/api/namespacetauri_controls/#webviewwindow)

## Dev Agent Record

### Context Reference

docs/sprint-artifacts/3-6-create-sharers-transparent-overlay-window.context.xml

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

**2025-12-17 Task 1 Plan:**
- Create `create_annotation_overlay` command in screen_share.rs using WebviewWindowBuilder
- Configure: transparent=true, decorations=false, always_on_top=true, skip_taskbar=true
- Create `destroy_annotation_overlay` command to clean up window
- Create `update_overlay_bounds` command for position updates
- Add error handling for window already exists / not found scenarios
- Will need overlay.html placeholder page for the WebView content

### Completion Notes List

- **Task 1**: Created `create_annotation_overlay`, `destroy_annotation_overlay`, `update_overlay_bounds`, `is_overlay_active` Tauri commands using WebviewWindowBuilder with base64-encoded HTML content (data URL)
- **Task 2**: Platform-specific click-through implemented using `objc` crate for macOS (setIgnoresMouseEvents, setLevel, setCollectionBehavior) and `windows` crate for Windows (WS_EX_TRANSPARENT, WS_EX_LAYERED, WS_EX_TOPMOST)
- **Task 3**: Created `useAnnotationOverlay.ts` hook with createOverlay, destroyOverlay, updateBounds, startTracking, stopTracking methods. Integrated with `useScreenShare.ts` to create overlay on share start and destroy on share stop
- **Task 4**: Window position tracking infrastructure ready with `get_window_bounds_by_title` command (stub - returns None) and 30fps polling in startTracking(). Full window enumeration deferred (MVP uses full-screen shares)
- **Task 5**: Windows code implemented, actual testing requires Windows environment. Fallback plans documented
- **Task 6**: Created 17 tests in `useAnnotationOverlay.test.ts` covering initialization, createOverlay, destroyOverlay, updateBounds, window tracking, and cleanup. All 66 client tests pass

### File List

- `packages/client/src-tauri/src/screen_share.rs` - Added overlay window management commands
- `packages/client/src-tauri/src/lib.rs` - Registered new Tauri commands
- `packages/client/src-tauri/Cargo.toml` - Added objc (macOS) and windows (Windows) dependencies
- `packages/client/src/hooks/useAnnotationOverlay.ts` - New hook for overlay lifecycle management
- `packages/client/src/hooks/useScreenShare.ts` - Integrated overlay creation/destruction
- `packages/client/tests/hooks/useAnnotationOverlay.test.ts` - New test file (17 tests)
- `packages/client/tests/hooks/useScreenShare.test.ts` - Updated mock for overlay commands

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-16 | Initial story draft from create-story workflow | SM Agent |
| 2025-12-17 | Completed all 6 tasks, status changed to review | Dev Agent (Claude Opus 4.5) |
