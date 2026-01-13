# Epic Technical Specification: Real-Time Annotations

Date: 2025-12-18
Author: BMad
Epic ID: 4
Status: Draft

---

## Overview

Epic 4 implements real-time annotations for Etch - **THE CORE VALUE PROPOSITION** of the product. This is the "pointing finger" moment: users draw on shared screens and everyone sees it instantly with < 200ms latency.

The annotation system uses a **decoupled architecture** where annotation events flow through LiveKit DataTracks as lightweight vector data, while each client reconstructs the canvas locally. This separation enables sub-200ms latency through local-first rendering with network sync.

**Stories in this Epic (13 total):**

1. **4.1:** Create annotation canvas component for viewers
2. **4.2:** Implement annotation store with Zustand
3. **4.3:** Implement local stroke drawing (pen tool)
4. **4.4:** Implement highlighter tool
5. **4.5:** Implement eraser tool
6. **4.6:** Build annotation toolbar component
7. **4.7:** Implement DataTrack annotation sync
8. **4.8:** Implement late-joiner annotation sync
9. **4.9:** Implement resolution-independent coordinates
10. **4.10:** Assign unique colors per participant
11. **4.11:** Render annotations on sharer's overlay
12. **4.12:** Smart Picture-in-Picture annotation preview
13. **4.14:** Annotation arrival notification system

*Note: Story 4.13 was removed (browser tab DOM injection requires Chrome extension - out of scope)*

**FRs Addressed:** FR27-FR36

## Objectives and Scope

### Objectives

1. **Sub-200ms annotation latency** - Draw on shared screen, everyone sees it instantly (local render < 16ms, network sync < 150ms)
2. **Natural drawing experience** - "Drawing on glass" feel with smooth, anti-aliased strokes using Perfect Freehand
3. **Tool variety** - Pen, highlighter, and eraser tools with keyboard shortcuts (Excalidraw-style)
4. **Participant differentiation** - Each user has unique color for their annotations
5. **State synchronization** - Late joiners see all existing annotations, reconnection preserves state
6. **Cross-window consistency** - Annotations render identically on viewer canvas AND sharer overlay

### In Scope

- Annotation canvas overlay on shared screen (viewers)
- Annotation store with Zustand (strokes, tools, active stroke)
- Drawing tools: pen, highlighter, eraser
- Annotation toolbar with shortcuts (1-7, 0)
- DataTrack sync for real-time updates
- Late-joiner state snapshot mechanism
- Resolution-independent normalized coordinates
- Per-participant color assignment
- Sharer overlay annotation rendering (wiring to Epic 3 overlay)
- PiP preview for unfocused sharers
- Annotation arrival notifications

### Out of Scope (Future Epics)

- Undo/redo for strokes (Growth feature)
- Shape tools: rectangle, ellipse, arrow (tools 4, 5, 6)
- Text annotations
- Cursor/pointer indicators
- Stroke persistence beyond session
- Recording annotations

## System Architecture Alignment

### Architecture Decision References

| ADR | Decision | Epic 4 Impact |
|-----|----------|---------------|
| ADR-002 | LiveKit DataTracks for Annotations | All annotation events flow through DataTracks (reliable mode) |
| ADR-003 | Hybrid Rendering | Viewer canvas in WebView, sharer sees annotations on native overlay |
| ADR-004 | Zustand over Redux | annotationStore for stroke state management |

### Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   ANNOTATION ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  DATA FLOW                                                        │
│  ═════════                                                        │
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │ User Draws   │───▶│ Local Render │───▶│ Update Store     │   │
│  │ (Mouse/Touch)│    │ (< 16ms)     │    │ (annotationStore)│   │
│  └──────────────┘    └──────────────┘    └────────┬─────────┘   │
│                                                    │              │
│                                                    ▼              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                 LiveKit DataTrack                          │   │
│  │  ├─ stroke_update (batched every 16ms during draw)        │   │
│  │  ├─ stroke_complete (on mouse up)                         │   │
│  │  ├─ stroke_delete (eraser)                                │   │
│  │  ├─ clear_all (host only)                                 │   │
│  │  ├─ state_request (late joiner)                           │   │
│  │  └─ state_snapshot (response to request)                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                    │
│                              ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                 Remote Participants                        │   │
│  │  ├─ Receive DataTrack message                             │   │
│  │  ├─ Update local annotationStore                          │   │
│  │  └─ Re-render canvas (requestAnimationFrame)              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  VIEWER'S MACHINE                                                 │
│  ════════════════                                                 │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Main Window (WebView)                                     │   │
│  │  ┌────────────────────────────────────────────────────┐   │   │
│  │  │  ScreenShareViewer                                  │   │   │
│  │  │  ├─ <video> element (LiveKit screen track)         │   │   │
│  │  │  └─ <canvas> overlay (AnnotationCanvas)            │   │   │
│  │  │       └─ Renders strokes from annotationStore      │   │   │
│  │  └────────────────────────────────────────────────────┘   │   │
│  │                                                            │   │
│  │  ┌────────────────────────────────────────────────────┐   │   │
│  │  │  AnnotationToolbar                                  │   │   │
│  │  │  [↖️1/V][✏️2][🖍️3][🧹7] | [🗑️0]                    │   │   │
│  │  └────────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  SHARER'S MACHINE                                                 │
│  ════════════════                                                 │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Annotation Overlay (Tauri transparent window)            │   │
│  │  ├─ Positioned over shared content                        │   │
│  │  ├─ Subscribes to same annotationStore                    │   │
│  │  ├─ Renders strokes with same Perfect Freehand           │   │
│  │  └─ Click-through except when sharer is drawing           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  PiP Preview (when unfocused from shared content)         │   │
│  │  ├─ Shows video + annotations composited                  │   │
│  │  └─ Fades in/out with annotation activity                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Package Structure

```
packages/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AnnotationCanvas/
│   │   │   │   ├── AnnotationCanvas.tsx      # Canvas overlay component
│   │   │   │   ├── AnnotationCanvas.test.tsx
│   │   │   │   └── index.ts
│   │   │   ├── AnnotationToolbar/
│   │   │   │   ├── AnnotationToolbar.tsx     # Tool selection UI
│   │   │   │   ├── AnnotationToolbar.test.tsx
│   │   │   │   └── index.ts
│   │   │   ├── PiPPreview/
│   │   │   │   ├── PiPPreview.tsx            # Picture-in-Picture preview
│   │   │   │   └── index.ts
│   │   │   └── ScreenShare/
│   │   │       ├── ScreenShareViewer.tsx     # Updated with canvas overlay
│   │   │       └── SharerOverlay.tsx         # Sharer annotation overlay
│   │   ├── hooks/
│   │   │   ├── useAnnotations.ts             # Annotation drawing logic
│   │   │   ├── useAnnotationSync.ts          # DataTrack sync logic
│   │   │   └── usePiP.ts                     # PiP window management
│   │   ├── stores/
│   │   │   ├── annotationStore.ts            # Stroke state
│   │   │   └── annotationStore.test.ts
│   │   ├── lib/
│   │   │   ├── canvas.ts                     # Canvas rendering utilities
│   │   │   ├── stroke.ts                     # Stroke path generation
│   │   │   └── datatrack.ts                  # DataTrack message handling
│   │   └── utils/
│   │       ├── coordinates.ts                # Normalize/denormalize
│   │       ├── coordinates.test.ts
│   │       ├── colors.ts                     # Participant color assignment
│   │       └── colors.test.ts
│   │
└── shared/
    └── src/
        ├── types/
        │   ├── stroke.ts                     # Stroke, Point, Tool types
        │   └── annotation.ts                 # DataTrack message types
        └── constants/
            └── colors.ts                     # Participant color palette
```

## Detailed Design

### Services and Modules

#### 1. Annotation Store (`annotationStore.ts`)

```typescript
interface Point {
  x: number;  // 0.0 - 1.0 (normalized)
  y: number;  // 0.0 - 1.0 (normalized)
  pressure?: number;  // 0.0 - 1.0 for pen pressure support
}

interface Stroke {
  id: string;
  participantId: string;
  tool: 'pen' | 'highlighter';
  color: string;
  points: Point[];
  createdAt: number;  // Unix timestamp (ms)
  isComplete: boolean;
}

type Tool = 'select' | 'pen' | 'highlighter' | 'eraser';

interface AnnotationState {
  // Stroke data
  strokes: Stroke[];
  activeStroke: Stroke | null;  // Currently being drawn

  // Tool state
  activeTool: Tool;

  // Actions
  addStroke: (stroke: Stroke) => void;
  updateStroke: (strokeId: string, points: Point[]) => void;
  completeStroke: (strokeId: string) => void;
  deleteStroke: (strokeId: string) => void;
  clearAll: () => void;
  setActiveTool: (tool: Tool) => void;
  setActiveStroke: (stroke: Stroke | null) => void;

  // Bulk operations (for late-joiner sync)
  setStrokes: (strokes: Stroke[]) => void;

  // Selectors
  getStrokesByParticipant: (participantId: string) => Stroke[];
  getCompletedStrokes: () => Stroke[];
}
```

#### 2. useAnnotations Hook

```typescript
interface UseAnnotationsReturn {
  // State
  strokes: Stroke[];
  activeStroke: Stroke | null;
  activeTool: Tool;
  canAnnotate: boolean;  // Based on role and share state

  // Drawing actions
  startStroke: (point: Point) => void;
  continueStroke: (point: Point) => void;
  endStroke: () => void;

  // Tool actions
  setTool: (tool: Tool) => void;

  // Eraser
  eraseStrokeAt: (point: Point) => void;

  // Clear (host only)
  clearAll: () => void;

  // Local participant info
  myColor: string;
  myParticipantId: string;
}
```

#### 3. useAnnotationSync Hook

```typescript
interface UseAnnotationSyncReturn {
  // Connection state
  isConnected: boolean;

  // Sync actions
  publishStroke: (stroke: Stroke) => void;
  publishStrokeUpdate: (strokeId: string, points: Point[]) => void;
  publishDelete: (strokeId: string) => void;
  publishClearAll: () => void;

  // Late-joiner
  requestStateSnapshot: () => void;
  sendStateSnapshot: (targetParticipantId: string) => void;
}
```

#### 4. Canvas Rendering Utilities (`lib/canvas.ts`)

```typescript
// Perfect Freehand integration
import { getStroke } from 'perfect-freehand';

interface RenderOptions {
  canvas: HTMLCanvasElement;
  strokes: Stroke[];
  activeStroke: Stroke | null;
  scale: number;  // For retina displays
}

function renderAnnotations(options: RenderOptions): void;

// Stroke path generation
function getStrokePath(stroke: Stroke, tool: Tool): Path2D;

// Hit testing for eraser
function isPointOnStroke(point: Point, stroke: Stroke, threshold: number): boolean;

// Bounding box calculation
function getStrokeBounds(stroke: Stroke): { x: number; y: number; width: number; height: number };
```

#### 5. Coordinate Utilities (`utils/coordinates.ts`)

```typescript
// Normalize pixel coordinates to [0, 1] range
function normalizeCoordinates(
  pixelX: number,
  pixelY: number,
  canvasWidth: number,
  canvasHeight: number
): Point;

// Convert normalized coordinates back to pixels
function denormalizeCoordinates(
  normX: number,
  normY: number,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number };

// Batch conversion for stroke points
function normalizeStrokePoints(points: Array<{ x: number; y: number }>, width: number, height: number): Point[];
function denormalizeStrokePoints(points: Point[], width: number, height: number): Array<{ x: number; y: number }>;
```

### Data Models and Contracts

#### DataTrack Message Protocol

```typescript
// Incremental update during drawing (batched every 16ms)
interface StrokeUpdateMessage {
  type: 'stroke_update';
  strokeId: string;
  participantId: string;
  tool: 'pen' | 'highlighter';
  color: string;
  points: Point[];        // New points since last update
  timestamp: number;
}

// Stroke completed
interface StrokeCompleteMessage {
  type: 'stroke_complete';
  strokeId: string;
  participantId: string;
  tool: 'pen' | 'highlighter';
  color: string;
  points: Point[];        // Full point array
  timestamp: number;
}

// Delete stroke (eraser)
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

// Response with snapshot
interface StateSnapshotMessage {
  type: 'state_snapshot';
  strokes: Stroke[];
  timestamp: number;
}

type AnnotationMessage =
  | StrokeUpdateMessage
  | StrokeCompleteMessage
  | StrokeDeleteMessage
  | ClearAllMessage
  | StateRequestMessage
  | StateSnapshotMessage;
```

#### Participant Color Palette

```typescript
// constants/colors.ts
export const PARTICIPANT_COLORS = [
  '#f97316',  // Orange (first participant/host)
  '#06b6d4',  // Cyan
  '#a855f7',  // Purple
  '#22c55e',  // Green
  '#ec4899',  // Pink
] as const;

export function getParticipantColor(index: number): string {
  return PARTICIPANT_COLORS[index % PARTICIPANT_COLORS.length];
}
```

### APIs and Interfaces

#### LiveKit DataTrack Usage

```typescript
// Publishing annotation messages
const publishAnnotationMessage = (message: AnnotationMessage) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(message));

  room.localParticipant.publishData(data, {
    reliable: true,  // Ordered delivery for strokes
    topic: 'annotations'
  });
};

// Receiving annotation messages
room.on(RoomEvent.DataReceived, (payload, participant, _kind, topic) => {
  if (topic !== 'annotations') return;

  const decoder = new TextDecoder();
  const message = JSON.parse(decoder.decode(payload)) as AnnotationMessage;

  handleAnnotationMessage(message, participant);
});
```

#### Perfect Freehand Configuration

```typescript
// Pen tool settings
const PEN_OPTIONS = {
  size: 8,
  thinning: 0.5,
  smoothing: 0.5,
  streamline: 0.5,
  easing: (t: number) => t,
  start: { taper: 0, cap: true },
  end: { taper: 0, cap: true },
};

// Highlighter tool settings (wider, flatter)
const HIGHLIGHTER_OPTIONS = {
  size: 24,
  thinning: 0,
  smoothing: 0.5,
  streamline: 0.3,
  easing: (t: number) => t,
  start: { taper: 0, cap: false },
  end: { taper: 0, cap: false },
};
```

### Workflows and Sequencing

#### Drawing Flow (Local + Sync)

```
User presses mouse down on canvas
         │
         ▼
┌─────────────────────────┐
│ Check canAnnotate       │
│ (role + share active?)  │
└───────────┬─────────────┘
            │ yes
            ▼
┌─────────────────────────┐
│ Create new Stroke       │
│ - Generate UUID         │
│ - Set participantId     │
│ - Set tool & color      │
│ - Add first point       │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Store as activeStroke   │
│ Render immediately      │
└───────────┬─────────────┘
            │
            ▼
     User drags mouse
            │
            ▼
┌─────────────────────────┐
│ Capture point at 60fps  │
│ Add to activeStroke     │
│ Render immediately      │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Every 16ms: Batch       │
│ Publish stroke_update   │
│ via DataTrack           │
└───────────┬─────────────┘
            │
            ▼
     User releases mouse
            │
            ▼
┌─────────────────────────┐
│ Complete stroke         │
│ Move to strokes array   │
│ Clear activeStroke      │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Publish stroke_complete │
│ with full point array   │
└─────────────────────────┘
```

#### Late-Joiner Sync Flow

```
New participant joins room
         │
         ▼
┌─────────────────────────┐
│ Connect to LiveKit      │
│ Subscribe to DataTrack  │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Send state_request      │
│ message via DataTrack   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Show loading indicator  │
│ on annotation canvas    │
└───────────┬─────────────┘
            │
            ▼
     Existing participant receives request
            │
            ▼
┌─────────────────────────┐
│ Host (or first to see)  │
│ sends state_snapshot    │
│ with all strokes        │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ New participant receives│
│ Populate annotationStore│
│ Render all strokes      │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Start receiving live    │
│ updates normally        │
└─────────────────────────┘
```

#### Eraser Flow

```
User selects eraser tool (press 7)
         │
         ▼
User clicks/drags on canvas
         │
         ▼
┌─────────────────────────┐
│ Hit-test point against  │
│ all strokes             │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Find strokes under      │
│ cursor position         │
│ (use stroke bounds +    │
│  point distance)        │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Filter: only own strokes│
│ (unless host/sharer)    │
└───────────┬─────────────┘
            │ found match
            ▼
┌─────────────────────────┐
│ Delete from store       │
│ Highlight briefly       │
│ then remove from render │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Publish stroke_delete   │
│ via DataTrack           │
└─────────────────────────┘
```

## Non-Functional Requirements

### Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| Local stroke render | < 16ms | Time from mouse event to canvas draw |
| Network sync latency | < 150ms p95 | DataTrack round-trip |
| End-to-end annotation | < 200ms | Local draw to remote display |
| Canvas render loop | 60fps | requestAnimationFrame timing |
| Late-joiner sync | < 1s for 100 strokes | Time to reconstruct canvas |
| Memory per stroke | < 5KB | Average stroke data size |

**Optimization Strategies:**

1. **Local-first rendering** - Draw immediately, sync in background
2. **Point batching** - Batch point updates every 16ms (not per point)
3. **Path2D caching** - Cache completed strokes as Path2D objects
4. **Dirty region rendering** - Only re-render changed areas (future)
5. **Stroke point limits** - Cap at 10,000 points per stroke

### Security

| Concern | Mitigation |
|---------|------------|
| Annotation spam | Rate limiting on DataTrack messages (client-side) |
| Stroke injection | Validate participantId matches sender |
| Clear-all abuse | Only host role can clear all |
| Delete-any abuse | Only host/sharer can delete others' strokes |
| Message size | Validate message size < 64KB (DataTrack limit) |

### Reliability/Availability

| Scenario | Handling |
|----------|----------|
| Network disconnect | Queue strokes locally, sync on reconnect |
| DataTrack failure | Fallback to optimistic local state |
| State desync | Request new snapshot on detected inconsistency |
| Stroke limit reached | Warn user, oldest strokes auto-clear (future) |

### Observability

| Event | Log Level | Data |
|-------|-----------|------|
| Stroke started | DEBUG | tool, participantId |
| Stroke completed | DEBUG | strokeId, pointCount, duration |
| Stroke deleted | DEBUG | strokeId, deletedBy |
| Clear all | INFO | clearedBy |
| State sync requested | DEBUG | requesterId |
| State sync sent | DEBUG | strokeCount, targetId |
| Sync latency | DEBUG | latencyMs |

## Dependencies and Integrations

### External Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| perfect-freehand | ^1.2.2 | Stroke path generation with natural feel |
| livekit-client | ^2.16.0 | DataTrack messaging |
| zustand | ^5.0.9 | State management |
| nanoid | ^3.3.x | Stroke ID generation |

### Internal Dependencies

| Package | Dependency | Purpose |
|---------|------------|---------|
| Epic 4 | Epic 2 (Story 2.6) | LiveKit room connection |
| Epic 4 | Epic 3 (Story 3.2) | Screen share viewer component |
| Epic 4 | Epic 3 (Story 3.6) | Sharer overlay window |
| Story 4.11 | Story 3.6 | Overlay window exists |
| Story 4.7 | Story 2.6 | DataTrack available |

### New Package Dependencies to Add

```json
{
  "dependencies": {
    "perfect-freehand": "^1.2.2"
  }
}
```

## Acceptance Criteria (Authoritative)

### Story 4.1: Create Annotation Canvas Component for Viewers

| AC ID | Criterion | Verification |
|-------|-----------|--------------|
| AC-4.1.1 | Transparent canvas overlay renders on top of video element | Manual: canvas visible |
| AC-4.1.2 | Canvas matches exact dimensions of video element | Test: dimensions match |
| AC-4.1.3 | Canvas has `pointer-events: none` by default | Test: clicks pass through |
| AC-4.1.4 | Canvas uses HTML Canvas 2D context | Test: context type |
| AC-4.1.5 | Canvas clears and redraws on each animation frame | Test: render loop |
| AC-4.1.6 | Canvas scales correctly with letterboxing | Manual: aspect ratio preserved |
| AC-4.1.7 | Canvas not visible when no screen share active | Test: conditional render |

### Story 4.2: Implement Annotation Store with Zustand

| AC ID | Criterion | Verification |
|-------|-----------|--------------|
| AC-4.2.1 | Store provides strokes array | Test: state shape |
| AC-4.2.2 | Store provides activeStroke for in-progress drawing | Test: state shape |
| AC-4.2.3 | Store provides activeTool state | Test: state shape |
| AC-4.2.4 | addStroke action adds stroke to array | Test: action |
| AC-4.2.5 | updateStroke action appends points | Test: action |
| AC-4.2.6 | deleteStroke action removes stroke | Test: action |
| AC-4.2.7 | clearAll action empties strokes | Test: action |
| AC-4.2.8 | Strokes stored with normalized [0,1] coordinates | Test: coordinate range |

### Story 4.3: Implement Local Stroke Drawing (Pen Tool)

| AC ID | Criterion | Verification |
|-------|-----------|--------------|
| AC-4.3.1 | Press and drag on canvas creates stroke | Manual: stroke appears |
| AC-4.3.2 | Stroke appears immediately (< 16ms) | Performance: measure |
| AC-4.3.3 | Stroke uses participant's assigned color | Test: color matches |
| AC-4.3.4 | Stroke has smooth, anti-aliased lines | Manual: visual quality |
| AC-4.3.5 | Stroke uses Perfect Freehand for natural feel | Test: library used |
| AC-4.3.6 | Mouse down starts new stroke | Test: event handler |
| AC-4.3.7 | Mouse move extends stroke | Test: points added |
| AC-4.3.8 | Mouse up finalizes stroke | Test: isComplete true |
| AC-4.3.9 | Pen tool active by default | Test: initial state |
| AC-4.3.10 | Key `2` activates pen tool | Test: keyboard shortcut |
| AC-4.3.11 | Cursor changes to crosshair over canvas | Test: cursor style |

### Story 4.4: Implement Highlighter Tool

| AC ID | Criterion | Verification |
|-------|-----------|--------------|
| AC-4.4.1 | Key `3` activates highlighter tool | Test: keyboard shortcut |
| AC-4.4.2 | Highlighter stroke has 40% opacity | Test: globalAlpha |
| AC-4.4.3 | Highlighter is 3x wider than pen | Test: stroke width |
| AC-4.4.4 | Highlighter uses participant color with alpha | Test: color format |
| AC-4.4.5 | Highlighter has flat ends (not rounded) | Test: lineCap |
| AC-4.4.6 | Toolbar shows highlighter as active | Test: UI state |
| AC-4.4.7 | Cursor indicates highlighter mode | Test: cursor style |

### Story 4.5: Implement Eraser Tool

| AC ID | Criterion | Verification |
|-------|-----------|--------------|
| AC-4.5.1 | Key `7` activates eraser tool | Test: keyboard shortcut |
| AC-4.5.2 | Click on own stroke deletes it | Test: delete action |
| AC-4.5.3 | Drag over own strokes deletes them | Test: continuous erase |
| AC-4.5.4 | Cannot erase others' strokes (unless host/sharer) | Test: permission check |
| AC-4.5.5 | Entire stroke deleted on touch (not partial) | Test: full stroke removal |
| AC-4.5.6 | Visual feedback before deletion (highlight) | Manual: stroke highlights |
| AC-4.5.7 | Cursor changes to eraser icon | Test: cursor style |

### Story 4.6: Build Annotation Toolbar Component

| AC ID | Criterion | Verification |
|-------|-----------|--------------|
| AC-4.6.1 | Toolbar shows at top of canvas area | Manual: position |
| AC-4.6.2 | Tools: Select(1/V), Pen(2), Highlighter(3), Eraser(7) | Test: buttons present |
| AC-4.6.3 | Clear All(0) visible for host only | Test: role-based visibility |
| AC-4.6.4 | Active tool has filled accent background | Test: styling |
| AC-4.6.5 | Hover shows tooltip with name and shortcut | Manual: tooltip |
| AC-4.6.6 | Keyboard shortcuts 1/V, 2, 3, 7, 0 work | Test: shortcuts |
| AC-4.6.7 | Separator before Clear All (destructive) | Test: UI structure |
| AC-4.6.8 | Toolbar disabled (50% opacity) when no share | Test: disabled state |

### Story 4.7: Implement DataTrack Annotation Sync

| AC ID | Criterion | Verification |
|-------|-----------|--------------|
| AC-4.7.1 | Strokes sync to other participants in real-time | Manual: multi-client test |
| AC-4.7.2 | Latency < 200ms end-to-end | Performance: measure |
| AC-4.7.3 | Incremental updates sent every 16ms during draw | Test: message timing |
| AC-4.7.4 | Complete stroke sent on mouse up | Test: message type |
| AC-4.7.5 | Delete messages sync to others | Test: sync behavior |
| AC-4.7.6 | Clear all syncs to all participants | Test: sync behavior |
| AC-4.7.7 | Uses reliable DataTrack mode | Test: publish options |
| AC-4.7.8 | Local strokes render immediately (optimistic) | Test: no wait for sync |

### Story 4.8: Implement Late-Joiner Annotation Sync

| AC ID | Criterion | Verification |
|-------|-----------|--------------|
| AC-4.8.1 | Late joiner sees all existing annotations | Manual: join mid-session |
| AC-4.8.2 | Sync completes in < 1 second for 100 strokes | Performance: measure |
| AC-4.8.3 | state_request sent on join | Test: message sent |
| AC-4.8.4 | Host responds with state_snapshot | Test: response |
| AC-4.8.5 | Loading indicator shown while waiting | Test: UI state |
| AC-4.8.6 | Retry after 3 seconds if no response | Test: timeout handling |
| AC-4.8.7 | Snapshot includes only completed strokes | Test: filtering |

### Story 4.9: Implement Resolution-Independent Coordinates

| AC ID | Criterion | Verification |
|-------|-----------|--------------|
| AC-4.9.1 | All coordinates stored as [0, 1] normalized | Test: coordinate range |
| AC-4.9.2 | (0, 0) = top-left, (1, 1) = bottom-right | Test: coordinate system |
| AC-4.9.3 | Transform to pixels at render time | Test: render pipeline |
| AC-4.9.4 | Annotations scale on window resize | Manual: resize test |
| AC-4.9.5 | No position drift on resize | Manual: precision |
| AC-4.9.6 | Viewer canvas and sharer overlay aligned | Manual: position match |

### Story 4.10: Assign Unique Colors Per Participant

| AC ID | Criterion | Verification |
|-------|-----------|--------------|
| AC-4.10.1 | Each participant has distinct color | Manual: visual |
| AC-4.10.2 | First participant (host): Orange #f97316 | Test: color assignment |
| AC-4.10.3 | Colors cycle after 5 participants | Test: modulo logic |
| AC-4.10.4 | Color assigned via token metadata | Test: server-side |
| AC-4.10.5 | Color visible in strokes | Test: stroke color |
| AC-4.10.6 | Color visible in participant list | Test: avatar border |
| AC-4.10.7 | Colors work on light and dark backgrounds | Manual: visibility |

### Story 4.11: Render Annotations on Sharer's Overlay

| AC ID | Criterion | Verification |
|-------|-----------|--------------|
| AC-4.11.1 | Annotations render on sharer's overlay window | Manual: sharer view |
| AC-4.11.2 | Same strokes as viewer canvases | Test: state consistency |
| AC-4.11.3 | Same coordinate transformation | Test: alignment |
| AC-4.11.4 | Updates in real-time (< 200ms) | Performance: measure |
| AC-4.11.5 | Overlay is click-through except when drawing | Test: interaction mode |
| AC-4.11.6 | Sharer can draw on their own screen | Manual: sharer drawing |
| AC-4.11.7 | Coordinates align between overlay and viewers | Manual: alignment test |

### Story 4.12: Smart PiP Annotation Preview

| AC ID | Criterion | Verification |
|-------|-----------|--------------|
| AC-4.12.1 | PiP shows when sharer unfocused and annotation arrives | Manual: focus test |
| AC-4.12.2 | PiP does NOT show when sharer focused (overlay visible) | Test: logic |
| AC-4.12.3 | PiP fades in over 200ms | Manual: animation |
| AC-4.12.4 | PiP visible for 4s after last annotation | Test: timing |
| AC-4.12.5 | PiP fades out over 300ms | Manual: animation |
| AC-4.12.6 | Hover pauses hide timer | Test: interaction |
| AC-4.12.7 | Position: bottom-right corner | Test: placement |
| AC-4.12.8 | Size: 280x158 (16:9) | Test: dimensions |
| AC-4.12.9 | Shows video + annotations composited | Manual: content |

### Story 4.14: Annotation Arrival Notification System

| AC ID | Criterion | Verification |
|-------|-----------|--------------|
| AC-4.14.1 | Notification triggers when unfocused + annotation | Test: condition |
| AC-4.14.2 | Annotations debounced at 500ms | Test: timing |
| AC-4.14.3 | PiP border pulses on new annotation | Manual: animation |
| AC-4.14.4 | Control bar shows badge with count | Test: badge UI |
| AC-4.14.5 | Audio cue optional (default off) | Test: setting |
| AC-4.14.6 | Badge clears on view/interaction | Test: state reset |
| AC-4.14.7 | Setting: "Notify me of new annotations" | Test: preference |
| AC-4.14.8 | No notification when focused or drawing | Test: conditions |

## Traceability Mapping

### FR to Story Mapping

| FR | Description | Story | Notes |
|----|-------------|-------|-------|
| FR27 | Draw freehand strokes | 4.3, 4.4 | Pen and highlighter tools |
| FR28 | Pen tool for precise drawing | 4.3 | Default tool |
| FR29 | Highlighter for semi-transparent emphasis | 4.4 | 40% opacity |
| FR30 | Eraser to remove own strokes | 4.5 | With permission checks |
| FR31 | Hosts can clear all annotations | 4.6 | Clear All button |
| FR32 | Sharers can delete any annotation | 4.5 | Extended permission |
| FR33 | Annotations appear in real-time < 200ms | 4.7 | DataTrack sync |
| FR34 | Distinct color per participant | 4.10 | 5-color palette |
| FR35 | Late joiners see existing annotations | 4.8 | State snapshot |
| FR36 | Resolution-independent coordinates | 4.9 | Normalized [0,1] |

### Story Dependencies

```
                        Story 4.2 (Annotation Store)
                               │
           ┌───────────────────┼───────────────────┐
           │                   │                   │
           ▼                   ▼                   ▼
     Story 4.1            Story 4.9          Story 4.10
    (Canvas)          (Coordinates)         (Colors)
           │                   │                   │
           └───────────────────┼───────────────────┘
                               │
                               ▼
                        Story 4.3 (Pen Tool)
                               │
                    ┌──────────┼──────────┐
                    ▼          ▼          ▼
              Story 4.4   Story 4.5   Story 4.6
            (Highlighter)  (Eraser)  (Toolbar)
                    │          │          │
                    └──────────┼──────────┘
                               │
                               ▼
                        Story 4.7 (DataTrack Sync)
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
              Story 4.8             Story 4.11
           (Late Joiner)        (Sharer Overlay)
                                       │
                    ┌──────────────────┤
                    ▼                  ▼
              Story 4.12         Story 4.14
               (PiP)          (Notifications)
```

### Recommended Implementation Order

| Order | Story | Rationale |
|-------|-------|-----------|
| 1 | 4.2 | Store is foundation for all other stories |
| 2 | 4.9 | Coordinates needed before any rendering |
| 3 | 4.10 | Color assignment needed for strokes |
| 4 | 4.1 | Canvas component to render strokes |
| 5 | 4.3 | Core drawing functionality (pen) |
| 6 | 4.6 | Toolbar for tool switching |
| 7 | 4.4 | Highlighter tool |
| 8 | 4.5 | Eraser tool |
| 9 | 4.7 | DataTrack sync (makes it collaborative) |
| 10 | 4.8 | Late-joiner support |
| 11 | 4.11 | Sharer overlay rendering |
| 12 | 4.12 | PiP preview |
| 13 | 4.14 | Notification system |

**Parallelization Opportunities:**
- Stories 4.4, 4.5, 4.6 can be done in parallel after 4.3
- Stories 4.12, 4.14 can be parallelized after 4.11

## Risks, Assumptions, Open Questions

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Perfect Freehand performance on low-end devices | Low | Medium | Test on older hardware; simplify stroke generation if needed |
| DataTrack message size limits | Low | Medium | Batch points; ensure < 64KB per message |
| Coordinate drift between windows | Medium | High | Extensive cross-window testing; use identical transform logic |
| Canvas rendering performance with many strokes | Medium | Medium | Implement dirty region rendering; cache Path2D objects |
| Late-joiner snapshot too large | Low | Low | Limit stroke history; paginate if needed |

### Assumptions

1. **LiveKit DataTracks are reliable** - Ordered delivery in reliable mode
2. **Perfect Freehand library is stable** - Proven in Excalidraw and other apps
3. **Canvas 2D performance is adequate** - 60fps rendering achievable
4. **Sharer overlay window exists** - Epic 3 Story 3.6 complete
5. **Participants have unique IDs** - From LiveKit participant object

### Open Questions

| Question | Owner | Status | Resolution |
|----------|-------|--------|------------|
| Should strokes auto-clear after N minutes? | PM | Open | Consider for large sessions |
| Max strokes per session? | Architect | Open | Start with 500, monitor |
| Undo/redo priority? | PM | Deferred | Growth feature |
| Shape tools (4, 5, 6) timeline? | PM | Deferred | Post-MVP |

## Test Strategy Summary

### Unit Tests

| Component | Coverage Target | Key Tests |
|-----------|-----------------|-----------|
| annotationStore | 90% | All actions, selectors, edge cases |
| coordinates.ts | 100% | Normalize/denormalize, boundary cases |
| colors.ts | 100% | Color assignment, cycling |
| canvas.ts | 80% | Stroke path generation, hit testing |

### Integration Tests

| Scenario | Approach |
|----------|----------|
| Drawing flow | Mock canvas, verify store updates |
| Sync flow | Mock DataTrack, verify message format |
| Late-joiner | Mock snapshot response, verify reconstruction |
| Tool switching | Simulate keyboard shortcuts, verify state |

### E2E Tests (Manual for MVP)

| Scenario | Platforms |
|----------|-----------|
| Complete annotation flow | Windows, macOS |
| Multi-participant drawing | Two clients |
| Late-joiner sync | Join mid-session |
| Sharer overlay rendering | Windows, macOS |

### Performance Tests

| Metric | Test Approach |
|--------|---------------|
| Local render latency | Measure time from event to paint |
| Sync latency | Timestamp in message, measure on receive |
| Canvas FPS | Performance.now() in render loop |
| Memory usage | Heap snapshot with 100+ strokes |

### Test Data Factories

```typescript
// @etch/shared test utilities
export const createMockPoint = (overrides?: Partial<Point>): Point => ({
  x: 0.5,
  y: 0.5,
  pressure: 0.5,
  ...overrides
});

export const createMockStroke = (overrides?: Partial<Stroke>): Stroke => ({
  id: 'stroke-123',
  participantId: 'participant-1',
  tool: 'pen',
  color: '#f97316',
  points: [createMockPoint()],
  createdAt: Date.now(),
  isComplete: false,
  ...overrides
});

export const createMockAnnotationMessage = (
  type: AnnotationMessage['type'],
  overrides?: Partial<AnnotationMessage>
): AnnotationMessage => {
  const base = {
    timestamp: Date.now(),
    ...overrides
  };

  switch (type) {
    case 'stroke_complete':
      return {
        type: 'stroke_complete',
        strokeId: 'stroke-123',
        participantId: 'participant-1',
        tool: 'pen',
        color: '#f97316',
        points: [createMockPoint()],
        ...base
      };
    // ... other message types
  }
};
```

---

_Generated by BMAD Epic Tech Context Workflow_
_Date: 2025-12-18_
_Epic: 4 - Real-Time Annotations_
