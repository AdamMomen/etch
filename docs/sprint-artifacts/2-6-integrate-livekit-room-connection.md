# Story 2.6: Integrate LiveKit Room Connection

Status: done

## Story

As a **user**,
I want **to connect to the meeting room via LiveKit**,
So that **I can communicate with other participants in real-time**.

## Acceptance Criteria

1. **AC-2.6.1: LiveKit Connection with Token**
   - Given I have a valid LiveKit token from the join API
   - When I enter the meeting room
   - Then the client connects to LiveKit using the token and livekitUrl

2. **AC-2.6.2: Connection Success Indicator**
   - Given I successfully connect to LiveKit
   - When the connection is established
   - Then the connection status indicator shows green dot with "Connected"
   - And my participant appears in the participant list with role and color

3. **AC-2.6.3: Remote Participant Display**
   - Given I am connected to the room
   - When other participants are already in the room
   - Then they appear in the participant list within 2 seconds
   - And their name, role badge, and avatar color are displayed correctly

4. **AC-2.6.4: Participant Join Notification**
   - Given I am in a meeting
   - When another participant joins
   - Then they appear in the participant list within 2 seconds
   - And a subtle toast shows "{name} joined"

5. **AC-2.6.5: Participant Leave Notification**
   - Given I am in a meeting with other participants
   - When a participant leaves
   - Then they are removed from the participant list
   - And a subtle toast shows "{name} left"

6. **AC-2.6.6: Connection Failure Handling**
   - Given I attempt to connect to LiveKit
   - When the connection fails (invalid token, network error, etc.)
   - Then the status indicator shows red dot with "Disconnected"
   - And an error toast appears with "Failed to connect" and retry option

7. **AC-2.6.7: Participant Metadata Extraction**
   - Given a participant joins the room
   - When their LiveKit participant object is received
   - Then their role and color are extracted from token metadata
   - And stored in roomStore for UI rendering

## Tasks / Subtasks

- [x] **Task 1: Install LiveKit dependencies** (AC: 2.6.1)
  - [x] Add `livekit-client` package to client
  - [x] Add `@livekit/components-react` package for hooks (optional, can use direct SDK) - Skipped, using direct SDK
  - [x] Verify TypeScript types are available

- [x] **Task 2: Create useLiveKit hook** (AC: 2.6.1, 2.6.2, 2.6.6)
  - [x] Create `packages/client/src/hooks/useLiveKit.ts`
  - [x] Implement room connection with token and URL
  - [x] Return connection state (connecting, connected, disconnected, failed)
  - [x] Handle connection errors with appropriate error types
  - [x] Clean up room connection on unmount

- [x] **Task 3: Extend roomStore for LiveKit integration** (AC: 2.6.2, 2.6.3, 2.6.7)
  - [x] Add `isConnecting`, `isConnected`, `error` state fields
  - [x] Add `liveKitRoom` reference (Room instance or null) - Managed by hook, not store
  - [x] Add action `setConnectionState(state: ConnectionState)`
  - [x] Add action `setLocalParticipant(participant: Participant)`
  - [x] Add action `addRemoteParticipant(participant: Participant)`
  - [x] Add action `removeRemoteParticipant(participantId: string)`
  - [x] Add action `updateParticipant(participantId: string, updates: Partial<Participant>)`

- [x] **Task 4: Implement participant metadata parsing** (AC: 2.6.7)
  - [x] Create utility function `parseParticipantMetadata(metadata: string): { role: Role; color: string }`
  - [x] Extract participant info from LiveKit Participant object (identity, name, metadata)
  - [x] Convert to roomStore Participant type
  - [x] Handle malformed metadata gracefully (fallback defaults)

- [x] **Task 5: Connect to LiveKit on room entry** (AC: 2.6.1, 2.6.2)
  - [x] Update MeetingRoom component to use useLiveKit hook
  - [x] Pass token and livekitUrl from roomStore.currentRoom
  - [x] Set local participant in roomStore on connection
  - [x] Update connection status indicator (replace placeholder)

- [x] **Task 6: Subscribe to LiveKit room events** (AC: 2.6.3, 2.6.4, 2.6.5)
  - [x] Listen to `RoomEvent.ParticipantConnected`
  - [x] Listen to `RoomEvent.ParticipantDisconnected`
  - [x] Listen to `RoomEvent.Connected` and `RoomEvent.Disconnected`
  - [x] Update roomStore participants on events
  - [x] Show toast notifications for join/leave

- [x] **Task 7: Update connection status indicator** (AC: 2.6.2, 2.6.6)
  - [x] Replace static "Connected" text with dynamic state
  - [x] Show green dot + "Connected" on success
  - [x] Show red dot + "Disconnected" on failure
  - [x] Show amber dot (animated) + "Connecting..." during connection
  - [x] Add retry button on failure state

- [x] **Task 8: Update participant list with remote participants** (AC: 2.6.3)
  - [x] Display remote participants from roomStore
  - [x] Update Sidebar to show both local and remote participants
  - [x] Sort participants: host first, then by join order
  - [x] Update participant count badge

- [x] **Task 9: Write tests for LiveKit integration** (AC: all)
  - [x] Create MockLiveKitRoom for testing - Used vi.mock instead
  - [x] Test useLiveKit hook connection lifecycle - Covered by integration tests
  - [x] Test roomStore participant management actions
  - [x] Test participant metadata parsing utility
  - [x] Test connection status indicator states
  - [x] Test toast notifications on join/leave - Covered by MeetingRoom tests

## Dev Notes

### Learnings from Previous Story

**From Story 2.5 (Status: done)**

- **MeetingRoom Layout**: Full layout implementation available at `packages/client/src/components/MeetingRoom/MeetingRoom.tsx`
- **Sidebar Component**: `Sidebar.tsx` accepts `participants: Participant[]` prop - ready for remote participants
- **Connection Status Placeholder**: Currently shows static "Connected" - replace with dynamic state
- **roomStore Available**: `useRoomStore` with `currentRoom` containing `roomId`, `token`, `livekitUrl`
- **settingsStore Available**: Has `displayName` for local participant name
- **Toast Pattern**: Use `sonner` toast for notifications

[Source: docs/sprint-artifacts/2-5-create-meeting-room-layout-shell.md#File-List]

### LiveKit SDK Usage

```typescript
// packages/client/src/hooks/useLiveKit.ts
import { Room, RoomEvent, ConnectionState } from 'livekit-client';

export function useLiveKit(token: string | null, livekitUrl: string | null) {
  const [room] = useState(() => new Room());
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected);

  useEffect(() => {
    if (!token || !livekitUrl) return;

    const connect = async () => {
      try {
        await room.connect(livekitUrl, token);
      } catch (error) {
        console.error('Failed to connect to LiveKit:', error);
      }
    };

    room.on(RoomEvent.ConnectionStateChanged, setConnectionState);
    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);

    connect();

    return () => {
      room.disconnect();
    };
  }, [token, livekitUrl]);

  return { room, connectionState };
}
```

### Participant Metadata Structure

```typescript
// Token metadata set by server in Story 2.1/2.2
interface ParticipantMetadata {
  role: 'host' | 'annotator' | 'viewer';
  color: string;  // e.g., '#f97316'
}

// Parse from LiveKit Participant
function parseParticipantMetadata(metadata: string): ParticipantMetadata {
  try {
    return JSON.parse(metadata);
  } catch {
    return { role: 'annotator', color: '#f97316' };  // defaults
  }
}
```

### LiveKit Room Events

Key events to handle:
- `RoomEvent.Connected` - Connection established
- `RoomEvent.Disconnected` - Connection lost
- `RoomEvent.ParticipantConnected` - Remote participant joined
- `RoomEvent.ParticipantDisconnected` - Remote participant left
- `RoomEvent.ConnectionStateChanged` - State changes (for UI indicator)

### Environment Configuration

Ensure `.env` has LiveKit URL configured:
```
VITE_API_URL=http://localhost:3000/api
```

LiveKit URL comes from server response, not client env.

### Dependencies

New packages to add:
- `livekit-client` - LiveKit WebRTC client
- `@livekit/components-react` - Optional React hooks (can use direct SDK)

### Test Mocking Strategy

Create `MockLiveKitRoom` class:
```typescript
// packages/client/src/test/mocks/MockLiveKitRoom.ts
class MockLiveKitRoom {
  private listeners = new Map<string, Function[]>();

  on(event: string, callback: Function) {
    const handlers = this.listeners.get(event) || [];
    handlers.push(callback);
    this.listeners.set(event, handlers);
  }

  emit(event: string, ...args: any[]) {
    const handlers = this.listeners.get(event) || [];
    handlers.forEach(h => h(...args));
  }

  connect() { return Promise.resolve(); }
  disconnect() {}
}
```

### References

- [Tech Spec: AC-2.6](docs/sprint-artifacts/tech-spec-epic-2.md#AC-2.6)
- [Epics: Story 2.6](docs/epics.md#Story-2.6)
- [Architecture: LiveKit Integration](docs/architecture.md#Integration-Points)
- [Architecture: Message Protocol](docs/architecture.md#Message-Protocol)
- [Story 2.5 Implementation](docs/sprint-artifacts/2-5-create-meeting-room-layout-shell.md)

---

## Dev Agent Record

### Context Reference

- [Story Context XML](./2-6-integrate-livekit-room-connection.context.xml)

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes List

- Installed `livekit-client` v2.16.0 (TypeScript types bundled)
- Skipped `@livekit/components-react` - direct SDK provides more control
- Created `useLiveKit` hook with full connection lifecycle management
- Extended `roomStore` with connection state and participant management
- Created `ConnectionStatusIndicator` component with 3 states (connected, connecting, disconnected)
- Created `parseParticipantMetadata` utility with fallback defaults
- Updated `MeetingRoom` to use LiveKit integration
- Updated `Sidebar` to use shared `Participant` type
- All 128 tests pass (38 new tests added for this story)
- TypeScript compilation passes
- No breaking changes to existing functionality

### File List

**New Files:**
- `packages/client/src/hooks/useLiveKit.ts` - LiveKit connection hook
- `packages/client/src/utils/participantMetadata.ts` - Metadata parsing utility
- `packages/client/src/utils/participantMetadata.test.ts` - Metadata tests (14 tests)
- `packages/client/src/stores/roomStore.test.ts` - Store tests (17 tests)
- `packages/client/src/components/MeetingRoom/ConnectionStatusIndicator.tsx` - Status indicator component
- `packages/client/src/components/MeetingRoom/ConnectionStatusIndicator.test.tsx` - Status indicator tests (7 tests)

**Modified Files:**
- `packages/client/package.json` - Added livekit-client dependency
- `packages/client/src/stores/roomStore.ts` - Extended with connection/participant state
- `packages/client/src/components/MeetingRoom/MeetingRoom.tsx` - LiveKit integration
- `packages/client/src/components/MeetingRoom/MeetingRoom.test.tsx` - Updated tests (30 tests)
- `packages/client/src/components/MeetingRoom/Sidebar.tsx` - Use shared Participant type
- `pnpm-lock.yaml` - Updated dependencies

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-01 | Initial story draft from create-story workflow | SM Agent |
| 2025-12-01 | Story context generated, status updated to ready-for-dev | SM Agent |
| 2025-12-01 | Story implementation completed | Dev Agent |
