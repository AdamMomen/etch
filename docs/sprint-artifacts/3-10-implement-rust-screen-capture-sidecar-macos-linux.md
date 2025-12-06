# Story 3.10: Implement Core Media Engine (All Platforms)

Status: in-progress

> **⚠️ REVISED 2025-12-06**: Original sidecar approach using `xcap` library delivered only 4-5 FPS (screenshot library, not video capture). Pivoting to Core-centric architecture using Hopp's LiveKit fork with DesktopCapturer. See `docs/sprint-change-proposal-2025-12-06.md` for full details.

## Story

As a **desktop user on any platform**,
I want **screen sharing powered by a native Core media engine**,
So that **I get 60fps capture with low-latency annotation rendering**.

## Acceptance Criteria (REVISED)

1. **AC-3.10.1: Core Binary Launches with App**
   - Given I launch the NAMELESS desktop app
   - When the app initializes
   - Then Core binary is spawned as a child process
   - And socket connection is established between Tauri and Core
   - And Core is ready to receive commands

2. **AC-3.10.2: Core Provides Native Screen Capture**
   - Given Core is running
   - When I initiate screen share
   - Then Core uses LiveKit DesktopCapturer (Hopp's fork) for native capture
   - And screen/window picker is displayed via native dialog
   - And 60fps capture is achieved on all platforms
   - And frames are published directly to LiveKit (no WebView relay)

3. **AC-3.10.3: Capture Quality Meets Requirements**
   - Given I'm sharing via Core
   - When viewers see my shared screen
   - Then the quality meets these requirements:
     - 1080p resolution (minimum)
     - 60fps capture rate
     - 4-6 Mbps bitrate target
     - Text remains sharp and readable

4. **AC-3.10.4: Platform Permission Handling**
   - Given I'm on macOS
   - When I start screen sharing for the first time
   - Then screen recording permission is requested if not granted
   - And permission status is communicated to WebView for UI feedback

5. **AC-3.10.5: Frame Relay to WebView**
   - Given Core is receiving video from other participants
   - When frames arrive via LiveKit
   - Then Core relays frames to WebView via socket
   - And WebView renders frames in video display component

6. **AC-3.10.6: Core Lifecycle Management**
   - Given the app is running
   - When the app closes or crashes
   - Then Core process is gracefully terminated
   - And socket is cleaned up

[Source: docs/epics.md#Story-3.10, docs/sprint-change-proposal-2025-12-06.md]

## Tasks / Subtasks (REVISED)

### Phase 1: Core Package Foundation

- [ ] **Task 1: Create Core Rust package structure** (AC: 3.10.1)
  - [ ] Create `packages/core/` directory
  - [ ] Initialize Cargo.toml with Hopp's LiveKit fork dependency
  - [ ] Add winit, wgpu, tokio dependencies
  - [ ] Create module structure: `lib.rs`, `main.rs`
  - [ ] Define `UserEvent` enum (command vocabulary)
  - [ ] Define `Application` struct (component container)

- [ ] **Task 2: Implement socket server** (AC: 3.10.1)
  - [ ] Create `socket/` module
  - [ ] Implement Unix socket server (named pipe on Windows)
  - [ ] Define `IncomingMessage` enum (WebView → Core)
  - [ ] Define `OutgoingMessage` enum (Core → WebView)
  - [ ] Route incoming messages to UserEvent dispatch
  - [ ] Handle connection lifecycle

- [ ] **Task 3: Implement winit event loop** (AC: 3.10.1)
  - [ ] Create EventLoop with UserEvent
  - [ ] Implement `Application::handle_user_event()`
  - [ ] Wire socket messages to event loop via EventLoopProxy
  - [ ] Handle graceful shutdown on Terminate event

### Phase 2: Screen Capture

- [ ] **Task 4: Implement screen capture with DesktopCapturer** (AC: 3.10.2, 3.10.3)
  - [ ] Create `capture/` module
  - [ ] Implement `Capturer` struct using LiveKit DesktopCapturer
  - [ ] Enumerate available screens and windows
  - [ ] Start/stop capture on demand
  - [ ] Verify 60fps capture rate

- [ ] **Task 5: Implement LiveKit room connection** (AC: 3.10.2)
  - [ ] Create `room/` module with `RoomService`
  - [ ] Connect to LiveKit server with token
  - [ ] Publish screen capture as video track
  - [ ] Handle room events (participant join/leave)
  - [ ] Forward events to WebView via socket

- [ ] **Task 6: Implement platform permission handling** (AC: 3.10.4)
  - [ ] Check macOS screen recording permission
  - [ ] Request permission if not granted
  - [ ] Send permission status to WebView
  - [ ] Handle Linux X11/Wayland detection

### Phase 3: Frame Relay & Integration

- [ ] **Task 7: Implement frame relay to WebView** (AC: 3.10.5)
  - [ ] Subscribe to remote video tracks
  - [ ] Decode frames from LiveKit
  - [ ] Encode as JPEG for efficient socket transfer
  - [ ] Send frames via socket with metadata
  - [ ] Benchmark frame relay performance

- [ ] **Task 8: Update Tauri to spawn Core** (AC: 3.10.1, 3.10.6)
  - [ ] Add `spawn_core` command to spawn Core binary
  - [ ] Add `kill_core` command for cleanup
  - [ ] Update bundle config to include Core binary
  - [ ] Handle Core crash detection and restart

- [ ] **Task 9: Create TypeScript socket client** (AC: 3.10.5)
  - [ ] Create `lib/socket.ts` with CoreSocket class
  - [ ] Create `useCore()` hook for React
  - [ ] Update `useScreenShare` to use Core commands
  - [ ] Create VideoDisplay component for frame rendering

### Phase 4: Testing & Verification

- [ ] **Task 10: Write tests and verify** (AC: all)
  - [ ] Unit tests for socket protocol parsing
  - [ ] Unit tests for UserEvent handling
  - [ ] Integration test: Tauri spawns Core, connects socket
  - [ ] Integration test: Screen share start/stop
  - [ ] Performance test: Verify 60fps capture
  - [ ] Performance test: Frame relay latency <50ms

---

## Original Tasks (DEPRECATED - kept for reference)

<details>
<summary>Click to expand original sidecar tasks (no longer applicable)</summary>

- [x] ~~**Task 1: Create capture-sidecar Rust package**~~ ❌ ABANDONED
- [x] ~~**Task 2: Implement screen/window enumeration**~~ ❌ xcap only 4-5 FPS
- [x] ~~**Task 3: Implement frame capture**~~ ❌ xcap is screenshot library
- [x] ~~**Task 4: Implement VP9 encoding**~~ ❌ Not needed with DesktopCapturer
- [x] ~~**Task 5: Implement IPC**~~ → Replaced by socket protocol
- [x] ~~**Task 6: macOS permission handling**~~ → Moved to Task 6
- [x] ~~**Task 7: Update Tauri for sidecar**~~ → Replaced by Task 8
- [x] ~~**Task 8: LiveKit custom video track**~~ → Core handles directly
- [x] ~~**Task 9: Linux-specific capture**~~ → Moved to Task 6
- [x] ~~**Task 10: Write tests**~~ → Replaced by Task 10

</details>

## Dev Notes (REVISED)

### Key Architecture Change

**Original approach (FAILED):** Rust sidecar using `xcap`/`scrap` → Only 4-5 FPS (screenshot libraries)

**New approach:** Core-centric architecture using Hopp's LiveKit fork with DesktopCapturer → 60fps native capture

See full proposal: `docs/sprint-change-proposal-2025-12-06.md`

### Core Architecture Reference (ADR-008)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CORE (Rust Binary)                          │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                      LiveKit Rust SDK (Hopp Fork)                   │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │ │
│  │  │ Desktop     │  │ Audio       │  │ Video       │  │ DataTracks │ │ │
│  │  │ Capturer    │  │ Source      │  │ Source      │  │            │ │ │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬──────┘ │ │
│  │         └────────────────┴────────────────┴───────────────┘        │ │
│  │                                   │                                  │ │
│  │                          LiveKit Server                              │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                   │                                      │
│                                   │ socket                               │
│                                   ▼                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           Tauri WebView (UI Shell)                       │
└─────────────────────────────────────────────────────────────────────────┘
```

### Required Rust Crates

| Crate | Purpose | Notes |
|-------|---------|-------|
| `livekit` | LiveKit with DesktopCapturer | Hopp's fork: `git = "https://github.com/gethopp/rust-sdks"` |
| `winit` | Event loop & window management | Central message bus pattern |
| `wgpu` | GPU-accelerated rendering | For annotation overlay |
| `tokio` | Async runtime | Full features |
| `serde` / `serde_json` | Serialization | Socket protocol |

### Socket Protocol

See `docs/sprint-change-proposal-2025-12-06.md` Section 7.4 for full protocol definition.

Key messages:
- `join_room` / `leave_room` - Room connection
- `get_available_content` - Screen/window enumeration
- `start_screen_share` / `stop_screen_share` - Capture control
- `video_frame` - Frame relay to WebView
- `participant_joined` / `participant_left` - Room events

### Project Structure (NEW)

```
packages/
├── core/                          # NEW - Rust media engine
│   ├── Cargo.toml
│   ├── src/
│   │   ├── main.rs               # Entry point, event loop
│   │   ├── lib.rs                # Application, UserEvent
│   │   ├── capture/              # Screen capture
│   │   ├── room/                 # LiveKit room service
│   │   ├── socket/               # IPC with Tauri
│   │   ├── graphics/             # wgpu overlay (future: annotations)
│   │   └── annotation/           # Stroke storage (future)
│   └── README.md
│
└── client/
    ├── src-tauri/
    │   └── src/lib.rs            # spawn_core, kill_core commands
    └── src/
        ├── hooks/useCore.ts      # Socket connection hook
        └── lib/socket.ts         # CoreSocket client
```

### Hopp Reference Files

Study these files from `hopp-main/core/src/`:
- `lib.rs` - Application struct, UserEvent enum pattern
- `capture/capturer.rs` - Capturer lifecycle
- `capture/stream.rs` - Frame handling
- `graphics/graphics_context.rs` - wgpu setup (for future annotations)

### Prerequisites

- Story 1.1 (Monorepo structure) - DONE
- Clone Hopp source for reference: `hopp-main/`
- Hopp's LiveKit fork dependency

### References

- [Sprint Change Proposal](docs/sprint-change-proposal-2025-12-06.md)
- [Hopp GitHub](https://github.com/gethopp/hopp)
- [Hopp LiveKit Fork](https://github.com/gethopp/rust-sdks)
- [winit Event Loop](https://docs.rs/winit/latest/winit/event_loop/)
- [wgpu Getting Started](https://wgpu.rs/)

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/3-10-implement-rust-screen-capture-sidecar-macos-linux.context.xml`

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

#### Original Implementation (2025-12-05) - ABANDONED

1. ~~**Implementation complete**~~ - Rust capture-sidecar package implemented but **FAILED performance requirements**:
   - xcap 0.7 delivers only **4-5 FPS** (screenshot library, not video capture)
   - This is fundamentally unsuitable for screen sharing (requires 30-60 FPS)

2. **Root cause:** xcap and scrap are screenshot libraries that capture individual frames on demand, not continuous video streams

3. **Decision:** Pivot to Core-centric architecture using Hopp's LiveKit fork with DesktopCapturer

#### Architecture Pivot (2025-12-06)

1. **Sidecar code deleted** - `packages/capture-sidecar/` removed entirely
2. **New approach:** Core binary using Hopp's LiveKit fork
3. **See:** `docs/sprint-change-proposal-2025-12-06.md` for full details

### File List

**Deleted (2025-12-06):**
- `packages/capture-sidecar/` - Entire directory removed

**To be created (Core architecture):**
- `packages/core/Cargo.toml`
- `packages/core/src/main.rs`
- `packages/core/src/lib.rs`
- `packages/core/src/capture/`
- `packages/core/src/room/`
- `packages/core/src/socket/`
- `packages/client/src/lib/socket.ts`
- `packages/client/src/hooks/useCore.ts`

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-05 | Initial story draft from create-story workflow | SM Agent |
| 2025-12-05 | Original sidecar implementation completed | Dev Agent |
| 2025-12-06 | **MAJOR REVISION**: Discovered xcap delivers 4-5 FPS (screenshot library). Pivoted to Core-centric architecture using Hopp's LiveKit fork. Deleted capture-sidecar, rewrote acceptance criteria and tasks. | Architect Agent |
