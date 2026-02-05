# Epic 6: Connection Resilience

**Goal:** Make meetings robust against network issues - automatic reconnection, state preservation, and graceful degradation so users stay productive even on unstable connections.

**User Value:** After this epic, meetings survive network blips, annotation state is preserved, and users get clear feedback about connection status.

**FRs Addressed:** FR42, FR43, FR44, FR45, FR46

---

## Story 6.1: Implement Connection State Management

**As a** developer,
**I want** a centralized connection state system,
**So that** the application can respond appropriately to network changes.

**Acceptance Criteria:**

**Given** the application is running
**When** network conditions change
**Then** connection state is tracked and exposed to the UI

**And** connection states include:
```typescript
type ConnectionState =
  | 'connecting'     // Initial connection in progress
  | 'connected'      // Fully connected and operational
  | 'reconnecting'   // Lost connection, attempting to restore
  | 'disconnected'   // Connection lost, not attempting reconnect
  | 'failed';        // Reconnection attempts exhausted
```

**And** the state includes metadata:
```typescript
interface ConnectionInfo {
  state: ConnectionState;
  latency: number | null;        // RTT in ms when connected
  reconnectAttempt: number;      // Current attempt count
  lastConnected: number | null;  // Timestamp of last successful connection
}
```

**And** state changes trigger events/subscriptions for UI updates

**Prerequisites:** Story 2.6

**Technical Notes:**
- Extend roomStore with connection state
- Listen to LiveKit Room connection events
- Measure latency via periodic ping (DataTrack round-trip)
- Expose via useConnectionState() hook

---

## Story 6.2: Display Connection Status Indicator

**As a** user,
**I want** to see my connection status clearly,
**So that** I know if there are network issues affecting my meeting.

**Acceptance Criteria:**

**Given** I'm in a meeting
**When** I look at the toolbar area
**Then** I see a connection status indicator

**And** the indicator shows per UX spec:
| State | Appearance |
|-------|------------|
| Connected | Green dot + "Connected" (can show latency: "23ms") |
| Reconnecting | Amber dot (animated) + "Reconnecting..." |
| Disconnected | Red dot + "Disconnected" + Retry button |

**And** in Focus Mode:
  - Only the colored dot shows (minimal)
  - Full text appears on hover

**And** clicking the indicator shows connection details:
  - Current latency
  - Connection duration
  - Network quality estimate

**Prerequisites:** Story 6.1, 2.5

**Technical Notes:**
- Implement ConnectionStatus component per UX spec Section 6
- Use `aria-live="polite"` for screen reader announcements
- Pulse animation on reconnecting state (respects prefers-reduced-motion)
- Position: top-right of toolbar area

---

## Story 6.3: Implement Automatic Reconnection

**As a** user,
**I want** to automatically reconnect after brief network interruptions,
**So that** I don't have to manually rejoin after a WiFi blip.

**Acceptance Criteria:**

**Given** I'm in a meeting and my network drops briefly
**When** the connection is lost
**Then** the application automatically attempts to reconnect

**And** reconnection behavior:
  - First retry: immediate
  - Subsequent retries: exponential backoff (1s, 2s, 4s, 8s, 16s max)
  - Maximum attempts: 10 (then stops and shows manual retry)
  - Status updates shown during each attempt

**And** on successful reconnection:
  - Toast: "Reconnected"
  - Resume receiving updates from room
  - Re-sync annotation state (if needed)

**And** during reconnection:
  - UI remains functional (can view cached state)
  - Drawing is disabled (queued locally if attempted)
  - Other participants see me as "reconnecting"

**Prerequisites:** Story 6.1, 6.2

**Technical Notes:**
- LiveKit handles most reconnection logic
- Configure `Room.connect()` with reconnect options
- Listen to `RoomEvent.Reconnecting`, `RoomEvent.Reconnected`
- Extend with custom retry logic if LiveKit's is insufficient

---

## Story 6.4: Preserve Annotation State During Reconnection

**As a** user,
**I want** my annotation state preserved during network issues,
**So that** I don't lose context when reconnection completes.

**Acceptance Criteria:**

**Given** I was viewing annotations before disconnect
**When** I reconnect to the meeting
**Then** I see the current annotation state (not stale state)

**And** state preservation behavior:
  - Local strokes from before disconnect are retained
  - On reconnect, request state sync from peers
  - Merge received state with local state
  - Resolve conflicts (remote wins for remote strokes, local wins for own strokes)

**And** if I was mid-stroke when disconnected:
  - Incomplete stroke is discarded
  - No phantom strokes appear for others

**And** strokes drawn by others during my disconnect:
  - Are received via state sync
  - Appear immediately on my canvas

**Prerequisites:** Story 6.3, 4.8

**Technical Notes:**
- Reuse late-joiner sync mechanism (state_request/state_snapshot)
- Add timestamp to strokes for conflict resolution
- Queue any local actions during disconnect, replay on reconnect
- Clear in-progress stroke on disconnect

---

## Story 6.5: Queue Local Actions During Offline

**As a** user,
**I want** my actions queued when offline,
**So that** they're applied when I reconnect (if still valid).

**Acceptance Criteria:**

**Given** I'm disconnected but UI is still showing
**When** I attempt to draw or interact
**Then** actions are queued locally

**And** queue behavior:
  - Drawing attempts: queued with timestamp
  - Tool changes: applied locally, no queue needed
  - Eraser actions: queued (may fail if stroke deleted by others)

**And** on reconnect:
  - Sync state first
  - Replay queued strokes (if screen share still active)
  - Discard queued actions if context changed (e.g., screen share ended)
  - Show toast if actions were discarded: "Some actions couldn't be applied"

**And** visual feedback during offline:
  - Drawing still works locally (optimistic)
  - Strokes appear with "pending" indicator (subtle)
  - Clear feedback that sync will happen on reconnect

**Prerequisites:** Story 6.4

**Technical Notes:**
- Create action queue in annotationStore
- Queue structure: `{ type, payload, timestamp, localStrokeId }`
- Max queue size: 100 actions (prevent memory issues)
- Replay queue in order after state sync

---

## Story 6.6: Implement Graceful Degradation

**As a** user,
**I want** the meeting to remain usable during poor network conditions,
**So that** I can continue participating even with limited connectivity.

**Acceptance Criteria:**

**Given** network quality degrades (high latency, packet loss)
**When** connection becomes unstable
**Then** the application adapts gracefully

**And** degradation levels:

| Quality | Latency | Behavior |
|---------|---------|----------|
| Good | < 100ms | Full functionality |
| Fair | 100-300ms | Reduce video quality, show warning |
| Poor | 300-1000ms | Pause video, audio-only, annotation continues |
| Critical | > 1000ms | Show "unstable connection" warning, queue actions |

**And** quality indicator:
  - Subtle icon change on connection indicator
  - Tooltip shows current quality level
  - No disruptive alerts for temporary dips

**And** automatic recovery:
  - Quality improves → restore full functionality
  - No manual intervention needed

**Prerequisites:** Story 6.2, 6.3

**Technical Notes:**
- Use LiveKit's connection quality events
- Implement quality estimation via latency + packet loss
- Configure adaptive bitrate in LiveKit room options
- Debounce quality changes (don't flicker)

---

## Story 6.7: Handle Disconnection Notifications

**As a** user,
**I want** clear notifications about connection events,
**So that** I understand what's happening with my meeting.

**Acceptance Criteria:**

**Given** connection events occur
**When** the event happens
**Then** appropriate notification is shown

**And** notification types:
| Event | Notification |
|-------|--------------|
| Connection lost | Toast (warning): "Connection lost. Reconnecting..." |
| Reconnect success | Toast (success): "Reconnected" |
| Reconnect failed | Modal: "Unable to reconnect. [Retry] [Leave]" |
| Peer disconnect | Toast (info): "{name} disconnected" |
| Peer reconnect | Toast (info): "{name} reconnected" |

**And** notification behavior:
  - Don't spam notifications for rapid connect/disconnect
  - Debounce peer status changes (2 second window)
  - Critical notifications (failed) require user action

**And** audio feedback:
  - Subtle chime on reconnect success (respects system sound settings)
  - No sound on warning/errors (not alarming)

**Prerequisites:** Story 6.2, 6.3

**Technical Notes:**
- Use toast system from UX spec
- Modal for critical failures (can't auto-dismiss)
- Track peer connection state in roomStore
- Debounce notifications with timestamps

---
