# NAMELESS Architecture

## Overview

NAMELESS uses a modular architecture that separates media transport from annotation logic, enabling scalability, extensibility, and low latency.

## Core Components

### 1. LiveKit Backend (Media Layer)

**Purpose**: SFU (Selective Forwarding Unit) for audio/video/screen-share + DataTracks for annotation events

**Technology**: LiveKit (self-hosted or LiveKit Cloud)

**Responsibilities**:
- WebRTC media routing (audio, video, screen-share)
- DataTrack transport for annotation events
- Low-latency real-time communication

**License**: Apache 2.0

### 2. App Server (Control Plane)

**Purpose**: Authentication, room management, role control, token issuance

**Technology**: Node.js 

**Responsibilities**:
- User authentication and session management
- LiveKit token issuance with role metadata
- Room creation and management
- Policy enforcement (who can annotate)
- Optional event logging

**Does NOT handle**:
- Media routing (LiveKit handles this)
- Drawing logic (client-side only)

### 3. Electron + React Desktop Client

**Purpose**: Primary desktop application

**Technology**: Electron + React + TypeScript

**Features**:
- Login and room list UI
- Join LiveKit room with token
- Publish mic/camera/screen via `desktopCapturer`
- Subscribe to media streams
- Render screen-share with annotation overlay
- Annotation tools (pen, erase, clear-all)
- Role-based UI

**Overlay Layout**:
```html
<div class="share-container">
  <video id="screen-video"></video>
  <canvas id="annotation-canvas"></canvas>
</div>
```

**Coordinate Normalization**:
- Normalize coordinates: `x_norm = x / canvas.width`
- Denormalize when rendering: `x = x_norm * canvas.width`

### 4. Web Client (Optional, Future)

**Purpose**: View-only web interface

**Features**:
- Join room
- View screen-share
- View annotations
- No annotation authoring

### 5. Native Overlay Helper (Future)

**Purpose**: OS-level overlay and capture optimization

**Technology**: Rust/Swift/C++

**Responsibilities**:
- OS-level overlay window
- Native screen capture (better performance)
- IPC contract with Electron app

**IPC Messages**:
```json
{ "type": "overlay_enable" }
{ "type": "overlay_disable" }
{ "type": "stroke_add", "stroke": { ... } }
{ "type": "stroke_delete", "strokeId": "..." }
{ "type": "clear_all" }
```

## Data Flow

### Join Room Flow

1. User authenticates with App Server
2. App Server issues LiveKit token with role metadata
3. Client connects to LiveKit room
4. Client subscribes to media tracks + annotation DataTrack
5. Client sends `sync_request` to get current annotation state
6. Client receives `sync_state` and hydrates local stroke store

### Screen Share Flow

1. Sharer selects screen/window via Electron `desktopCapturer`
2. Sharer publishes screen track to LiveKit
3. Other participants subscribe to screen track
4. All clients render screen video in `<video>` element

### Annotation Flow

1. Host enables annotation mode (if required)
2. Annotator draws on canvas
3. Client captures mouse/touch events
4. Client normalizes coordinates
5. Client emits `stroke_add` events via DataTrack
6. Client renders locally immediately (optimistic rendering)
7. All clients receive `stroke_add` events
8. All clients update local stroke store and re-render
9. Annotator completes stroke → emits `stroke_end`

### Delete/Clear Flow

1. Annotator deletes own stroke → emits `stroke_delete`
2. Host/sharer deletes any stroke → emits `stroke_delete`
3. Host/sharer clears all → emits `clear_all`
4. All clients receive event and update local state

## Architecture Principles

### 1. Separation of Concerns

- **Media Layer**: LiveKit handles all WebRTC media
- **Control Layer**: App Server handles auth, rooms, permissions
- **Presentation Layer**: Client handles rendering and UI

### 2. Event-Driven Synchronization

- Annotations are lightweight vector events
- No pixel data transmitted
- Each client renders independently
- Events are idempotent and replayable

### 3. Resolution Independence

- Coordinates normalized to [0,1] space
- Works across different screen sizes and resolutions
- Sharer and viewers see aligned annotations

### 4. Decentralized Rendering

- Each client maintains local stroke store
- Rendering happens locally for <200ms latency
- No server-side rendering or compositing

### 5. Modularity

- Components can be extended or replaced
- LiveKit can be swapped for another SFU (with work)
- App Server can be Node.js or Go
- Native overlay helper is optional

## Performance Considerations

### Latency Targets

- **Annotation Latency**: < 200ms end-to-end
- **Media Latency**: < 150ms (LiveKit default)

### Scalability

- **Participants**: 10-20 per room (v1 target)
- **Annotations**: Hundreds of strokes per session
- **DataTrack Bandwidth**: Minimal (vector events are small)

### Optimization Strategies

1. **Optimistic Rendering**: Render locally before receiving confirmation
2. **Batching**: Batch multiple points in stroke_add when possible
3. **Throttling**: Throttle high-frequency events (mouse move)
4. **Canvas Optimization**: Use requestAnimationFrame, avoid full redraws
5. **Memory Management**: Clean up old strokes, limit history

## Security Considerations

1. **Authentication**: Required for all users
2. **Authorization**: Role-based permissions enforced at App Server
3. **Token Security**: LiveKit tokens include role metadata, expire after session
4. **Input Validation**: Validate all annotation events
5. **Rate Limiting**: Prevent abuse of DataTrack events

## Deployment Architecture

### Self-Hosted Option

```
┌─────────────┐
│   Client    │
│  (Electron) │
└──────┬──────┘
       │
       ├──────────────┐
       │              │
┌──────▼──────┐  ┌────▼─────┐
│ App Server  │  │ LiveKit  │
│ (Node)      │  │ Backend  │
└─────────────┘  └──────────┘
```

### LiveKit Cloud Option

```
┌─────────────┐
│   Client    │
│  (Electron) │
└──────┬──────┘
       │
       ├──────────────┐
       │              │
┌──────▼──────┐  ┌────▼──────────┐
│ App Server  │  │ LiveKit Cloud │
│ (Node)   │  │   (Managed)   │
└─────────────┘  └───────────────┘
```

## Future Extensions

1. **Native Overlay Helper**: OS-level drawing for better performance
2. **Recording & Replay**: Store annotation events for playback
3. **Advanced Tools**: Rectangles, arrows, text annotations
4. **Org Features**: SSO, teams, user management
5. **Web Annotation Client**: Full-featured browser client
6. **Mobile Apps**: iOS/Android native clients

