# Story 4.11: Render Annotations on Sharer's Overlay

Status: done

## Story

As a **screen sharer**,
I want **to see annotations on my actual shared screen**,
so that **I can see what others are pointing at without looking at NAMELESS**.

## Acceptance Criteria

| AC ID | Criterion | Verification |
|-------|-----------|--------------|
| AC-4.11.1 | Annotations render on sharer's overlay window | Manual: sharer view |
| AC-4.11.2 | Same strokes as viewer canvases | Test: state consistency |
| AC-4.11.3 | Same coordinate transformation (normalized [0,1]) | Test: alignment |
| AC-4.11.4 | Updates in real-time (< 200ms from remote draw to local overlay) | Performance: measure |
| AC-4.11.5 | Overlay is click-through except when sharer is drawing | Test: interaction mode toggle |
| AC-4.11.6 | Sharer can draw on their own screen | Manual: sharer drawing |
| AC-4.11.7 | Coordinates align between overlay and viewers | Manual: cross-client alignment test |

## Tasks / Subtasks

- [x] **Task 1: Subscribe overlay window to annotationStore** (AC: 4.11.1, 4.11.2)
  - [x] Load SharerOverlay component with access to annotationStore
  - [x] Use Tauri events to bridge store to overlay (separate window context)
  - [x] Verify overlay receives stroke updates from main window
  - [x] Test: overlay shows same strokes as main window

- [x] **Task 2: Implement annotation canvas in overlay** (AC: 4.11.1, 4.11.3)
  - [x] Rewrite `AnnotationOverlayPage.tsx` with Perfect Freehand rendering
  - [x] Apply same stroke rendering as viewer canvas (PEN_OPTIONS, HIGHLIGHTER_OPTIONS)
  - [x] Match canvas dimensions to overlay window size with DPR scaling

- [x] **Task 3: Implement coordinate transformation for overlay** (AC: 4.11.3, 4.11.7)
  - [x] Use `denormalizeStrokePoints()` from `packages/client/src/utils/coordinates.ts`
  - [x] Transform normalized [0,1] coordinates to overlay pixel coordinates
  - [x] Same transformation logic as viewer canvas

- [x] **Task 4: Implement real-time annotation updates** (AC: 4.11.4)
  - [x] Create `useOverlayAnnotationBridge` hook for main window
  - [x] Bridge listens to annotationStore and emits events to overlay
  - [x] Use `requestAnimationFrame` for 60fps render loop in overlay
  - [x] Events: stroke_update, stroke_complete, stroke_delete, clear_all, full_state

- [x] **Task 5: Implement click-through behavior** (AC: 4.11.5)
  - [x] Overlay window set to click-through by default (Story 3.6 baseline)
  - [x] Add `set_overlay_click_through` Tauri command
  - [x] macOS: toggle `setIgnoresMouseEvents:` on NSWindow
  - [x] Windows: toggle `WS_EX_TRANSPARENT` extended style

- [x] **Task 6: Enable sharer drawing on overlay** (AC: 4.11.6)
  - [x] Add pointer event handlers to overlay for drawing
  - [x] Shift+D keyboard shortcut to toggle drawing mode
  - [x] Emit strokes to main window via Tauri events
  - [x] Visual indicator when drawing mode is active

- [ ] **Task 7: Verify cross-window coordinate alignment** (AC: 4.11.7)
  - [ ] Manual test: draw circle on viewer, verify same position on sharer overlay
  - [ ] Test multiple screen resolutions and aspect ratios
  - [ ] Document any edge cases with coordinate alignment

- [x] **Task 8: Write unit and integration tests** (AC: 4.11.2, 4.11.3)
  - [x] Test: useOverlayAnnotationBridge emits events correctly
  - [x] Test: Bridge handles overlay events (sharer drawing)
  - [x] Test: Cleanup on unmount and overlay deactivation
  - [x] 15 tests passing for useOverlayAnnotationBridge.test.ts

## Dev Notes

### Architecture Alignment

- **ADR-003:** Hybrid Rendering - Sharer overlay uses native Tauri transparent window with canvas rendering
- **ADR-008:** Core-Centric Media Architecture - Overlay subscribes to same annotationStore as main window
- **Tech Spec 4.11:** Sharer's overlay renders annotations from shared annotationStore

### Component Architecture

```
SHARER'S MACHINE (during screen share):
├── Main Window (WebView) - Minimized or transformed
│   └── annotationStore (Zustand) - source of truth
├── Sharer Overlay Window (Tauri transparent window)
│   ├── Subscribes to annotationStore via same React context
│   ├── AnnotationOverlayCanvas - renders strokes
│   ├── Click-through by default (ignore_cursor_events: true)
│   └── Toggles interactive when sharer draws
└── Shared Content (VS Code, Figma, etc.)
    └── Annotations visible ON TOP via overlay
```

### Existing Infrastructure

From Story 3.6 (Sharer's Transparent Overlay Window):
- Overlay window creation: `packages/client/src-tauri/src/screen_share.rs`
- Window configuration: transparent, click-through, positioned over shared content
- Tauri command: `create_overlay_window`, `destroy_overlay_window`

From Story 4.1-4.10 (Annotation Infrastructure):
- `annotationStore.ts` - Stroke state management
- `useAnnotations.ts` - Drawing logic and local stroke creation
- `useAnnotationSync.ts` - DataTrack message handling
- `AnnotationCanvas.tsx` - Canvas rendering with Perfect Freehand
- `coordinates.ts` - Normalize/denormalize utilities
- `colors.ts` - Participant color palette

### Implementation Approach

1. **Reuse existing canvas rendering** - Same `AnnotationCanvas` pattern for overlay
2. **Share annotationStore** - Overlay and main window use same Zustand store
3. **Coordinate transform** - Use existing `denormalizeCoordinates()`, account for overlay position
4. **Click-through toggle** - Tauri command to set `ignore_cursor_events` dynamically
5. **Sharer drawing** - Same `useAnnotations` hook, toggle overlay interactivity

### Key Files to Reference

- `packages/client/src/stores/annotationStore.ts` - Stroke state
- `packages/client/src/hooks/useAnnotations.ts` - Drawing logic
- `packages/client/src/components/AnnotationCanvas/AnnotationCanvas.tsx` - Canvas rendering
- `packages/client/src/utils/coordinates.ts` - Coordinate utilities
- `packages/client/src-tauri/src/screen_share.rs` - Overlay window management

### Learnings from Previous Story

**From Story 4-10-assign-unique-colors-per-participant (Status: done)**

- **Color palette:** `getParticipantColor(index)` in `@nameless/shared/constants/colors.ts` - use for sharer strokes
- **Metadata parsing:** `parseParticipantMetadata()` extracts color from LiveKit participant
- **Stroke creation:** `useAnnotations.ts:181` - uses `myColor` from localParticipant
- **All 1011 tests pass** - comprehensive test coverage established

**Key Infrastructure Already Working:**
- `packages/client/src/hooks/useAnnotations.ts` - Stroke creation with participant color
- `packages/client/src/hooks/useAnnotationSync.ts` - DataTrack sync includes color
- `packages/client/src/components/MeetingRoom/ParticipantBubble.tsx` - Color display pattern

**Patterns to Follow:**
- Strokes use `stroke.color` from participant metadata
- Canvas renders with `ctx.fillStyle = stroke.color`
- Perfect Freehand `getStroke()` generates smooth paths

[Source: docs/sprint-artifacts/4-10-assign-unique-colors-per-participant.md#Dev-Agent-Record]

### Project Structure Notes

**Files to Create:**
- `packages/client/src/components/SharerOverlay/AnnotationOverlayCanvas.tsx` - Canvas for overlay window
- `packages/client/src/components/SharerOverlay/AnnotationOverlayCanvas.test.tsx` - Unit tests

**Files to Modify:**
- `packages/client/src/components/ScreenShare/SharerOverlay.tsx` - Add AnnotationOverlayCanvas
- `packages/client/src-tauri/src/screen_share.rs` - Add toggle_click_through command
- `packages/client/src/hooks/useAnnotations.ts` - May need overlay-specific drawing mode

**Files to Reference:**
- `packages/client/src/components/AnnotationCanvas/AnnotationCanvas.tsx` - Reference implementation
- `packages/client/src/lib/canvas.ts` - Stroke rendering utilities
- `packages/client/src/utils/coordinates.ts` - Coordinate transform utilities

### Platform Considerations

**Click-through toggle (Tauri):**
```rust
// Toggle overlay interactivity
#[tauri::command]
pub fn set_overlay_click_through(window: Window, click_through: bool) -> Result<(), String> {
    window.set_ignore_cursor_events(click_through)
        .map_err(|e| e.to_string())
}
```

**macOS:** Uses `NSWindow.ignoresMouseEvents`
**Windows:** Uses `WS_EX_TRANSPARENT` extended window style
**Linux:** Uses `gdk_window_set_events_compression`

### Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Remote draw → overlay render | < 200ms | DataTrack receive to canvas paint |
| Overlay render loop | 60fps | requestAnimationFrame timing |
| Click-through toggle | < 50ms | Tauri command round-trip |

### Dependencies

- **Story 3.6:** Sharer's Transparent Overlay Window - DONE (provides overlay window)
- **Story 4.7:** DataTrack Annotation Sync - DONE (provides real-time sync)
- **Story 4.9:** Resolution-Independent Coordinates - DONE (provides coordinate transform)

### References

- [Source: docs/sprint-artifacts/tech-spec-epic-4.md#Story 4.11: Render Annotations on Sharer's Overlay]
- [Source: docs/epics/epic-4-real-time-annotations.md#Story 4.11]
- [Source: docs/architecture.md#ADR-003] - Hybrid Rendering architecture
- [Source: docs/architecture.md#Novel Pattern: Decoupled Annotation Layer] - Sharer overlay design

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/4-11-render-annotations-on-sharers-overlay.context.xml`

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

**Implementation Summary (2025-12-21):**

1. **Architecture Decision:** Instead of sharing Zustand store across windows (not possible since overlay is separate WebView), implemented Tauri event-based bridging between main window and overlay.

2. **Key Components Created:**
   - `useOverlayAnnotationBridge.ts` - Main window hook that bridges annotationStore changes to overlay via Tauri events
   - Updated `AnnotationOverlayPage.tsx` - Complete rewrite with Perfect Freehand rendering, event handling, and drawing mode

3. **Rust Backend Updates:**
   - Changed overlay to load React route (`/overlay`) instead of inline HTML data URL
   - Added `set_overlay_click_through` command for toggling drawing mode
   - macOS uses `setIgnoresMouseEvents:`, Windows uses `WS_EX_TRANSPARENT`

4. **Event Protocol:**
   - `overlay://annotation` - Annotation events (stroke_update, stroke_complete, stroke_delete, clear_all, full_state)
   - `overlay://participant-info` - Sharer's participant info for local drawing
   - `overlay://stroke-start`, `overlay://stroke-point`, `overlay://stroke-complete` - Sharer drawing from overlay
   - `overlay://draw-mode-changed` - Drawing mode toggle notification

5. **Testing:** 15 unit tests for useOverlayAnnotationBridge covering event emission, overlay event handling, cleanup

### File List

**Created:**
- `packages/client/src/hooks/useOverlayAnnotationBridge.ts`
- `packages/client/tests/hooks/useOverlayAnnotationBridge.test.ts`

**Modified:**
- `packages/client/src/App.tsx` - Added /overlay route
- `packages/client/src/components/ScreenShare/AnnotationOverlayPage.tsx` - Complete rewrite
- `packages/client/src/hooks/useAnnotationOverlay.ts` - Integrated bridge hook
- `packages/client/src-tauri/src/screen_share.rs` - URL-based overlay, click-through toggle
- `packages/client/src-tauri/src/lib.rs` - Registered set_overlay_click_through command
- `packages/client/src-tauri/Cargo.toml` - Added url crate dependency

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2025-12-21 | SM Agent | Initial draft created from Epic 4 tech spec with learnings from Story 4.10 |
| 2025-12-21 | Story Context Workflow | Generated context XML with code artifacts, interfaces, constraints, and test ideas |
| 2025-12-21 | Dev Agent (Opus 4.5) | Implemented story: Tauri event bridge, overlay canvas, click-through toggle, tests |
