# Story 1.3: Create Shared Types Package

Status: review

## Story

As a **developer**,
I want **shared TypeScript types available to both client and server**,
so that **type safety is maintained across the entire codebase**.

## Acceptance Criteria

1. **AC-1.3.1: Package Import**
   - Given the monorepo structure
   - When I import from `@nameless/shared` in client or server code
   - Then I have access to all shared types and constants
   - And TypeScript recognizes the types without errors

2. **AC-1.3.2: Point and Stroke Types**
   - Given the shared package
   - When I examine the exported types
   - Then the following types are defined:
     ```typescript
     interface Point {
       x: number;    // 0.0 - 1.0 (normalized)
       y: number;    // 0.0 - 1.0 (normalized)
       pressure?: number;
     }

     interface Stroke {
       id: string;
       participantId: string;
       tool: 'pen' | 'highlighter';
       color: string;
       points: Point[];
       createdAt: number;  // Unix timestamp (ms)
     }
     ```

3. **AC-1.3.3: Room and Participant Types**
   - Given the shared package
   - When I examine the exported types
   - Then the following types are defined:
     ```typescript
     type Role = 'host' | 'sharer' | 'annotator' | 'viewer';

     interface Participant {
       id: string;
       name: string;
       role: Role;
       color: string;
       isLocal: boolean;
     }

     interface RoomState {
       id: string;
       participants: Participant[];
       isScreenSharing: boolean;
       sharerId: string | null;
       annotationsEnabled: boolean;
     }
     ```

4. **AC-1.3.4: API Types**
   - Given the shared package
   - When I examine the exported types
   - Then the following API types are defined:
     ```typescript
     interface CreateRoomRequest { hostName: string; }
     interface CreateRoomResponse { roomId: string; token: string; livekitUrl: string; }
     interface JoinRoomRequest { participantName: string; role?: Role; }
     interface JoinRoomResponse { token: string; livekitUrl: string; }
     interface ApiError { error: { code: string; message: string; } }
     ```

5. **AC-1.3.5: Constants**
   - Given the shared package
   - When I examine the exported constants
   - Then the following constants are defined:
     ```typescript
     const PARTICIPANT_COLORS = ['#f97316', '#06b6d4', '#a855f7', '#22c55e', '#ec4899'];
     const MAX_STROKE_POINTS = 10000;
     const MAX_PARTICIPANTS = 10;
     ```

6. **AC-1.3.6: Package Configuration**
   - Given the shared package
   - When I examine the package.json
   - Then it has `"type": "module"` for ES modules
   - And it has proper exports configuration for TypeScript

7. **AC-1.3.7: Build Output**
   - Given the shared package
   - When I run `pnpm build` in the shared package
   - Then TypeScript compiles to the `dist/` folder
   - And type declarations (`.d.ts` files) are generated

## Tasks / Subtasks

- [x] **Task 1: Initialize Shared Package** (AC: 1.3.6, 1.3.7)
  - [x] Update `packages/shared/package.json` with:
    - `"type": "module"`
    - `"main": "./dist/index.js"`
    - `"types": "./dist/index.d.ts"`
    - Exports configuration for both ESM and types
  - [x] Add dev dependencies: `typescript`
  - [x] Create `tsconfig.json` extending `../../tsconfig.base.json`
  - [x] Configure TypeScript to emit declarations
  - [x] Add scripts: `build`, `clean`

- [x] **Task 2: Create Stroke Types** (AC: 1.3.2)
  - [x] Create `src/types/stroke.ts`
  - [x] Define `Point` interface with x, y, optional pressure
  - [x] Define `Stroke` interface with id, participantId, tool, color, points, createdAt
  - [x] Export types from module

- [x] **Task 3: Create Room Types** (AC: 1.3.3)
  - [x] Create `src/types/room.ts`
  - [x] Define `Role` type union
  - [x] Define `Participant` interface
  - [x] Define `RoomState` interface
  - [x] Export types from module

- [x] **Task 4: Create API Types** (AC: 1.3.4)
  - [x] Create `src/types/api.ts`
  - [x] Define `CreateRoomRequest` and `CreateRoomResponse`
  - [x] Define `JoinRoomRequest` and `JoinRoomResponse`
  - [x] Define `ApiError` interface
  - [x] Define `HealthResponse` interface (for existing health endpoint)
  - [x] Export types from module

- [x] **Task 5: Create Types Index** (AC: 1.3.1)
  - [x] Create `src/types/index.ts`
  - [x] Re-export all types from stroke, room, api modules

- [x] **Task 6: Create Constants** (AC: 1.3.5)
  - [x] Create `src/constants/colors.ts` with `PARTICIPANT_COLORS`
  - [x] Create `src/constants/limits.ts` with `MAX_STROKE_POINTS`, `MAX_PARTICIPANTS`
  - [x] Create `src/constants/index.ts` to re-export all constants

- [x] **Task 7: Create Package Index** (AC: 1.3.1)
  - [x] Create `src/index.ts`
  - [x] Export all from `./types`
  - [x] Export all from `./constants`

- [x] **Task 8: Verify Package Integration** (AC: 1.3.1, 1.3.7)
  - [x] Build the shared package
  - [x] Verify types can be imported in server package
  - [x] Verify types can be imported in client package
  - [x] Run type checking across monorepo

- [x] **Task 9: Write Unit Tests** (AC: 1.3.2, 1.3.3, 1.3.4, 1.3.5)
  - [x] Create `src/types/stroke.test.ts` - verify type exports
  - [x] Create `src/constants/colors.test.ts` - verify constants values
  - [x] Configure Vitest for shared package

## Dev Notes

### Architecture Patterns

Per `docs/architecture.md`:
- **Location**: `packages/shared/` - shared types and utilities
- **Purpose**: Type safety across client and server
- **Module Format**: ES modules with `"type": "module"`

### Type Definitions Source

All type definitions are derived from the Architecture document's "Data Architecture" section:

```typescript
// Normalized coordinates for resolution-independence
interface Point {
  x: number;  // 0.0 - 1.0
  y: number;  // 0.0 - 1.0
  pressure?: number;
}

// Stroke for annotation canvas
interface Stroke {
  id: string;
  participantId: string;
  tool: 'pen' | 'highlighter';
  color: string;
  points: Point[];
  createdAt: number;
}
```

[Source: docs/architecture.md#Data-Architecture]

### Package Structure

```
packages/shared/
├── src/
│   ├── types/
│   │   ├── stroke.ts       # Point, Stroke
│   │   ├── room.ts         # Role, Participant, RoomState
│   │   ├── api.ts          # API request/response types
│   │   └── index.ts        # Re-exports
│   ├── constants/
│   │   ├── colors.ts       # PARTICIPANT_COLORS
│   │   ├── limits.ts       # MAX_STROKE_POINTS, MAX_PARTICIPANTS
│   │   └── index.ts        # Re-exports
│   └── index.ts            # Package entry point
├── package.json
└── tsconfig.json
```

[Source: docs/architecture.md#Project-Structure]

### Constants Values

From UX Design Specification and Architecture:
- **PARTICIPANT_COLORS**: `['#f97316', '#06b6d4', '#a855f7', '#22c55e', '#ec4899']` (Orange, Cyan, Purple, Green, Pink)
- **MAX_STROKE_POINTS**: 10000 (prevent memory bloat)
- **MAX_PARTICIPANTS**: 10 (MVP target scale)

[Source: docs/architecture.md#Data-Architecture]
[Source: docs/epics.md#Story-1.3]

### Project Structure Notes

- Package follows monorepo workspace pattern established in Story 1.1
- Uses `../../tsconfig.base.json` for shared TypeScript configuration
- Exports both compiled JS and type declarations

### Learnings from Previous Story

**From Story 1-2 (Status: done)**

- **Server package created**: Full Hono server implementation exists
- **TypeScript config pattern**: Extend `../../tsconfig.base.json` for consistency
- **Package scripts**: Use `build`, `dev`, standard naming
- **Vitest configured**: Server has Vitest working - follow same pattern
- **File structure convention**: `src/` directory with subdirectories by concern

[Source: docs/sprint-artifacts/1-2-configure-hono-api-server-with-health-endpoint.md#Dev-Agent-Record]

### References

- [Architecture: Data Architecture](docs/architecture.md#Data-Architecture)
- [Architecture: Project Structure](docs/architecture.md#Project-Structure)
- [Tech Spec: AC-1.4 Shared Types Package](docs/sprint-artifacts/tech-spec-epic-1.md#AC-1.4)
- [Epics: Story 1.3](docs/epics.md#Story-1.3)

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/1-3-create-shared-types-package.context.xml

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

N/A

### Completion Notes List

- Implemented all 11 TypeScript types: Point, Stroke, Role, Participant, RoomState, CreateRoomRequest, CreateRoomResponse, JoinRoomRequest, JoinRoomResponse, ApiError, HealthResponse
- Implemented all constants: PARTICIPANT_COLORS (5 colors), MAX_STROKE_POINTS (10000), MAX_PARTICIPANTS (10), TOKEN_EXPIRY_SECONDS (3600)
- Added ParticipantColor type for type-safe color handling
- Package builds successfully with TypeScript outputting to dist/
- All 24 unit tests pass covering constants and type exports
- Server tests (3) continue to pass - no regressions

### File List

- packages/shared/package.json - Updated with proper exports configuration
- packages/shared/tsconfig.json - Created with base config extension and declaration output
- packages/shared/vitest.config.ts - Created for testing configuration
- packages/shared/src/index.ts - Package entry point re-exporting types and constants
- packages/shared/src/types/stroke.ts - Point and Stroke interfaces
- packages/shared/src/types/room.ts - Role, Participant, RoomState types
- packages/shared/src/types/api.ts - API request/response types including HealthResponse
- packages/shared/src/types/index.ts - Re-exports all types
- packages/shared/src/constants/colors.ts - PARTICIPANT_COLORS constant
- packages/shared/src/constants/limits.ts - MAX_STROKE_POINTS, MAX_PARTICIPANTS, TOKEN_EXPIRY_SECONDS
- packages/shared/src/constants/index.ts - Re-exports all constants
- packages/shared/src/index.test.ts - Integration tests for all exports
- packages/shared/src/constants/colors.test.ts - Tests for PARTICIPANT_COLORS
- packages/shared/src/constants/limits.test.ts - Tests for limit constants

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-11-30 | Initial story draft from create-story workflow | SM Agent |
| 2025-11-30 | Story completed - all 9 tasks done, all AC verified, 24 tests passing | Dev Agent |
