# Architecture

## Executive Summary

NAMELESS is an open-source, self-hosted meeting platform with real-time screen annotations. The architecture follows a **decoupled annotation layer** pattern where media transport (video/audio/screen) flows through LiveKit SFU unchanged, while annotation events flow through LiveKit DataTracks as lightweight vector data. Each client reconstructs the annotation canvas locally from the event stream, enabling sub-200ms annotation latency.

**Key Architectural Decisions:**
- **Desktop Client:** Tauri 2.0 (Rust + WebView) for cross-platform with minimal bundle size
- **UI Framework:** React + shadcn/ui + Tailwind CSS for developer-tool aesthetic
- **Media Transport:** LiveKit for WebRTC (self-hosted)
- **Annotation Sync:** LiveKit DataTracks for vector event synchronization
- **Rendering:** Local compositing (client-side, not server-side)

## Project Initialization

**First implementation story should execute:**

```bash
npx create-tauri-ui@latest nameless-client
```

Select options:
- Template: **Vite + React**
- Package manager: **pnpm** (recommended)

This establishes the base architecture with these decisions:

| Provided By Starter | Decision |
|---------------------|----------|
| Desktop Framework | Tauri 2.0 |
| UI Components | shadcn/ui (Radix primitives) |
| Styling | Tailwind CSS |
| Build Tool | Vite |
| Language | TypeScript |
| Icons | Lucide |
| Window Controls | tauri-controls (native look per OS) |
| Theming | Dark/Light mode via CSS variables |

**Additional Dependencies to Install:**

```bash
pnpm add livekit-client @livekit/components-react
```

## Decision Summary

| Category | Decision | Version | Affects FRs | Rationale |
| -------- | -------- | ------- | ----------- | --------- |
| Desktop Framework | Tauri 2.0 | Latest | FR47-52 | Cross-platform, small bundles (~2MB), Rust backend, native OS integration |
| UI Components | shadcn/ui + Radix | Latest | FR47-52 | Accessible primitives, dark mode, matches UX spec |
| Styling | Tailwind CSS | Latest | FR47-52 | Utility-first, consistent with design system |
| Build Tool | Vite | Latest | FR47-52 | Fast HMR, native ESM, Tauri integration |
| Language | TypeScript | 5.x | All | Type safety across client/server/shared |
| State Management | Zustand | 5.0.8 | FR21-30, FR42-46 | Lightweight (~1KB), simple real-time patterns, slice subscriptions |
| Annotation Data Model | Vector events, normalized [0,1] coords | N/A | FR21-30 | Resolution-independent, incremental sync, late-joiner snapshots |
| Backend Framework | Hono | 4.10.7 | FR38-41, FR53-56 | Ultra-lightweight (<12KB), TypeScript-first, zero dependencies |
| Canvas Rendering | HTML Canvas 2D + Perfect Freehand | 1.2.2 | FR21-27, FR30 | Native canvas (zero bundle), smooth strokes, laser effects |
| Testing Framework | Vitest + React Testing Library | Latest | All | Native Vite integration, fast, Jest-compatible |
| Monorepo Structure | pnpm workspaces | N/A | All | Simple, fast, disk-efficient, Tauri-friendly |
| Deployment | Docker Compose + Caddy | N/A | FR53-56 | One-liner self-hosting, auto SSL, simple Caddyfile |
| Reverse Proxy | Caddy | Latest | FR53-56 | Auto HTTPS, minimal config, self-hoster friendly |
| Media Transport | LiveKit | Latest | FR8-20 | WebRTC SFU, self-hostable, DataTracks for annotation sync |
| Screen Capture | Hybrid: Rust Sidecar (macOS) + getDisplayMedia (Windows) | N/A | FR15-20 | Native capture for macOS (WKWebView limitation), browser API for Windows |
| Sharer Annotation Overlay | Tauri transparent window | N/A | FR27-36 | OS-level overlay for sharer to see annotations on their screen |
| Sharer Floating Control Bar | Tauri native window | N/A | FR21-26 | Always-on-top control bar with meeting controls when sharing |
| Share Border Indicator | Tauri transparent window | N/A | FR22 | Visual border around shared window/screen |
| Icons | Lucide | Latest | FR47-52 | Included with shadcn/ui, consistent style |
| Window Controls | tauri-controls | Latest | FR47-52 | Native look per OS (macOS/Windows/Linux) |

## Project Structure

```
nameless/
├── .github/
│   └── workflows/
│       ├── ci.yaml                 # Lint, test, typecheck
│       └── release.yaml            # Build & publish desktop apps
├── packages/
│   ├── client/                     # Tauri desktop application
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── AnnotationCanvas/
│   │   │   │   │   ├── AnnotationCanvas.tsx
│   │   │   │   │   ├── AnnotationCanvas.test.tsx
│   │   │   │   │   └── index.ts
│   │   │   │   ├── AnnotationToolbar/
│   │   │   │   ├── MeetingRoom/
│   │   │   │   ├── ParticipantList/
│   │   │   │   ├── ScreenShare/
│   │   │   │   └── ui/             # shadcn/ui components
│   │   │   ├── hooks/
│   │   │   │   ├── useLiveKit.ts
│   │   │   │   ├── useAnnotations.ts
│   │   │   │   └── usePermissions.ts
│   │   │   ├── stores/
│   │   │   │   ├── annotationStore.ts
│   │   │   │   ├── annotationStore.test.ts
│   │   │   │   ├── roomStore.ts
│   │   │   │   └── settingsStore.ts
│   │   │   ├── lib/
│   │   │   │   ├── canvas.ts       # Canvas rendering utils
│   │   │   │   ├── datatrack.ts    # DataTrack message handling
│   │   │   │   └── api.ts          # API client
│   │   │   ├── utils/
│   │   │   │   ├── coordinates.ts
│   │   │   │   ├── coordinates.test.ts
│   │   │   │   ├── colors.ts       # Participant color assignment
│   │   │   │   └── logger.ts
│   │   │   ├── types/
│   │   │   │   └── index.ts        # Re-export from @nameless/shared
│   │   │   ├── App.tsx
│   │   │   ├── main.tsx
│   │   │   └── index.css           # Tailwind imports
│   │   ├── src-tauri/              # Rust backend
│   │   │   ├── src/
│   │   │   │   ├── main.rs
│   │   │   │   └── lib.rs
│   │   │   ├── Cargo.toml
│   │   │   ├── tauri.conf.json
│   │   │   └── icons/
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── capture-sidecar/            # Rust screen capture sidecar (macOS)
│   │   ├── src/
│   │   │   ├── main.rs             # Sidecar entry point
│   │   │   ├── capture.rs          # Screen capture logic (xcap/scrap)
│   │   │   ├── encode.rs           # VP9 encoding for LiveKit
│   │   │   └── ipc.rs              # Communication with Tauri main process
│   │   ├── Cargo.toml
│   │   └── README.md
│   │
│   ├── server/                     # Hono API server
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── rooms.ts        # POST /api/rooms, POST /api/rooms/:id/join
│   │   │   │   └── health.ts       # GET /api/health
│   │   │   ├── services/
│   │   │   │   └── livekit.ts      # Token generation
│   │   │   ├── middleware/
│   │   │   │   └── logger.ts
│   │   │   ├── utils/
│   │   │   │   └── logger.ts
│   │   │   └── index.ts            # Hono app entry
│   │   ├── Dockerfile
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── shared/                     # Shared types & utilities
│       ├── src/
│       │   ├── types/
│       │   │   ├── stroke.ts       # StrokeEvent, Point, Stroke
│       │   │   ├── room.ts         # Room, Participant, Role
│       │   │   ├── api.ts          # API request/response types
│       │   │   └── index.ts
│       │   ├── constants/
│       │   │   ├── colors.ts       # Participant colors
│       │   │   ├── limits.ts       # MAX_STROKE_POINTS, etc.
│       │   │   └── index.ts
│       │   └── index.ts
│       ├── tsconfig.json
│       └── package.json
│
├── docker/
│   ├── Caddyfile
│   └── livekit.yaml                # LiveKit server config
├── docker-compose.yaml
├── docker-compose.dev.yaml         # Development overrides
├── .env.example
├── pnpm-workspace.yaml
├── package.json                    # Root scripts
├── tsconfig.base.json              # Shared TS config
├── README.md
└── LICENSE                         # Apache 2.0
```

## FR Category to Architecture Mapping

| FR Category | Package | Key Files |
|-------------|---------|-----------|
| **Meeting & Room (FR1-7)** | server, client | `server/src/routes/rooms.ts`, `client/src/stores/roomStore.ts` |
| **Audio & Video (FR8-14)** | client | `client/src/hooks/useLiveKit.ts`, `client/src/components/MeetingRoom/` |
| **Screen Sharing (FR15-20)** | client | `client/src/components/ScreenShare/` |
| **Annotation System (FR21-30)** | client, shared | `client/src/stores/annotationStore.ts`, `client/src/components/AnnotationCanvas/`, `shared/src/types/stroke.ts` |
| **Permission & Roles (FR31-37)** | client, shared | `client/src/hooks/usePermissions.ts`, `shared/src/types/room.ts` |
| **Authentication (FR38-41)** | server | `server/src/services/livekit.ts` |
| **Connection & State (FR42-46)** | client | `client/src/stores/roomStore.ts`, `client/src/lib/datatrack.ts` |
| **Desktop Application (FR47-52)** | client | `client/src-tauri/`, `client/src/App.tsx` |
| **Self-Hosting (FR53-56)** | server, docker | `docker-compose.yaml`, `docker/Caddyfile`, `server/Dockerfile` |

## Technology Stack Details

### Core Technologies

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Desktop Runtime** | Tauri 2.0 | Cross-platform app shell, Rust backend, WebView frontend |
| **Frontend Framework** | React 18 | UI components, hooks, state management |
| **Build Tool** | Vite | Fast HMR, ESM-native bundling |
| **UI Components** | shadcn/ui + Radix | Accessible primitives, consistent design |
| **Styling** | Tailwind CSS | Utility-first, design system tokens |
| **State Management** | Zustand | Lightweight stores, slice subscriptions |
| **Canvas** | HTML Canvas 2D | Native rendering, zero dependencies |
| **Stroke Smoothing** | Perfect Freehand | Beautiful freehand line rendering |
| **Backend** | Hono | Ultra-light API server |
| **Media Transport** | LiveKit | WebRTC SFU, DataTracks |
| **Reverse Proxy** | Caddy | Auto HTTPS, simple config |
| **Containerization** | Docker | Self-hosting deployment |

### Integration Points

| Integration | Package | Purpose |
|-------------|---------|---------|
| **LiveKit Client** | `livekit-client` | WebRTC connection, tracks, DataTracks |
| **LiveKit React** | `@livekit/components-react` | React hooks and components |
| **LiveKit Server SDK** | `livekit-server-sdk` | Token generation (server-side) |

**LiveKit Integration Pattern:**

```typescript
// Client: Connect to room
import { Room, RoomEvent } from 'livekit-client';

const room = new Room();
await room.connect(livekitUrl, token);

// Listen for DataTrack messages (annotations)
room.on(RoomEvent.DataReceived, (payload, participant) => {
  const message = JSON.parse(new TextDecoder().decode(payload));
  handleAnnotationMessage(message);
});

// Send annotation via DataTrack
room.localParticipant.publishData(
  new TextEncoder().encode(JSON.stringify(strokeMessage)),
  { reliable: true }
);
```

**Server: Token Generation:**

```typescript
// Server: Generate room token
import { AccessToken } from 'livekit-server-sdk';

const token = new AccessToken(apiKey, apiSecret, {
  identity: participantId,
  name: displayName,
  metadata: JSON.stringify({ role, color }),
});
token.addGrant({ room: roomId, roomJoin: true, canPublish: true });
return token.toJwt();
```

## Novel Pattern: Decoupled Annotation Layer

### Overview

NAMELESS separates annotation from media transport - annotations flow as lightweight vector events via DataTracks, not embedded in video. Each client reconstructs the canvas locally, enabling sub-200ms latency.

**Key Innovations:**
1. **Annotation Overlay:** The sharer sees annotations on their actual screen (VS Code, Figma, etc.), not inside NAMELESS - via a native transparent overlay window.
2. **Floating Control Bar:** When sharing, the main Nameless window minimizes and a floating control bar appears on top of all windows, giving the sharer access to meeting controls (mic, camera, participant faces, stop share, leave) without switching apps.
3. **Share Border Indicator:** A visual border around the shared window/screen shows exactly what's being captured.

### Component Architecture

**Viewer's Client (WebView only):**
```
┌─────────────────────────────────────────────────────────────────┐
│                    VIEWER CLIENT (WebView)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │AnnotationStore│◀──│ DataTrack    │◀───│ LiveKit Room     │   │
│  │  (Zustand)    │   │ Handler      │    │ Connection       │   │
│  └──────┬───────┘    └──────────────┘    └──────────────────┘   │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────┐    ┌──────────────┐                           │
│  │ <canvas>     │───▶│ Composited   │                           │
│  │ overlay      │    │ View         │                           │
│  └──────────────┘    └──────────────┘                           │
│         ▲                   ▲                                    │
│         │                   │                                    │
│  ┌──────┴───────┐    ┌──────┴───────┐                           │
│  │ Perfect      │    │ <video>      │                           │
│  │ Freehand     │    │ (LiveKit)    │                           │
│  └──────────────┘    └──────────────┘                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Sharer's Client (Hybrid - WebView + Native Windows):**

When sharing, the main window **minimizes** and three native elements appear:

```
┌─────────────────────────────────────────────────────────────────┐
│  MAIN WINDOW (WebView) - MINIMIZED DURING SHARE                  │
│  ├── Meeting controls, participant list                          │
│  ├── getDisplayMedia() → LiveKit screen track                    │
│  └── DataTrack handler → AnnotationStore                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  FLOATING CONTROL BAR (Tauri native window)                      │
│  ├── Always on top of ALL windows & screens                      │
│  ├── Draggable, repositionable                                   │
│  ├── Shows: 🔴 Sharing | [🎤][📷] | [○○○] | [Stop] [Leave]       │
│  └── Dismisses + restores main window on "Stop Share"            │
└─────────────────────────────────────────────────────────────────┘
                           │ visible above everything
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  SHARE BORDER INDICATOR (Tauri transparent window)               │
│  ├── Visual border around shared window/screen                   │
│  ├── Indicates what is being captured                            │
│  └── Click-through (doesn't intercept interactions)              │
└─────────────────────────────────────────────────────────────────┘
                           │ frames the content
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  ANNOTATION OVERLAY WINDOW (Tauri transparent window)            │
│  ├── Always on top, click-through (except when drawing)          │
│  ├── Positioned over shared screen/window                        │
│  └── Canvas renders annotations from AnnotationStore             │
└─────────────────────────────────────────────────────────────────┘
                           │ overlays
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  SHARED CONTENT (VS Code, Figma, etc.)                          │
│                                                                  │
│      ~~~∿~~~ ← Annotations visible ON TOP of shared app         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Window z-order (top to bottom):**
1. Floating Control Bar (always topmost)
2. Annotation Overlay (click-through unless drawing)
3. Share Border Indicator (click-through)
4. Shared Content (user's app)

### Screen Capture Strategy

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Screen capture (macOS) | Rust sidecar (`xcap`/`scrap` crates) | WKWebView doesn't support `getDisplayMedia()` |
| Screen capture (Windows) | WebView `getDisplayMedia()` | WebView2 has full WebRTC support |
| Screen capture (Linux) | Rust sidecar | WebKitGTK WebRTC support is inconsistent |
| Video encoding | VP9 @ 4-6 Mbps | Optimal for text clarity (crisp code) |
| Viewer annotations | `<canvas>` over `<video>` | Standard web compositing |
| Sharer annotations | Tauri transparent window | OS-level overlay on actual shared content |
| Sharer floating control bar | Tauri native window | Always-on-top meeting controls during share |
| Share border indicator | Tauri transparent window | Visual frame showing capture area |

**Screen Capture Architecture:**

```
┌─────────────────────────────────────────────────────────────────┐
│                   Screen Capture Flow                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Platform Detection                     │   │
│  │         (Tauri checks OS at runtime)                      │   │
│  └─────────────────────────┬────────────────────────────────┘   │
│                            │                                     │
│            ┌───────────────┼───────────────┐                    │
│            ▼               ▼               ▼                    │
│      ┌──────────┐   ┌──────────┐   ┌──────────┐                │
│      │  macOS   │   │ Windows  │   │  Linux   │                │
│      │ Sidecar  │   │ WebView  │   │ Sidecar  │                │
│      │ (xcap)   │   │(getDisp) │   │ (scrap)  │                │
│      └────┬─────┘   └────┬─────┘   └────┬─────┘                │
│           │              │              │                       │
│           └──────────────┼──────────────┘                       │
│                          ▼                                      │
│             ┌───────────────────────┐                           │
│             │    VP9 Encoding       │                           │
│             │   (4-6 Mbps target)   │                           │
│             └───────────┬───────────┘                           │
│                         ▼                                       │
│             ┌───────────────────────┐                           │
│             │   LiveKit Track       │                           │
│             │   (Screen Share)      │                           │
│             └───────────────────────┘                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Sidecar Architecture (macOS/Linux):**

```
┌─────────────────────────────────────────────────────────────────┐
│                   Tauri Main Process                             │
│  ┌──────────────┐        ┌──────────────────┐                   │
│  │   WebView    │◄──────►│   Rust Backend   │                   │
│  │  (UI/React)  │  IPC   │   (Tauri Core)   │                   │
│  └──────────────┘        └────────┬─────────┘                   │
│                                   │ Sidecar API                  │
│                          ┌────────▼─────────┐                   │
│                          │  capture-sidecar │                   │
│                          │  (Rust binary)   │                   │
│                          ├──────────────────┤                   │
│                          │ - xcap/scrap     │                   │
│                          │ - VP9 encoding   │                   │
│                          │ - Frame streaming│                   │
│                          └────────┬─────────┘                   │
└───────────────────────────────────┼─────────────────────────────┘
                                    │
                           ┌────────▼─────────┐
                           │     LiveKit      │
                           │   (custom track) │
                           └──────────────────┘
```

**Why Rust Sidecar for macOS?**
- macOS WKWebView (used by Tauri) does NOT support `getDisplayMedia()`
- This is a WebKit limitation, not a Tauri limitation
- Same issue affects Linux WebKitGTK with inconsistent WebRTC support
- Windows WebView2 (Chromium-based) has full WebRTC support

**Recommended Rust Crates:**
- `xcap` - Cross-platform screen capture (used by tauri-plugin-screenshots)
- `scrap` - From RustDesk, proven at scale for remote desktop
- `vpx-encode` or `rav1e` - VP9/AV1 encoding

### Data Flow

| Flow | Steps |
|------|-------|
| **Local Drawing** | User draws → Local render (immediate) → Send via DataTrack → Others receive |
| **Remote Strokes** | DataTrack message → Validate → Add to store → Re-render canvas |
| **Late-Joiner** | Join room → Request snapshot → Host sends strokes → Reconstruct canvas |

### Message Protocol

```typescript
// Incremental update during drawing (batched every 16ms)
interface StrokeUpdateMessage {
  type: 'stroke_update';
  strokeId: string;
  participantId: string;
  tool: 'pen' | 'highlighter' | 'laser';
  points: Point[];        // New points since last update
  timestamp: number;
}

// Stroke completed
interface StrokeCompleteMessage {
  type: 'stroke_complete';
  strokeId: string;
  participantId: string;
  tool: 'pen' | 'highlighter' | 'laser';
  points: Point[];        // Full point array
  timestamp: number;
}

// Delete stroke
interface StrokeDeleteMessage {
  type: 'stroke_delete';
  strokeId: string;
  deletedBy: string;
  timestamp: number;
}

// Clear all (host only)
interface ClearAllMessage {
  type: 'clear_all';
  clearedBy: string;
  timestamp: number;
}

// Late-joiner requests state
interface StateRequestMessage {
  type: 'state_request';
  requesterId: string;
}

// Host responds with snapshot
interface StateSnapshotMessage {
  type: 'state_snapshot';
  strokes: Stroke[];
  timestamp: number;
}

// Laser pointer (ephemeral)
interface LaserUpdateMessage {
  type: 'laser_update';
  participantId: string;
  position: Point;
  trail: Point[];         // Last 20 points for trail
  timestamp: number;
}
```

### State Synchronization

**Conflict Resolution:**
- Timestamp-based ordering (last-write-wins for deletes)
- Strokes are append-only until deleted
- No concurrent editing (each stroke has single owner)

**Late-Joiner Flow:**
1. New participant joins
2. Client sends `state_request` via DataTrack
3. Host sends `state_snapshot` with all completed strokes
4. New client reconstructs canvas
5. Starts receiving live updates

**Reconnection Flow:**
1. Detect disconnect
2. Queue local strokes during disconnect
3. On reconnect, request state snapshot
4. Merge local queue with received state
5. Resume normal operation

### Laser Pointer Handling

Laser pointers are **ephemeral** - separate from annotation store:

| Aspect | Behavior |
|--------|----------|
| Storage | Separate `laserStore`, not persisted |
| Lifetime | Fades after 2 seconds inactivity |
| Trail | Last 20 points shown |
| Update frequency | Every frame while moving |
| Late-join | Not included in snapshot |

### Canvas Rendering Pipeline

```
1. Clear canvas (or double-buffer)
2. Draw completed strokes from annotationStore
3. Draw in-progress stroke (local user)
4. Draw laser pointers with glow effect
5. requestAnimationFrame → repeat
```

**Performance Optimizations:**
- Re-render only dirty regions when possible
- Cache completed strokes as Path2D objects
- Use `requestAnimationFrame` for 60fps
- Batch point updates (don't re-render per point)

## Implementation Patterns

These patterns ensure consistent implementation across all AI agents:

### React Component Pattern

```typescript
// Functional components with TypeScript
interface AnnotationToolbarProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  canClearAll: boolean;
  onClearAll: () => void;
}

export function AnnotationToolbar({
  activeTool,
  onToolChange,
  canClearAll,
  onClearAll,
}: AnnotationToolbarProps) {
  return (
    <div className="flex items-center gap-2">
      {/* ... */}
    </div>
  );
}
```

### Zustand Store Pattern

```typescript
// Typed store with actions
import { create } from 'zustand';
import type { Stroke, Point } from '@nameless/shared';

interface AnnotationState {
  strokes: Stroke[];
  addStroke: (stroke: Stroke) => void;
  updateStroke: (strokeId: string, points: Point[]) => void;
  deleteStroke: (strokeId: string) => void;
  clearAll: () => void;
}

export const useAnnotationStore = create<AnnotationState>((set) => ({
  strokes: [],
  addStroke: (stroke) =>
    set((state) => ({ strokes: [...state.strokes, stroke] })),
  updateStroke: (strokeId, points) =>
    set((state) => ({
      strokes: state.strokes.map((s) =>
        s.id === strokeId ? { ...s, points: [...s.points, ...points] } : s
      ),
    })),
  deleteStroke: (strokeId) =>
    set((state) => ({
      strokes: state.strokes.filter((s) => s.id !== strokeId),
    })),
  clearAll: () => set({ strokes: [] }),
}));
```

### API Route Pattern (Hono)

```typescript
// Route with validation and error handling
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const createRoomSchema = z.object({
  hostName: z.string().min(1).max(50),
});

const rooms = new Hono();

rooms.post('/', zValidator('json', createRoomSchema), async (c) => {
  const { hostName } = c.req.valid('json');

  try {
    const roomId = generateRoomId();
    const token = await createHostToken(roomId, hostName);
    return c.json({ roomId, token }, 201);
  } catch (error) {
    return c.json({ error: { code: 'ROOM_CREATE_FAILED', message: 'Failed to create room' } }, 500);
  }
});

export { rooms };
```

### Custom Hook Pattern

```typescript
// Hook encapsulating LiveKit + annotation logic
import { useRoom, useDataChannel } from '@livekit/components-react';
import { useAnnotationStore } from '@/stores/annotationStore';

export function useAnnotations() {
  const { strokes, addStroke, clearAll } = useAnnotationStore();
  const { send } = useDataChannel('annotations');

  const publishStroke = useCallback((stroke: Stroke) => {
    addStroke(stroke);  // Optimistic local update
    send(JSON.stringify({ type: 'stroke_complete', ...stroke }));
  }, [addStroke, send]);

  return { strokes, publishStroke, clearAll };
}

## Consistency Rules

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Files (components) | PascalCase | `AnnotationToolbar.tsx` |
| Files (utils/hooks) | camelCase | `useAnnotationStore.ts`, `coordinates.ts` |
| Files (tests) | Co-located with `.test.ts` | `coordinates.test.ts` |
| React Components | PascalCase | `AnnotationCanvas` |
| Functions | camelCase | `normalizeCoordinates()` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_STROKE_POINTS` |
| Error Codes | SCREAMING_SNAKE_CASE | `ROOM_NOT_FOUND` |
| Types/Interfaces | PascalCase | `StrokeEvent`, `Point` |
| CSS Classes | Tailwind utilities | `className="flex items-center"` |
| API Endpoints | kebab-case | `/api/rooms/:id/join` |
| Environment Variables | SCREAMING_SNAKE_CASE | `LIVEKIT_API_KEY` |

### Code Organization

**Test files:** Co-located with source files
```
src/
  stores/
    annotationStore.ts
    annotationStore.test.ts
  utils/
    coordinates.ts
    coordinates.test.ts
```

**Component structure:**
```
src/
  components/
    AnnotationToolbar/
      AnnotationToolbar.tsx
      AnnotationToolbar.test.tsx
      index.ts
```

**Imports:** Use path aliases
```typescript
import { useAnnotationStore } from '@/stores/annotationStore';
import { normalizeCoordinates } from '@/utils/coordinates';
```

### Error Handling

**Client-side:**
- Custom error classes extending `Error`
- Error boundaries for React component failures
- Toast notifications for user-facing errors
- Console logging in development only

**Server-side:**
```typescript
interface ApiError {
  error: {
    code: string;      // SCREAMING_SNAKE_CASE, e.g., 'ROOM_NOT_FOUND'
    message: string;   // Human-readable description
  }
}
```

**HTTP Status Codes:**
| Code | Usage |
|------|-------|
| 200 | Success |
| 201 | Created (new room) |
| 400 | Bad request (validation failed) |
| 401 | Unauthorized (invalid/expired token) |
| 404 | Not found (room doesn't exist) |
| 500 | Internal server error |

### Logging Strategy

**Log Levels:**
| Level | When to Use |
|-------|-------------|
| `error` | Unexpected failures, caught exceptions |
| `warn` | Recoverable issues, deprecations |
| `info` | Key events (room joined, screen share started) |
| `debug` | Detailed flow (stroke sync, DataTrack messages) |

**Client-side:** Console wrapper, production shows `error` + `warn` only
**Server-side:** Structured JSON to stdout (Docker logs)

```typescript
// Server log format
{
  "level": "info",
  "timestamp": "2025-11-30T10:00:00Z",
  "message": "Room created",
  "roomId": "abc123"
}
```

### Date/Time Handling

| Aspect | Decision |
|--------|----------|
| Storage/Transport | Unix timestamps (milliseconds) |
| Timezone | All timestamps in UTC |
| Display | User's locale via `Intl.DateTimeFormat` |
| Library | Native `Date` + `Intl` (no external deps) |

### API Response Format

**Success:** Direct JSON data (no wrapper)
```json
{
  "roomId": "abc123",
  "token": "eyJ..."
}
```

**Error:** Consistent error object
```json
{
  "error": {
    "code": "ROOM_NOT_FOUND",
    "message": "The requested room does not exist"
  }
}
```

**Content-Type:** Always `application/json`

### Authentication Pattern

**Token Flow:**
1. Create room → Server generates HOST token (JWT)
2. Share link → Link contains roomId
3. Join via link → Server generates PARTICIPANT token
4. Token to LiveKit → LiveKit validates, grants access

**JWT Structure:**
```typescript
{
  "sub": "participant-id",
  "video": { "room": "room-id", "roomJoin": true },
  "name": "Display Name",
  "metadata": {
    "role": "host" | "annotator" | "viewer",
    "color": "#f97316"
  },
  "exp": 1732971600,  // 1 hour expiry
  "iat": 1732968000
}
```

### Testing Strategy

**HIGH Priority (MVP required):**
- Annotation store logic (add/remove/clear strokes)
- Coordinate normalization functions
- DataTrack message serialization
- Token generation and validation

**MEDIUM Priority (should have):**
- Canvas rendering, stroke paths
- UI component interactions

**LOW Priority (post-MVP):**
- E2E flows with Playwright
- Cross-platform consistency

## Data Architecture

### Core Data Models

**No persistent database** - NAMELESS is session-based. All data exists in memory during meetings.

```typescript
// packages/shared/src/types/stroke.ts
export interface Point {
  x: number;  // 0.0 - 1.0 (normalized)
  y: number;  // 0.0 - 1.0 (normalized)
  pressure?: number;
}

export interface Stroke {
  id: string;
  participantId: string;
  tool: 'pen' | 'highlighter';
  color: string;
  points: Point[];
  createdAt: number;  // Unix timestamp (ms)
}

// packages/shared/src/types/room.ts
export type Role = 'host' | 'sharer' | 'annotator' | 'viewer';

export interface Participant {
  id: string;
  name: string;
  role: Role;
  color: string;
  isLocal: boolean;
}

export interface RoomState {
  id: string;
  participants: Participant[];
  isScreenSharing: boolean;
  sharerId: string | null;
  annotationsEnabled: boolean;
}
```

### State Locations

| Data | Location | Persistence |
|------|----------|-------------|
| Strokes | `annotationStore` (Zustand) | Session only |
| Laser pointers | `laserStore` (Zustand) | Ephemeral (2s TTL) |
| Room state | `roomStore` (Zustand) | Session only |
| User settings | `settingsStore` + localStorage | Persisted locally |
| Recent rooms | localStorage | Persisted locally |

## API Contracts

### Endpoints

**POST /api/rooms** - Create new room

Request:
```json
{
  "hostName": "BMad"
}
```

Response (201):
```json
{
  "roomId": "abc-123-xyz",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "livekitUrl": "wss://nameless.example.com/livekit"
}
```

---

**POST /api/rooms/:roomId/join** - Join existing room

Request:
```json
{
  "participantName": "Alice",
  "role": "annotator"
}
```

Response (200):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "livekitUrl": "wss://nameless.example.com/livekit"
}
```

Error (404):
```json
{
  "error": {
    "code": "ROOM_NOT_FOUND",
    "message": "The requested room does not exist or has ended"
  }
}
```

---

**GET /api/health** - Health check

Response (200):
```json
{
  "status": "ok",
  "timestamp": 1732968000000
}
```

## Security Architecture

### Transport Security

| Layer | Protection |
|-------|------------|
| API | HTTPS via Caddy (auto TLS) |
| WebRTC Signaling | WSS via Caddy |
| WebRTC Media | DTLS-SRTP (standard) |
| DataTrack | Encrypted via WebRTC |

### Authentication

- **Room tokens:** JWT with 1-hour expiry
- **Token scope:** Single room, specific permissions
- **No password:** Token is the credential
- **No accounts:** Stateless, anonymous participation

### Authorization (Roles)

| Action | Host | Sharer | Annotator | Viewer |
|--------|------|--------|-----------|--------|
| Create strokes | ✅ | ✅ | ✅ | ❌ |
| Delete own strokes | ✅ | ✅ | ✅ | ❌ |
| Delete any stroke | ✅ | ✅ (on their screen) | ❌ | ❌ |
| Clear all | ✅ | ❌ | ❌ | ❌ |
| Share screen | ✅ | ✅ | ❌ | ❌ |
| Remove participant | ✅ | ❌ | ❌ | ❌ |
| Enable/disable annotations | ✅ | ❌ | ❌ | ❌ |

### Data Privacy

- No server-side persistence of meeting content
- Screen content never stored
- Annotation data exists only in participant memory
- No telemetry without explicit opt-in
- All data deleted when meeting ends

## Performance Considerations

### Latency Targets

| Metric | Target | Strategy |
|--------|--------|----------|
| Local stroke render | < 16ms | Direct canvas draw, no React re-render |
| Annotation sync (network) | < 150ms p95 | DataTrack reliable mode |
| End-to-end annotation | < 200ms | Local-first optimistic rendering |
| Room join | < 5s | Minimal token validation |
| Late-join sync | < 1s for 100 strokes | Batched state snapshot |

### Resource Limits

| Resource | Limit | Rationale |
|----------|-------|-----------|
| Memory (idle) | < 500MB | Reasonable for desktop |
| Memory (active) | < 1GB | Leave headroom for user work |
| CPU (screen share + annotate) | < 30% | Don't interfere with user's work |
| Strokes per session | 500+ | Extended meeting support |
| Points per stroke | 10,000 | Prevent memory bloat |

### Optimization Strategies

1. **Canvas rendering:**
   - Cache completed strokes as Path2D
   - Only re-render on changes
   - Use `requestAnimationFrame`

2. **Network:**
   - Batch stroke points (every 16ms, not per point)
   - Use reliable DataTrack for strokes
   - Use unreliable DataTrack for laser (lower latency)

3. **Memory:**
   - Limit stroke point arrays
   - Clear laser trails older than 2s
   - Prune deleted strokes from state

## Deployment Architecture

### Overview

Single domain deployment with reverse proxy handling SSL and routing:

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Compose                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐     ┌──────────────┐    ┌──────────────┐   │
│  │    Caddy    │────▶│ nameless-api │    │   LiveKit    │   │
│  │   (proxy)   │────▶│   (Hono)     │    │   Server     │   │
│  │  auto SSL   │     └──────────────┘    └──────────────┘   │
│  └─────────────┘                                             │
│         │                                                    │
│         ▼                                                    │
│    :443 (HTTPS)                                             │
│    :7881 (WebRTC UDP/TCP - direct to LiveKit)               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Routing

| Path | Service | Purpose |
|------|---------|---------|
| `/api/*` | nameless-api:3000 | Token generation, room management |
| `/livekit/*` | livekit:7880 | WebRTC signaling (WebSocket) |

### Caddyfile

```
{$DOMAIN} {
    reverse_proxy /api/* nameless-api:3000
    reverse_proxy /livekit/* livekit:7880
}
```

### docker-compose.yaml

```yaml
services:
  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    environment:
      - DOMAIN=${DOMAIN}
    depends_on:
      - nameless-api
      - livekit

  nameless-api:
    build: ./packages/server
    environment:
      - LIVEKIT_URL=ws://livekit:7880
      - LIVEKIT_API_KEY=${LIVEKIT_API_KEY}
      - LIVEKIT_API_SECRET=${LIVEKIT_API_SECRET}
    expose:
      - "3000"

  livekit:
    image: livekit/livekit-server:latest
    ports:
      - "7881:7881/udp"  # WebRTC media (must be direct, not proxied)
    expose:
      - "7880"  # Signaling (internal, proxied via Caddy)
    environment:
      - LIVEKIT_KEYS=${LIVEKIT_API_KEY}:${LIVEKIT_API_SECRET}

volumes:
  caddy_data:
  caddy_config:
```

### User Configuration (.env)

```bash
DOMAIN=nameless.mycompany.com
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=your-secret-here
```

### Client Configuration

Users set ONE value in the desktop client:
```
Server: nameless.mycompany.com
```

Client derives:
- API: `https://nameless.mycompany.com/api`
- LiveKit: `wss://nameless.mycompany.com/livekit`

### Deployment Commands

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down
```

### Health Checks

| Endpoint | Purpose |
|----------|---------|
| `GET /api/health` | API server health |
| LiveKit built-in | LiveKit server health |

## Development Environment

### Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| Node.js | 20 LTS | JavaScript runtime |
| pnpm | 8+ | Package manager |
| Rust | 1.70+ | Tauri backend |
| Docker | 24+ | Local LiveKit, deployment |
| macOS / Windows / Linux | - | Development platform |

**Rust toolchain (for Tauri):**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### Setup Commands

```bash
# Clone repository
git clone https://github.com/your-org/nameless.git
cd nameless

# Install dependencies
pnpm install

# Start local LiveKit (required for meetings)
docker compose -f docker-compose.dev.yaml up -d livekit

# Start development servers
pnpm dev           # Runs client + server concurrently

# Or run individually:
pnpm dev:client    # Tauri dev mode (hot reload)
pnpm dev:server    # Hono dev server

# Run tests
pnpm test          # All packages
pnpm test:client   # Client tests only
pnpm test:server   # Server tests only

# Type checking
pnpm typecheck     # All packages

# Linting
pnpm lint          # ESLint + Prettier check
pnpm lint:fix      # Auto-fix issues

# Build for production
pnpm build         # Build all packages
pnpm build:client  # Build Tauri app (.dmg, .msi)
pnpm build:server  # Build server Docker image
```

### Environment Variables

**Development (.env.local):**
```bash
# LiveKit (local Docker instance)
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret

# Server
PORT=3000
```

**Production (.env):**
```bash
DOMAIN=nameless.example.com
LIVEKIT_API_KEY=your-production-key
LIVEKIT_API_SECRET=your-production-secret
```

### IDE Setup

**VS Code Extensions (recommended):**
- `dbaeumer.vscode-eslint`
- `esbenp.prettier-vscode`
- `bradlc.vscode-tailwindcss`
- `rust-lang.rust-analyzer`
- `tauri-apps.tauri-vscode`

**Settings (.vscode/settings.json):**
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.preferences.importModuleSpecifier": "non-relative"
}
```

## Architecture Decision Records (ADRs)

### ADR-001: Tauri over Electron

**Status:** Accepted

**Context:** Need cross-platform desktop runtime for macOS and Windows.

**Decision:** Use Tauri 2.0 instead of Electron.

**Rationale:**
- 10x smaller bundle size (~2MB vs ~150MB)
- Lower memory footprint
- Rust backend enables future native optimizations
- Active development with mobile support coming
- Aligns with "lean" philosophy

**Consequences:**
- Team needs basic Rust knowledge for native features
- Smaller ecosystem than Electron
- WebView rendering (not Chromium) - minor CSS differences possible

---

### ADR-002: LiveKit DataTracks for Annotations

**Status:** Accepted

**Context:** Need to synchronize annotation state across participants with < 200ms latency.

**Decision:** Use LiveKit DataTracks instead of separate WebSocket.

**Rationale:**
- Already have LiveKit for media transport
- DataTracks encrypted by default
- Reliable and unreliable modes available
- No additional infrastructure needed
- Ordered delivery in reliable mode

**Consequences:**
- Tightly coupled to LiveKit
- Message size limited (64KB default)
- Must handle late-joiner sync ourselves

---

### ADR-003: Hybrid Rendering (WebView + Native Windows)

**Status:** Accepted

**Context:** Where to render annotations - and how does the sharer see annotations on their shared content? How does the sharer access meeting controls when the main window is minimized?

**Decision:** Hybrid approach with multiple rendering modes:
1. **Viewers:** Canvas overlay on `<video>` element in WebView
2. **Sharer:** Three native Tauri windows:
   - **Floating Control Bar:** Always-on-top window with meeting controls (mic, camera, stop share, leave, participant faces)
   - **Annotation Overlay:** Transparent window for drawing annotations on shared content
   - **Share Border Indicator:** Transparent window showing visual frame around captured area

**Rationale:**
- Sharer needs to see annotations on their actual screen (VS Code, Figma, etc.), not inside NAMELESS
- Sharer needs meeting controls accessible without switching apps (main window minimizes during share)
- Floating control bar provides: sharing indicator, mic/camera toggles, participant faces, stop share, leave
- Share border shows exactly what's being captured
- Viewers see annotations composited on the video element (standard web)
- WebView handles screen capture via `getDisplayMedia()` (proven, hardware-accelerated)
- Tauri handles native windows (transparent overlays, always-on-top control bar)

**Architecture:**
```
Sharer's machine (during screen share):
├── NAMELESS main window (WebView) - MINIMIZED
├── Floating Control Bar (Tauri native) - always on top, draggable
├── Share Border Indicator (Tauri transparent) - frames captured area
├── Annotation Overlay (Tauri transparent) - annotations on shared content
└── Screen capture via getDisplayMedia() - sent to LiveKit

Viewer's machine:
├── NAMELESS main window (WebView)
│   ├── <video> element - shared screen from LiveKit
│   └── <canvas> overlay - annotations
```

**Window Lifecycle:**
1. User clicks "Share Screen" → screen picker appears
2. User selects window/screen → main window minimizes
3. Three native elements created: floating bar, border indicator, annotation overlay
4. User clicks "Stop Share" on floating bar → native windows destroyed, main window restores

**Consequences:**
- More complex than pure WebView approach (three native windows to manage)
- Need to sync annotation coordinates between overlay and video
- Sharer's overlay windows must track shared screen/window position
- Floating control bar needs to work across all screens/spaces
- Two rendering pipelines must produce identical visual results
- Future: Native overlay could be extracted as annotation SDK

**Platform Considerations:**
- **macOS:** NSWindow with `level: .floating`, `collectionBehavior: .canJoinAllSpaces`
- **Windows:** `WS_EX_TOPMOST` + `WS_EX_TRANSPARENT` (for click-through), `SetWindowPos` for always-on-top

---

### ADR-004: Zustand over Redux

**Status:** Accepted

**Context:** Need state management for annotations, room state, settings.

**Decision:** Use Zustand instead of Redux Toolkit.

**Rationale:**
- Minimal boilerplate
- ~1KB bundle size
- Simple subscription model (slice-based re-renders)
- Works outside React (useful for Tauri commands)
- Sufficient for our state complexity

**Consequences:**
- Less structured than Redux
- Smaller middleware ecosystem
- Team familiar with Redux may need adjustment

---

### ADR-005: No Persistent Database

**Status:** Accepted

**Context:** Do we need a database for MVP?

**Decision:** No database - session-based only.

**Rationale:**
- Meetings are ephemeral by design
- Reduces self-hosting complexity
- Aligns with privacy goals (no server-side data retention)
- Can add optional persistence later if needed

**Consequences:**
- No meeting history on server
- No user accounts
- Room state lost when all participants leave
- Settings stored in client localStorage only

---

### ADR-006: Caddy over nginx/Traefik

**Status:** Accepted

**Context:** Need reverse proxy with SSL for self-hosted deployment.

**Decision:** Use Caddy instead of nginx or Traefik.

**Rationale:**
- Automatic HTTPS with Let's Encrypt (2 lines of config)
- Simplest configuration for self-hosters
- WebSocket support built-in
- Open source (Apache 2.0)

**Consequences:**
- Less familiar to some ops teams
- Fewer advanced routing features than Traefik
- Sufficient for our simple routing needs

---

### ADR-007: Hybrid Screen Capture (Sidecar + WebView)

**Status:** Accepted (Updated 2025-12-01 based on domain research)

**Context:** How to capture the screen for sharing - Rust/native APIs or WebView/browser APIs?

**Decision:** Use a **hybrid approach**:
- **macOS/Linux:** Rust sidecar binary using `xcap`/`scrap` crates for native screen capture
- **Windows:** WebView `getDisplayMedia()` (WebView2 has full WebRTC support)

**Rationale:**
- macOS WKWebView does NOT support `getDisplayMedia()` - this is a WebKit limitation
- Linux WebKitGTK has inconsistent WebRTC support
- Windows WebView2 (Chromium-based) has full `getDisplayMedia()` support
- Tauri's sidecar pattern is proven (Hopp uses exactly this approach)
- Rust crates `xcap` and `scrap` (from RustDesk) are production-ready

**Research Findings (2025-12-01):**
- Hopp app uses Tauri + Rust sidecar for screen capture
- RustDesk proves native Rust screen capture at scale
- The key insight: native capture is REQUIRED for macOS, not just an optimization

**Resolution Strategy:**
- MVP: 1080p @ 4-6 Mbps with VP9 codec
- Focus on text clarity (high bitrate) over raw resolution
- 5K not needed - crisp text at 1080p beats blurry text at 4K

**Alternatives Considered:**
1. **Pure WebView getDisplayMedia** - ❌ Won't work on macOS (WKWebView limitation)
2. **Electron** - Works but violates startup speed and bundle size goals
3. **Windows-only MVP** - Loses 50%+ of developer market (Mac-heavy)
4. **Rust sidecar on all platforms** - Chosen for macOS/Linux, optional for Windows

**Consequences:**
- More complex architecture (two capture paths)
- Need to maintain sidecar binary alongside Tauri app
- Platform-specific code paths for screen capture
- Graceful fallback if sidecar fails (show error, suggest Windows)
- Sidecar increases bundle size slightly (~2-5MB)

**Implementation:**
```
packages/capture-sidecar/
├── src/
│   ├── main.rs          # Entry point, IPC with Tauri
│   ├── capture.rs       # xcap/scrap screen capture
│   ├── encode.rs        # VP9 encoding
│   └── ipc.rs           # Communication protocol
├── Cargo.toml
└── README.md
```

**Sidecar Communication:**
- Tauri manages sidecar lifecycle via `tauri-plugin-shell`
- IPC via stdin/stdout or local socket
- Frame data streamed to LiveKit via custom video track

---

### ADR-008: Core-Centric Media Architecture (Supersedes ADR-007)

**Status:** Accepted (2025-12-06)

**Context:** ADR-007's hybrid sidecar approach using `xcap`/`scrap` for screen capture was implemented but **failed performance requirements**. Benchmarking revealed xcap delivers only 4-5 FPS because it's a screenshot library, not a video capture library. Screen sharing requires 30-60 FPS.

**Decision:** Adopt a **Core-centric architecture** where a dedicated Rust binary (Core) owns all media:

- **All Platforms:** Single Core binary using LiveKit DesktopCapturer (Hopp's fork)
- **Core owns:** Screen capture, audio, camera, LiveKit connection, DataTracks
- **Core renders:** Annotation overlay via wgpu (GPU-accelerated)
- **WebView becomes:** Pure UI shell receiving video frames via socket

**Key Dependency:**
```toml
livekit = { git = "https://github.com/gethopp/rust-sdks", branch = "patches", features = ["native-tls"] }
```

**Architecture:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CORE (Rust Binary)                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                      LiveKit Rust SDK (Hopp Fork)                   │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │ │
│  │  │ Desktop     │  │ Audio       │  │ Video       │  │ DataTracks │ │ │
│  │  │ Capturer    │  │ Source      │  │ Source      │  │            │ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                   │                                      │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                     GraphicsContext (wgpu)                          │ │
│  │  - Overlay window (transparent, click-through)                      │ │
│  │  - Annotation stroke rendering                                      │ │
│  │  - Remote cursor rendering                                          │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                   │ socket                               │
└───────────────────────────────────┼─────────────────────────────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           Tauri WebView (UI Shell)                       │
│  - React UI (controls, participant list, chat)                          │
│  - Video display (frames from Core)                                     │
│  - Sends commands to Core (start share, mute, draw stroke)              │
└─────────────────────────────────────────────────────────────────────────┘
```

**Rationale:**
1. **Performance:** DesktopCapturer provides native 60fps capture (vs 4-5fps with xcap)
2. **Annotation latency:** wgpu renders directly to overlay (~1-2ms vs ~20-30ms WebView path)
3. **Proven architecture:** Hopp ships this exact pattern in production
4. **Single LiveKit connection:** Core owns the connection, simplifying state management
5. **Browser viewers work:** LiveKit protocol handles interoperability automatically

**Key Pattern (from Hopp):**
- **winit EventLoop** as central message bus
- **UserEvent enum** as command vocabulary
- **Application struct** holds all components
- **Socket IPC** between Core and Tauri

**Consequences:**
- Larger architectural change than simple library swap
- Core becomes complex media engine (~5-10K lines Rust)
- Must maintain socket protocol between Core and WebView
- Build complexity increases (two Rust binaries)
- Need to study Hopp's codebase for implementation patterns

**Migration from ADR-007:**
- Delete `packages/capture-sidecar/` ✓ Done
- Create `packages/core/` with new architecture
- Update Tauri to spawn Core instead of sidecar
- Remove platform-specific capture branching (all platforms use Core)

**Reference Implementation:**
- [Hopp Core](https://github.com/gethopp/hopp/tree/main/core)
- [Hopp LiveKit Fork](https://github.com/gethopp/rust-sdks)

**Full Details:** See `docs/sprint-change-proposal-2025-12-06.md`

---

### ADR-009: Transform Mode for Sharer Controls (Supersedes Floating Control Bar in ADR-003)

**Status:** Accepted (2025-12-18)

**Context:** ADR-003 specified a separate floating control bar window for sharers. Implementation revealed issues:
1. **State sync complexity:** Separate WebView window requires event bridge (7 events) to sync mic/camera/share state with main window
2. **Two JavaScript contexts:** Each window has separate Zustand stores, requiring IPC for every action
3. **Performance overhead:** Extra ~25MB RAM for second WebView
4. **Debugging difficulty:** Distributed state across two windows

Additionally, studying Zoom's UX revealed a simpler pattern: transforming the main window rather than creating a second window.

**Decision:** Replace floating control bar with **Transform Mode** - the main window transforms into a compact control bar during screen sharing:

```
Normal Mode:                          Sharing Mode (Transform):
┌────────────────────────────┐       ┌─────────────────────────────────────────┐
│                            │       │ ┌─────┐ ┌─────┐ │ 🎤 📷 ✏️ │ ■ Stop  │
│      Full Meeting View     │  →    │ │ You │ │ Bob │ │          │ Leave   │
│                            │       │ └─────┘ └─────┘ │          │         │
│    [Video Grid][Controls]  │       └─────────────────────────────────────────┘
└────────────────────────────┘        ↑ Same window, resized & repositioned
                                      ↑ Top-center, below physical camera
                                      ↑ Excluded from screen capture
```

**Key Features:**
1. **Single window architecture:** No IPC, no state sync, same React context
2. **Camera preview:** Shows self-view (and optionally other participants)
3. **Position:** Top-center of screen, just below where physical camera typically is
4. **Content protection:** Window excluded from screen capture via platform APIs
5. **View modes:** Single (just you) ↔ Multi (all participants strip)
6. **Future:** Face-tracking crop for "Around-style" circular avatars

**Architecture:**
```
Screen Share Flow (new):
1. User clicks "Share Screen" → screen picker
2. User selects source → main window TRANSFORMS:
   - Resize to compact bar (~400x80px)
   - Reposition to top-center
   - Set always-on-top
   - Enable content protection (exclude from capture)
   - Switch UI to SharerControlBar component
3. User clicks "Stop" → window RESTORES:
   - Resize to original dimensions
   - Reposition to original location
   - Disable always-on-top
   - Switch UI back to normal Meeting view
```

**Content Protection (exclude from screen capture):**
```rust
// macOS: NSWindow.sharingType = .none
#[cfg(target_os = "macos")]
unsafe {
    let ns_window: id = window.ns_window() as id;
    let _: () = msg_send![ns_window, setSharingType: 0]; // NSWindowSharingNone
}

// Windows: SetWindowDisplayAffinity
#[cfg(target_os = "windows")]
unsafe {
    SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE);
}
```

**Comparison with ADR-003 Floating Bar:**

| Aspect | Floating Bar (ADR-003) | Transform Mode (ADR-009) |
|--------|------------------------|--------------------------|
| Windows | 2 (main + floating) | 1 (main transforms) |
| State sync | 7 events via IPC | None (same context) |
| Memory | +25MB extra WebView | No overhead |
| LiveKit access | Event bridge | Direct |
| Complexity | High | Low |
| Debug | Hard (distributed) | Easy (single window) |

**Multi-Monitor Handling:**
- **Same screen shared:** Window transforms in-place, excluded from capture
- **Other screen shared:** Window transforms on non-shared screen, user can work normally

**Consequences:**
- Simpler architecture than floating bar
- No IPC or event bridging needed
- Same stores, same LiveKit connection, same React context
- Need to implement window transform animation (resize/reposition)
- Need platform-specific content protection code
- Different UX than original spec (transform vs separate window)
- Future work: Face detection for Around-style circular avatar crop

**Migration:**
- Remove `FloatingControlBar.tsx` component
- Remove `FloatingControlBarPage.tsx` page
- Remove `useFloatingControlBar.ts` hook
- Remove floating bar event listeners from `useScreenShare.ts`
- Remove floating bar Tauri commands from `screen_share.rs`
- Add `SharerControlBar.tsx` component (compact sharing UI)
- Add window transform logic to `useScreenShare.ts`
- Add content protection Tauri commands

**References:**
- Zoom's screen sharing UX (transform main window pattern)
- Around app's face-focused circular avatars (future enhancement)

---

_Generated by BMAD Decision Architecture Workflow v1.0_
_Date: 2025-11-30_
_Updated: 2025-12-06 (ADR-008 added)_
_Updated: 2025-12-18 (ADR-009 added)_
_For: BMad_
