# Story 2.2: Implement Room Join API Endpoint

Status: review

## Story

As a **user**,
I want **to join an existing meeting room via a shareable link**,
So that **I can participate in meetings others have created**.

## Acceptance Criteria

1. **AC-2.2.1: Room Join Endpoint**
   - Given a room "abc-123-xyz" exists
   - When I send `POST /api/rooms/abc-123-xyz/join` with body `{ "participantName": "Alice" }`
   - Then I receive status 200 with response containing `token` and `livekitUrl`

2. **AC-2.2.2: LiveKit Token Generation for Joiner**
   - Given a successful join request
   - When I examine the returned token
   - Then it is a valid LiveKit JWT containing:
     - `identity`: unique participant ID (UUID)
     - `name`: "Alice" (the participantName)
     - `metadata`: `{ "role": "annotator", "color": "#06b6d4" }` (next available color)
     - `exp`: 1 hour from now
     - Room permissions: `roomJoin: true`, `canPublish: true`, `canSubscribe: true`, `canPublishData: true`

3. **AC-2.2.3: Color Assignment Cycling**
   - Given participants join a room sequentially
   - When a new participant joins
   - Then they are assigned the next available color from PARTICIPANT_COLORS
   - And colors cycle back to the beginning after the last color is used

4. **AC-2.2.4: Room Not Found Error**
   - Given a room "nonexistent-room" does not exist
   - When I send `POST /api/rooms/nonexistent-room/join` with valid body
   - Then I receive status 404 with error:
     ```json
     {
       "error": {
         "code": "ROOM_NOT_FOUND",
         "message": "The requested room does not exist or has ended"
       }
     }
     ```

5. **AC-2.2.5: Validation Error for participantName**
   - Given an invalid request (missing or empty participantName)
   - When I send `POST /api/rooms/:roomId/join` with body `{}`
   - Then I receive status 400 with error:
     ```json
     {
       "error": {
         "code": "VALIDATION_ERROR",
         "message": "participantName is required"
       }
     }
     ```

6. **AC-2.2.6: Participant Name Length Validation**
   - Given a participantName longer than 50 characters
   - When I send `POST /api/rooms/:roomId/join`
   - Then I receive status 400 with error code `VALIDATION_ERROR`

7. **AC-2.2.7: Participant Added to Room Store**
   - Given a room exists
   - When a participant successfully joins
   - Then they are added to the room's participants Map
   - And the participant record includes: id, name, role, color, joinedAt

## Tasks / Subtasks

- [x] **Task 1: Add JoinRoomRequest and JoinRoomResponse types** (AC: 2.2.1, 2.2.2)
  - [x] Add `JoinRoomRequest` type to `@nameless/shared` (participantName, optional role) - ALREADY EXISTS
  - [x] Add `JoinRoomResponse` type to `@nameless/shared` (token, livekitUrl) - ALREADY EXISTS
  - [x] Export new types from shared package index - ALREADY EXPORTED

- [x] **Task 2: Implement color assignment logic** (AC: 2.2.3)
  - [x] Add `getNextColor(room: RoomRecord)` function to roomStore - ALREADY EXISTS in addParticipant
  - [x] Implement cycling through PARTICIPANT_COLORS based on participant count - ALREADY EXISTS
  - [x] Add unit tests for color assignment cycling - ALREADY EXISTS in roomStore.test.ts

- [x] **Task 3: Add participant to room store** (AC: 2.2.7)
  - [x] Implement `addParticipant(roomId, participantId, name, role)` function in roomStore - ALREADY EXISTS
  - [x] Return participant with assigned color - ALREADY EXISTS
  - [x] Throw error if room not found - Returns undefined, handled in route
  - [x] Add unit tests for addParticipant - ALREADY EXISTS in roomStore.test.ts

- [x] **Task 4: Create join room API route** (AC: 2.2.1, 2.2.4, 2.2.5, 2.2.6)
  - [x] Create `POST /api/rooms/:roomId/join` handler in `packages/server/src/routes/rooms.ts`
  - [x] Define Zod schema for JoinRoomRequest: `{ participantName: z.string().min(1).max(50), role?: z.enum(['annotator', 'viewer']) }`
  - [x] Validate roomId exists in room store
  - [x] Return 404 with ROOM_NOT_FOUND if room doesn't exist
  - [x] Return 400 for validation errors with structured error response

- [x] **Task 5: Generate token and return response** (AC: 2.2.2)
  - [x] Generate unique participant ID (UUID)
  - [x] Add participant to room store
  - [x] Generate LiveKit token with annotator role (default) and assigned color
  - [x] Return 200 with `{ token, livekitUrl }`

- [x] **Task 6: Integration testing** (AC: all)
  - [x] Write integration test for successful room join
  - [x] Write integration test for joining non-existent room
  - [x] Write integration test for validation error cases
  - [x] Write integration test for multiple joins (verify color cycling)
  - [x] Verify token structure and claims
  - [x] Verify participant is stored in room

## Dev Notes

### Architecture Patterns

Per `docs/architecture.md`:
- **API Route Pattern (Hono)**: Use `zValidator` for request validation with Zod schemas
- **Error Response Format**: `{ error: { code: string, message: string } }`
- **HTTP Status Codes**: 200 for success, 400 for validation errors, 404 for not found
- **Content-Type**: Always `application/json`

[Source: docs/architecture.md#API-Route-Pattern]

### Token Generation Pattern

Reuse the existing `generateToken()` function from Story 2.1:

```typescript
import { generateToken, getLiveKitUrl } from '../services/livekit';

// Generate token for joining participant
const token = await generateToken(
  roomId,
  participantId,
  participantName,
  'annotator',  // Default role for joiners
  participantColor
);
```

[Source: packages/server/src/services/livekit.ts]

### Tech Spec Requirements

Per `docs/sprint-artifacts/tech-spec-epic-2.md`:

**POST /api/rooms/:roomId/join API Contract:**

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

[Source: docs/sprint-artifacts/tech-spec-epic-2.md#APIs-and-Interfaces]

### Color Assignment Logic

Per `docs/sprint-artifacts/tech-spec-epic-2.md`:
- Default role for joiners is "annotator" (can be overridden to "viewer")
- Color assignment: cycle through PARTICIPANT_COLORS array based on join order
- Colors: Orange (#f97316), Cyan (#06b6d4), Purple (#a855f7), Green (#22c55e), Pink (#ec4899)

```typescript
// Cycling logic
const colorIndex = room.participants.size % PARTICIPANT_COLORS.length;
const color = PARTICIPANT_COLORS[colorIndex];
```

[Source: docs/sprint-artifacts/tech-spec-epic-2.md#APIs-and-Interfaces]

### Existing Services to Reuse

From Story 2.1 implementation:
- `packages/server/src/services/roomStore.ts` - In-memory room storage (getRoom)
- `packages/server/src/services/livekit.ts` - Token generation (generateToken, getLiveKitUrl)
- `packages/server/src/utils/roomId.ts` - Room ID format validation
- `packages/server/src/middleware/logger.ts` - Structured logging (log)

### Project Structure Notes

Following the pattern established in Story 2.1:
- Route handlers: `packages/server/src/routes/rooms.ts` (add join handler to existing router)
- Service extensions: `packages/server/src/services/roomStore.ts` (add addParticipant)
- Test files co-located: `*.test.ts` next to source

[Source: docs/architecture.md#Project-Structure]

### Shared Types to Add

Add to `@nameless/shared`:
- `JoinRoomRequest` - `{ participantName: string; role?: Role }`
- `JoinRoomResponse` - `{ token: string; livekitUrl: string }`

[Source: packages/shared/src/index.ts]

### Learnings from Story 2.1

1. **Test setup**: Environment variables (LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL) must be set in beforeEach
2. **Room store cleanup**: Use `clearRooms()` in beforeEach to ensure test isolation
3. **Token validation**: Test token claims by decoding base64 payload (don't verify signature in unit tests)
4. **Integration tests**: Use `app.request()` pattern for Hono testing
5. **Logging**: Use the extended LogEntry interface with roomId and participantId for observability

[Source: packages/server/src/routes/rooms.test.ts]

### References

- [Tech Spec: AC-2.2](docs/sprint-artifacts/tech-spec-epic-2.md#AC-2.2)
- [Architecture: API Route Pattern](docs/architecture.md#API-Route-Pattern)
- [Architecture: API Contracts](docs/architecture.md#API-Contracts)
- [Epics: Story 2.2](docs/epics.md#Story-2.2)
- [Story 2.1 Implementation](docs/sprint-artifacts/2-1-implement-room-creation-api-endpoint.md)

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/2-2-implement-room-join-api-endpoint.context.xml`

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A - Implementation was straightforward

### Completion Notes List

1. **Tasks 1-3 were pre-implemented**: Context file correctly identified that `JoinRoomRequest`, `JoinRoomResponse` types and `addParticipant` function with color cycling already existed from Story 2.1
2. **Implemented POST /:roomId/join route** following exact pattern from room creation endpoint:
   - Zod validation schema with participantName (1-50 chars) and optional role
   - 404 response for non-existent rooms with ROOM_NOT_FOUND code
   - 400 response for validation errors with VALIDATION_ERROR code
   - 500 response for server errors with JOIN_FAILED code
3. **Added 14 integration tests** covering all acceptance criteria:
   - Successful join (token, livekitUrl, room grants)
   - Token claims verification (identity, name, metadata)
   - Color cycling (sequential colors, wrap-around)
   - 404 for non-existent rooms
   - Validation errors (missing name, empty name, too long, invalid type, invalid JSON)
   - Viewer role override
4. **All 111 tests pass** across all packages
5. **Typecheck and lint pass** (1 pre-existing warning about unused Role import in factories.ts)

### File List

**Modified:**
- `packages/server/src/routes/rooms.ts` - Added join endpoint handler
- `packages/server/src/routes/rooms.test.ts` - Added 14 integration tests

**Unchanged (leveraged existing):**
- `packages/shared/src/types/api.ts` - JoinRoomRequest, JoinRoomResponse types
- `packages/server/src/services/roomStore.ts` - addParticipant function with color cycling
- `packages/server/src/services/roomStore.test.ts` - Unit tests for addParticipant

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-01 | Initial story draft from create-story workflow | SM Agent |
| 2025-12-01 | Implementation complete - all ACs satisfied, 14 tests added | Dev Agent |

