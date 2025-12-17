# Epic 3: Screen Sharing

**Goal:** Enable users to share their screen or specific windows so others can see what they're working on - including the floating control bar and share border indicator that keep sharers in control while their main window is minimized.

**User Value:** After this epic, users can share their screens in meetings with a professional UX - the main window minimizes, a floating control bar provides meeting controls, and a border indicator shows what's being captured.

**FRs Addressed:** FR15-26 (Screen Sharing + Floating Control Bar + Share Border + Auto-Minimize)

---

## Story 3.1: Implement Screen Share Initiation (Hybrid Capture)

**As a** user,
**I want** to share my entire screen or a specific window,
**So that** other participants can see what I'm working on.

**Acceptance Criteria:**

**Given** I'm in a meeting room
**When** I click the "Share Screen" button
**Then** the system shows the native screen/window picker dialog

**And** the picker shows:
  - List of available screens (for multi-monitor setups)
  - List of open application windows
  - Preview thumbnails where supported

**And** after selecting a screen/window:
  - Screen capture starts immediately
  - **Main Nameless window automatically minimizes**
  - **Selected window/screen is focused (brought to foreground)**
  - Screen share track is published to LiveKit at 1080p/VP9/4-6Mbps
  - Floating control bar appears (Story 3.7)
  - Share border indicator appears (Story 3.8)
  - My participant entry shows "Sharing" badge

**And** if I cancel the picker:
  - No screen share starts
  - Main window stays open
  - Button remains in default state

**And** keyboard shortcut `⌘S` (Ctrl+S) triggers share flow

**Prerequisites:** Story 2.6, Story 3.10 (for macOS/Linux)

**Technical Notes:**
- **Hybrid capture approach** (per Architecture ADR-007, updated 2025-12-01):
  - **Windows:** Use WebView `getDisplayMedia()` API (WebView2 has full WebRTC support)
  - **macOS/Linux:** Use Rust sidecar for native capture (Story 3.10) - WKWebView doesn't support getDisplayMedia
- Resolution: 1080p with VP9 codec at 4-6 Mbps (optimized for text clarity)
- Use `room.localParticipant.setScreenShareEnabled()` or create screen track manually
- Request with `{ video: true, audio: true }` for system audio option
- Hardware-accelerated capture at 60fps target
- LiveKit handles encoding and transmission
- Use Tauri window API to minimize main window after share starts
- Focus the shared window/screen using platform APIs

---

## Story 3.10: Implement Rust Screen Capture Sidecar (macOS/Linux)

**As a** macOS or Linux user,
**I want** screen sharing to work on my platform,
**So that** I can share my screen with the same quality as Windows users.

**Acceptance Criteria:**

**Given** I'm on macOS or Linux
**When** the app detects my platform at runtime
**Then** screen capture uses the Rust sidecar instead of WebView getDisplayMedia

**And** the sidecar provides:
  - Native screen capture via `xcap` or `scrap` Rust crates
  - Screen/window picker UI (native dialog)
  - VP9 encoding at 1080p / 4-6 Mbps bitrate
  - Frame streaming to LiveKit via custom video track

**And** the capture quality matches Windows:
  - 1080p resolution (minimum)
  - VP9 codec for text clarity
  - 4-6 Mbps bitrate target
  - 60fps capable

**And** on macOS:
  - Screen recording permission is requested if not granted
  - Permission dialog shows "NAMELESS wants to record this Mac's screen"
  - User can grant permission in System Preferences

**And** the sidecar lifecycle is managed:
  - Sidecar spawns when screen share starts
  - Sidecar terminates when screen share stops
  - Graceful fallback if sidecar fails to start (error message, suggest Windows)

**Prerequisites:** Story 1.1 (monorepo structure)

**Technical Notes:**
- Create `packages/capture-sidecar/` Rust binary
- Use Tauri's sidecar management via `tauri-plugin-shell`
- Recommended crates:
  - `xcap` - Cross-platform screen capture (used by tauri-plugin-screenshots)
  - `scrap` - From RustDesk, proven at scale for remote desktop
  - `vpx-encode` or similar for VP9 encoding
- IPC between sidecar and Tauri main process via stdin/stdout or local socket
- Stream encoded frames to LiveKit using custom video track API
- Handle macOS screen recording permission via `CGPreflightScreenCaptureAccess()` / `CGRequestScreenCaptureAccess()`
- Linux may need X11/Wayland detection for proper capture API selection

**FRs Addressed:** FR15, FR16, FR20 (platform-specific implementation)

---

## Story 3.2: Display Shared Screen for Viewers

**As a** participant,
**I want** to see the shared screen clearly in the meeting,
**So that** I can follow along with what the sharer is presenting.

**Acceptance Criteria:**

**Given** another participant is sharing their screen
**When** the screen share starts
**Then** the shared screen displays in the main content area

**And** the display behavior:
  - Screen content fills available space while maintaining aspect ratio
  - Letterbox/pillarbox with dark background (`--background`) if aspect doesn't match
  - Minimum 16px padding on all sides
  - Resolution adapts to available window size

**And** participant videos switch to floating bubbles (Around-style):
  - Small circular avatars (32px) stacked in corner
  - Don't obscure shared content
  - Position: bottom-right corner by default

**And** the sharer's name is displayed: "BMad is sharing"
**And** video quality automatically adapts to network conditions

**Prerequisites:** Story 3.1, 2.9

**Technical Notes:**
- Subscribe to screen share track via LiveKit
- Use `<VideoTrack>` component for rendering
- Implement ScreenShareViewer component
- CSS object-fit: contain for aspect ratio preservation
- Track type: `Track.Source.ScreenShare`

---

## Story 3.3: Implement Stop Screen Sharing

**As a** sharer,
**I want** to stop sharing my screen at any time,
**So that** I can regain privacy when done presenting.

**Acceptance Criteria:**

**Given** I'm currently sharing my screen
**When** I click "Stop Sharing" on the **floating control bar**
**Then** screen capture stops immediately

**And** the sharer's UI updates:
  - **Floating control bar is dismissed**
  - **Share border indicator is dismissed**
  - **Annotation overlay is dismissed**
  - **Main Nameless window restores from minimized state**
  - Button returns to "Share Screen" state (outline style)
  - "Sharing" badge removed from my participant entry

**And** other participants see:
  - Shared screen disappears
  - Toast: "{name} stopped sharing"
  - Layout returns to video grid
  - Participant videos return from floating bubbles to grid

**And** pressing `⌘S` again while sharing also stops sharing
**And** if browser/OS stops the capture (user clicked "Stop sharing" in system UI):
  - App detects this and updates state accordingly
  - All native windows (floating bar, border, overlay) are dismissed
  - Main window restores

**Prerequisites:** Story 3.1, 3.2, 3.7, 3.8

**Technical Notes:**
- Use `room.localParticipant.setScreenShareEnabled(false)`
- Listen to track ended event for system-initiated stops
- Clean up all Tauri native windows: floating control bar, share border, annotation overlay
- Restore main window using Tauri window API
- Smooth transition animation when switching layouts

---

## Story 3.4: Enforce Single Active Screen Share

**As a** meeting participant,
**I want** only one person to share at a time,
**So that** there's no confusion about what content to focus on.

**Acceptance Criteria:**

**Given** someone is already sharing their screen
**When** I try to share my screen
**Then** I see a message: "Someone is already sharing. Ask them to stop first."

**And** the "Share Screen" button is disabled (50% opacity)
**And** tooltip on hover: "{name} is currently sharing"
**And** when the current sharer stops:
  - Button becomes enabled again
  - I can now initiate screen share

**Post-MVP Enhancement - Host Screen Share Takeover:**
- Host can stop another participant's screen share
- Host can "take over" (stop current share and start their own)
- Current sharer receives notification that host took over
- Related to FR5 (host can remove participants) - similar privilege pattern

**Prerequisites:** Story 3.3

**Technical Notes:**
- Track screen share state in roomStore
- Listen for remote screen share track published/unpublished
- Disable button via disabled prop, not removing
- Update sharer info from participant metadata

---

## Story 3.5: Implement Screen Share Quality Optimization

**As a** viewer,
**I want** the shared screen to display at appropriate quality,
**So that** I can read text and see details clearly.

**Acceptance Criteria:**

**Given** someone is sharing their screen
**When** I view the shared content
**Then** the quality is optimized for content visibility:
  - Text is readable (not blurry from over-compression)
  - UI elements are clearly distinguishable
  - Code in IDEs is legible

**And** quality adapts to network conditions:
  - On good network: high resolution, 30fps minimum
  - On poor network: reduced resolution but maintains readability
  - Never drops below readable threshold for text content

**And** the system prefers quality over framerate for screen content (opposite of camera video)

**Prerequisites:** Story 3.2

**Technical Notes:**
- Configure LiveKit screen share encoding:
  - Resolution: up to 1080p (or source resolution)
  - Framerate: 30fps (can drop to 15fps on poor network)
  - Codec preference: VP9 or AV1 for better text quality
- Use `screenShareSimulcastEncodings` for adaptive quality
- Set `contentHint: 'text'` on video track for encoder optimization

---

## Story 3.6: Create Sharer's Transparent Overlay Window

**As a** screen sharer,
**I want** to see annotations on my actual shared screen (not inside NAMELESS),
**So that** I can see what others are pointing at without switching windows.

**Acceptance Criteria:**

**Given** I start sharing my screen
**When** the screen share is active
**Then** a transparent overlay window is created by Tauri

**And** the overlay window:
  - Is positioned exactly over my shared screen/window
  - Is always-on-top (above shared content, below system UI)
  - Is fully transparent (click-through when not drawing)
  - Has no window decorations (frameless)
  - Matches the exact dimensions of shared content

**And** when sharing a specific window:
  - Overlay tracks the window position if it moves
  - Overlay resizes if window resizes

**And** when I stop sharing:
  - Overlay window is destroyed
  - No visual artifacts remain

**Prerequisites:** Story 3.1

**Technical Notes:**
- Use Tauri window creation with `transparent: true`, `decorations: false`, `alwaysOnTop: true`
- For full screen: position at monitor bounds
- For window: use platform APIs to track target window position
- This overlay will render annotations in Epic 4 (placeholder for now)
- Per Architecture ADR-003: Hybrid rendering approach

**Windows-Specific Validation (High Priority):**

Per Implementation Readiness assessment, Windows transparent overlay behavior needs early validation:

- [ ] Transparent window renders correctly on Windows 10 and Windows 11
- [ ] Click-through (`WS_EX_TRANSPARENT`, `WS_EX_LAYERED`) allows interaction with underlying app
- [ ] Overlay position stays aligned with shared window (no drift)
- [ ] Multi-monitor and high-DPI scaling handled correctly
- [ ] Performance acceptable (no visible lag in overlay rendering)

**Fallback Plan if Windows Transparency Fails:**
- Option A: Small floating preview window showing annotations
- Option B: "Annotations visible to viewers" indicator only on sharer's screen
- Document findings and update ADR-003 with Windows-specific notes

**Recommendation:** Create minimal POC for Windows transparent overlay before full implementation.

---

## Story 3.7: Create Sharer's Floating Control Bar

**As a** screen sharer,
**I want** a floating control bar that stays visible on top of all windows,
**So that** I can access meeting controls (mic, camera, stop sharing, leave) without switching back to the minimized Nameless window.

**Acceptance Criteria:**

**Given** I start sharing my screen
**When** the screen share is active
**Then** a floating control bar window is created by Tauri

**And** the floating control bar:
  - Is always on top of ALL windows and screens (highest z-order)
  - Shows sharing status indicator (red dot + "Sharing" text)
  - Shows mic toggle button (mute/unmute)
  - Shows camera toggle button (enable/disable)
  - Shows participant face circles (Around-style, up to 4 visible, "+N" for overflow)
  - Shows "Stop Share" button (accent color)
  - Shows "Leave" button (destructive style)
  - Has semi-transparent dark background (`rgba(0,0,0,0.85)`)
  - Has rounded corners (12px radius)
  - Has compact height (~48px)

**And** the control bar behavior:
  - Default position: top-center of primary screen
  - Is draggable - can be repositioned anywhere on any screen
  - Position is persisted between sessions
  - Works across all screens/desktops (multi-monitor)
  - Fades to 60% opacity after 5 seconds idle
  - Returns to full opacity on hover

**And** button actions:
  - Mic toggle: mutes/unmutes microphone
  - Camera toggle: enables/disables camera
  - Stop Share: stops sharing, dismisses all native windows, restores main window
  - Leave: shows confirmation, then leaves meeting

**And** when I stop sharing:
  - Floating control bar is destroyed
  - Main Nameless window restores from minimized state

**Prerequisites:** Story 3.1

**Technical Notes:**
- Use Tauri window creation with `alwaysOnTop: true`, `decorations: false`
- macOS: NSWindow with `level: .floating`, `collectionBehavior: .canJoinAllSpaces`
- Windows: `WS_EX_TOPMOST` window style
- Render React component inside the floating window
- Store position in settingsStore with localStorage persistence
- Communicate with main window via Tauri events for button actions

**FRs Addressed:** FR21, FR23, FR24, FR25, FR26

---

## Story 3.8: Create Share Border Indicator

**As a** screen sharer,
**I want** a visual border around my shared content,
**So that** I can clearly see what is being captured and shared with others.

**Acceptance Criteria:**

**Given** I start sharing my screen
**When** the screen share is active
**Then** a visible border appears around the shared content

**And** the border indicator:
  - Is a thin colored border (3-4px, accent color or red)
  - Exactly frames the shared window/screen boundaries
  - Is always visible while sharing (doesn't fade)
  - Is click-through (doesn't intercept mouse events)
  - Has no fill (transparent interior)

**And** when sharing a specific window:
  - Border tracks the window position if it moves
  - Border resizes if window resizes

**And** when sharing a full screen:
  - Border appears at screen edges

**And** when I stop sharing:
  - Border indicator is destroyed
  - No visual artifacts remain

**Prerequisites:** Story 3.1

**Technical Notes:**
- Use Tauri transparent window with only border rendering
- Position using platform APIs to track shared window bounds
- Use `transparent: true`, `decorations: false`, `alwaysOnTop: true`
- z-order: below floating control bar, above annotation overlay
- macOS: May need to handle fullscreen apps specially
- Windows: Use `WS_EX_TRANSPARENT` + `WS_EX_LAYERED` for click-through

**FRs Addressed:** FR22

---

## Story 3.9: Implement Main Window Auto-Minimize and Restore

**As a** screen sharer,
**I want** the Nameless window to automatically minimize when I start sharing,
**So that** my shared content is visible and I can focus on presenting.

**Acceptance Criteria:**

**Given** I'm in a meeting and initiate screen share
**When** I select a window/screen to share
**Then** the main Nameless window automatically minimizes

**And** the shared window/screen is brought to focus (foreground)
**And** the floating control bar, share border, and annotation overlay appear

**And** when I stop sharing (via floating bar "Stop Share"):
  - Main Nameless window restores from minimized state
  - Window returns to its previous position and size
  - All native windows (floating bar, border, overlay) are dismissed

**And** when I click "Leave" on floating bar:
  - Confirmation dialog appears (if host)
  - On confirm, all native windows dismissed
  - Main window restores briefly, then closes/returns to home

**And** if the screen share is stopped by the OS (e.g., user clicks system stop):
  - App detects track ended event
  - All native windows dismissed
  - Main window restores

**Prerequisites:** Story 3.1, 3.7, 3.8

**Technical Notes:**
- Use Tauri window API: `window.minimize()`, `window.unminimize()`
- Store window position/size before minimizing for exact restore
- Focus shared window using platform-specific APIs:
  - macOS: `NSApp.activate(ignoringOtherApps:)`
  - Windows: `SetForegroundWindow`
- Listen to LiveKit track ended event for system-initiated stops
- Coordinate with floating control bar button actions via Tauri events

**FRs Addressed:** FR21

---

## Story 3.11: Associate Screen Share Participant with Main Identity in UI

**As a** meeting participant,
**I want** the screen share to appear as coming from the actual sharer (not a separate participant),
**So that** the participant list shows the correct number of people and I can see who is sharing.

**Acceptance Criteria:**

**Given** a participant starts screen sharing on macOS/Linux (using Core sidecar)
**When** the Core connects to LiveKit with a separate identity (e.g., `user-123-screen`)
**Then** the UI does NOT show this as a separate participant in the participant list

**And** the screen share track is associated with the main participant:
  - Main participant shows "Sharing" badge/indicator
  - Screen share video displays with sharer's name attribution
  - Participant count remains accurate (doesn't double-count)

**And** the association uses participant metadata:
  - Screen share token includes `metadata: { parentIdentity: "<main-user-id>", isScreenShare: true }`
  - Client filters participants where `metadata.isScreenShare === true` from participant list
  - Client looks up `parentIdentity` to associate screen track with real participant

**And** when screen sharing stops:
  - The `-screen` participant disconnects automatically (Core leaves room)
  - Main participant's "Sharing" badge is removed
  - No orphaned participants remain in list

**And** the viewer experience is seamless:
  - Viewers see one participant entry with screen share indicator
  - Screen share video element shows sharer's display name
  - Stopping screen share notification shows real participant name

**Prerequisites:** Story 3.1, Story 3.10

**Technical Notes:**
- Server: Generate screen share token with metadata containing `parentIdentity` and `isScreenShare: true`
- Client: Filter `participants.filter(p => !p.metadata?.isScreenShare)` for participant list
- Client: Find screen share participant via `participants.find(p => p.metadata?.parentIdentity === mainId)`
- Update `MeetingRoom.tsx` participant rendering logic
- Update `useScreenShare.ts` to read screen share track from associated participant
- LiveKit metadata is set via access token claims, not client-side

**FRs Addressed:** FR15, FR16 (screen share UX)

---

## Story 3.12: Source Picker Thumbnail Previews

**As a** user starting screen share on macOS/Linux,
**I want** to see thumbnail previews of each screen and window in the source picker,
**So that** I can visually identify which source to share without guessing from names alone.

**Acceptance Criteria:**

**Given** I click to start screen sharing on macOS/Linux
**When** the source picker dialog appears
**Then** each screen/window shows a thumbnail preview image (not just an icon)

**And** thumbnails are captured during source enumeration:
  - Thumbnail size: ~320x180 pixels
  - Format: JPEG encoded as base64 string
  - Each source shows its actual current content

**And** the UI handles missing thumbnails gracefully:
  - Show icon placeholder if thumbnail capture fails
  - Show loading state while thumbnails are being captured

**And** enumeration performance is acceptable:
  - Total enumeration time < 2 seconds for typical source counts
  - Thumbnails may load progressively if needed

**Prerequisites:** Story 3.1, Story 3.10

**Technical Notes:**
- Core (Rust):
  - Add `thumbnail: Option<String>` to `ScreenInfo` and `WindowInfo` structs
  - Capture single frame from each source during `enumerate_sources()`
  - Scale to 320x180, JPEG encode, base64 encode
  - May need `image` crate for JPEG encoding
  - Challenge: DesktopCapturer uses async callbacks, need synchronous capture pattern
- Client (TypeScript):
  - Update `ScreenInfo`/`WindowInfo` types in `lib/core.ts`
  - Update `SourcePickerDialog` to display thumbnail images
  - Show placeholder icon when thumbnail is null/undefined

**FRs Addressed:** FR15 (screen share UX)

---

## Story 3.13: Add Windows Support to Core Sidecar

**As a** Windows user,
**I want** the Core sidecar to work on my platform,
**So that** I have the same native screen sharing and annotation overlay as macOS/Linux users.

**Acceptance Criteria:**

**Given** I'm on Windows 10 or Windows 11
**When** the app starts the Core sidecar
**Then** capture and overlay work identically to macOS/Linux

**And** Windows-specific implementation in `packages/core/`:
  - Cross-compile existing Rust code for Windows target
  - Add Windows platform conditionals where needed (`#[cfg(target_os = "windows")]`)
  - Screen/window enumeration via existing `xcap`/`scrap` (already cross-platform)
  - Transparent overlay using Win32 APIs

**And** transparent overlay on Windows:
  - `WS_EX_LAYERED` + `WS_EX_TRANSPARENT` for click-through
  - `HWND_TOPMOST` for always-on-top
  - Tracks shared window position/resize
  - High-DPI and multi-monitor aware

**And** quality/behavior matches macOS/Linux:
  - 1080p, VP9, 4-6 Mbps
  - 60fps capable
  - Same IPC protocol with Tauri main process

**Prerequisites:** Story 3.10 (Core already implemented for macOS/Linux)

**Technical Notes:**
- Add to existing `packages/core/src/`
- Platform-specific overlay code in `overlay/windows.rs` or similar module
- Build target: `x86_64-pc-windows-msvc`
- Test: Windows 10 (1903+), Windows 11, high-DPI, multi-monitor

**FRs Addressed:** FR15, FR16, FR20, FR27 (Windows platform parity)

---

## Story 3.14: Fix Screen Share State Not Updating When Host Stops

**Type:** Bug Fix

**As a** meeting participant,
**I want** the UI to immediately reflect when the host stops screen sharing,
**So that** I have accurate information about the current meeting state.

**Bug Description:**

**Current behavior:** When the host stops streaming, the UI still shows the "streaming" indicator. State doesn't update in real-time.

**Expected behavior:** UI should immediately update when screen share ends - indicator disappears, layout returns to video grid.

**Acceptance Criteria:**

**Given** the host is currently sharing their screen
**When** the host stops screen sharing (via Stop button, keyboard shortcut, or system)
**Then** all participants see the screen share end within 500ms

**And** the UI updates immediately:
  - Screen share video element is removed
  - "Sharing" badge removed from host's participant entry
  - Layout transitions back to video grid
  - Toast notification: "{host} stopped sharing"

**And** the sharer's UI updates:
  - Floating control bar dismissed
  - Share border indicator dismissed
  - Main window restored (if minimized)
  - Share button returns to default state

**And** state is consistent across all participants

**Investigation Areas:**
- `RoomEvent.TrackUnpublished` event listener
- `RoomEvent.TrackUnsubscribed` handler
- `roomStore` screen share state updates
- Participant metadata sync on track end
- React re-render triggers

**Prerequisites:** Story 3.2, 3.3

**Technical Notes:**
- Verify all track lifecycle events are being handled:
  - `TrackUnpublished` (publisher side)
  - `TrackUnsubscribed` (subscriber side)
  - `LocalTrackUnpublished` (local cleanup)
- Check if `screenShareTrack` state is being set to `null` on end
- Verify `isScreenSharing` computed state updates
- May be race condition between track end and metadata update
- Add logging to track event flow for diagnosis

---
