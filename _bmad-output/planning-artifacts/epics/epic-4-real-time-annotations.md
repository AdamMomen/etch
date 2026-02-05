# Epic 4: Real-Time Annotations

**Goal:** Enable users to draw on shared screens in real-time with sub-200ms latency - THE CORE VALUE PROPOSITION of Etch. This is the "pointing finger" moment.

**User Value:** After this epic, users can draw circles, highlight areas, and point at things on shared screens - and everyone sees it instantly!

**FRs Addressed:** FR21, FR22, FR23, FR24, FR27, FR28, FR29, FR30

---

## Story 4.1: Create Annotation Canvas Component for Viewers

**As a** viewer,
**I want** to see an annotation layer overlaid on the shared screen,
**So that** I can see what others are drawing in real-time.

**Acceptance Criteria:**

**Given** someone is sharing their screen
**When** the screen share is displayed
**Then** a transparent canvas overlay is rendered on top of the video element

**And** the canvas:
  - Matches the exact dimensions of the video element
  - Has `pointer-events: none` by default (click-through)
  - Uses HTML Canvas 2D for rendering
  - Clears and redraws on each animation frame when strokes change

**And** the canvas scales correctly:
  - If video is letterboxed, canvas only covers the video content area
  - Annotations stay aligned with video content when window resizes

**And** the canvas is not visible when no screen is being shared

**Prerequisites:** Story 3.2

**Technical Notes:**
- Create AnnotationCanvas component in `client/src/components/AnnotationCanvas/`
- Use `requestAnimationFrame` for 60fps render loop
- Canvas context: `2d` with `willReadFrequently: false` for performance
- Implement coordinate transform from normalized [0,1] to canvas pixels
- Store canvas ref for imperative drawing operations

---

## Story 4.2: Implement Annotation Store with Zustand

**As a** developer,
**I want** a centralized store for annotation state,
**So that** strokes can be managed consistently across the application.

**Acceptance Criteria:**

**Given** the annotation system is initialized
**When** strokes are added, updated, or removed
**Then** the store updates and triggers re-renders

**And** the store provides:
```typescript
interface AnnotationState {
  strokes: Stroke[];
  activeStroke: Stroke | null;  // Currently being drawn
  activeTool: 'pen' | 'highlighter' | 'eraser';

  // Actions
  addStroke: (stroke: Stroke) => void;
  updateStroke: (strokeId: string, points: Point[]) => void;
  completeStroke: (strokeId: string) => void;
  deleteStroke: (strokeId: string) => void;
  clearAll: () => void;
  setActiveTool: (tool: Tool) => void;
  setActiveStroke: (stroke: Stroke | null) => void;
}
```

**And** the store is optimized for frequent updates (batched renders)
**And** strokes are stored with normalized coordinates [0,1]

**Prerequisites:** Story 1.3

**Technical Notes:**
- Location: `client/src/stores/annotationStore.ts`
- Use Zustand with subscriptions for selective re-renders
- Implement `immer` middleware if mutation patterns are complex
- Add unit tests for all store actions

---

## Story 4.3: Implement Local Stroke Drawing (Pen Tool)

**As an** annotator,
**I want** to draw freehand strokes on the shared screen,
**So that** I can point at and mark up content visually.

**Acceptance Criteria:**

**Given** someone is sharing their screen and I have annotator permissions
**When** I press and drag on the canvas
**Then** a stroke appears immediately under my cursor (< 16ms local render)

**And** the stroke:
  - Uses my assigned participant color
  - Has smooth, anti-aliased lines
  - Follows my cursor precisely
  - Uses Perfect Freehand library for natural brush feel

**And** drawing interaction:
  - Mouse down: start new stroke
  - Mouse move: extend stroke with new points
  - Mouse up: finalize stroke

**And** the pen tool is active by default (key `2`)
**And** cursor changes to crosshair when over annotation area

**Prerequisites:** Story 4.1, 4.2, 3.2

**Technical Notes:**
- Use `perfect-freehand` library for stroke path generation
- Capture points at 60fps during drag
- Store points in normalized [0,1] coordinates
- Convert to canvas coordinates only during render
- Implement in AnnotationCanvas with pointer event handlers

---

## Story 4.4: Implement Highlighter Tool

**As an** annotator,
**I want** to use a highlighter tool for semi-transparent emphasis,
**So that** I can highlight areas without fully obscuring content.

**Acceptance Criteria:**

**Given** I select the highlighter tool (key `3`)
**When** I draw on the canvas
**Then** the stroke appears with semi-transparent fill

**And** the highlighter stroke:
  - Has 40% opacity (allows content to show through)
  - Is wider than pen strokes (3x width)
  - Uses my participant color with alpha
  - Has flat/square ends (not rounded like pen)

**And** the toolbar shows highlighter as active when selected
**And** cursor indicates highlighter mode

**Prerequisites:** Story 4.3

**Technical Notes:**
- Store tool type in stroke metadata: `tool: 'highlighter'`
- Render with `globalAlpha = 0.4` on canvas context
- Use wider stroke width in Perfect Freehand options
- Different `thinning` and `smoothing` params for highlighter feel

---

## Story 4.5: Implement Eraser Tool

**As an** annotator,
**I want** to erase my own strokes,
**So that** I can correct mistakes or clean up my annotations.

**Acceptance Criteria:**

**Given** I select the eraser tool (key `7`)
**When** I click on or drag over my own strokes
**Then** those strokes are deleted

**And** eraser behavior:
  - Only erases strokes I created (my participantId)
  - Erases entire stroke on touch (not partial erase)
  - Works by hit-testing stroke bounding boxes
  - Visual feedback: stroke highlights before deletion

**And** I cannot erase other participants' strokes (unless I'm host/sharer - covered in Epic 5)
**And** cursor changes to eraser icon when tool selected

**Prerequisites:** Story 4.3

**Technical Notes:**
- Implement hit-testing using stroke bounding box + point distance
- Compare stroke.participantId with local user ID
- Delete via annotationStore.deleteStroke()
- Send delete message via DataTrack after local delete

---

## Story 4.6: Build Annotation Toolbar Component

**As an** annotator,
**I want** a toolbar to switch between annotation tools,
**So that** I can quickly access pen, highlighter, and eraser.

**Acceptance Criteria:**

**Given** someone is sharing their screen
**When** I look at the top of the canvas area
**Then** I see the annotation toolbar with tools:

```
[↖️ Select][✏️ Pen][🖍️ Highlighter][🧹 Eraser] | [🗑️ Clear All]
    1/V       2          3              7             0
```

**And** toolbar behavior:
  - Active tool has filled accent background
  - Hover shows tooltip with tool name and shortcut
  - Keyboard shortcuts work: 1/V, 2, 3, 7, 0
  - Clear All (0) only visible/enabled for host (grayed otherwise)

**And** toolbar styling per UX spec:
  - Horizontal layout, subtle rounded buttons
  - Shortcut numbers shown below icons (small, muted)
  - Separator before destructive action

**And** toolbar is disabled (50% opacity) when no screen share active

**Prerequisites:** Story 4.3, 4.4, 4.5

**Technical Notes:**
- Create AnnotationToolbar component per UX spec Section 6
- Use shadcn/ui Button with custom styling
- Lucide icons for tool icons
- Connect to annotationStore for active tool state
- Register keyboard shortcuts globally

---

## Story 4.7: Implement DataTrack Annotation Sync

**As a** participant,
**I want** to see others' annotations in real-time,
**So that** we can collaborate visually during the meeting.

**Acceptance Criteria:**

**Given** I draw a stroke on the canvas
**When** I'm drawing (mouse down → move → up)
**Then** other participants see my stroke appear in real-time

**And** sync behavior:
  - Incremental updates every 16ms during drawing (batched points)
  - Final stroke sent on mouse up (complete point array)
  - Latency < 200ms end-to-end (local draw to remote display)

**And** message types per Architecture spec:
  - `stroke_update`: incremental points during drawing
  - `stroke_complete`: final stroke with all points
  - `stroke_delete`: when erasing
  - `clear_all`: when host clears

**And** messages are sent via LiveKit DataTrack (reliable mode)
**And** local strokes render immediately (optimistic UI)

**Prerequisites:** Story 4.3, 2.6

**Technical Notes:**
- Use `room.localParticipant.publishData()` for sending
- Listen to `RoomEvent.DataReceived` for receiving
- Message format per Architecture "Message Protocol" section
- Batch point updates at 60fps intervals (collect points, send batch)
- Use reliable DataTrack for strokes (ordered delivery)

---

## Story 4.8: Implement Late-Joiner Annotation Sync

**As a** late-joining participant,
**I want** to see all existing annotations when I join,
**So that** I have full context of what's been discussed.

**Acceptance Criteria:**

**Given** annotations exist on the shared screen
**When** I join the meeting mid-session
**Then** I see all existing annotations immediately (< 1 second)

**And** sync flow:
  1. I join and connect to LiveKit
  2. I send `state_request` message via DataTrack
  3. Host (or any participant with full state) responds with `state_snapshot`
  4. I reconstruct canvas from snapshot
  5. I start receiving live updates

**And** the canvas shows loading indicator while waiting for snapshot
**And** if no response within 3 seconds, retry request
**And** snapshot includes all completed strokes (not in-progress ones)

**Prerequisites:** Story 4.7

**Technical Notes:**
- Message types: `state_request`, `state_snapshot` per Architecture
- Host is primary responder, but any participant can respond
- Snapshot: array of all Stroke objects from annotationStore
- Timestamp on snapshot for conflict resolution
- Handle case where no one has state (empty response)

---

## Story 4.9: Implement Resolution-Independent Coordinates

**As a** participant on any display,
**I want** annotations to appear in the correct position regardless of my screen resolution,
**So that** everyone sees annotations in the same location.

**Acceptance Criteria:**

**Given** participants have different screen sizes and resolutions
**When** someone draws a circle around a button
**Then** all participants see the circle around the same button

**And** coordinate system:
  - All coordinates stored as normalized [0, 1] range
  - (0, 0) = top-left of shared content
  - (1, 1) = bottom-right of shared content
  - Transform to/from pixel coordinates at render time

**And** on window resize:
  - Annotations scale proportionally with video
  - No position drift or misalignment
  - Smooth scaling without flicker

**And** annotations align on both viewer canvas AND sharer overlay

**Prerequisites:** Story 4.3

**Technical Notes:**
- Implement `normalizeCoordinates(pixelX, pixelY, canvasWidth, canvasHeight)` utility
- Implement `denormalizeCoordinates(normX, normY, canvasWidth, canvasHeight)` utility
- Store all points in normalized form in annotationStore
- Convert on input (capture) and output (render)
- Add unit tests for coordinate transformations

---

## Story 4.10: Assign Unique Colors Per Participant

**As a** participant,
**I want** each person's annotations to have a distinct color,
**So that** I can tell who drew what.

**Acceptance Criteria:**

**Given** multiple participants are annotating
**When** strokes are displayed
**Then** each participant's strokes are in their assigned color

**And** color assignment:
  - First participant (host): Orange (#f97316)
  - Second: Cyan (#06b6d4)
  - Third: Purple (#a855f7)
  - Fourth: Green (#22c55e)
  - Fifth: Pink (#ec4899)
  - Cycle back to orange for 6th, etc.

**And** colors are assigned at join time (stored in token metadata)
**And** color is visible in:
  - Annotation strokes
  - Participant list (avatar border)
  - "Drawing" indicator when someone is actively annotating

**And** colors are high-visibility on any screen content (tested on light/dark backgrounds)

**Prerequisites:** Story 4.7, 2.1

**Technical Notes:**
- Color assigned server-side when generating join token
- Stored in participant metadata: `{ color: '#f97316' }`
- Extract from LiveKit participant object
- Use same colors defined in `@etch/shared` constants

---

## Story 4.11: Render Annotations on Sharer's Overlay

**As a** screen sharer,
**I want** to see annotations on my actual shared screen,
**So that** I can see what others are pointing at without looking at Etch.

**Acceptance Criteria:**

**Given** I'm sharing my screen and the transparent overlay exists (Story 3.6)
**When** participants draw annotations
**Then** the annotations appear on the overlay window over my shared content

**And** the overlay canvas:
  - Renders the same strokes as viewer canvases
  - Uses same coordinate transformation
  - Updates in real-time (< 200ms from remote draw to local overlay)
  - Is click-through except when I'm drawing

**And** I can also draw on my own shared screen:
  - When I draw, overlay becomes interactive (not click-through)
  - My strokes appear on the overlay and sync to others
  - Release returns to click-through mode

**And** coordinate alignment between:
  - Sharer's overlay (on actual screen content)
  - Viewer's canvas (on video element)
  - Must match perfectly

**Prerequisites:** Story 3.6, 4.7, 4.9

**Technical Notes:**
- Sharer's overlay subscribes to same annotationStore
- Render loop identical to viewer canvas
- Coordinate transform accounts for overlay window position
- Toggle `ignore_cursor_events` Tauri option for click-through
- Communication between main window and overlay via Tauri events

---

## Story 4.12: Smart Picture-in-Picture Annotation Preview

**As a** screen sharer,
**I want** a floating preview window that shows annotations when I can't see the native overlay,
**So that** I always know what others are drawing, regardless of my platform or focus state.

**Acceptance Criteria:**

**Given** I'm sharing my screen
**When** annotations are drawn by participants
**Then** a PiP preview appears **only when needed**:

**And** PiP toast shows when annotation arrives AND:
  - **Browser client:** Always (no native overlay available)
  - **Desktop client:** Sharer is unfocused from shared content (different window/desktop/space)

**And** PiP toast does NOT show when:
  - **Desktop client, focused:** Native overlay is visible - no toast needed

**And** PiP toast behavior (unified across all platforms):
  - Fade in: 200ms ease-out when annotation arrives
  - Visible duration: 4 seconds after last annotation activity
  - Fade out: 300ms ease-in when hiding
  - New annotation resets the hide timer
  - Hovering pauses the hide timer (user is looking)
  - Position: bottom-right corner (compact, non-intrusive)
  - Size: 280x158 (16:9, compact)

**And** the toast shows:
  - Real-time capture of shared content + annotation overlaid
  - Uses normalized [0,1] coordinate system
  - Subtle accent border
  - Colored indicator for who is annotating

**And** browser implementation:
  - Uses Document Picture-in-Picture API (Chrome 116+, Edge 116+)
  - Fallback for unsupported browsers: toast overlay in viewport corner
  - Lightweight, minimal screen real estate

**And** desktop implementation:
  - Tauri window with video capture composited with annotation canvas
  - Same toast behavior as browser (unified UX)
  - Detects focus state via Tauri window events + platform APIs

**Prerequisites:** Story 4.7, 4.9, 4.11, 3.1

**Technical Notes:**
- Browser: `documentPictureInPicture.requestWindow()` API
- Desktop: Tauri window with `alwaysOnTop: true`, `decorations: false`
- Detect focus state:
  - Desktop: Tauri window focus events + platform APIs for active window
  - Browser: `document.hasFocus()` + visibility API
- Capture shared content via same MediaStream used for sharing
- Composite annotation canvas over video frame in render loop
- Position persistence in settingsStore

**FRs Addressed:** FR27, FR28 (universal annotation visibility)

---

## Story 4.13: [REMOVED]

*This story was removed - browser tab DOM injection requires Chrome extension which is out of scope.*

---

## Story 4.14: Annotation Arrival Notification System

**As a** screen sharer who has switched away from shared content,
**I want** to be notified when someone draws an annotation,
**So that** I know to check the PiP preview or return to my shared content.

**Acceptance Criteria:**

**Given** I'm sharing my screen but not focused on shared content
**When** a participant draws an annotation
**Then** I receive a non-intrusive notification

**And** notification triggers:
  - First annotation after switching away
  - Subsequent annotations batched (debounce: 500ms)

**And** notification methods:
  - **PiP preview:** Subtle pulse/glow animation on border
  - **Floating control bar:** Badge showing count (e.g., "3 new")
  - **Audio cue:** Optional subtle sound (respects system settings)
  - **System notification:** Only if app completely unfocused (OS-level)

**And** "viewed" state resets when:
  - Sharer returns focus to shared content, OR
  - Sharer interacts with PiP preview (click/hover)
  - Badge clears on view

**And** user preferences (in settings):
  - Toggle: "Notify me of new annotations" (default: on)
  - Toggle: "Play sound for annotations" (default: off)

**And** notification does NOT trigger when:
  - Sharer is focused on shared content (they see native overlay)
  - Sharer is actively drawing (they're engaged)

**Prerequisites:** Story 4.7, 4.12

**Technical Notes:**
- Track annotation receipt timestamps in annotationStore
- Add `lastViewedTimestamp` for calculating "new" count
- Detect sharer focus state (same as Story 4.12)
- PiP pulse: CSS animation triggered via state change
- Floating bar badge: simple counter component
- Audio: single "pop" sound file, played via Web Audio API
- System notification: Notification API with permission request

**FRs Addressed:** FR27 (annotation awareness for distracted sharers)

---
