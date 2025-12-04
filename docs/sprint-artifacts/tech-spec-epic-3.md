# Epic Technical Specification: Screen Sharing

Date: 2025-12-05
Author: BMad
Epic ID: 3
Status: Draft

---

## Overview

Epic 3 implements screen sharing functionality for NAMELESS, enabling users to share their entire screen or specific application windows during meetings. This is a foundational feature that enables the core value proposition of real-time annotations (Epic 4).

The key differentiator is the **sharer experience**: when sharing, the main Nameless window minimizes, a floating control bar provides meeting controls, a share border indicates what's being captured, and a transparent overlay will display annotations (wired in Epic 4).

**Stories in this Epic (10 total):**

1. **3.1:** Implement screen share initiation (hybrid capture)
2. **3.2:** Display shared screen for viewers
3. **3.3:** Implement stop screen sharing
4. **3.4:** Enforce single active screen share
5. **3.5:** Implement screen share quality optimization
6. **3.6:** Create sharer's transparent overlay window
7. **3.7:** Create sharer's floating control bar
8. **3.8:** Create share border indicator
9. **3.9:** Implement main window auto-minimize and restore
10. **3.10:** Implement Rust screen capture sidecar (macOS/Linux)

**FRs Addressed:** FR15-FR26

## Objectives and Scope

### Objectives

1. **Enable screen sharing** - Users can share their entire screen or specific windows with 1080p/VP9/4-6Mbps quality optimized for text clarity
2. **Platform parity** - Screen sharing works on Windows, macOS, and Linux with equivalent quality
3. **Professional sharer UX** - Main window minimizes, floating control bar provides meeting controls, share border shows capture area
4. **Viewer experience** - Shared screen displays clearly with adaptive quality and Around-style participant bubbles
5. **Single share enforcement** - Only one participant can share at a time (MVP constraint)

### In Scope

- Screen/window picker and capture initiation
- LiveKit screen share track publishing
- Viewer-side screen display with quality adaptation
- Floating control bar (Tauri native window)
- Share border indicator (Tauri transparent window)
- Transparent annotation overlay window (placeholder for Epic 4)
- Main window auto-minimize/restore
- Rust sidecar for macOS/Linux capture
- Keyboard shortcut (⌘S / Ctrl+S)

### Out of Scope (Future Epics)

- Annotation rendering on overlay (Epic 4)
- Multiple simultaneous sharers
- Remote control / screen takeover
- Recording / replay
- Audio sharing (system audio)

## System Architecture Alignment

### Architecture Decision References

| ADR | Decision | Epic 3 Impact |
|-----|----------|---------------|
| ADR-003 | Hybrid Rendering (WebView + Native Windows) | Floating control bar, share border, annotation overlay are Tauri native windows |
| ADR-007 | Hybrid Screen Capture (Sidecar + WebView) | Windows uses getDisplayMedia, macOS/Linux use Rust sidecar |

### Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SCREEN SHARING ARCHITECTURE                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SHARER'S MACHINE                                               │
│  ════════════════                                               │
│                                                                  │
│  ┌──────────────────┐     ┌──────────────────────────────────┐  │
│  │  Main Window     │     │  Platform Detection              │  │
│  │  (WebView)       │────▶│  ├─ Windows → getDisplayMedia    │  │
│  │  - MINIMIZED     │     │  └─ macOS/Linux → Rust Sidecar   │  │
│  └──────────────────┘     └──────────────┬───────────────────┘  │
│                                          │                       │
│                                          ▼                       │
│  ┌──────────────────┐     ┌──────────────────────────────────┐  │
│  │ Floating Control │     │  Screen Capture                  │  │
│  │ Bar (Native)     │     │  ├─ 1080p / VP9 / 4-6 Mbps      │  │
│  │ - Always on top  │     │  └─ 60fps target                 │  │
│  └──────────────────┘     └──────────────┬───────────────────┘  │
│                                          │                       │
│  ┌──────────────────┐                    ▼                       │
│  │ Share Border     │     ┌──────────────────────────────────┐  │
│  │ (Transparent)    │     │  LiveKit Room                    │  │
│  │ - Click-through  │     │  └─ publishScreenShare()         │  │
│  └──────────────────┘     └──────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────┐                                           │
│  │ Annotation       │                                           │
│  │ Overlay (Trans.) │  ← Placeholder for Epic 4                 │
│  │ - Click-through  │                                           │
│  └──────────────────┘                                           │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  VIEWER'S MACHINE                                               │
│  ════════════════                                               │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Main Window (WebView)                                    │   │
│  │  ├─ <VideoTrack> for screen share                        │   │
│  │  ├─ Participant bubbles (Around-style, corner)           │   │
│  │  └─ "{name} is sharing" indicator                        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Window Z-Order (Sharer)

1. **Floating Control Bar** - Highest (always topmost)
2. **Share Border Indicator** - High (visible frame)
3. **Annotation Overlay** - Medium (click-through)
4. **Shared Content** - Normal (user's app)
5. **Main Nameless Window** - Minimized

### Package Structure

```
packages/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ScreenShare/
│   │   │   │   ├── ScreenShareButton.tsx      # Share initiation
│   │   │   │   ├── ScreenShareViewer.tsx      # Viewer display
│   │   │   │   ├── FloatingControlBar.tsx     # Sharer controls
│   │   │   │   ├── ShareBorderIndicator.tsx   # Border frame
│   │   │   │   ├── AnnotationOverlay.tsx      # Transparent overlay
│   │   │   │   └── index.ts
│   │   │   └── MeetingRoom/
│   │   │       └── ParticipantBubbles.tsx     # Around-style bubbles
│   │   ├── hooks/
│   │   │   ├── useScreenShare.ts              # Screen share logic
│   │   │   └── useFloatingWindows.ts          # Native window management
│   │   └── stores/
│   │       └── screenShareStore.ts            # Share state
│   └── src-tauri/
│       └── src/
│           ├── screen_share.rs                # Tauri commands
│           └── windows.rs                     # Native window creation
│
└── capture-sidecar/                           # macOS/Linux only
    ├── src/
    │   ├── main.rs                            # Entry point
    │   ├── capture.rs                         # xcap/scrap capture
    │   ├── encode.rs                          # VP9 encoding
    │   └── ipc.rs                             # Tauri communication
    └── Cargo.toml
```

## Detailed Design

### Services and Modules

#### 1. Screen Share Store (`screenShareStore.ts`)

```typescript
interface ScreenShareState {
  // Share state
  isSharing: boolean;
  sharerId: string | null;
  sharerName: string | null;

  // Local sharer state
  isLocalSharing: boolean;
  sharedSource: 'screen' | 'window' | null;
  sharedSourceId: string | null;

  // Native windows state
  floatingBarPosition: { x: number; y: number } | null;

  // Actions
  startSharing: (source: 'screen' | 'window', sourceId: string) => void;
  stopSharing: () => void;
  setRemoteSharer: (participantId: string | null, name: string | null) => void;
  setFloatingBarPosition: (pos: { x: number; y: number }) => void;
}
```

#### 2. useScreenShare Hook

```typescript
interface UseScreenShareReturn {
  // State
  isSharing: boolean;
  isLocalSharing: boolean;
  canShare: boolean;  // false if someone else is sharing
  sharerName: string | null;

  // Actions
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => void;

  // Track
  screenTrack: LocalVideoTrack | null;
}
```

#### 3. useFloatingWindows Hook

```typescript
interface UseFloatingWindowsReturn {
  // Create/destroy native windows
  createFloatingControlBar: () => Promise<void>;
  createShareBorder: (bounds: WindowBounds) => Promise<void>;
  createAnnotationOverlay: (bounds: WindowBounds) => Promise<void>;

  // Cleanup
  destroyAllFloatingWindows: () => Promise<void>;

  // Update
  updateShareBorderPosition: (bounds: WindowBounds) => Promise<void>;
}
```

#### 4. Tauri Commands (Rust)

```rust
// screen_share.rs
#[tauri::command]
async fn start_screen_capture(source_type: String, source_id: String) -> Result<(), String>;

#[tauri::command]
async fn stop_screen_capture() -> Result<(), String>;

#[tauri::command]
fn get_platform() -> String;  // "windows" | "macos" | "linux"

// windows.rs
#[tauri::command]
async fn create_floating_window(
    label: String,
    config: FloatingWindowConfig
) -> Result<(), String>;

#[tauri::command]
async fn destroy_floating_window(label: String) -> Result<(), String>;

#[tauri::command]
async fn update_window_position(
    label: String,
    x: i32,
    y: i32,
    width: u32,
    height: u32
) -> Result<(), String>;

#[tauri::command]
async fn minimize_main_window() -> Result<(), String>;

#[tauri::command]
async fn restore_main_window() -> Result<(), String>;
```

### Data Models and Contracts

#### Screen Share Track Metadata

```typescript
// Published with screen share track
interface ScreenShareMetadata {
  sourceType: 'screen' | 'window';
  sourceName: string;  // "Display 1" or "VS Code"
  resolution: {
    width: number;
    height: number;
  };
}
```

#### Floating Window Configuration

```typescript
interface FloatingWindowConfig {
  label: string;
  title?: string;
  width: number;
  height: number;
  x: number;
  y: number;
  transparent: boolean;
  decorations: boolean;
  alwaysOnTop: boolean;
  skipTaskbar: boolean;
  clickThrough?: boolean;  // For overlay and border
}
```

#### Window Bounds

```typescript
interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  screenId?: string;  // For multi-monitor
}
```

### APIs and Interfaces

#### LiveKit Screen Share API Usage

```typescript
// Starting screen share (Windows - WebView)
const startScreenShare = async () => {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: {
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 30, max: 60 }
    },
    audio: false  // MVP: no system audio
  });

  const track = new LocalVideoTrack(stream.getVideoTracks()[0]);
  await room.localParticipant.publishTrack(track, {
    name: 'screen',
    source: Track.Source.ScreenShare,
    videoEncoding: {
      maxBitrate: 6_000_000,  // 6 Mbps
      maxFramerate: 30
    },
    videoCodec: 'vp9'
  });
};

// Subscribing to remote screen share (Viewer)
room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
  if (track.source === Track.Source.ScreenShare) {
    // Display in ScreenShareViewer component
    setScreenShareTrack(track);
    setSharerName(participant.name);
  }
});
```

#### Tauri Window Creation

```typescript
// Create floating control bar
await invoke('create_floating_window', {
  label: 'floating-control-bar',
  config: {
    width: 450,
    height: 48,
    x: (screenWidth - 450) / 2,
    y: 20,
    transparent: false,
    decorations: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    clickThrough: false
  }
});

// Create share border (click-through)
await invoke('create_floating_window', {
  label: 'share-border',
  config: {
    ...sharedWindowBounds,
    transparent: true,
    decorations: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    clickThrough: true
  }
});
```

### Workflows and Sequencing

#### Screen Share Start Flow

```
User clicks "Share Screen"
         │
         ▼
┌─────────────────────────┐
│ Check canShare          │
│ (no one else sharing?)  │
└───────────┬─────────────┘
            │ yes
            ▼
┌─────────────────────────┐
│ Detect Platform         │
│ ├─ Windows → WebView    │
│ └─ macOS/Linux → Sidecar│
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Show Screen/Window      │
│ Picker (native)         │
└───────────┬─────────────┘
            │ user selects
            ▼
┌─────────────────────────┐
│ Start Capture           │
│ Publish to LiveKit      │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Minimize Main Window    │
│ Focus Shared Content    │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Create Native Windows:  │
│ 1. Floating Control Bar │
│ 2. Share Border         │
│ 3. Annotation Overlay   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Update Store State      │
│ Notify Participants     │
└─────────────────────────┘
```

#### Screen Share Stop Flow

```
User clicks "Stop Share" (or system stops)
         │
         ▼
┌─────────────────────────┐
│ Stop Capture            │
│ Unpublish Track         │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Destroy Native Windows: │
│ 1. Floating Control Bar │
│ 2. Share Border         │
│ 3. Annotation Overlay   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Restore Main Window     │
│ (unminimize)            │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Update Store State      │
│ Notify Participants     │
└─────────────────────────┘
```

## Non-Functional Requirements

### Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| Screen share start latency | < 2s | Time from picker close to first frame received |
| Video quality (sharer) | 1080p @ 4-6 Mbps | VP9 encoding settings |
| Frame rate | 30fps (min 15fps) | Adaptive based on network |
| Native window creation | < 100ms | Time to create floating bar/border |
| Main window minimize/restore | < 200ms | Tauri window API latency |

**Quality Priorities:**
1. Text clarity over frame rate (screen content is often code/documents)
2. Adaptive bitrate to maintain readability on poor networks
3. Never drop below readable threshold for text

### Security

| Concern | Mitigation |
|---------|------------|
| Screen content exposure | User explicitly selects what to share via native picker |
| Permission escalation | macOS/Linux require explicit screen recording permission |
| Floating window spoofing | Windows are created by app, not injectable from outside |
| IPC security (sidecar) | Local-only communication, no network exposure |

**Platform Permissions:**
- **macOS:** Screen Recording permission required (`CGRequestScreenCaptureAccess()`)
- **Windows:** No special permission required for getDisplayMedia
- **Linux:** May require X11/Wayland permissions depending on compositor

### Reliability/Availability

| Scenario | Handling |
|----------|----------|
| Capture fails to start | Show error toast, button returns to default state |
| Track ends unexpectedly | Detect via LiveKit event, clean up all native windows, restore main |
| Sidecar crashes (macOS/Linux) | Detect via process exit, stop sharing gracefully |
| Network degradation | LiveKit adaptive bitrate, quality drops but maintains stream |
| User closes shared window | Detect via track ended, clean up appropriately |

**Graceful Degradation:**
- If sidecar fails on macOS, show error: "Screen sharing requires macOS permissions"
- If getDisplayMedia fails on Windows, show browser-style error dialog
- Always ensure main window restores even if cleanup partially fails

### Observability

| Event | Log Level | Data |
|-------|-----------|------|
| Screen share started | INFO | sourceType, resolution, platform |
| Screen share stopped | INFO | duration, reason (user/system) |
| Native window created | DEBUG | windowLabel, position |
| Sidecar spawned | DEBUG | platform, pid |
| Sidecar error | ERROR | error message, platform |
| Track quality change | DEBUG | newBitrate, newResolution |

**Metrics (Future):**
- Screen share duration histogram
- Share failure rate by platform
- Average quality/bitrate during shares

## Dependencies and Integrations

### External Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| livekit-client | Latest | Screen share track publishing |
| @livekit/components-react | Latest | VideoTrack component for viewer |
| @tauri-apps/api | 2.x | Window management, invoke commands |
| tauri-plugin-shell | Latest | Sidecar management (macOS/Linux) |

### Internal Dependencies

| Package | Dependency | Purpose |
|---------|------------|---------|
| Epic 3 | Epic 2 (Stories 2.6, 2.9) | LiveKit room connection, remote tracks |
| Story 3.1 | Story 3.10 | Rust sidecar for macOS/Linux capture |
| Stories 3.3, 3.9 | Stories 3.6, 3.7, 3.8 | Native window cleanup on stop |

### Rust Crate Dependencies (capture-sidecar)

```toml
[dependencies]
xcap = "0.0.x"           # Cross-platform screen capture
# OR scrap = "0.5"       # RustDesk's capture library
vpx-encode = "0.1"       # VP9 encoding
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

### Platform-Specific Integration

| Platform | Screen Capture | Native Windows |
|----------|----------------|----------------|
| Windows | WebView getDisplayMedia | Tauri webview windows |
| macOS | Rust sidecar (xcap) | NSWindow via Tauri |
| Linux | Rust sidecar (scrap) | X11/Wayland windows via Tauri |

## Acceptance Criteria (Authoritative)

### Story 3.1: Screen Share Initiation (Hybrid Capture)

| AC ID | Criterion | Verification |
|-------|-----------|--------------|
| AC-3.1.1 | Click "Share Screen" shows native picker | Manual: picker appears with screens/windows |
| AC-3.1.2 | Picker shows screens and windows with previews | Manual: multi-monitor and apps visible |
| AC-3.1.3 | Selection starts capture at 1080p/VP9/4-6Mbps | Test: verify track encoding settings |
| AC-3.1.4 | Main window minimizes after selection | Manual: window minimizes |
| AC-3.1.5 | Shared window/screen is focused | Manual: shared content in foreground |
| AC-3.1.6 | Participant shows "Sharing" badge | Test: UI shows badge |
| AC-3.1.7 | Cancel picker does nothing | Test: no state change on cancel |
| AC-3.1.8 | ⌘S / Ctrl+S triggers share flow | Test: keyboard shortcut works |

### Story 3.2: Display Shared Screen for Viewers

| AC ID | Criterion | Verification |
|-------|-----------|--------------|
| AC-3.2.1 | Shared screen fills content area with aspect ratio | Manual: letterbox/pillarbox as needed |
| AC-3.2.2 | 16px minimum padding on all sides | Test: CSS padding verified |
| AC-3.2.3 | Participant videos switch to floating bubbles | Manual: Around-style bubbles in corner |
| AC-3.2.4 | "{name} is sharing" displayed | Test: sharer name shown |
| AC-3.2.5 | Quality adapts to network conditions | Manual: quality changes on throttle |

### Story 3.3: Stop Screen Sharing

| AC ID | Criterion | Verification |
|-------|-----------|--------------|
| AC-3.3.1 | "Stop Sharing" on floating bar stops capture | Test: track unpublished |
| AC-3.3.2 | Floating bar dismissed | Test: window destroyed |
| AC-3.3.3 | Share border dismissed | Test: window destroyed |
| AC-3.3.4 | Annotation overlay dismissed | Test: window destroyed |
| AC-3.3.5 | Main window restores | Test: window unminimized |
| AC-3.3.6 | Button returns to "Share Screen" state | Test: UI state reset |
| AC-3.3.7 | "Sharing" badge removed | Test: badge gone |
| AC-3.3.8 | Viewers see toast "{name} stopped sharing" | Test: toast appears |
| AC-3.3.9 | ⌘S while sharing stops sharing | Test: toggle behavior |
| AC-3.3.10 | System stop detected and handled | Test: track ended event cleanup |

### Story 3.4: Single Active Screen Share

| AC ID | Criterion | Verification |
|-------|-----------|--------------|
| AC-3.4.1 | "Share Screen" disabled when someone sharing | Test: button disabled |
| AC-3.4.2 | Message shown when disabled | Test: tooltip shows sharer name |
| AC-3.4.3 | Button re-enables when sharer stops | Test: state updates |

### Story 3.5: Screen Share Quality Optimization

| AC ID | Criterion | Verification |
|-------|-----------|--------------|
| AC-3.5.1 | Text is readable in shared content | Manual: code/docs legible |
| AC-3.5.2 | Quality prefers clarity over framerate | Test: encoding config |
| AC-3.5.3 | VP9 codec used | Test: track codec setting |
| AC-3.5.4 | contentHint: 'text' set | Test: track settings |

### Story 3.6: Sharer's Transparent Overlay Window

| AC ID | Criterion | Verification |
|-------|-----------|--------------|
| AC-3.6.1 | Transparent overlay created on share start | Test: window created |
| AC-3.6.2 | Overlay positioned over shared content | Test: bounds match |
| AC-3.6.3 | Overlay is always-on-top | Manual: stays above content |
| AC-3.6.4 | Overlay is click-through | Manual: clicks pass through |
| AC-3.6.5 | Overlay tracks window position if sharing window | Manual: follows window |
| AC-3.6.6 | Overlay destroyed on share stop | Test: window cleanup |

### Story 3.7: Sharer's Floating Control Bar

| AC ID | Criterion | Verification |
|-------|-----------|--------------|
| AC-3.7.1 | Floating bar created on share start | Test: window created |
| AC-3.7.2 | Bar shows: 🔴 Sharing, mic, camera, faces, Stop, Leave | Manual: all elements present |
| AC-3.7.3 | Bar always on top of ALL windows | Manual: stays topmost |
| AC-3.7.4 | Bar is draggable | Manual: can reposition |
| AC-3.7.5 | Position persisted between sessions | Test: localStorage |
| AC-3.7.6 | Fades to 60% after 5s idle | Manual: opacity change |
| AC-3.7.7 | Full opacity on hover | Manual: opacity restored |
| AC-3.7.8 | Mic toggle works | Test: mute/unmute |
| AC-3.7.9 | Camera toggle works | Test: enable/disable |
| AC-3.7.10 | Stop Share works | Test: triggers stop flow |
| AC-3.7.11 | Leave shows confirmation (host) | Test: dialog appears |
| AC-3.7.12 | Bar destroyed on share stop | Test: window cleanup |

### Story 3.8: Share Border Indicator

| AC ID | Criterion | Verification |
|-------|-----------|--------------|
| AC-3.8.1 | Border appears around shared content | Manual: visible frame |
| AC-3.8.2 | Border is 3-4px colored line | Manual: visual check |
| AC-3.8.3 | Border is click-through | Manual: clicks pass through |
| AC-3.8.4 | Border tracks window if sharing window | Manual: follows window |
| AC-3.8.5 | Border destroyed on share stop | Test: window cleanup |

### Story 3.9: Main Window Auto-Minimize and Restore

| AC ID | Criterion | Verification |
|-------|-----------|--------------|
| AC-3.9.1 | Main window minimizes on share start | Test: window state |
| AC-3.9.2 | Shared content focused | Manual: foreground |
| AC-3.9.3 | Main window restores on share stop | Test: window state |
| AC-3.9.4 | Window returns to previous position/size | Test: bounds preserved |
| AC-3.9.5 | Restore works even if sidecar crashes | Test: error handling |

### Story 3.10: Rust Screen Capture Sidecar (macOS/Linux)

| AC ID | Criterion | Verification |
|-------|-----------|--------------|
| AC-3.10.1 | Platform detected at runtime | Test: get_platform() |
| AC-3.10.2 | macOS uses sidecar, Windows uses WebView | Test: capture path |
| AC-3.10.3 | Sidecar provides 1080p/VP9/4-6Mbps | Test: output quality |
| AC-3.10.4 | macOS permission requested if needed | Manual: dialog appears |
| AC-3.10.5 | Sidecar spawns on share start | Test: process created |
| AC-3.10.6 | Sidecar terminates on share stop | Test: process cleanup |
| AC-3.10.7 | Graceful fallback if sidecar fails | Test: error message shown |

## Traceability Mapping

### FR to Story Mapping

| FR | Description | Story | Notes |
|----|-------------|-------|-------|
| FR15 | Share entire screen | 3.1, 3.10 | Hybrid capture approach |
| FR16 | Share specific window | 3.1, 3.10 | Native picker |
| FR17 | Stop screen sharing | 3.3 | Via floating bar |
| FR18 | Single share at a time | 3.4 | MVP constraint |
| FR19 | View shared screen | 3.2 | VideoTrack component |
| FR20 | Appropriate quality | 3.5 | VP9/1080p/4-6Mbps |
| FR21 | Main window minimizes | 3.9, 3.1 | Auto-minimize on share |
| FR22 | Visual share border | 3.8 | Transparent window |
| FR23 | Floating control bar | 3.7 | Native window |
| FR24 | Bar visible across screens | 3.7 | Always-on-top |
| FR25 | Bar repositionable | 3.7 | Draggable |
| FR26 | Bar quick controls | 3.7 | Mic, camera, stop, leave |

### Story Dependencies

```
Story 3.10 (Rust Sidecar)
    │
    ▼
Story 3.1 (Screen Share Initiation) ◄─── Epic 2 (LiveKit Room)
    │
    ├───► Story 3.6 (Annotation Overlay)
    │
    ├───► Story 3.7 (Floating Control Bar)
    │
    ├───► Story 3.8 (Share Border)
    │
    └───► Story 3.9 (Auto-Minimize)
              │
              ▼
          Story 3.3 (Stop Sharing)
              │
              ▼
          Story 3.2 (Viewer Display)
              │
              ▼
          Story 3.4 (Single Share)
              │
              ▼
          Story 3.5 (Quality Optimization)
```

### Recommended Implementation Order

| Order | Story | Rationale |
|-------|-------|-----------|
| 1 | 3.10 | Sidecar needed for macOS before 3.1 |
| 2 | 3.1 | Core capture functionality |
| 3 | 3.2 | Viewer display (validates capture works) |
| 4 | 3.9 | Auto-minimize (core UX) |
| 5 | 3.7 | Floating control bar (sharer needs controls) |
| 6 | 3.3 | Stop sharing (complete the flow) |
| 7 | 3.8 | Share border indicator |
| 8 | 3.6 | Annotation overlay (placeholder) |
| 9 | 3.4 | Single share enforcement |
| 10 | 3.5 | Quality optimization |

**Note:** Stories 3.6-3.8 (native windows) can be parallelized after 3.1.

## Risks, Assumptions, Open Questions

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Windows transparent window doesn't work correctly | Medium | High | Early POC validation (Story 3.6 notes); fallback to indicator-only |
| macOS screen recording permission UX confusing | Low | Medium | Clear error messages, link to System Preferences |
| Sidecar VP9 encoding performance on older Macs | Medium | Medium | Test on Intel Macs; consider H.264 fallback |
| Multi-monitor edge cases | Medium | Low | Focus on single monitor MVP; document limitations |
| Window position tracking drift | Low | Medium | Poll position at 60fps; use native APIs |

### Assumptions

1. **LiveKit supports custom video tracks** - Required for sidecar to publish frames
2. **Tauri 2.0 window APIs are stable** - Using for all native windows
3. **xcap/scrap crates work on target platforms** - Proven in other apps (RustDesk, Hopp)
4. **VP9 hardware encoding available** - Most modern Macs/PCs have this
5. **Users have adequate network** - 4-6 Mbps upload for screen share

### Open Questions

| Question | Owner | Status | Resolution |
|----------|-------|--------|------------|
| Should we support system audio sharing? | PM | Deferred | Post-MVP consideration |
| Multi-sharer support timeline? | PM | Deferred | Future epic |
| Linux Wayland vs X11 detection strategy? | Architect | Open | Research during 3.10 |
| Floating bar position: per-screen or global? | UX | Open | Start with global, iterate |

## Test Strategy Summary

### Unit Tests

| Component | Coverage Target | Key Tests |
|-----------|-----------------|-----------|
| screenShareStore | 80% | State transitions, actions |
| useScreenShare hook | 70% | Start/stop logic, error handling |
| useFloatingWindows hook | 70% | Window lifecycle |

### Integration Tests

| Scenario | Approach |
|----------|----------|
| Screen share flow | Mock LiveKit, verify track publishing |
| Native window lifecycle | Mock Tauri invoke, verify calls |
| Platform detection | Mock get_platform(), verify path selection |

### E2E Tests (Manual for MVP)

| Scenario | Platforms |
|----------|-----------|
| Complete share flow | Windows, macOS |
| Floating bar interactions | Windows, macOS |
| Stop via system UI | Windows, macOS |
| Multi-monitor share | Windows, macOS |

### Platform-Specific Testing

| Platform | Focus Areas |
|----------|-------------|
| Windows | Transparent window click-through, getDisplayMedia |
| macOS | Sidecar spawn/kill, permission flow |
| Linux | Wayland/X11 detection, scrap capture |

### Test Data Factories

```typescript
// To be added to @nameless/shared
export const createMockScreenShareTrack = (overrides?: Partial<RemoteVideoTrack>) => ({
  source: Track.Source.ScreenShare,
  sid: 'screen-track-123',
  ...overrides
});

export const createMockScreenShareState = (overrides?: Partial<ScreenShareState>) => ({
  isSharing: false,
  sharerId: null,
  sharerName: null,
  isLocalSharing: false,
  sharedSource: null,
  sharedSourceId: null,
  floatingBarPosition: null,
  ...overrides
});
```

---

_Generated by BMAD Epic Tech Context Workflow_
_Date: 2025-12-05_
_Epic: 3 - Screen Sharing_
