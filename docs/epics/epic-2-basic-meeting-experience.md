# Epic 2: Basic Meeting Experience

**Goal:** Enable users to create and join meeting rooms with audio/video communication - a fully functional video conferencing experience.

**User Value:** After this epic, users can hold video meetings with others.

**FRs Addressed:** FR1-4, FR6-14, FR38-41, FR47-50

---

## Story 2.1: Implement Room Creation API Endpoint

**As a** user,
**I want** to create a new meeting room with a single action,
**So that** I can quickly start a meeting and invite others.

**Acceptance Criteria:**

**Given** the API server is running
**When** I send `POST /api/rooms` with body `{ "hostName": "BMad" }`
**Then** I receive status 201 with response:
```json
{
  "roomId": "abc-123-xyz",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "livekitUrl": "wss://localhost:7880"
}
```

**And** the roomId is a unique, URL-safe string (format: `xxx-xxx-xxx`)
**And** the token is a valid LiveKit JWT with:
  - `identity`: unique participant ID
  - `name`: "BMad"
  - `metadata`: `{ "role": "host", "color": "#f97316" }`
  - `exp`: 1 hour from now
  - Room permissions: `roomJoin: true`, `canPublish: true`

**And** invalid requests return 400 with error:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "hostName is required"
  }
}
```

**Prerequisites:** Story 1.2, 1.3

**Technical Notes:**
- Use `livekit-server-sdk` for token generation
- Room ID generation: `nanoid` with custom alphabet (lowercase + numbers, no ambiguous chars)
- Store active rooms in memory (Map) for MVP - no database needed
- Token expiry: 1 hour (configurable via env)

---

## Story 2.2: Implement Room Join API Endpoint

**As a** user,
**I want** to join an existing meeting room via a shareable link,
**So that** I can participate in meetings others have created.

**Acceptance Criteria:**

**Given** a room "abc-123-xyz" exists
**When** I send `POST /api/rooms/abc-123-xyz/join` with body `{ "participantName": "Alice" }`
**Then** I receive status 200 with response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "livekitUrl": "wss://localhost:7880"
}
```

**And** the token has:
  - `identity`: unique participant ID
  - `name`: "Alice"
  - `metadata`: `{ "role": "annotator", "color": "#06b6d4" }` (next available color)
  - Room permissions: `roomJoin: true`, `canPublish: true`

**And** joining a non-existent room returns 404:
```json
{
  "error": {
    "code": "ROOM_NOT_FOUND",
    "message": "The requested room does not exist or has ended"
  }
}
```

**And** the participant color is assigned from the pool, cycling through available colors

**Prerequisites:** Story 2.1

**Technical Notes:**
- Default role for joiners is "annotator" (can be overridden to "viewer")
- Color assignment: cycle through PARTICIPANT_COLORS array based on join order
- Validate roomId format before lookup

---

## Story 2.3: Build Home Screen with Create/Join Meeting UI

**As a** user,
**I want** a home screen where I can create a new meeting or join an existing one,
**So that** I have a clear entry point to start using Etch.

**Acceptance Criteria:**

**Given** I launch the Etch application
**When** the app opens
**Then** I see the home screen with:
  - Etch logo/title
  - "Start Meeting" primary button
  - "Join Meeting" input field with room code/link
  - "Join" button (enabled when input has value)

**And** clicking "Start Meeting" shows a brief loading state then navigates to the meeting room
**And** entering a room code and clicking "Join" shows name input dialog then navigates to room
**And** the UI matches the UX spec dark theme (`--background: #09090b`)
**And** the "Start Meeting" button has accent color (`--accent: #8b5cf6`)
**And** keyboard shortcut `Enter` submits the join form when focused

**Prerequisites:** Story 1.1, 2.1, 2.2

**Technical Notes:**
- Use shadcn/ui Button, Input components
- Store API base URL in settings (defaults to localhost:3000 for dev)
- Room code input accepts both full URLs and just the room ID
- Parse room ID from URL format: `etch://room/{id}` or `https://*/room/{id}`

---

## Story 2.4: Implement Join Meeting Flow with Name Input

**As a** user,
**I want** to enter my display name when joining a meeting,
**So that** other participants can identify me.

**Acceptance Criteria:**

**Given** I click "Join" with a valid room code
**When** the join dialog appears
**Then** I see:
  - "Join Meeting" title with room ID displayed
  - "Your name" input field (pre-filled if I've joined before)
  - "Join" primary button
  - "Cancel" secondary button

**And** the name input has:
  - Minimum 1 character, maximum 50 characters
  - Focus on open (auto-focus)
  - Validation error shown below input if empty on submit

**And** clicking "Join" with valid name:
  - Shows loading spinner on button
  - Calls join API
  - Navigates to meeting room on success
  - Shows error toast on failure

**And** my name is saved to localStorage for next time
**And** pressing `Enter` in the name field submits the form

**Prerequisites:** Story 2.3

**Technical Notes:**
- Use shadcn/ui Dialog, Input, Button components
- localStorage key: `etch_display_name`
- Error toast duration: 5 seconds per UX spec
- Loading state disables button and shows spinner

---

## Story 2.5: Create Meeting Room Layout Shell

**As a** user,
**I want** a meeting room interface that shows participants and meeting controls,
**So that** I have a clear view of who's in the meeting and how to interact.

**Acceptance Criteria:**

**Given** I've joined a meeting room
**When** the meeting room view loads
**Then** I see the layout per UX spec Direction #1 (Hybrid):
  - Left sidebar: collapsible, shows participant list
  - Center: main content area (will show video/screen share)
  - Top toolbar: annotation tools area (disabled until screen share)
  - Bottom: meeting controls bar

**And** the sidebar shows:
  - "PARTICIPANTS" header
  - List of participants with avatar, name, role badge
  - My entry marked with "(You)"
  - "Invite" button at bottom

**And** the meeting controls bar shows:
  - Microphone toggle button (muted by default, with slash icon)
  - Camera toggle button (off by default, with slash icon)
  - Screen share button (outline style)
  - Leave button (red/destructive style)

**And** the sidebar can be toggled with `⌘\` (Ctrl+\ on Windows)
**And** the layout is responsive per UX spec (sidebar auto-collapses < 1000px width)

**Prerequisites:** Story 2.4, 1.3

**Technical Notes:**
- Use Zustand `roomStore` for room state (participants, local user)
- Implement ParticipantListItem component per UX spec Section 6
- Implement MeetingControlsBar component per UX spec Section 6
- Use CSS Grid or Flexbox for responsive layout
- Sidebar state persisted to localStorage

---

## Story 2.6: Integrate LiveKit Room Connection

**As a** user,
**I want** to connect to the meeting room via LiveKit,
**So that** I can communicate with other participants in real-time.

**Acceptance Criteria:**

**Given** I have a valid LiveKit token from the join API
**When** I enter the meeting room
**Then** the client connects to LiveKit using the token

**And** on successful connection:
  - Connection status indicator shows green dot with "Connected"
  - My participant appears in the participant list
  - Other participants in the room appear in the list

**And** when another participant joins:
  - They appear in the participant list within 2 seconds
  - A subtle toast shows "{name} joined"

**And** when a participant leaves:
  - They are removed from the participant list
  - A subtle toast shows "{name} left"

**And** on connection failure:
  - Status indicator shows red dot with "Disconnected"
  - Error toast with "Failed to connect" and retry option

**Prerequisites:** Story 2.5

**Technical Notes:**
- Use `livekit-client` Room class
- Use `@livekit/components-react` hooks where helpful
- Listen to RoomEvent.ParticipantConnected, ParticipantDisconnected
- Extract participant metadata (role, color) from token
- Update Zustand roomStore on participant changes

---

## Story 2.7: Implement Audio Publishing and Controls

**As a** user,
**I want** to publish my microphone audio and control mute/unmute,
**So that** I can speak to other participants in the meeting.

**Acceptance Criteria:**

**Given** I'm connected to a LiveKit room
**When** I click the microphone button (currently muted)
**Then** the system prompts for microphone permission (if not granted)

**And** after permission granted:
  - Microphone audio is published to the room
  - Button icon changes from muted (slash) to unmuted
  - Other participants can hear me

**And** clicking the microphone button again:
  - Mutes the audio track (stops publishing)
  - Button icon shows muted state (slash)

**And** the mute/unmute toggle is instant (< 100ms visual feedback)
**And** keyboard shortcut `M` toggles mute state
**And** if permission denied, show toast: "Microphone access denied. Check system settings."

**Prerequisites:** Story 2.6

**Technical Notes:**
- Use `room.localParticipant.setMicrophoneEnabled()`
- Request permission via Tauri's permission APIs or browser API
- Store preference in settingsStore (start muted by default per UX spec)
- Add speaking indicator animation on participant avatar when audio detected

---

## Story 2.8: Implement Video Publishing and Controls

**As a** user,
**I want** to publish my camera video and control on/off,
**So that** other participants can see me during the meeting.

**Acceptance Criteria:**

**Given** I'm connected to a LiveKit room
**When** I click the camera button (currently off)
**Then** the system prompts for camera permission (if not granted)

**And** after permission granted:
  - Camera video is published to the room
  - Button icon changes from off (slash) to on
  - My video appears in the participant area

**And** clicking the camera button again:
  - Stops the video track
  - Button icon shows off state (slash)
  - Video element shows avatar/placeholder

**And** keyboard shortcut `V` toggles video state
**And** if permission denied, show toast: "Camera access denied. Check system settings."

**Prerequisites:** Story 2.7

**Technical Notes:**
- Use `room.localParticipant.setCameraEnabled()`
- Video off by default per UX spec (less intimidating)
- Show gradient avatar with initial when video off
- Video resolution: 720p default (can be lower on poor network)

---

## Story 2.9: Display Remote Participant Audio/Video Streams

**As a** user,
**I want** to see and hear other participants' audio and video,
**So that** I can communicate face-to-face in the meeting.

**Acceptance Criteria:**

**Given** I'm in a meeting with other participants
**When** a remote participant has video enabled
**Then** their video displays in the participant area

**And** when a remote participant has audio enabled:
  - I can hear their audio
  - Their avatar shows speaking indicator when they talk

**And** when a remote participant disables video:
  - Their video is replaced with avatar placeholder
  - Transition is smooth (fade)

**And** participant videos are displayed as:
  - Floating bubbles (Around-style) when screen sharing is active
  - Grid layout when no screen share (up to 10 participants)

**And** video quality adapts to network conditions automatically

**Prerequisites:** Story 2.8

**Technical Notes:**
- Use LiveKit's automatic track subscription
- Implement ParticipantBubble component per UX spec
- Use `<VideoTrack>` or `<AudioTrack>` from @livekit/components-react
- Grid layout: 2x2 for 4 or fewer, 3x3 for 5-9, etc.
- Simulcast enabled for adaptive quality

---

## Story 2.10: Implement Device Selection for Microphone and Camera

**As a** user,
**I want** to select which microphone and camera to use,
**So that** I can use my preferred devices for the meeting.

**Acceptance Criteria:**

**Given** I'm in a meeting
**When** I click a dropdown arrow next to the microphone button
**Then** I see a list of available microphones with:
  - Device names
  - Checkmark on currently selected device
  - "System Default" option at top

**And** selecting a different microphone:
  - Switches to that device immediately
  - Shows brief "Switched to {device}" toast
  - Persists selection for future meetings

**And** the same pattern works for camera selection (dropdown next to camera button)
**And** if a device is disconnected mid-meeting:
  - Fallback to default device
  - Show toast: "Device disconnected, switched to {default}"

**Prerequisites:** Story 2.8

**Technical Notes:**
- Use `navigator.mediaDevices.enumerateDevices()`
- Use shadcn/ui DropdownMenu component
- Store device preferences in settingsStore (localStorage)
- Listen for `devicechange` event to update list
- Use `room.switchActiveDevice()` for switching

---

## Story 2.11: Implement Participant Volume Control

**As a** user,
**I want** to adjust the volume of individual participants,
**So that** I can balance audio levels to my preference.

**Acceptance Criteria:**

**Given** I'm in a meeting with other participants
**When** I hover over a participant in the sidebar
**Then** I see a volume slider icon appear

**And** clicking the volume icon shows a volume slider (0-100%)
**And** dragging the slider adjusts that participant's audio volume locally
**And** setting volume to 0 effectively mutes them (for me only)
**And** volume changes are instant (no delay)
**And** volume settings persist for the session (reset on rejoin)

**Prerequisites:** Story 2.9

**Technical Notes:**
- Use Web Audio API gain node for per-participant volume
- Or use LiveKit's `setVolume()` method on audio tracks
- shadcn/ui Slider component for volume control
- Default volume: 100%
- Volume range: 0-200% (allow boost)

---

## Story 2.12: Implement Leave Meeting Flow

**As a** user,
**I want** to leave a meeting at any time,
**So that** I can exit when I'm done participating.

**Acceptance Criteria:**

**Given** I'm in a meeting
**When** I click the "Leave" button
**Then** if I'm a regular participant:
  - I immediately disconnect from the room
  - I'm returned to the home screen
  - Other participants see "{name} left" notification

**And** if I'm the host:
  - I see confirmation dialog: "Leave meeting? You are the host. The meeting will continue without you."
  - "Leave" confirms and disconnects
  - "Cancel" returns to meeting
  - Host role transfers to next participant (by join order)

**And** keyboard shortcut `⌘W` (Ctrl+W) triggers leave
**And** closing the window also triggers leave flow

**Prerequisites:** Story 2.6

**Technical Notes:**
- Use `room.disconnect()` to cleanly leave
- Host transfer: update participant metadata via DataTrack message
- Window close: listen to Tauri window close event, disconnect first
- Return to home screen via React Router or state change

---

## Story 2.13: Implement Room Invite Link Generation and Sharing

**As a** host,
**I want** to generate and share invite links,
**So that** I can invite others to join my meeting.

**Acceptance Criteria:**

**Given** I'm in a meeting (as host or participant)
**When** I click the "Invite" button in the sidebar
**Then** I see an invite modal with:
  - Room link displayed (e.g., `etch://room/abc-123-xyz`)
  - "Copy Link" button
  - QR code (optional, nice-to-have)

**And** clicking "Copy Link":
  - Copies the link to clipboard
  - Shows toast: "Link copied!"
  - Button text briefly changes to "Copied!"

**And** the link auto-copies to clipboard when room is first created
**And** keyboard shortcut `⌘I` (Ctrl+I) opens invite modal

**Prerequisites:** Story 2.5

**Technical Notes:**
- Use Tauri clipboard API or `navigator.clipboard`
- shadcn/ui Dialog for modal
- Link format configurable (custom domain for self-hosted)
- Store server URL in settings for link generation

---

## Story 2.14: Implement User Preferences Storage

**As a** user,
**I want** my preferences saved locally,
**So that** I don't have to reconfigure settings every time I use the app.

**Acceptance Criteria:**

**Given** I've used Etch before
**When** I launch the app again
**Then** my preferences are restored:
  - Display name (pre-filled in join dialog)
  - Preferred microphone device
  - Preferred camera device
  - Sidebar collapsed/expanded state
  - Theme preference (dark/light)

**And** preferences persist across app restarts
**And** preferences can be cleared/reset from a settings menu
**And** preferences are stored locally only (no server sync)

**Prerequisites:** Story 2.10

**Technical Notes:**
- Use Zustand with `persist` middleware for settingsStore
- Storage: localStorage (or Tauri's store plugin for native)
- Settings structure in shared types
- Add basic settings menu accessible from home screen

---

## Story 2.15: Fix Browser Room Join Retry Issue

**Type:** Bug Fix

**As a** browser user,
**I want** to join a room on the first connection attempt,
**So that** I don't experience delays or confusion waiting for retries.

**Bug Description:**

**Current behavior:** Browser client doesn't join room directly; connection only succeeds after automatic retries.

**Expected behavior:** Room join should succeed on first attempt without requiring retry logic to kick in.

**Acceptance Criteria:**

**Given** I'm using the browser client
**When** I click to join a room with valid credentials
**Then** I connect to the room on the first attempt (within 3 seconds)

**And** no retry logic is triggered for successful connections
**And** connection status shows "Connecting..." → "Connected" (no "Retrying..." state)
**And** console shows single connection attempt, not multiple

**Investigation Areas:**
- `room.connect()` timeout configuration
- Token fetch timing / race condition with connection
- LiveKit server URL resolution
- WebSocket connection establishment
- Signal server handshake timing

**Prerequisites:** Story 2.3 (Room Joining)

**Technical Notes:**
- Check `RoomOptions.connectOptions` timeout values
- Review token generation timing vs connection initiation
- Inspect network tab for failed WebSocket attempts
- Compare browser vs desktop client connection flow
- May need to add connection state logging for diagnosis

---
