# Story 3.6: Create Sharer's Transparent Overlay Window

Status: drafted

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

- [ ] **Task 1: Create Tauri Rust commands for overlay window management** (AC: 3.6.1, 3.6.6)
  - [ ] Create `create_annotation_overlay` command in `screen_share.rs`
  - [ ] Configure window: transparent, no decorations, skip taskbar
  - [ ] Create `destroy_annotation_overlay` command
  - [ ] Handle error cases (window already exists, creation fails)

- [ ] **Task 2: Configure platform-specific always-on-top and click-through** (AC: 3.6.3, 3.6.4)
  - [ ] macOS: Set `NSWindow.level` to floating, enable `ignoresMouseEvents`
  - [ ] Windows: Apply `WS_EX_TRANSPARENT`, `WS_EX_LAYERED`, `WS_EX_TOPMOST` styles
  - [ ] Linux: Configure appropriate X11/Wayland window properties
  - [ ] Verify click-through works on each platform

- [ ] **Task 3: Create TypeScript hook for overlay lifecycle** (AC: 3.6.1, 3.6.2, 3.6.6)
  - [ ] Create `useAnnotationOverlay.ts` hook in `packages/client/src/hooks/`
  - [ ] Integrate with `useScreenShare` hook - create overlay when share starts
  - [ ] Calculate initial bounds from share source (screen or window)
  - [ ] Destroy overlay when share stops

- [ ] **Task 4: Implement window position tracking for window shares** (AC: 3.6.5)
  - [ ] Create Tauri command to get window bounds by ID
  - [ ] Create `update_overlay_position` command
  - [ ] Set up polling or native event listener for window move/resize
  - [ ] Update overlay position at ~30fps when tracking

- [ ] **Task 5: Windows platform validation (POC)** (AC: 3.6.3, 3.6.4)
  - [ ] Test transparent window renders correctly on Windows 10/11
  - [ ] Verify click-through with `WS_EX_TRANSPARENT` + `WS_EX_LAYERED`
  - [ ] Test multi-monitor scenarios
  - [ ] Test high-DPI scaling
  - [ ] Document findings, implement fallback if needed

- [ ] **Task 6: Write tests** (AC: all)
  - [ ] Unit tests for useAnnotationOverlay hook
  - [ ] Integration tests for Tauri command invocations
  - [ ] Tests for overlay lifecycle (create/destroy with share)
  - [ ] Tests for position tracking logic

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

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

<!-- To be filled by dev agent -->

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-16 | Initial story draft from create-story workflow | SM Agent |
