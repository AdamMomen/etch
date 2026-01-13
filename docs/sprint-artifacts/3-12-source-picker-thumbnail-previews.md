# Story 3.12: Source Picker Thumbnail Previews

Status: done

## Story

As a **user starting screen share on macOS/Linux**,
I want **to see thumbnail previews of each screen in the source picker**,
So that **I can visually identify which source to share without guessing from names alone**.

> **Note:** Window capture was removed from scope. Only screen capture is supported.
> Window capture requires platform-specific APIs (CGWindowListCopyWindowInfo on macOS)
> which would add significant complexity. This can be added in a future story if needed.

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

- [x] **Task 1: Add thumbnail field to Rust structs** (AC: 3.12.2)
  - [x] Add `thumbnail: Option<String>` to `ScreenInfo` in `lib.rs`
  - [x] Add `thumbnail: Option<String>` to `WindowInfo` in `lib.rs`
  - [x] Update serde serialization (with `skip_serializing_if = "Option::is_none"`)

- [x] **Task 2: Implement thumbnail capture in Core** (AC: 3.12.2, 3.12.4)
  - [x] Add `image` crate dependency for JPEG encoding
  - [x] Modify `enumerate_sources()` to capture frame per source
  - [x] Scale captured frame to 320x180
  - [x] JPEG encode and base64 encode
  - [x] Handle DesktopCapturer async callback pattern for synchronous capture
  - [x] Optimize for < 2 second total enumeration time

- [x] **Task 3: Update client TypeScript types** (AC: 3.12.1)
  - [x] Add `thumbnail?: string` to `ScreenInfo` type in `lib/core.ts`
  - [x] Add `thumbnail?: string` to `WindowInfo` type in `lib/core.ts`

- [x] **Task 4: Update SourcePickerDialog to display thumbnails** (AC: 3.12.1, 3.12.3)
  - [x] Update `SourceCard` component to accept optional thumbnail prop
  - [x] Display thumbnail image when available
  - [x] Show icon placeholder when thumbnail is null/undefined
  - [x] Add loading state for progressive thumbnail loading (if implemented) - N/A: synchronous capture used

- [x] **Task 5: Write tests** (AC: all)
  - [x] Rust test: enumerate_sources returns ScreenInfo/WindowInfo with thumbnail field
  - [x] Client test: SourcePickerDialog displays thumbnail images when provided
  - [x] Client test: SourceCard shows placeholder when thumbnail is not available

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

docs/sprint-artifacts/3-12-source-picker-thumbnail-previews.context.xml

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes List

- Implemented synchronous thumbnail capture during source enumeration
- Each source gets a dedicated DesktopCapturer for thumbnail capture
- Thumbnails are captured at 320x180 resolution with 75% JPEG quality
- ABGR to RGBA color space conversion before encoding
- Total enumeration timeout of 2 seconds with per-source timeout of 500ms
- Graceful fallback to icon placeholder when thumbnail capture fails
- Added 11 new Rust tests for thumbnail serialization/deserialization
- Added comprehensive SourcePickerDialog tests for thumbnail display
- All 22 Rust tests pass, all 557 TypeScript tests pass

### File List

**Rust Core:**
- `packages/core/src/lib.rs` - Added thumbnail field to ScreenInfo and WindowInfo
- `packages/core/src/capture/mod.rs` - Added thumbnail capture functions
- `packages/core/Cargo.toml` - Added image crate dependency
- `packages/core/tests/user_event_tests.rs` - Added 11 thumbnail tests
- `packages/core/tests/socket_tests.rs` - Updated to include thumbnail field

**TypeScript Client:**
- `packages/client/src/lib/core.ts` - Updated ScreenInfo/WindowInfo types
- `packages/client/src/components/ScreenShare/SourcePickerDialog.tsx` - Display thumbnails in SourceCard
- `packages/client/tests/components/ScreenShare/SourcePickerDialog.test.tsx` - New test file (19 tests)

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-14 | Initial story draft - extracted from Story 3.5 | Dev Agent |
| 2025-12-16 | Implementation complete - all tasks done, tests passing | Claude Opus 4.5 |
