# Sprint Change Proposal: Core-Centric Architecture

**Date:** 2025-12-06
**Triggered By:** Story 3.10 implementation revealed xcap library is unsuitable (4-5 FPS)
**Scope:** Major - Fundamental architecture revision
**Author:** Winston (Architect Agent)

---

## 1. Issue Summary

### Problem Statement

During Story 3.10 implementation, benchmarking revealed that `xcap` (the chosen screen capture library) delivers only **4-5 FPS** - completely unsuitable for screen sharing which requires 30-60 FPS.

**Root Cause:** `xcap` is a screenshot library, not a screen recording library. It captures individual frames on demand, not a continuous video stream.

### Discovery Context

- Story 3.10 marked as "done" but fundamentally broken
- All tasks completed but with wrong library
- Discovered through performance benchmarking

### Evidence

| Library | FPS | Suitable |
|---------|-----|----------|
| xcap (current) | 4-5 | No |
| Hopp's LiveKit DesktopCapturer | 60 | Yes |

### Reference Implementation

[Hopp](https://github.com/gethopp/hopp) - a production Tauri app using the exact architecture we need:
- LiveKit Rust SDK fork with native DesktopCapturer
- Core process owns all media (screen, audio, camera)
- wgpu-based overlay rendering for cursors/annotations
- Socket communication with Tauri UI

---

## 2. Impact Analysis

### Epic Impact

| Epic | Impact Level | Description |
|------|--------------|-------------|
| **Epic 3: Screen Sharing** | Critical | Stories 3.5-3.10 affected by architecture change |
| **Epic 4: Annotations** | Critical | Rendering architecture completely changes |
| **Epic 5: Permissions** | Moderate | Role enforcement moves to Core |
| **Epic 6: Connection Resilience** | Moderate | Connection management moves to Core |
| **Epic 2: Basic Meeting** | Moderate | Audio/video moves to Core |

### Story Impact

**Must Rework:**
- 3.10: Replace xcap with LiveKit DesktopCapturer
- 3.6: Sharer overlay becomes Core-managed wgpu window
- 3.7: Floating control bar - may stay in Tauri or move to Core
- 3.8: Share border indicator - Core-managed

**Must Redesign:**
- 4.1-4.11: All annotation stories - rendering moves to Core
- 2.6-2.11: Audio/video stories - media moves to Core

### Artifact Conflicts

| Document | Sections Affected |
|----------|-------------------|
| **architecture.md** | ADR-007, Novel Pattern (Decoupled Annotation Layer), Project Structure, Data Flow |
| **epics.md** | Epic 3, Epic 4 story descriptions |
| **Individual Stories** | 3.5-3.10, 4.1-4.11, 2.6-2.11 |

### Technical Impact

| Area | Change |
|------|--------|
| **Build System** | New `core` Rust package, not a sidecar |
| **Dependencies** | Add wgpu, winit, Hopp's LiveKit fork |
| **IPC** | Socket protocol between Core and Tauri |
| **Bundle** | Core binary bundled with app |

---

## 3. Recommended Approach: Core-Centric Architecture

### Why This Approach

| Requirement | Why Core-Centric Wins |
|-------------|----------------------|
| 60fps screen capture | DesktopCapturer in Core, direct to LiveKit |
| Low-latency annotations | wgpu renders directly to overlay, no IPC for frames |
| Cross-nation performance | ~1-2ms local processing vs ~20-30ms with WebView path |
| Proven architecture | Hopp ships this in production |
| Browser viewer support | LiveKit protocol - JS SDK viewers work automatically |

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CORE (Rust Binary)                          │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                      LiveKit Rust SDK (Hopp Fork)                   │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │ │
│  │  │ Desktop     │  │ Audio       │  │ Video       │  │ DataTracks │ │ │
│  │  │ Capturer    │  │ Source      │  │ Source      │  │ (annotations│ │ │
│  │  │ (screen)    │  │ (mic)       │  │ (camera)    │  │  + chat)   │ │ │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬──────┘ │ │
│  │         │                │                │                │        │ │
│  │         └────────────────┴────────────────┴────────────────┘        │ │
│  │                                   │                                  │ │
│  │                                   ▼                                  │ │
│  │                          LiveKit Server                              │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                   │                                      │
│                                   │ received frames + DataTracks         │
│                                   ▼                                      │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                     GraphicsContext (wgpu)                          │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐ │ │
│  │  │ Overlay Window  │  │ Stroke Renderer │  │ Cursor Renderer     │ │ │
│  │  │ (transparent)   │  │ (annotations)   │  │ (remote cursors)    │ │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────┘ │ │
│  │                                                                      │ │
│  │  Platform-specific compositing:                                      │ │
│  │  - Windows: DirectComposition                                        │ │
│  │  - macOS: Core Animation                                             │ │
│  │  - Linux: X11/Wayland compositor                                     │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                   │                                      │
│                                   │ socket (commands, chat, UI state,    │
│                                   │         frame relay for display)     │
│                                   ▼                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           Tauri WebView                                  │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                         React UI                                 │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │    │
│  │  │ Video       │  │ Participant │  │ Chat        │  │ Controls│ │    │
│  │  │ Display     │  │ List        │  │ Panel       │  │ Bar     │ │    │
│  │  │ (frames     │  │             │  │             │  │         │ │    │
│  │  │  from Core) │  │             │  │             │  │         │ │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  Responsibilities:                                                       │
│  - Display video frames received from Core                               │
│  - Render UI (participant list, controls, chat)                          │
│  - Send user commands to Core (start share, mute, draw stroke)           │
│  - Annotation toolbar (tool selection → commands to Core)                │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

#### Screen Sharing (Outbound)

```
User clicks Share → Tauri sends command → Core
                                           │
Core: DesktopCapturer.start(source_id) ────┘
         │
         ▼
   Native screen capture (60fps)
         │
         ▼
   NativeVideoSource → LiveKit WebRTC → Server → Viewers
```

#### Annotations (Inbound to Sharer)

```
Viewer draws stroke → DataTrack → LiveKit Server
                                       │
                                       ▼
                              Core receives DataPacket
                                       │
                                       ▼
                              Parse annotation event
                                       │
                                       ▼
                              GraphicsContext.render_stroke()
                                       │
                                       ▼
                              wgpu → Overlay window
                                       │
                                       ▼
                              Sharer sees annotation on their screen
                              (on top of VS Code, Figma, etc.)
```

#### Video Display (Core → WebView)

```
LiveKit Server → Core receives video frames
                        │
                        ▼
                 Decode frame
                        │
                        ▼
                 Socket: send frame to WebView
                        │
                        ▼
                 WebView: render to <canvas>
```

### Socket Protocol

```typescript
// Commands: WebView → Core
interface StartScreenShare {
  type: 'start_screen_share';
  sourceId: string;
}

interface StopScreenShare {
  type: 'stop_screen_share';
}

interface SendAnnotation {
  type: 'send_annotation';
  stroke: StrokeData;
}

interface MuteAudio {
  type: 'mute_audio';
  muted: boolean;
}

interface SendChat {
  type: 'send_chat';
  message: string;
}

// Events: Core → WebView
interface VideoFrame {
  type: 'video_frame';
  participantId: string;
  data: Uint8Array;  // Encoded frame (JPEG or raw)
  width: number;
  height: number;
  timestamp: number;
}

interface ParticipantJoined {
  type: 'participant_joined';
  participant: ParticipantInfo;
}

interface ChatReceived {
  type: 'chat_received';
  senderId: string;
  senderName: string;
  message: string;
  timestamp: number;
}

interface ConnectionStateChanged {
  type: 'connection_state';
  state: 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
}

interface ScreenShareStateChanged {
  type: 'screen_share_state';
  isSharing: boolean;
  sharerId: string | null;
}
```

### Key Dependencies

```toml
# packages/core/Cargo.toml

[dependencies]
# LiveKit with DesktopCapturer (Hopp's fork)
livekit = { git = "https://github.com/gethopp/rust-sdks", branch = "patches", features = ["native-tls"] }

# GPU-accelerated rendering
wgpu = "25.0"
winit = { version = "0.30", features = ["rwh_06"] }

# Platform-specific graphics
[target.'cfg(target_os = "windows")'.dependencies]
windows = { version = "0.58", features = ["Win32_Graphics_Direct2D", "Win32_Graphics_Direct3D11", "Win32_Graphics_DirectComposition"] }

[target.'cfg(target_os = "macos")'.dependencies]
core-graphics = "0.25"
objc2 = "0.5"

# Async runtime
tokio = { version = "1", features = ["full"] }

# Serialization for socket protocol
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

### Project Structure

```
etch/
├── packages/
│   ├── core/                          # NEW - Rust media engine
│   │   ├── Cargo.toml
│   │   ├── src/
│   │   │   ├── main.rs                # Entry point, socket server
│   │   │   ├── lib.rs                 # Library exports
│   │   │   ├── room.rs                # LiveKit room management
│   │   │   ├── capture/
│   │   │   │   ├── mod.rs
│   │   │   │   ├── capturer.rs        # Screen capture lifecycle
│   │   │   │   ├── stream.rs          # Frame streaming
│   │   │   │   ├── macos.rs           # macOS monitor APIs
│   │   │   │   ├── linux.rs           # Linux monitor APIs
│   │   │   │   └── windows.rs         # Windows monitor APIs
│   │   │   ├── media/
│   │   │   │   ├── mod.rs
│   │   │   │   ├── audio.rs           # Microphone capture
│   │   │   │   └── camera.rs          # Camera capture
│   │   │   ├── graphics/
│   │   │   │   ├── mod.rs
│   │   │   │   ├── context.rs         # wgpu GraphicsContext
│   │   │   │   ├── overlay.rs         # Transparent overlay window
│   │   │   │   ├── stroke.rs          # Annotation stroke rendering
│   │   │   │   ├── cursor.rs          # Remote cursor rendering
│   │   │   │   ├── shader.wgsl        # GPU shaders
│   │   │   │   └── direct_composition.rs  # Windows compositor
│   │   │   ├── socket/
│   │   │   │   ├── mod.rs
│   │   │   │   ├── server.rs          # Socket server for Tauri
│   │   │   │   └── protocol.rs        # Message types
│   │   │   └── annotation/
│   │   │       ├── mod.rs
│   │   │       ├── store.rs           # Annotation state
│   │   │       └── sync.rs            # DataTrack sync
│   │   └── README.md
│   │
│   ├── client/                         # Tauri application (simplified)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── VideoDisplay/       # Renders frames from Core
│   │   │   │   ├── AnnotationToolbar/  # Tool selection → commands
│   │   │   │   ├── ParticipantList/
│   │   │   │   ├── ChatPanel/
│   │   │   │   └── ControlBar/
│   │   │   ├── hooks/
│   │   │   │   ├── useCore.ts          # Socket connection to Core
│   │   │   │   ├── useRoom.ts          # Room state from Core
│   │   │   │   └── useAnnotations.ts   # Send annotation commands
│   │   │   ├── lib/
│   │   │   │   └── socket.ts           # Socket client
│   │   │   └── stores/
│   │   │       ├── roomStore.ts        # UI state (from Core events)
│   │   │       └── settingsStore.ts    # User preferences
│   │   ├── src-tauri/
│   │   │   ├── src/
│   │   │   │   ├── lib.rs              # Minimal - just spawns Core
│   │   │   │   └── main.rs
│   │   │   └── tauri.conf.json
│   │   └── package.json
│   │
│   ├── server/                         # Hono API (unchanged)
│   │   └── ...
│   │
│   └── shared/                         # Shared types (mostly unchanged)
│       └── ...
│
└── docker-compose.yaml
```

### Browser Viewer Support

Browser viewers work automatically via LiveKit:

```
Desktop (Core)                    Browser Viewer
┌─────────────┐                  ┌─────────────┐
│   Core      │                  │  JS SDK     │
│ publishes:  │                  │ subscribes: │
│ - screen    │◄────LiveKit────►│ - screen    │
│ - audio     │     Server       │ - audio     │
│ - camera    │                  │ - camera    │
│ - DataTracks│                  │ - DataTracks│
└─────────────┘                  └─────────────┘
```

No changes needed for browser support - LiveKit's protocol handles interoperability.

---

## 4. Detailed Change Proposals

### 4.1 Architecture Document Updates

#### ADR-007 Revision

```
OLD:
**Decision:** Use a **hybrid approach**:
- **macOS/Linux:** Rust sidecar binary using `xcap`/`scrap` crates
- **Windows:** WebView `getDisplayMedia()`

NEW:
**Decision:** Use a **Core-centric architecture**:
- **All Platforms:** Rust Core binary using LiveKit DesktopCapturer (Hopp fork)
- Core owns all media: screen capture, audio, camera, DataTracks
- Core renders annotations via wgpu to transparent overlay
- WebView is pure UI shell, receives video frames via socket
```

#### New ADR-008: Core-Centric Media Architecture

```markdown
### ADR-008: Core-Centric Media Architecture

**Status:** Proposed

**Context:** Story 3.10 revealed xcap delivers 4-5 FPS (screenshot library).
Additionally, cross-nation annotation latency requires minimal processing overhead.

**Decision:** Move all media handling to a dedicated Core binary:
- Core owns LiveKit connection (single connection per participant)
- Core captures screen, audio, camera natively
- Core renders annotations to wgpu overlay (GPU-accelerated)
- Core relays video frames to WebView for display
- WebView becomes pure UI shell

**Rationale:**
- Hopp proves this architecture in production
- DesktopCapturer provides 60fps native capture
- wgpu overlay adds ~1-2ms latency vs ~20-30ms for WebView path
- Single LiveKit connection simplifies state management

**Consequences:**
- Larger architectural change than simple library swap
- Core becomes complex media engine
- Must maintain socket protocol between Core and WebView
- Build complexity increases (two Rust binaries)
- Browser viewers still work (LiveKit protocol handles it)
```

### 4.2 Story Revisions

#### Story 3.10: Reopen and Revise

```
OLD Status: done
NEW Status: in-progress

OLD Acceptance Criteria:
- Sidecar provides native capture via xcap or scrap

NEW Acceptance Criteria:
- Core provides native capture via LiveKit DesktopCapturer (Hopp fork)
- Core connects directly to LiveKit (not through WebView)
- 60fps capture verified on macOS
- Frame relay to WebView for display working

NEW Tasks:
- [ ] Create packages/core/ with Hopp-style architecture
- [ ] Implement capture/ module using DesktopCapturer
- [ ] Implement socket server for Tauri communication
- [ ] Implement frame relay to WebView
- [ ] Update Tauri to spawn and manage Core process
- [ ] Verify 60fps capture on macOS
```

#### Epic 4 Stories: Annotation Architecture Change

All stories 4.1-4.11 need revision to reflect:
- Annotation rendering happens in Core (wgpu)
- WebView sends annotation commands via socket
- Sharer overlay is Core-managed window

### 4.3 New Epic: Core Foundation

Consider adding a new epic before Epic 4:

```markdown
## Epic 3.5: Core Media Engine Foundation

**Goal:** Establish Core binary with LiveKit integration and socket protocol

### Stories:
- 3.5.1: Create Core package structure with socket server
- 3.5.2: Implement LiveKit room connection in Core
- 3.5.3: Implement screen capture with DesktopCapturer
- 3.5.4: Implement audio/camera capture in Core
- 3.5.5: Implement frame relay to WebView
- 3.5.6: Implement GraphicsContext with wgpu overlay
- 3.5.7: Update Tauri to spawn and manage Core

**Dependencies:** Epic 1, Epic 2 (partial)
**Enables:** Epic 3 completion, Epic 4
```

---

## 5. Implementation Handoff

### Scope Classification: **MAJOR**

This is a fundamental architecture revision requiring:
- New Rust binary (Core)
- wgpu graphics pipeline
- Socket protocol design
- Significant story rewrites

### Handoff Recipients

| Role | Responsibility |
|------|----------------|
| **Architect** | Finalize ADR-008, approve architecture |
| **PM** | Revise Epic 3, Epic 4 stories; consider new Epic 3.5 |
| **SM** | Update sprint status, re-estimate affected stories |
| **Dev** | Implement Core binary starting with capture module |

### Success Criteria

1. Core binary captures screen at 60fps on macOS
2. Core connects to LiveKit and publishes screen track
3. Frame relay to WebView displays video
4. Annotations render on wgpu overlay with <5ms local latency
5. All existing tests updated and passing

### Recommended Next Steps

1. **Architect:** Approve this proposal and finalize ADR-008
2. **PM:** Create Epic 3.5 stories for Core foundation
3. **SM:** Mark Story 3.10 as in-progress, add dependency on Core foundation
4. **Dev:** Begin Core implementation by studying Hopp's codebase:
   - https://github.com/gethopp/hopp/tree/main/core/src/capture
   - https://github.com/gethopp/hopp/tree/main/core/src/graphics

---

## 6. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| wgpu complexity | Medium | High | Reference Hopp's implementation closely |
| Socket protocol bugs | Medium | Medium | Comprehensive protocol tests |
| Platform-specific issues | High | Medium | Test on all platforms early |
| Increased build time | Low | Low | Parallel builds, caching |
| Frame relay performance | Medium | Medium | Benchmark early, optimize encoding |

---

## 7. Detailed Core Architecture (Based on Hopp Patterns)

This section provides the detailed implementation pattern for the Core binary, derived from analyzing Hopp's `lib.rs` architecture.

### 7.1 Central Event Loop Pattern

Hopp uses **winit's EventLoop as a central message bus**. All events—user input, socket messages, LiveKit callbacks, render requests—flow through this single event loop. This provides:

- **Single-threaded coordination** for all state changes
- **Predictable event ordering**
- **Clean shutdown semantics**
- **Platform-native event handling**

```rust
// packages/core/src/main.rs
use winit::event_loop::{ControlFlow, EventLoop, EventLoopProxy};
use crate::lib::{Application, UserEvent};

fn main() {
    let event_loop: EventLoop<UserEvent> = EventLoop::with_user_event().build().unwrap();
    event_loop.set_control_flow(ControlFlow::Wait);

    let event_loop_proxy = event_loop.create_proxy();
    let mut app = Application::new(event_loop_proxy.clone());

    event_loop.run(move |event, elwt| {
        match event {
            Event::UserEvent(user_event) => {
                app.handle_user_event(user_event, elwt);
            }
            Event::WindowEvent { event, .. } => {
                app.handle_window_event(event, elwt);
            }
            _ => {}
        }
    }).unwrap();
}
```

### 7.2 UserEvent Enum (Command Vocabulary)

The `UserEvent` enum defines the complete vocabulary of commands that can flow through the system. This is Etch-specific, adapted from Hopp's pattern:

```rust
// packages/core/src/lib.rs

/// All possible events that can be dispatched through the event loop.
/// This is the central command vocabulary for the Core process.
#[derive(Debug, Clone)]
pub enum UserEvent {
    // ═══════════════════════════════════════════════════════════════════════
    // SCREEN CAPTURE
    // ═══════════════════════════════════════════════════════════════════════

    /// Request list of available screens and windows for capture
    GetAvailableContent,

    /// Start screen sharing with the specified source
    StartScreenShare(ScreenShareMessage),

    /// Stop current screen share
    StopScreenShare,

    /// Screen share state changed (for internal notification)
    ScreenShareStateChanged { is_sharing: bool, source_id: Option<String> },

    // ═══════════════════════════════════════════════════════════════════════
    // ANNOTATIONS (Our Core Feature)
    // ═══════════════════════════════════════════════════════════════════════

    /// Remote participant started drawing a stroke
    StrokeStart {
        stroke_id: String,
        participant_id: String,
        tool: AnnotationTool,
        color: Color,
        start_point: Point,
    },

    /// Remote participant added points to their stroke
    StrokeUpdate {
        stroke_id: String,
        points: Vec<Point>,
    },

    /// Remote participant completed their stroke
    StrokeComplete {
        stroke_id: String,
    },

    /// Delete a specific stroke (eraser or moderation)
    StrokeDelete {
        stroke_id: String,
    },

    /// Clear all annotations (host/sharer action)
    ClearAllAnnotations,

    /// Annotation permissions changed
    AnnotationPermissionChanged {
        enabled: bool,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // REMOTE CURSORS (Visual feedback, no input simulation)
    // ═══════════════════════════════════════════════════════════════════════

    /// Remote participant moved their cursor on the shared screen
    RemoteCursorPosition {
        participant_id: String,
        x: f32,  // Normalized 0.0-1.0
        y: f32,
        visible: bool,
    },

    /// Remote cursor style changed (different tools show different cursors)
    RemoteCursorStyle {
        participant_id: String,
        style: CursorStyle,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LIVEKIT / ROOM EVENTS
    // ═══════════════════════════════════════════════════════════════════════

    /// Connect to LiveKit room
    JoinRoom {
        server_url: String,
        token: String,
    },

    /// Leave the current room
    LeaveRoom,

    /// Participant connected to the room
    ParticipantConnected(ParticipantData),

    /// Participant disconnected from the room
    ParticipantDisconnected(ParticipantData),

    /// Connection state changed
    ConnectionStateChanged(ConnectionState),

    /// DataTrack message received (annotations, chat, etc.)
    DataReceived {
        participant_id: String,
        payload: Vec<u8>,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // AUDIO/VIDEO CONTROLS
    // ═══════════════════════════════════════════════════════════════════════

    /// Toggle microphone mute
    SetMicrophoneMuted(bool),

    /// Toggle camera
    SetCameraEnabled(bool),

    /// Change audio input device
    SetAudioInputDevice(String),

    /// Change video input device
    SetVideoInputDevice(String),

    // ═══════════════════════════════════════════════════════════════════════
    // FRAME RELAY (Core → WebView)
    // ═══════════════════════════════════════════════════════════════════════

    /// Video frame ready to send to WebView for display
    VideoFrameReady {
        participant_id: String,
        track_id: String,
        frame_data: Vec<u8>,
        width: u32,
        height: u32,
        format: FrameFormat,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // GRAPHICS / RENDERING
    // ═══════════════════════════════════════════════════════════════════════

    /// Request overlay window redraw
    RequestRedraw,

    /// Overlay window visibility changed
    SetOverlayVisible(bool),

    /// Update overlay position to match shared screen
    UpdateOverlayBounds {
        x: i32,
        y: i32,
        width: u32,
        height: u32,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LIFECYCLE
    // ═══════════════════════════════════════════════════════════════════════

    /// Graceful shutdown
    Terminate,
}

/// Screen share initiation message
#[derive(Debug, Clone)]
pub struct ScreenShareMessage {
    pub source_id: String,
    pub source_type: SourceType,
    pub config: CaptureConfig,
}

#[derive(Debug, Clone)]
pub enum SourceType {
    Screen,
    Window,
}

#[derive(Debug, Clone)]
pub struct CaptureConfig {
    pub width: u32,
    pub height: u32,
    pub framerate: u32,
    pub bitrate: u32,
}

#[derive(Debug, Clone)]
pub enum AnnotationTool {
    Pen,
    Highlighter,
    Eraser,
}

#[derive(Debug, Clone)]
pub struct Point {
    pub x: f32,  // Normalized 0.0-1.0
    pub y: f32,
    pub pressure: f32,
}

#[derive(Debug, Clone)]
pub struct Color {
    pub r: u8,
    pub g: u8,
    pub b: u8,
    pub a: u8,
}

#[derive(Debug, Clone)]
pub enum CursorStyle {
    Default,
    Pen,
    Highlighter,
    Eraser,
    Hidden,
}

#[derive(Debug, Clone)]
pub enum ConnectionState {
    Disconnected,
    Connecting,
    Connected,
    Reconnecting,
}

#[derive(Debug, Clone)]
pub enum FrameFormat {
    Jpeg,
    Rgba,
    Nv12,
}

#[derive(Debug, Clone)]
pub struct ParticipantData {
    pub id: String,
    pub name: String,
    pub is_local: bool,
    pub role: ParticipantRole,
}

#[derive(Debug, Clone)]
pub enum ParticipantRole {
    Host,
    Participant,
}
```

### 7.3 Application Struct (Component Container)

The `Application` struct holds all components and state. It's the central coordinator that handles events:

```rust
// packages/core/src/lib.rs

use std::sync::{Arc, Mutex};
use tokio::task::JoinHandle;
use winit::event_loop::EventLoopProxy;

pub mod capture;
pub mod graphics;
pub mod socket;
pub mod annotation;
pub mod room;

/// Main application struct holding all components.
/// Follows Hopp's pattern of centralized state management.
pub struct Application {
    // ═══════════════════════════════════════════════════════════════════════
    // EVENT DISPATCH
    // ═══════════════════════════════════════════════════════════════════════

    /// Proxy to send events to the main event loop from any thread
    event_loop_proxy: EventLoopProxy<UserEvent>,

    // ═══════════════════════════════════════════════════════════════════════
    // SCREEN CAPTURE
    // ═══════════════════════════════════════════════════════════════════════

    /// Screen capturer (thread-safe, may be capturing on background thread)
    screen_capturer: Arc<Mutex<capture::Capturer>>,

    /// Handle to capturer event forwarding task
    capturer_events_task: Option<JoinHandle<()>>,

    // ═══════════════════════════════════════════════════════════════════════
    // LIVEKIT
    // ═══════════════════════════════════════════════════════════════════════

    /// LiveKit room service (handles connection, tracks, DataTracks)
    room_service: Option<room::RoomService>,

    // ═══════════════════════════════════════════════════════════════════════
    // GRAPHICS (Overlay Rendering)
    // ═══════════════════════════════════════════════════════════════════════

    /// wgpu graphics context for overlay window
    graphics_context: Option<graphics::GraphicsContext>,

    /// Overlay window for annotations (transparent, click-through)
    overlay_window: Option<graphics::OverlayWindow>,

    // ═══════════════════════════════════════════════════════════════════════
    // ANNOTATIONS
    // ═══════════════════════════════════════════════════════════════════════

    /// In-memory annotation store
    annotation_store: annotation::AnnotationStore,

    /// Remote cursor positions (participant_id → position)
    remote_cursors: std::collections::HashMap<String, RemoteCursor>,

    // ═══════════════════════════════════════════════════════════════════════
    // SOCKET (Communication with Tauri/WebView)
    // ═══════════════════════════════════════════════════════════════════════

    /// Socket server for Tauri communication
    socket: socket::CoreSocket,

    // ═══════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════

    /// Current screen share state
    is_sharing: bool,

    /// Current shared source (if sharing)
    shared_source_id: Option<String>,

    /// Local participant info
    local_participant: Option<ParticipantData>,

    /// All participants in room
    participants: std::collections::HashMap<String, ParticipantData>,
}

#[derive(Debug, Clone)]
pub struct RemoteCursor {
    pub participant_id: String,
    pub x: f32,
    pub y: f32,
    pub visible: bool,
    pub style: CursorStyle,
    pub color: Color,
}

impl Application {
    pub fn new(event_loop_proxy: EventLoopProxy<UserEvent>) -> Self {
        let socket = socket::CoreSocket::new(event_loop_proxy.clone());
        let screen_capturer = Arc::new(Mutex::new(capture::Capturer::new()));

        Self {
            event_loop_proxy,
            screen_capturer,
            capturer_events_task: None,
            room_service: None,
            graphics_context: None,
            overlay_window: None,
            annotation_store: annotation::AnnotationStore::new(),
            remote_cursors: std::collections::HashMap::new(),
            socket,
            is_sharing: false,
            shared_source_id: None,
            local_participant: None,
            participants: std::collections::HashMap::new(),
        }
    }

    /// Handle UserEvent dispatched through the event loop
    pub fn handle_user_event(
        &mut self,
        event: UserEvent,
        elwt: &winit::event_loop::EventLoopWindowTarget<UserEvent>,
    ) {
        match event {
            // ═══════════════════════════════════════════════════════════════
            // SCREEN CAPTURE EVENTS
            // ═══════════════════════════════════════════════════════════════

            UserEvent::GetAvailableContent => {
                self.handle_get_available_content();
            }

            UserEvent::StartScreenShare(msg) => {
                self.handle_start_screen_share(msg, elwt);
            }

            UserEvent::StopScreenShare => {
                self.handle_stop_screen_share();
            }

            // ═══════════════════════════════════════════════════════════════
            // ANNOTATION EVENTS
            // ═══════════════════════════════════════════════════════════════

            UserEvent::StrokeStart { stroke_id, participant_id, tool, color, start_point } => {
                self.annotation_store.start_stroke(stroke_id, participant_id, tool, color, start_point);
                self.request_overlay_redraw();
            }

            UserEvent::StrokeUpdate { stroke_id, points } => {
                self.annotation_store.update_stroke(&stroke_id, points);
                self.request_overlay_redraw();
            }

            UserEvent::StrokeComplete { stroke_id } => {
                self.annotation_store.complete_stroke(&stroke_id);
                self.request_overlay_redraw();
            }

            UserEvent::StrokeDelete { stroke_id } => {
                self.annotation_store.delete_stroke(&stroke_id);
                self.request_overlay_redraw();
            }

            UserEvent::ClearAllAnnotations => {
                self.annotation_store.clear_all();
                self.request_overlay_redraw();
            }

            // ═══════════════════════════════════════════════════════════════
            // REMOTE CURSOR EVENTS
            // ═══════════════════════════════════════════════════════════════

            UserEvent::RemoteCursorPosition { participant_id, x, y, visible } => {
                if let Some(cursor) = self.remote_cursors.get_mut(&participant_id) {
                    cursor.x = x;
                    cursor.y = y;
                    cursor.visible = visible;
                } else {
                    // Create new cursor with default color (will be assigned by role)
                    let color = self.get_participant_color(&participant_id);
                    self.remote_cursors.insert(participant_id.clone(), RemoteCursor {
                        participant_id,
                        x, y, visible,
                        style: CursorStyle::Default,
                        color,
                    });
                }
                self.request_overlay_redraw();
            }

            // ═══════════════════════════════════════════════════════════════
            // LIVEKIT EVENTS
            // ═══════════════════════════════════════════════════════════════

            UserEvent::JoinRoom { server_url, token } => {
                self.handle_join_room(server_url, token);
            }

            UserEvent::LeaveRoom => {
                self.handle_leave_room();
            }

            UserEvent::ParticipantConnected(data) => {
                self.participants.insert(data.id.clone(), data.clone());
                self.socket.send_participant_joined(&data);
            }

            UserEvent::ParticipantDisconnected(data) => {
                self.participants.remove(&data.id);
                self.remote_cursors.remove(&data.id);
                self.socket.send_participant_left(&data);
                self.request_overlay_redraw();
            }

            UserEvent::DataReceived { participant_id, payload } => {
                self.handle_data_received(participant_id, payload);
            }

            // ═══════════════════════════════════════════════════════════════
            // FRAME RELAY
            // ═══════════════════════════════════════════════════════════════

            UserEvent::VideoFrameReady { participant_id, track_id, frame_data, width, height, format } => {
                self.socket.send_video_frame(&participant_id, &track_id, &frame_data, width, height, format);
            }

            // ═══════════════════════════════════════════════════════════════
            // GRAPHICS EVENTS
            // ═══════════════════════════════════════════════════════════════

            UserEvent::RequestRedraw => {
                if let Some(window) = &self.overlay_window {
                    window.request_redraw();
                }
            }

            UserEvent::SetOverlayVisible(visible) => {
                if let Some(window) = &self.overlay_window {
                    window.set_visible(visible);
                }
            }

            UserEvent::UpdateOverlayBounds { x, y, width, height } => {
                if let Some(window) = &self.overlay_window {
                    window.set_bounds(x, y, width, height);
                }
            }

            // ═══════════════════════════════════════════════════════════════
            // LIFECYCLE
            // ═══════════════════════════════════════════════════════════════

            UserEvent::Terminate => {
                self.handle_shutdown();
                elwt.exit();
            }

            _ => {}
        }
    }

    fn request_overlay_redraw(&self) {
        let _ = self.event_loop_proxy.send_event(UserEvent::RequestRedraw);
    }

    fn get_participant_color(&self, participant_id: &str) -> Color {
        // Assign unique color based on participant index
        let colors = [
            Color { r: 255, g: 87, b: 87, a: 255 },   // Red
            Color { r: 87, g: 166, b: 255, a: 255 },  // Blue
            Color { r: 87, g: 255, b: 144, a: 255 },  // Green
            Color { r: 255, g: 193, b: 87, a: 255 },  // Orange
            Color { r: 200, g: 87, b: 255, a: 255 },  // Purple
            Color { r: 255, g: 87, b: 200, a: 255 },  // Pink
        ];

        let index = self.participants.keys()
            .position(|id| id == participant_id)
            .unwrap_or(0);

        colors[index % colors.len()].clone()
    }

    // Implementation methods omitted for brevity...
    fn handle_get_available_content(&mut self) { /* ... */ }
    fn handle_start_screen_share(&mut self, msg: ScreenShareMessage, elwt: &winit::event_loop::EventLoopWindowTarget<UserEvent>) { /* ... */ }
    fn handle_stop_screen_share(&mut self) { /* ... */ }
    fn handle_join_room(&mut self, server_url: String, token: String) { /* ... */ }
    fn handle_leave_room(&mut self) { /* ... */ }
    fn handle_data_received(&mut self, participant_id: String, payload: Vec<u8>) { /* ... */ }
    fn handle_shutdown(&mut self) { /* ... */ }
}
```

### 7.4 Socket Communication Pattern

Core and Tauri communicate via Unix domain sockets (or named pipes on Windows). This follows Hopp's `CursorSocket` pattern:

```rust
// packages/core/src/socket/mod.rs

use std::sync::mpsc;
use tokio::net::UnixListener;
use winit::event_loop::EventLoopProxy;
use crate::UserEvent;

pub struct CoreSocket {
    event_loop_proxy: EventLoopProxy<UserEvent>,
    sender: mpsc::Sender<OutgoingMessage>,
}

/// Messages from WebView to Core
#[derive(Debug, Clone, serde::Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum IncomingMessage {
    // Room
    JoinRoom { server_url: String, token: String },
    LeaveRoom,

    // Screen share
    GetAvailableContent,
    StartScreenShare { source_id: String, source_type: String },
    StopScreenShare,

    // Annotations (local user drawing)
    SendAnnotation { stroke: StrokeData },
    DeleteAnnotation { stroke_id: String },
    ClearAnnotations,

    // Cursor (local user's cursor for others to see)
    CursorMove { x: f32, y: f32 },
    CursorHide,

    // Media
    SetMicMuted { muted: bool },
    SetCameraEnabled { enabled: bool },

    // Lifecycle
    Shutdown,
}

/// Messages from Core to WebView
#[derive(Debug, Clone, serde::Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum OutgoingMessage {
    // Screen sources
    AvailableContent { screens: Vec<ScreenInfo>, windows: Vec<WindowInfo> },

    // Room state
    ParticipantJoined { participant: ParticipantInfo },
    ParticipantLeft { participant_id: String },
    ConnectionStateChanged { state: String },

    // Screen share
    ScreenShareStarted { sharer_id: String },
    ScreenShareStopped,

    // Video frames (sent as binary messages)
    VideoFrame {
        participant_id: String,
        track_id: String,
        width: u32,
        height: u32,
        timestamp: u64,
        // frame_data sent as binary payload after JSON header
    },

    // Errors
    Error { code: String, message: String },
}

impl CoreSocket {
    pub fn new(event_loop_proxy: EventLoopProxy<UserEvent>) -> Self {
        let (sender, receiver) = mpsc::channel();

        // Start socket listener in background
        tokio::spawn(async move {
            Self::run_socket_server(receiver).await;
        });

        Self { event_loop_proxy, sender }
    }

    async fn run_socket_server(receiver: mpsc::Receiver<OutgoingMessage>) {
        let socket_path = Self::get_socket_path();
        let listener = UnixListener::bind(&socket_path).unwrap();

        // Accept connections and handle messages...
    }

    fn get_socket_path() -> String {
        #[cfg(unix)]
        {
            format!("/tmp/etch-core-{}.sock", std::process::id())
        }
        #[cfg(windows)]
        {
            format!("\\\\.\\pipe\\etch-core-{}", std::process::id())
        }
    }

    /// Handle incoming message from WebView, dispatch to event loop
    pub fn handle_incoming(&self, msg: IncomingMessage) {
        let event = match msg {
            IncomingMessage::JoinRoom { server_url, token } => {
                UserEvent::JoinRoom { server_url, token }
            }
            IncomingMessage::GetAvailableContent => {
                UserEvent::GetAvailableContent
            }
            IncomingMessage::StartScreenShare { source_id, source_type } => {
                UserEvent::StartScreenShare(ScreenShareMessage {
                    source_id,
                    source_type: if source_type == "screen" { SourceType::Screen } else { SourceType::Window },
                    config: CaptureConfig::default(),
                })
            }
            IncomingMessage::SendAnnotation { stroke } => {
                // Local user's stroke - publish to DataTrack and render
                self.publish_annotation_to_room(&stroke);
                return; // Don't dispatch to local overlay, it goes out to others
            }
            IncomingMessage::Shutdown => {
                UserEvent::Terminate
            }
            // ... handle other messages
            _ => return,
        };

        let _ = self.event_loop_proxy.send_event(event);
    }

    // Outgoing message helpers
    pub fn send_participant_joined(&self, data: &ParticipantData) {
        let _ = self.sender.send(OutgoingMessage::ParticipantJoined {
            participant: data.into(),
        });
    }

    pub fn send_video_frame(
        &self,
        participant_id: &str,
        track_id: &str,
        frame_data: &[u8],
        width: u32,
        height: u32,
        format: FrameFormat,
    ) {
        // Send as binary message with JSON header
        let _ = self.sender.send(OutgoingMessage::VideoFrame {
            participant_id: participant_id.to_string(),
            track_id: track_id.to_string(),
            width,
            height,
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64,
        });
        // Binary frame data follows...
    }

    fn publish_annotation_to_room(&self, stroke: &StrokeData) {
        // Publish via LiveKit DataTrack to all participants
        // (implementation in RoomService)
    }
}
```

### 7.5 Module Responsibilities

| Module | Responsibility | Key Types |
|--------|----------------|-----------|
| `lib.rs` | Application struct, UserEvent enum, event dispatch | `Application`, `UserEvent` |
| `capture/` | Screen/window capture via DesktopCapturer | `Capturer`, `CaptureSource` |
| `graphics/` | wgpu overlay, stroke/cursor rendering | `GraphicsContext`, `OverlayWindow` |
| `socket/` | IPC with Tauri, message serialization | `CoreSocket`, `IncomingMessage`, `OutgoingMessage` |
| `annotation/` | Stroke storage, collision detection | `AnnotationStore`, `Stroke` |
| `room/` | LiveKit room management, DataTrack handling | `RoomService` |

### 7.6 Key Differences from Hopp

| Aspect | Hopp | Etch |
|--------|------|----------|
| **Primary Feature** | Remote cursor sharing + input control | Annotation drawing |
| **Input Handling** | Simulates keyboard/mouse on sharer's machine | No input simulation (annotations only) |
| **DataTrack Usage** | Cursor position, clicks | Stroke data, chat |
| **Overlay Content** | Remote cursors, boundary markers | Strokes, remote cursors, highlights |
| **Backend** | Go server for auth, payments | Minimal Hono API (session-based) |

### 7.7 Tauri Integration

Tauri becomes a thin shell that spawns Core and forwards socket messages:

```rust
// packages/client/src-tauri/src/lib.rs

use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::State;

struct CoreProcess(Mutex<Option<Child>>);

#[tauri::command]
fn spawn_core(state: State<CoreProcess>) -> Result<String, String> {
    let mut guard = state.0.lock().unwrap();

    if guard.is_some() {
        return Err("Core already running".into());
    }

    let core_path = get_core_binary_path();
    let child = Command::new(core_path)
        .spawn()
        .map_err(|e| e.to_string())?;

    let socket_path = format!("/tmp/etch-core-{}.sock", child.id());
    *guard = Some(child);

    Ok(socket_path)
}

#[tauri::command]
fn kill_core(state: State<CoreProcess>) {
    let mut guard = state.0.lock().unwrap();
    if let Some(mut child) = guard.take() {
        let _ = child.kill();
    }
}

fn get_core_binary_path() -> String {
    // Platform-specific binary path in resources
    #[cfg(target_os = "macos")]
    { "resources/core-aarch64-apple-darwin".into() }
    #[cfg(target_os = "linux")]
    { "resources/core-x86_64-unknown-linux-gnu".into() }
    #[cfg(target_os = "windows")]
    { "resources/core-x86_64-pc-windows-msvc.exe".into() }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(CoreProcess(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            spawn_core,
            kill_core,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### 7.8 TypeScript Socket Client

```typescript
// packages/client/src/lib/socket.ts

export class CoreSocket {
  private socket: WebSocket | null = null;
  private eventHandlers = new Map<string, Set<(data: any) => void>>();

  async connect(socketPath: string): Promise<void> {
    // Use Tauri's IPC or native WebSocket to connect to Unix socket
    this.socket = new WebSocket(`ws://localhost:${socketPath}`);

    this.socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      this.emit(msg.type, msg);
    };
  }

  // Commands to Core
  joinRoom(serverUrl: string, token: string): void {
    this.send({ type: 'join_room', server_url: serverUrl, token });
  }

  getAvailableContent(): void {
    this.send({ type: 'get_available_content' });
  }

  startScreenShare(sourceId: string, sourceType: 'screen' | 'window'): void {
    this.send({ type: 'start_screen_share', source_id: sourceId, source_type: sourceType });
  }

  stopScreenShare(): void {
    this.send({ type: 'stop_screen_share' });
  }

  sendAnnotation(stroke: StrokeData): void {
    this.send({ type: 'send_annotation', stroke });
  }

  // Event handlers
  on(event: string, handler: (data: any) => void): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
    return () => this.eventHandlers.get(event)?.delete(handler);
  }

  private send(msg: object): void {
    this.socket?.send(JSON.stringify(msg));
  }

  private emit(event: string, data: any): void {
    this.eventHandlers.get(event)?.forEach(handler => handler(data));
  }
}

// React hook
export function useCore() {
  const [socket] = useState(() => new CoreSocket());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Spawn Core and connect
    invoke<string>('spawn_core').then(socketPath => {
      socket.connect(socketPath).then(() => setConnected(true));
    });

    return () => {
      invoke('kill_core');
    };
  }, []);

  return { socket, connected };
}
```

---

## Appendix: Hopp Reference

Key files to study:

| Component | Hopp Path |
|-----------|-----------|
| Capturer lifecycle | `core/src/capture/capturer.rs` |
| Frame streaming | `core/src/capture/stream.rs` |
| Graphics context | `core/src/graphics/graphics_context.rs` |
| Cursor rendering | `core/src/graphics/cursor.rs` |
| DirectComposition | `core/src/graphics/direct_composition.rs` |
| Socket protocol | `core/src/socket/` (examine their IPC) |

Key dependency:
```toml
livekit = { git = "https://github.com/gethopp/rust-sdks", branch = "patches", features = ["native-tls"] }
```

---

**Proposal Status:** ✅ APPROVED

**Approved By:** Product Owner
**Approval Date:** 2025-12-06

---

## Next Steps (Post-Approval)

1. **Delete `packages/capture-sidecar/`** - No longer needed, Core replaces it
2. **Update Story 3.10 status** - Change from `done` to `in-progress`, revise tasks
3. **Update architecture.md** - Add ADR-008 for Core-centric architecture
4. **Create Epic 3.5 stories** - Foundation stories for Core binary
5. **Begin Core implementation** - Start with capture module using Hopp's patterns
