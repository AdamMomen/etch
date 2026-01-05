# Epic Technical Specification: Basic Meeting Experience

Date: 2025-11-30
Author: BMad
Epic ID: 2
Status: Draft

---

## Overview

Epic 2 delivers the core video conferencing functionality for Etch - enabling users to create and join meeting rooms with real-time audio/video communication. This epic establishes the fundamental meeting infrastructure that all subsequent features (screen sharing, annotations, permissions) will build upon.

This epic implements the meeting room lifecycle: room creation with unique IDs and shareable links, participant joining with token-based authentication, audio/video publishing and subscription via LiveKit, device selection, participant management, and user preferences persistence. Upon completion, users will be able to hold functional video meetings with up to 10 participants.

**Key Differentiator:** Unlike Epic 3-4 (screen sharing and annotations), Epic 2 focuses on standard video conferencing patterns using LiveKit as the WebRTC SFU. The novel annotation architecture comes later.

[Source: docs/prd.md#Meeting-Room-Management, docs/epics.md#Epic-2]

## Objectives and Scope

### In Scope

**Server-Side (packages/server):**
- Room creation API endpoint (`POST /api/rooms`) with unique room ID generation
- Room join API endpoint (`POST /api/rooms/:id/join`) with participant token generation
- LiveKit JWT token generation with participant metadata (role, color)
- Room lifecycle management (in-memory storage for MVP)
- Error handling and validation with Zod

**Client-Side (packages/client):**
- Home screen UI with "Start Meeting" and "Join Meeting" flows
- Join meeting dialog with display name input
- Meeting room layout shell (sidebar + canvas + controls)
- LiveKit room connection integration
- Audio publishing and mute/unmute controls
- Video publishing and camera on/off controls
- Remote participant audio/video stream display
- Device selection for microphone and camera
- Participant volume control (local mix)
- Leave meeting flow with confirmation for hosts
- Room invite link generation and sharing
- User preferences storage (localStorage)

**Shared Types (packages/shared):**
- API request/response types already defined in Epic 1
- Room state types already defined in Epic 1

### Out of Scope

- Screen sharing (Epic 3)
- Annotation system (Epic 4)
- Role-based permissions beyond basic host/participant (Epic 5)
- Connection resilience and reconnection logic (Epic 6)
- Docker deployment configuration (Epic 7)
- Persistent database storage (MVP uses in-memory)
- Web client or mobile clients
- Recording capabilities
- Chat functionality (post-MVP)

[Source: docs/epics.md#Epic-2, docs/prd.md#Product-Scope]

## System Architecture Alignment

This epic implements the meeting infrastructure layer of the Etch architecture:

**Components Being Built:**

| Component | Package | Purpose |
|-----------|---------|---------|
| Room Routes | `server/src/routes/rooms.ts` | REST API for room creation/joining |
| LiveKit Service | `server/src/services/livekit.ts` | Token generation with livekit-server-sdk |
| Room Store | `client/src/stores/roomStore.ts` | Zustand store for room/participant state |
| Settings Store | `client/src/stores/settingsStore.ts` | Zustand store with localStorage persist |
| LiveKit Hook | `client/src/hooks/useLiveKit.ts` | Room connection and track management |
| API Client | `client/src/lib/api.ts` | HTTP client for server communication |

**Architecture Decisions Applied:**
- **ADR-002**: LiveKit DataTracks for future annotation sync (connection established here)
- **ADR-004**: Zustand for state management
- **ADR-005**: No persistent database - in-memory room storage

**Integration Points:**
- LiveKit Server: WebRTC SFU for media transport
- LiveKit Client SDK: `livekit-client` for room connection
- LiveKit React Components: `@livekit/components-react` for hooks

[Source: docs/architecture.md#Technology-Stack-Details, docs/architecture.md#Integration-Points]

## Detailed Design

### Services and Modules

| Module | Responsibility | Inputs | Outputs | Owner |
|--------|---------------|--------|---------|-------|
| `routes/rooms.ts` | HTTP handlers for room CRUD | HTTP requests | JSON responses | Backend |
| `services/livekit.ts` | LiveKit token generation | Participant info | JWT tokens | Backend |
| `stores/roomStore.ts` | Room and participant state | LiveKit events | React state | Frontend |
| `stores/settingsStore.ts` | User preferences | User input | Persisted settings | Frontend |
| `hooks/useLiveKit.ts` | LiveKit connection lifecycle | Token, URL | Room instance | Frontend |
| `lib/api.ts` | Server API communication | Request params | Response data | Frontend |
| `components/MeetingRoom/` | Meeting UI components | Props | React elements | Frontend |

### Data Models and Contracts

**Room Management (Server-Side, In-Memory):**

```typescript
// server/src/services/roomStore.ts (new file for Epic 2)
interface RoomRecord {
  id: string;                    // Format: xxx-xxx-xxx (lowercase + numbers)
  createdAt: number;             // Unix timestamp
  hostId: string;                // Participant ID of room creator
  participants: Map<string, ParticipantRecord>;
}

interface ParticipantRecord {
  id: string;                    // UUID
  name: string;
  role: Role;                    // 'host' | 'annotator' | 'viewer'
  color: string;                 // From PARTICIPANT_COLORS
  joinedAt: number;
}

// In-memory storage
const rooms = new Map<string, RoomRecord>();
```

**Client-Side State:**

```typescript
// client/src/stores/roomStore.ts
interface RoomState {
  // Room info
  roomId: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;

  // Local participant
  localParticipant: Participant | null;
  isMuted: boolean;
  isVideoEnabled: boolean;

  // Remote participants
  participants: Participant[];

  // Actions
  setRoom: (roomId: string) => void;
  setConnected: (connected: boolean) => void;
  setLocalParticipant: (participant: Participant) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (participantId: string) => void;
  updateParticipant: (participantId: string, updates: Partial<Participant>) => void;
  setMuted: (muted: boolean) => void;
  setVideoEnabled: (enabled: boolean) => void;
  reset: () => void;
}

// client/src/stores/settingsStore.ts
interface SettingsState {
  displayName: string;
  preferredMicrophoneId: string | null;
  preferredCameraId: string | null;
  sidebarCollapsed: boolean;
  theme: 'dark' | 'light';
  recentRooms: RecentRoom[];

  setDisplayName: (name: string) => void;
  setPreferredMicrophone: (deviceId: string) => void;
  setPreferredCamera: (deviceId: string) => void;
  toggleSidebar: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
  addRecentRoom: (room: RecentRoom) => void;
}

interface RecentRoom {
  roomId: string;
  name: string;
  lastJoined: number;
  serverUrl: string;
}
```

[Source: docs/architecture.md#Data-Architecture, packages/shared/src/index.ts]

### APIs and Interfaces

**POST /api/rooms** - Create new room

Request:
```typescript
interface CreateRoomRequest {
  hostName: string;  // 1-50 characters
}
```

Response (201 Created):
```typescript
interface CreateRoomResponse {
  roomId: string;      // Format: xxx-xxx-xxx
  token: string;       // LiveKit JWT
  livekitUrl: string;  // WebSocket URL
}
```

Errors:
| Status | Code | Message |
|--------|------|---------|
| 400 | VALIDATION_ERROR | "hostName is required" |
| 400 | VALIDATION_ERROR | "hostName must be 1-50 characters" |
| 500 | ROOM_CREATE_FAILED | "Failed to create room" |

---

**POST /api/rooms/:roomId/join** - Join existing room

Request:
```typescript
interface JoinRoomRequest {
  participantName: string;  // 1-50 characters
  role?: Role;              // Optional, defaults to 'annotator'
}
```

Response (200 OK):
```typescript
interface JoinRoomResponse {
  token: string;       // LiveKit JWT
  livekitUrl: string;  // WebSocket URL
}
```

Errors:
| Status | Code | Message |
|--------|------|---------|
| 400 | VALIDATION_ERROR | "participantName is required" |
| 404 | ROOM_NOT_FOUND | "The requested room does not exist or has ended" |
| 500 | JOIN_FAILED | "Failed to join room" |

---

**LiveKit JWT Token Structure:**

```typescript
{
  sub: string;           // Participant ID (UUID)
  video: {
    room: string;        // Room ID
    roomJoin: true;
    canPublish: true;
    canSubscribe: true;
    canPublishData: true;
  };
  name: string;          // Display name
  metadata: string;      // JSON: { role, color }
  exp: number;           // Expiry (1 hour)
  iat: number;           // Issued at
}
```

[Source: docs/architecture.md#API-Contracts, docs/epics.md#Story-2.1, docs/epics.md#Story-2.2]

### Workflows and Sequencing

**Room Creation Flow:**

```
User                    Client                   Server                 LiveKit
 |                        |                        |                      |
 |--Click "Start Meeting"->|                       |                      |
 |                        |--POST /api/rooms------>|                      |
 |                        |                        |--Generate Room ID--->|
 |                        |                        |--Create JWT Token--->|
 |                        |<--{roomId, token, url}-|                      |
 |                        |--room.connect(url,token)---------------------->|
 |                        |<-----------------Connection Established--------|
 |<--Show Meeting Room----|                        |                      |
```

**Room Join Flow:**

```
User                    Client                   Server                 LiveKit
 |                        |                        |                      |
 |--Click Invite Link---->|                       |                      |
 |                        |--Show Join Dialog----->|                      |
 |--Enter Name, Click Join|                       |                      |
 |                        |--POST /api/rooms/:id/join-->|                 |
 |                        |                        |--Validate Room------>|
 |                        |                        |--Create JWT Token--->|
 |                        |<--{token, url}---------|                      |
 |                        |--room.connect(url,token)---------------------->|
 |                        |<-----------------Connection Established--------|
 |<--Show Meeting Room----|                        |                      |
```

**Audio/Video Publishing Flow:**

```
User                    Client                   LiveKit
 |                        |                        |
 |--Click Mic Button----->|                       |
 |                        |--Request Mic Permission (if needed)
 |                        |--room.localParticipant.setMicrophoneEnabled(true)-->|
 |                        |<--Track Published------|
 |<--Update UI (mic on)---|                        |
 |                        |                        |--Broadcast to room--->
```

[Source: docs/architecture.md#Integration-Points]

## Non-Functional Requirements

### Performance

| Metric | Target | Strategy |
|--------|--------|----------|
| Room creation | < 1s | Simple ID generation, in-memory storage |
| Room join | < 5s to first frame | Direct LiveKit connection |
| Mic/camera toggle | < 100ms visual feedback | Optimistic UI update |
| Participant list update | < 2s after join/leave | LiveKit event-driven |
| Device enumeration | < 500ms | Cached after first load |

**LiveKit Performance (inherited):**
- Video latency: < 500ms (standard WebRTC)
- Audio latency: < 150ms
- Adaptive bitrate based on network conditions

[Source: docs/prd.md#Performance]

### Security

**Token Security:**
- JWT tokens signed with LIVEKIT_API_SECRET (env var)
- 1-hour expiry to limit exposure
- Tokens scoped to specific room only
- No token reuse across rooms

**Transport Security:**
- All WebRTC traffic encrypted (DTLS-SRTP)
- API calls over HTTPS in production
- WebSocket signaling over WSS

**Data Handling:**
- No meeting content persisted server-side
- Room records deleted when empty
- Display names not validated against external systems

**Input Validation:**
- All API inputs validated with Zod schemas
- Room ID format validated before lookup
- Display name length restricted (1-50 chars)

[Source: docs/prd.md#Security, docs/architecture.md#Security-Architecture]

### Reliability/Availability

| Metric | Target |
|--------|--------|
| Room creation success | > 99% |
| Join success (valid room) | > 95% |
| Media track publish success | > 95% |

**Failure Handling:**
- Invalid room ID → Clear error message, link to create new room
- LiveKit connection failure → Retry with exponential backoff (handled by LiveKit SDK)
- Device permission denied → Clear message with settings link

**Note:** Advanced reconnection logic (Epic 6) is out of scope. Basic LiveKit reconnection is included.

[Source: docs/prd.md#Reliability]

### Observability

**Server Logging:**
```typescript
// Structured JSON logs
{
  level: 'info' | 'warn' | 'error',
  timestamp: string,
  message: string,
  roomId?: string,
  participantId?: string,
  error?: string
}
```

**Key Events to Log:**
- Room created (info)
- Participant joined (info)
- Participant left (info)
- Room deleted (info)
- Token generation failed (error)
- Validation errors (warn)

**Client Logging:**
- Console logging in development
- Error events captured for debugging
- No production telemetry (per privacy requirements)

[Source: docs/architecture.md#Observability]

## Dependencies and Integrations

### Core Dependencies (Server)

| Package | Version | Purpose |
|---------|---------|---------|
| `hono` | ^4.x | HTTP framework |
| `@hono/node-server` | ^1.x | Node.js adapter |
| `@hono/zod-validator` | ^0.x | Request validation |
| `livekit-server-sdk` | ^2.x | Token generation |
| `zod` | ^3.x | Schema validation |
| `nanoid` | ^5.x | Room ID generation |

### Core Dependencies (Client)

| Package | Version | Purpose |
|---------|---------|---------|
| `livekit-client` | ^2.x | WebRTC client |
| `@livekit/components-react` | ^2.x | React hooks/components |
| `zustand` | ^5.x | State management |
| `react-router-dom` | ^6.x | Navigation (if not using Tauri routing) |

### Environment Variables

```bash
# Server
LIVEKIT_URL=ws://localhost:7880        # LiveKit WebSocket URL
LIVEKIT_API_KEY=devkey                 # LiveKit API key
LIVEKIT_API_SECRET=secret              # LiveKit API secret
PORT=3000                              # Server port

# Client (build-time)
VITE_API_URL=http://localhost:3000/api # API base URL
```

### Integration Points

| Integration | SDK | Events to Handle |
|-------------|-----|------------------|
| LiveKit Server | `livekit-server-sdk` | Token generation only |
| LiveKit Client | `livekit-client` | RoomEvent.* (Connected, Disconnected, ParticipantConnected, ParticipantDisconnected, TrackSubscribed, TrackUnsubscribed) |

[Source: docs/architecture.md#Dependencies-and-Integrations, package.json]

## Acceptance Criteria (Authoritative)

### AC-2.1: Room Creation API
- `POST /api/rooms` with `{ hostName: "BMad" }` returns 201 with `{ roomId, token, livekitUrl }`
- Room ID is unique, URL-safe, format `xxx-xxx-xxx`
- Token is valid LiveKit JWT with host role and assigned color
- Invalid/missing hostName returns 400 with structured error

### AC-2.2: Room Join API
- `POST /api/rooms/:id/join` with `{ participantName: "Alice" }` returns 200 with `{ token, livekitUrl }`
- Token has annotator role by default, unique color
- Non-existent room returns 404 with `ROOM_NOT_FOUND` error
- Invalid participantName returns 400 with validation error

### AC-2.3: Home Screen UI
- Home screen shows "Start Meeting" button and room code input
- "Start Meeting" creates room and navigates to meeting view
- Room code input accepts full URLs or just room ID
- Join button enabled only when input has value

### AC-2.4: Join Meeting Flow
- Clicking join shows name input dialog
- Name pre-filled from localStorage if available
- Name saved to localStorage after successful join
- Error toast shown on join failure

### AC-2.5: Meeting Room Layout
- Left sidebar shows participants with role badges
- Center area for video/screen content
- Bottom bar with mic, camera, share, leave controls
- Sidebar toggleable with `⌘\` (Ctrl+\)

### AC-2.6: LiveKit Room Connection
- Client connects to LiveKit using token from API
- Connection status shown (Connected/Disconnected)
- Participant events trigger UI updates
- Join/leave toasts shown for other participants

### AC-2.7: Audio Publishing
- Clicking mic button requests permission and publishes audio
- Mic button shows muted/unmuted state
- `M` keyboard shortcut toggles mute
- Permission denied shows helpful error toast

### AC-2.8: Video Publishing
- Clicking camera button requests permission and publishes video
- Camera button shows on/off state
- `V` keyboard shortcut toggles video
- Video off shows avatar placeholder

### AC-2.9: Remote Streams
- Remote participant audio plays automatically
- Remote participant video displays in UI
- Video grid layout for multiple participants
- Speaking indicator on active audio

### AC-2.10: Device Selection
- Dropdown on mic/camera buttons shows available devices
- Selecting device switches immediately
- Device preference persisted for future sessions
- Disconnected device triggers fallback with notification

### AC-2.11: Volume Control
- Hovering participant shows volume slider
- Slider adjusts local playback volume (0-200%)
- Volume changes are instant
- Settings persist for session

### AC-2.12: Leave Meeting
- "Leave" button disconnects and returns to home
- Host leaving shows confirmation dialog
- Host role transfers to next participant
- Closing window triggers leave flow

### AC-2.13: Invite Link
- "Invite" button/shortcut shows modal with room link
- "Copy Link" copies to clipboard with toast confirmation
- Link format: `etch://room/{roomId}` or configurable

### AC-2.14: User Preferences
- Display name persisted across sessions
- Device preferences persisted
- Sidebar state persisted
- Preferences clearable from settings

[Source: docs/epics.md#Epic-2, docs/prd.md#Functional-Requirements]

## Traceability Mapping

| AC | Spec Section | Component(s) | Test Ideas |
|----|--------------|--------------|------------|
| AC-2.1 | APIs - POST /api/rooms | `routes/rooms.ts`, `services/livekit.ts` | Unit: token generation, Integration: create room flow |
| AC-2.2 | APIs - POST /api/rooms/:id/join | `routes/rooms.ts`, `services/livekit.ts` | Unit: validation, Integration: join flow |
| AC-2.3 | Workflows - Creation | `components/HomeScreen` | Component: button states, Integration: create + navigate |
| AC-2.4 | Workflows - Join | `components/JoinDialog` | Component: form validation, Integration: join flow |
| AC-2.5 | Data Models - RoomState | `components/MeetingRoom`, `stores/roomStore` | Component: layout render, Store: state updates |
| AC-2.6 | Workflows - Connection | `hooks/useLiveKit`, `stores/roomStore` | Hook: connection lifecycle, Integration: full flow |
| AC-2.7 | NFR - Performance | `hooks/useLiveKit` | Integration: mic toggle, timing measurements |
| AC-2.8 | NFR - Performance | `hooks/useLiveKit` | Integration: camera toggle, timing measurements |
| AC-2.9 | Data Models - Participant | `components/ParticipantVideo` | Component: stream rendering |
| AC-2.10 | Dependencies - MediaDevices | `hooks/useDevices` | Hook: device enumeration, switching |
| AC-2.11 | Data Models - Settings | `components/VolumeControl` | Component: slider interaction |
| AC-2.12 | Workflows - Leave | `components/MeetingControls` | Component: leave flow, Integration: disconnect |
| AC-2.13 | APIs - Room | `components/InviteModal` | Component: clipboard copy |
| AC-2.14 | Data Models - Settings | `stores/settingsStore` | Store: persistence, hydration |

## Risks, Assumptions, Open Questions

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| LiveKit SDK breaking changes | Low | Medium | Pin exact version, monitor releases |
| WebRTC compatibility issues | Medium | High | Test on multiple browsers/versions, use LiveKit's fallbacks |
| Permission prompts vary by OS | Medium | Low | Document expected behavior, clear error messages |
| In-memory room storage limits | Low | Medium | Rooms auto-cleanup when empty; scale concern for post-MVP |

### Assumptions

- LiveKit server is available at configured URL (either local Docker or remote)
- LIVEKIT_API_KEY and LIVEKIT_API_SECRET are correctly configured
- Users have microphone and camera hardware available
- Network allows WebRTC connections (not blocked by firewall)
- Epic 1 foundation is complete (monorepo, shared types, test framework)

### Open Questions

1. **Q**: Should room IDs be memorable words or random characters?
   **A**: Use `nanoid` with custom alphabet (lowercase + numbers, no ambiguous chars like 0/O, 1/l). Format: `xxx-xxx-xxx` (9 chars total).

2. **Q**: What happens when host leaves?
   **A**: Host role transfers to next participant by join order. If no participants remain, room is deleted.

3. **Q**: Should we validate room capacity (10 participants)?
   **A**: Yes, reject joins that would exceed MAX_PARTICIPANTS. Return 403 with `ROOM_FULL` error.

4. **Q**: How to handle duplicate display names?
   **A**: Allow duplicates - participant ID is the unique identifier. Users can use same name if they want.

## Test Strategy Summary

### Test Levels

| Level | Focus | Tools | Coverage Target |
|-------|-------|-------|-----------------|
| Unit | Services, stores, utilities | Vitest | 80% for critical paths |
| Component | React components | RTL + Vitest | Key interactions |
| Integration | API endpoints, LiveKit flow | Vitest + supertest | Happy paths + error cases |

### Key Test Scenarios

**Server Tests:**
- Room creation generates valid ID and token
- Join validates room exists
- Invalid input returns proper error codes
- Token contains correct metadata

**Client Tests:**
- roomStore state transitions
- settingsStore persistence
- Component rendering with various states
- Keyboard shortcut handling

**Integration Tests:**
- Full create room → connect flow (mocked LiveKit)
- Full join room → connect flow (mocked LiveKit)
- Leave meeting cleanup

### Test Infrastructure

**Mocks Required:**
- `MockLiveKitRoom` - Simulates room connection and events
- `MockMediaDevices` - Simulates device enumeration
- `MockLocalStorage` - For settings persistence tests

**Test Factories (from Epic 1):**
- `createMockParticipant(overrides?)` - Participant with role
- `createMockRoomState(overrides?)` - Room configuration

### Coverage Goals

- Critical paths (stores, services): 80%
- UI components: 60%
- Overall Epic 2 code: 70%

---

*Generated by BMad Method Epic Tech Context Workflow*
*Date: 2025-11-30*
