# Story 2.1: Implement Room Creation API Endpoint

Status: done

## Story

As a **user**,
I want **to create a new meeting room with a single action**,
so that **I can quickly start a meeting and invite others**.

## Acceptance Criteria

1. **AC-2.1.1: Room Creation Endpoint**
   - Given the API server is running
   - When I send `POST /api/rooms` with body `{ "hostName": "BMad" }`
   - Then I receive status 201 with response containing `roomId`, `token`, and `livekitUrl`

2. **AC-2.1.2: Room ID Generation**
   - Given a room is created
   - When I examine the roomId
   - Then it is a unique, URL-safe string in format `xxx-xxx-xxx`
   - And it uses lowercase letters and numbers (no ambiguous chars like 0/O, 1/l)

3. **AC-2.1.3: LiveKit Token Generation**
   - Given a room is created successfully
   - When I examine the returned token
   - Then it is a valid LiveKit JWT containing:
     - `identity`: unique participant ID (UUID)
     - `name`: "BMad" (the hostName)
     - `metadata`: `{ "role": "host", "color": "#f97316" }`
     - `exp`: 1 hour from now
     - Room permissions: `roomJoin: true`, `canPublish: true`, `canPublishData: true`

4. **AC-2.1.4: Validation Error Handling**
   - Given an invalid request (missing or empty hostName)
   - When I send `POST /api/rooms` with body `{}`
   - Then I receive status 400 with error:
     ```json
     {
       "error": {
         "code": "VALIDATION_ERROR",
         "message": "hostName is required"
       }
     }
     ```

5. **AC-2.1.5: Host Name Length Validation**
   - Given a hostName longer than 50 characters
   - When I send `POST /api/rooms`
   - Then I receive status 400 with error code `VALIDATION_ERROR`

6. **AC-2.1.6: In-Memory Room Storage**
   - Given a room is created
   - When the room is stored
   - Then it is saved in an in-memory Map (no database for MVP)
   - And the room record includes: id, createdAt, hostId, participants Map

## Tasks / Subtasks

- [x] **Task 1: Install required dependencies** (AC: 2.1.1, 2.1.2, 2.1.3)
  - [x] Add `livekit-server-sdk` to server package
  - [x] Add `nanoid` for room ID generation
  - [x] Ensure `zod` and `@hono/zod-validator` are installed

- [x] **Task 2: Create room ID generation utility** (AC: 2.1.2)
  - [x] Create `packages/server/src/utils/roomId.ts`
  - [x] Implement `generateRoomId()` using nanoid with custom alphabet
  - [x] Custom alphabet: lowercase letters + numbers, excluding ambiguous chars (0, O, 1, l, I)
  - [x] Format: `xxx-xxx-xxx` (9 characters with 2 dashes)
  - [x] Add unit tests for room ID generation

- [x] **Task 3: Create in-memory room store service** (AC: 2.1.6)
  - [x] Create `packages/server/src/services/roomStore.ts`
  - [x] Define `RoomRecord` and `ParticipantRecord` interfaces
  - [x] Implement `createRoom(hostId, hostName)` function
  - [x] Implement `getRoom(roomId)` function
  - [x] Use `Map<string, RoomRecord>` for storage
  - [x] Add unit tests for room store operations

- [x] **Task 4: Create LiveKit token generation service** (AC: 2.1.3)
  - [x] Create `packages/server/src/services/livekit.ts`
  - [x] Implement `generateToken(roomId, participantId, name, role, color)` function
  - [x] Configure token with correct grants: roomJoin, canPublish, canSubscribe, canPublishData
  - [x] Set metadata with role and color as JSON string
  - [x] Set expiry to 1 hour (configurable via env)
  - [x] Read `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` from environment
  - [x] Add unit tests with mocked AccessToken

- [x] **Task 5: Implement room creation API route** (AC: 2.1.1, 2.1.4, 2.1.5)
  - [x] Create `packages/server/src/routes/rooms.ts`
  - [x] Define Zod schema for CreateRoomRequest: `{ hostName: z.string().min(1).max(50) }`
  - [x] Implement `POST /api/rooms` handler with zValidator
  - [x] Generate room ID, create room record, generate host token
  - [x] Assign first participant color from PARTICIPANT_COLORS
  - [x] Return 201 with `{ roomId, token, livekitUrl }`
  - [x] Return 400 for validation errors with structured error response

- [x] **Task 6: Register rooms route in main app** (AC: 2.1.1)
  - [x] Import rooms router in `packages/server/src/index.ts`
  - [x] Mount at `/api/rooms`
  - [x] Ensure CORS allows necessary methods

- [x] **Task 7: Integration testing** (AC: all)
  - [x] Write integration test for successful room creation
  - [x] Write integration test for validation error cases
  - [x] Verify token structure and claims
  - [x] Verify room is stored in memory

## Dev Notes

### Architecture Patterns

Per `docs/architecture.md`:
- **API Route Pattern (Hono)**: Use `zValidator` for request validation with Zod schemas
- **Error Response Format**: `{ error: { code: string, message: string } }`
- **HTTP Status Codes**: 201 for created, 400 for validation errors
- **Content-Type**: Always `application/json`

[Source: docs/architecture.md#API-Route-Pattern]

### Token Generation Pattern

Per `docs/architecture.md`:

```typescript
import { AccessToken } from 'livekit-server-sdk';

const token = new AccessToken(apiKey, apiSecret, {
  identity: participantId,
  name: displayName,
  metadata: JSON.stringify({ role, color }),
});
token.addGrant({ room: roomId, roomJoin: true, canPublish: true });
return token.toJwt();
```

[Source: docs/architecture.md#Integration-Points]

### Tech Spec Requirements

Per `docs/sprint-artifacts/tech-spec-epic-2.md`:

**Room ID Format:** `xxx-xxx-xxx` (nanoid with custom alphabet)

**Server-Side Room Storage:**
```typescript
interface RoomRecord {
  id: string;                    // Format: xxx-xxx-xxx
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
```

**LiveKit JWT Structure:**
```typescript
{
  sub: string;           // Participant ID (UUID)
  video: {
    room: string;        // Room ID
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  };
  name: string;          // Display name
  metadata: string;      // JSON: { role, color }
  exp: number;           // Expiry (1 hour)
  iat: number;           // Issued at
}
```

[Source: docs/sprint-artifacts/tech-spec-epic-2.md#Data-Models-and-Contracts]

### Project Structure Notes

- Route files: `packages/server/src/routes/rooms.ts`
- Service files: `packages/server/src/services/livekit.ts`, `packages/server/src/services/roomStore.ts`
- Utility files: `packages/server/src/utils/roomId.ts`
- Test files co-located: `*.test.ts` next to source

[Source: docs/architecture.md#Project-Structure]

### Environment Variables Required

```bash
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
```

[Source: docs/sprint-artifacts/tech-spec-epic-2.md#Environment-Variables]

### Shared Types to Use

From `@nameless/shared`:
- `CreateRoomRequest`, `CreateRoomResponse` - API types
- `Role` - 'host' | 'sharer' | 'annotator' | 'viewer'
- `PARTICIPANT_COLORS` - Color array for assignment

[Source: packages/shared/src/index.ts]

### References

- [Tech Spec: AC-2.1](docs/sprint-artifacts/tech-spec-epic-2.md#AC-2.1)
- [Architecture: API Route Pattern](docs/architecture.md#API-Route-Pattern)
- [Architecture: Integration Points](docs/architecture.md#Integration-Points)
- [Epics: Story 2.1](docs/epics.md#Story-2.1)
- [LiveKit Server SDK Documentation](https://docs.livekit.io/realtime/server/generating-tokens/)

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/2-1-implement-room-creation-api-endpoint.context.xml`

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A - No errors encountered during implementation.

### Completion Notes List

- Installed `livekit-server-sdk@^2.14.2`, `nanoid@^5.1.6`, `@hono/zod-validator@^0.7.5`
- Room IDs use custom nanoid alphabet excluding ambiguous chars (0, O, 1, l, I)
- Extended LogEntry interface to support roomId, participantId, and error fields
- All 97 tests passing across shared, server, and client packages
- Build compiles successfully with no TypeScript errors

### File List

**New Files Created:**
- `packages/server/src/utils/roomId.ts` - Room ID generation utility
- `packages/server/src/utils/roomId.test.ts` - Room ID unit tests (9 tests)
- `packages/server/src/services/roomStore.ts` - In-memory room storage service
- `packages/server/src/services/roomStore.test.ts` - Room store unit tests (19 tests)
- `packages/server/src/services/livekit.ts` - LiveKit token generation service
- `packages/server/src/services/livekit.test.ts` - LiveKit service unit tests (13 tests)
- `packages/server/src/routes/rooms.ts` - Room creation API route
- `packages/server/src/routes/rooms.test.ts` - Room API integration tests (13 tests)

**Modified Files:**
- `packages/server/package.json` - Added new dependencies
- `packages/server/src/index.ts` - Registered rooms router
- `packages/server/src/middleware/logger.ts` - Extended LogEntry interface

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-11-30 | Initial story draft from create-story workflow | SM Agent |
| 2025-11-30 | Generated story context file | SM Agent |
| 2025-11-30 | Implementation complete - all tasks done, 97 tests passing | DEV Agent |
| 2025-11-30 | Code review completed - APPROVED | SM Agent |

---

## Code Review Notes

### Review Summary

**Review Date:** 2025-11-30
**Reviewer Model:** Claude Opus 4.5 (claude-opus-4-5-20251101)
**Verdict:** APPROVED

### Acceptance Criteria Validation

| AC | Status | Evidence |
|----|--------|----------|
| AC-2.1.1: Room Creation Endpoint | ✅ IMPLEMENTED | `packages/server/src/routes/rooms.ts:87` returns 201 with roomId, token, livekitUrl |
| AC-2.1.2: Room ID Generation | ✅ IMPLEMENTED | `packages/server/src/utils/roomId.ts:8` uses `23456789abcdefghjkmnpqrstuvwxyz` alphabet, format `xxx-xxx-xxx` |
| AC-2.1.3: LiveKit Token Generation | ✅ IMPLEMENTED | `packages/server/src/services/livekit.ts:47-73` generates valid JWT with identity, name, metadata (role+color), ttl, grants |
| AC-2.1.4: Validation Error Handling | ✅ IMPLEMENTED | `packages/server/src/routes/rooms.ts:33-43` returns 400 with `{error:{code:'VALIDATION_ERROR',message}}` |
| AC-2.1.5: Host Name Length Validation | ✅ IMPLEMENTED | `packages/server/src/routes/rooms.ts:20` validates `.max(50, 'hostName must be at most 50 characters')` |
| AC-2.1.6: In-Memory Room Storage | ✅ IMPLEMENTED | `packages/server/src/services/roomStore.ts:39` uses `Map<string, RoomRecord>` with id, createdAt, hostId, participants |

### Task Validation

| Task | Status | Evidence |
|------|--------|----------|
| Task 1: Install dependencies | ✅ Complete | `packages/server/package.json:14-18` - livekit-server-sdk@^2.14.2, nanoid@^5.1.6, @hono/zod-validator@^0.7.5 |
| Task 2: Room ID utility | ✅ Complete | `packages/server/src/utils/roomId.ts` + `roomId.test.ts` (9 tests) |
| Task 3: Room store service | ✅ Complete | `packages/server/src/services/roomStore.ts` + `roomStore.test.ts` (19 tests) |
| Task 4: LiveKit token service | ✅ Complete | `packages/server/src/services/livekit.ts` + `livekit.test.ts` (13 tests) |
| Task 5: Room creation route | ✅ Complete | `packages/server/src/routes/rooms.ts` + `rooms.test.ts` (13 tests) |
| Task 6: Route registration | ✅ Complete | `packages/server/src/index.ts:23` - `app.route('/api/rooms', roomsRouter)` |
| Task 7: Integration testing | ✅ Complete | 13 integration tests covering success, validation errors, token structure, room storage |

### Code Quality Assessment

**Strengths:**
1. **Architecture compliance** - Follows Hono API pattern with zValidator as specified in architecture.md
2. **Error handling** - Consistent `{error:{code,message}}` format per spec
3. **Type safety** - Uses shared types from @nameless/shared (Role, PARTICIPANT_COLORS, TOKEN_EXPIRY_SECONDS)
4. **Test coverage** - 54 tests for story 2.1 alone (9+19+13+13), comprehensive edge cases
5. **Clean separation** - Utils, services, routes cleanly separated
6. **Proper logging** - Extended LogEntry with roomId, participantId, error fields for observability

**Code Observations:**
- Room ID alphabet correctly excludes ambiguous chars (0, O, 1, l, I) - `packages/server/src/utils/roomId.ts:8`
- Token expiry uses shared constant TOKEN_EXPIRY_SECONDS - `packages/server/src/services/livekit.ts:61`
- Host gets first color (orange #f97316) from PARTICIPANT_COLORS - `packages/server/src/services/roomStore.ts:61`
- Proper async/await pattern for token generation - `packages/server/src/routes/rooms.ts:62-68`

### Test Results

```
Test Files  10 passed (10)
Tests       97 passed (97)
```

Build compiles successfully with no TypeScript errors.

### Security Review

- No secrets hardcoded - uses environment variables for LIVEKIT_API_KEY/SECRET
- Input validation via Zod schema prevents injection
- hostName max length (50) prevents potential DoS via oversized input
- No obvious XSS vectors in server-side code

### Recommendations for Future Stories

1. Consider adding rate limiting for room creation endpoint
2. Add room expiry/cleanup mechanism for idle rooms (noted for future epic)
3. Consider adding request ID to log entries for tracing

### Final Verdict

**APPROVED** - All acceptance criteria satisfied, comprehensive test coverage, follows architectural patterns, clean implementation with no blocking issues.
