# Story 3.12: Source Picker Thumbnail Previews

Status: drafted

## Story

As a **user starting screen share on macOS/Linux**,
I want **to see thumbnail previews of each screen and window in the source picker**,
So that **I can visually identify which source to share without guessing from names alone**.

## Acceptance Criteria

1. **AC-3.12.1: Thumbnails Displayed in Source Picker**
   - Given I click to start screen sharing on macOS/Linux
   - When the source picker dialog appears
   - Then each screen/window shows a thumbnail preview image (not just an icon)

2. **AC-3.12.2: Thumbnail Capture During Enumeration**
   - Given the Core enumerates available sources
   - When thumbnails are captured
   - Then thumbnail size is ~320x180 pixels
   - And format is JPEG encoded as base64 string
   - And each source shows its actual current content

3. **AC-3.12.3: Graceful Handling of Missing Thumbnails**
   - Given a thumbnail capture fails for a source
   - When the source picker displays that source
   - Then an icon placeholder is shown instead
   - And the user can still select and share that source

4. **AC-3.12.4: Acceptable Enumeration Performance**
   - Given the user opens the source picker
   - When sources are enumerated with thumbnails
   - Then total enumeration time is < 2 seconds for typical source counts
   - And thumbnails may load progressively if needed

[Source: docs/epics.md#Story-3.12]

## Tasks / Subtasks

- [ ] **Task 1: Add thumbnail field to Rust structs** (AC: 3.12.2)
  - [ ] Add `thumbnail: Option<String>` to `ScreenInfo` in `lib.rs`
  - [ ] Add `thumbnail: Option<String>` to `WindowInfo` in `lib.rs`
  - [ ] Update serde serialization

- [ ] **Task 2: Implement thumbnail capture in Core** (AC: 3.12.2, 3.12.4)
  - [ ] Add `image` crate dependency for JPEG encoding
  - [ ] Modify `enumerate_sources()` to capture frame per source
  - [ ] Scale captured frame to 320x180
  - [ ] JPEG encode and base64 encode
  - [ ] Handle DesktopCapturer async callback pattern for synchronous capture
  - [ ] Optimize for < 2 second total enumeration time

- [ ] **Task 3: Update client TypeScript types** (AC: 3.12.1)
  - [ ] Add `thumbnail?: string` to `ScreenInfo` type in `lib/core.ts`
  - [ ] Add `thumbnail?: string` to `WindowInfo` type in `lib/core.ts`

- [ ] **Task 4: Update SourcePickerDialog to display thumbnails** (AC: 3.12.1, 3.12.3)
  - [ ] Update `SourceCard` component to accept optional thumbnail prop
  - [ ] Display thumbnail image when available
  - [ ] Show icon placeholder when thumbnail is null/undefined
  - [ ] Add loading state for progressive thumbnail loading (if implemented)

- [ ] **Task 5: Write tests** (AC: all)
  - [ ] Rust test: enumerate_sources returns ScreenInfo/WindowInfo with thumbnail field
  - [ ] Client test: SourcePickerDialog displays thumbnail images when provided
  - [ ] Client test: SourceCard shows placeholder when thumbnail is not available

## Dev Notes

### Technical Challenges

**DesktopCapturer Async Pattern**
The LiveKit DesktopCapturer uses a callback-based async pattern for frame capture. To capture thumbnails synchronously during enumeration, we need to:
1. Create a capturer per source
2. Start capture, wait for callback to fire
3. Capture the frame in the callback
4. Stop capture and move to next source

This adds latency per source (~100-200ms each).

**Alternative Approaches:**
1. **Progressive loading**: Return sources immediately without thumbnails, then send thumbnails as they become available via separate socket message
2. **Caching**: Cache thumbnails from previous enumerations
3. **Platform-specific APIs**: Use CGWindowListCopyWindowInfo on macOS for faster thumbnail capture

### Files to Modify

**Rust Core:**
- `packages/core/src/lib.rs` - Add thumbnail field to ScreenInfo/WindowInfo
- `packages/core/src/capture/mod.rs` - Capture thumbnails during enumeration
- `packages/core/Cargo.toml` - Add image crate dependency

**TypeScript Client:**
- `packages/client/src/lib/core.ts` - Update ScreenInfo/WindowInfo types
- `packages/client/src/components/ScreenShare/SourcePickerDialog.tsx` - Display thumbnails

### Prerequisites

- Story 3.1 (Screen Share Initiation) - **DONE**
- Story 3.10 (Rust Screen Capture Sidecar) - **DONE**

### References

- [DesktopCapturer API](https://docs.rs/livekit/latest/livekit/webrtc/desktop_capturer/)
- [image crate](https://docs.rs/image/latest/image/)
- Extracted from Story 3.5 (AC-3.5.5 moved here)

---

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-14 | Initial story draft - extracted from Story 3.5 | Dev Agent |
