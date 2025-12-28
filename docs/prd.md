# Etch - Product Requirements Document

**Author:** BMad
**Date:** 2025-11-29
**Version:** 1.0

---

## Executive Summary

Etch is an open-source, self-hosted meeting platform that brings real-time screen annotations to video collaboration. It fills a critical gap between proprietary platforms (Zoom, Teams) that are closed and expensive, and open alternatives (Jitsi) that lack annotation capabilities.

The product enables distributed teams - developers doing code reviews, designers critiquing prototypes, support technicians guiding users - to draw directly on shared screens with imperceptible latency. All while maintaining complete control over their data through self-hosting.

**Core Architecture:** LiveKit handles WebRTC media transport while a separate annotation layer synchronizes lightweight vector events through DataTracks. This separation enables sub-200ms annotation latency with local compositing on each participant's desktop client.

**Target Users:** Developer teams, design teams, and IT support - professionals who need precise visual communication during screen sharing and value open-source, self-hostable tools.

### What Makes This Special

**The "pointing finger" moment** - the experience of drawing on someone's screen and having everyone see it instantly. No more "the button on the left... no, your other left." Just draw a circle around it.

Combined with:
- **Fully open-source (Apache 2.0)** - inspect, modify, embed, redistribute
- **Self-hosted** - your data, your servers, your compliance
- **Architecture-first** - clean separation enabling modularity and future portability

---

## Project Classification

**Technical Type:** Desktop Application (with real-time backend)
**Domain:** General (Collaboration/Communication)
**Complexity:** Low (no regulated domain requirements)

Etch is a cross-platform desktop application with a real-time collaboration backend. The desktop client handles video rendering and annotation compositing, while the backend (LiveKit) manages WebRTC connections and data synchronization.

**Reference Documents:**
- Product Brief: `docs/product-brief-etch-2025-11-29.md`

---

## Success Criteria

Success for Etch is measured by **community adoption and product quality**, not revenue.

### Primary Success Indicators

| Indicator | Target | Why It Matters |
|-----------|--------|----------------|
| **GitHub Stars** | 500+ | Visibility, social proof, discoverability |
| **Self-hosted Deployments** | 50+ active instances | Real-world validation that it works |
| **External Contributors** | 10+ merged PRs | Community health and sustainability |
| **Community Members** | 200+ (Discord/discussions) | Engaged user base for feedback |

### Product Quality Gates

| Quality Metric | Requirement | Rationale |
|----------------|-------------|-----------|
| **Annotation Latency** | < 200ms consistently | Core value prop - must feel instant |
| **Connection Success Rate** | > 95% | Reliability is table stakes |
| **Bug Resolution** | Critical bugs < 1 week | Community trust requires responsiveness |

### User Success Moments

The product succeeds when users experience:
- Drawing on a shared screen and seeing teammates react in real-time
- Setting up a self-hosted instance without needing to ask for help
- Inviting a colleague who joins and immediately starts annotating
- Finishing a code review and realizing they never said "scroll down a bit"

### Future Commercial Signals (Watch, Don't Optimize)

These indicate potential for sustainability, tracked but not targeted:
- Enterprise inquiries received
- Requests for managed/hosted version
- Support contract interest

---

## Product Scope

### MVP - Minimum Viable Product

The MVP proves the core value: **real-time annotation on shared screens in a self-hosted meeting**.

**Meeting Infrastructure:**
- Self-hosted LiveKit instance deployment (Docker)
- Create and join meeting rooms
- Room authentication (simple token-based)
- Audio, video, and screen sharing

**Annotation System:**
- Real-time annotation canvas overlaid on shared screens
- Drawing tools: pen, highlighter, eraser, clear-all
- Annotation synchronization via DataTrack (vector events, not pixels)
- Late-joiner sync (new participants see existing annotations)
- Resolution-independent coordinates (normalized [0,1] space)

**Desktop Client:**
- macOS and Windows support
- Local compositing of video + annotation overlay
- Performance-optimized rendering (technology TBD - Tauri, native, or Electron fallback)

**Permission Model:**
- Host: enable/disable annotations, clear all, manage participants
- Sharer: share screen, delete any stroke on their screen
- Annotator: create strokes, delete own strokes
- Viewer: observe only

**Deployment & Documentation:**
- Docker Compose one-liner deployment
- Clear README for self-hosting setup
- Basic troubleshooting guide

### Growth Features (Post-MVP)

Features that make it competitive but aren't required to prove the concept:

- **Undo/redo** for annotation strokes
- **Cursor indicators** showing where others are pointing
- **Persistent session state** (rejoin and see history)
- **Enhanced drawing tools** (rectangles, arrows, text labels)
- **Recording & replay** of annotated sessions
- **Web viewer** (view-only participation from browser)
- **Linux desktop client**

### Vision (Future)

The long-term direction, not commitments:

- **Native overlay SDK** - embeddable annotation layer for other apps
- **OS-level annotation** (Rust/Swift helpers for true native overlays)
- **Organization features** (SSO, teams, admin dashboard)
- **Mobile clients** (iOS/Android for viewing/basic participation)
- **Whiteboard mode** (annotation without screen share)
- **Plugin architecture** for custom tools and integrations

---

## Innovation & Novel Patterns

### Architectural Innovation: Decoupled Annotation Layer

Most collaboration tools embed annotation into their media pipeline - annotations are composited server-side or baked into the video stream. Etch takes a different approach:

**The Pattern:**
- Media transport (video/audio/screen) flows through LiveKit SFU unchanged
- Annotation events flow through LiveKit DataTracks as lightweight vector data
- Each client reconstructs the annotation canvas locally from event stream
- Compositing happens client-side, not server-side

**Why This Matters:**
1. **Latency** - Annotations don't wait for video encoding/decoding round-trip
2. **Bandwidth** - Vector events (stroke coordinates) are tiny vs. pixel data
3. **Modularity** - Annotation layer can be extracted and embedded elsewhere
4. **Scalability** - Server doesn't bear compositing CPU load

**The Risk:**
- Requires careful state synchronization (what if events arrive out of order?)
- Late-joiner sync needs a reliable state snapshot mechanism
- Different clients must render identically from same event stream

### Validation Approach

1. **Latency Spike** - Build minimal annotation sync prototype, measure round-trip
2. **Stress Test** - Simulate 10 concurrent annotators, verify consistency
3. **Late-Join Test** - Join mid-session, verify state reconstruction
4. **Cross-Platform** - Verify identical rendering on macOS vs Windows

If DataTrack approach fails latency requirements, fallback is direct WebSocket for annotations (still decoupled from media, just different transport).

---

## Desktop Application Requirements

### Platform Support

| Platform | Priority | Status |
|----------|----------|--------|
| **macOS** (Intel + Apple Silicon) | Primary | MVP |
| **Windows** (10/11, x64) | Primary | MVP |
| **Linux** (Ubuntu/Debian) | Secondary | Post-MVP |

**Framework Decision:**
Desktop client technology is TBD, evaluated on:
- Annotation rendering latency (must be imperceptible)
- Bundle size and memory footprint
- Cross-platform code sharing
- Native OS integration quality
- Developer velocity for MVP

**Options under evaluation:**
1. **Tauri** - Rust backend + webview, smaller bundles than Electron
2. **Swift/AppKit** - Native macOS, would require separate Windows implementation
3. **Rust + egui/iced** - Pure native, maximum control
4. **Electron** - Fallback if velocity trumps performance for MVP

### System Integration

**Screen Capture:**
- Hybrid approach: Rust sidecar for macOS/Linux (WKWebView limitation), WebView for Windows
- macOS: Native capture via `xcap`/`scrap` Rust crates (WKWebView doesn't support getDisplayMedia)
- Windows: WebView2 getDisplayMedia() (full WebRTC support)
- Permission prompts for screen recording access
- Support for capturing specific windows or full displays

**Screen Sharing Quality (Research-Validated):**
- Resolution: 1080p (sufficient for readable code with high bitrate)
- Codec: VP9 (optimal quality-to-bandwidth for screen content)
- Bitrate: 4-6 Mbps (high enough for crisp text, reasonable bandwidth)
- Focus: Text clarity over raw resolution (crisp 1080p > blurry 4K)
- Future: 1440p option in v1.1, 4K in v2.0 if demand exists

**Audio/Video:**
- Microphone and camera access
- System audio capture (for sharing application audio)
- Device selection (multiple mics/cameras)

**Overlay Rendering:**
- Transparent overlay window for annotation canvas (positioned over shared content)
- Floating control bar window for sharer (always-on-top, above all windows & screens)
- Visual border around shared window/screen to indicate active sharing
- Proper z-ordering (control bar > annotations > shared content border > application windows)
- High refresh rate rendering for smooth strokes
- Control bar follows sharer across screens/desktops

**Clipboard:**
- Copy annotation snapshots to clipboard (future)

### Update Strategy

**MVP Approach (Research-Validated for "Premium Feel"):**
- Auto-update mechanism via Tauri's built-in updater
- In-app notification when new version available
- One-click update installation
- Seamless restart after update

**Post-MVP:**
- Delta updates to minimize download size
- Staged rollouts for stability
- Update channels (stable, beta)

### Offline Capabilities

**Reality Check:** Etch is inherently an online collaboration tool - no meeting without network.

**Graceful Degradation:**
- Handle network interruptions without crashing
- Reconnect automatically when connection restored
- Queue annotation events during brief disconnects, replay on reconnect
- Clear feedback when disconnected ("Connection lost, reconnecting...")

**Local Data:**
- Settings stored locally (preferences, recent rooms)
- No cloud account required
- Session history (optional, local-only)

---

## User Experience Principles

### Visual Personality

**Vibe:** Professional but approachable. Developer-tool aesthetic - clean, functional, no unnecessary flourish.

- Dark mode default (matches developer environments)
- Light mode available
- Minimal chrome - maximize screen real estate for shared content
- High contrast for annotation tools (must be visible on any background)

**Not:** Consumer-playful (Figma), corporate-sterile (Teams), gamified (Discord).

### Core UX Philosophy

**Annotations should feel like drawing on glass in front of the screen.**

1. **Zero friction to annotate** - See something, draw on it. No mode switches, no tool palettes in the way.
2. **Ephemeral by default** - Annotations are for the moment, not permanent artifacts. Easy to clear.
3. **Non-intrusive to presenter** - Annotations don't disrupt the sharer's workflow.
4. **Visibility without distraction** - Others' annotations are visible but don't overwhelm the content.

### Key Interactions

**Starting a meeting:**
- Launch app → Create room (one click) → Share link → Done
- Or: Click join link → Enter name → Join

**Sharing screen:**
- Click share → Pick window/display → Sharing begins
- Main Etch window is minimized - selected window/screen is focused (border indicates sharing)
- Floating control bar appears on top of all windows & screens
- Shows: sharing indicator, participant face circles, mic/camera toggles, stop share, leave
- Annotation canvas auto-activates for all participants

**Annotating:**
- Move cursor to annotation area → Draw (pen is default tool)
- Tool switching via keyboard shortcuts (P=pen, H=highlight, E=eraser, C=clear)
- Minimal floating toolbar for mouse-only users

**Viewing annotations:**
- Others' strokes appear in real-time, different colors per participant
- Strokes fade or can be cleared by host
- No "accept/reject" workflow - it's live collaboration

**Permission awareness:**
- Clear indicator of your current role (host/annotator/viewer)
- Disabled tools clearly show why ("Only host can clear all")

---

## Functional Requirements

### Meeting & Room Management

- **FR1:** Users can create a new meeting room with a single action
- **FR2:** Users can join an existing room via shareable link
- **FR3:** Users can set a display name when joining a room
- **FR4:** Hosts can generate and share room invite links
- **FR5:** Hosts can remove participants from the room
- **FR6:** Users can leave a meeting at any time
- **FR7:** Rooms are automatically cleaned up when all participants leave

### Audio & Video

- **FR8:** Users can publish audio from their microphone
- **FR9:** Users can publish video from their camera
- **FR10:** Users can mute/unmute their own audio
- **FR11:** Users can enable/disable their own video
- **FR12:** Users can select which microphone and camera to use
- **FR13:** Users can see and hear other participants' audio/video streams
- **FR14:** Users can adjust volume of individual participants (local mix)

### Screen Sharing

- **FR15:** Users can share their entire screen
- **FR16:** Users can share a specific application window
- **FR17:** Users can stop screen sharing at any time
- **FR18:** Only one participant can share screen at a time (MVP)
- **FR19:** All participants can view the shared screen
- **FR20:** Shared screen displays at 1080p resolution with VP9 codec at 4-6 Mbps bitrate, optimized for text clarity
- **FR21:** When sharing begins, the main Etch window automatically minimizes and the shared window/screen is focused
- **FR22:** A visual border appears around the shared window/screen to indicate active sharing
- **FR23:** A floating control bar appears on top of all windows showing sharing status, participant face circles, and meeting controls
- **FR24:** The floating control bar remains visible across all screens/desktops when the main application is minimized
- **FR25:** The floating control bar can be repositioned by dragging
- **FR26:** The floating control bar provides quick access to: mute/unmute, camera toggle, stop sharing, and leave meeting

### Annotation System

- **FR27:** Users with annotator permissions can draw freehand strokes on shared screens
- **FR28:** Users can use a pen tool for precise line drawing
- **FR29:** Users can use a highlighter tool for semi-transparent emphasis
- **FR30:** Users can use an eraser tool to remove their own strokes
- **FR31:** Hosts can clear all annotations from the shared screen
- **FR32:** Sharers can delete any annotation on their shared screen
- **FR33:** Annotations appear in real-time for all participants (< 200ms latency)
- **FR34:** Each participant's annotations display in a distinct color
- **FR35:** Late-joining participants see all existing annotations immediately
- **FR36:** Annotations are resolution-independent (scale correctly on different displays)

### Permission & Roles

- **FR37:** Room creator is automatically assigned the Host role
- **FR38:** Hosts can assign roles to other participants (Annotator, Viewer)
- **FR39:** Hosts can enable or disable annotation capability for the room
- **FR40:** Annotators can create and delete their own annotations
- **FR41:** Viewers can observe the meeting but cannot annotate
- **FR42:** Sharers have elevated permissions on their own shared content
- **FR43:** Users can see their current role and permissions clearly

### Authentication & Access

- **FR44:** Rooms use token-based authentication for access control
- **FR45:** Users do not need to create an account to join meetings
- **FR46:** Room tokens can be generated by the self-hosted server
- **FR47:** Invalid or expired tokens are rejected with clear error messages

### Connection & State Management

- **FR48:** Application automatically reconnects after brief network interruptions
- **FR49:** Annotation state is preserved and restored after reconnection
- **FR50:** Users receive clear feedback when connection is lost
- **FR51:** Users receive notification when reconnection succeeds
- **FR52:** Application handles graceful degradation during poor network conditions

### Desktop Application

- **FR53:** Application runs on macOS (Intel and Apple Silicon)
- **FR54:** Application runs on Windows 10 and 11
- **FR55:** Application requests necessary system permissions (screen capture, microphone, camera)
- **FR56:** Application stores user preferences locally
- **FR57:** Application displays notification when updates are available
- **FR58:** Users can access recent rooms from the application

### Self-Hosting & Deployment

- **FR59:** Server can be deployed via Docker Compose with minimal configuration
- **FR60:** Server integrates with self-hosted LiveKit instance
- **FR61:** Deployment documentation enables setup without external support
- **FR62:** Server provides health check endpoints for monitoring

---

## Non-Functional Requirements

### Performance

Performance is central to Etch's value proposition - annotations must feel instant.

| Metric | Requirement | Rationale |
|--------|-------------|-----------|
| **Annotation latency** | < 200ms end-to-end | Core UX - must feel like drawing on glass |
| **Stroke rendering** | 60fps during active drawing | Smooth ink feel |
| **Video latency** | < 500ms (LiveKit default) | Standard for video calls |
| **Room join time** | < 5 seconds to first frame | Quick start experience |
| **Memory usage** | < 500MB idle, < 1GB active meeting | Reasonable for desktop app |
| **CPU usage** | < 30% during screen share + annotation | Leave headroom for user's work |

**Annotation-specific performance:**
- Local stroke rendering: immediate (< 16ms)
- Network round-trip for sync: < 150ms p95
- Late-join state reconstruction: < 1 second for 100 strokes

### Security

Self-hosted means users are trusting Etch with potentially sensitive screen content.

**Transport Security:**
- All WebRTC traffic encrypted (DTLS-SRTP, standard)
- All signaling over TLS/WSS
- No unencrypted data transmission

**Authentication & Authorization:**
- Room tokens use secure signing (JWT with expiration)
- Tokens scoped to specific rooms with specific permissions
- No token reuse across rooms

**Data Handling:**
- No annotation data persisted on server by default
- Screen content never stored server-side
- Session data exists only in memory during meeting

**Self-Hosting Security:**
- Documentation includes security best practices
- Clear guidance on firewall/network configuration
- No phone-home or telemetry without explicit opt-in

**Client Security:**
- Desktop app signed for macOS and Windows
- No execution of remote code
- Minimal permission requests (only what's needed)

### Scalability

MVP scope is modest - focus on correctness first, scale later.

| Scenario | Target | Notes |
|----------|--------|-------|
| **Participants per room** | 2-10 | Typical team meeting size |
| **Concurrent annotators** | Up to 5 | More gets visually chaotic anyway |
| **Strokes per session** | 500+ | Should handle extended sessions |
| **Concurrent rooms per server** | 10+ | Single-team deployment |

**Post-MVP scaling considerations:**
- LiveKit handles media scaling (SFU architecture)
- Annotation sync may need optimization for larger rooms
- Consider sharding for multi-team deployments

### Reliability

| Metric | Requirement |
|--------|-------------|
| **Connection success rate** | > 95% |
| **Crash-free sessions** | > 99% |
| **Reconnection success** | > 90% after brief disconnect |
| **Data consistency** | Zero annotation state loss during normal operation |

**Failure handling:**
- Graceful degradation over hard failures
- Clear error messages (not technical jargon)
- Recovery without user intervention when possible

---

## Summary

**Etch** is an open-source, self-hosted meeting platform that delivers real-time screen annotations - the "pointing finger" moment that makes remote collaboration feel natural.

| Dimension | Summary |
|-----------|---------|
| **Core Value** | Draw on shared screens with < 200ms latency, fully self-hosted |
| **Target Users** | Developer teams, design teams, IT support |
| **Technical Approach** | LiveKit for media, DataTracks for annotation sync, local compositing |
| **MVP Scope** | Desktop app (macOS/Windows), A/V/screen share, annotation tools, role permissions |
| **Success Metrics** | 500+ GitHub stars, 50+ deployments, 10+ contributors |

**Functional Requirements:** 62 capabilities across meeting management, A/V, screen sharing (including floating control bar), annotations, permissions, auth, connection handling, desktop app, and deployment.

**Non-Functional Requirements:** Performance (< 200ms annotation latency), security (encrypted, no server persistence), scalability (2-10 participants), reliability (> 95% connection success).

---

_This PRD captures the essence of Etch - enabling teams to point at things on screen and have everyone see it instantly, without giving up control of their data._

_Created through collaborative discovery between BMad and AI facilitator._
