# Epic 1: Foundation & Project Setup

**Goal:** Establish the development foundation - monorepo structure, Tauri app shell, API server skeleton, shared types, and development tooling that enables all subsequent work.

**User Value:** Enables all development work (necessary foundation for greenfield project)

**FRs Addressed:** Infrastructure for all FRs (FR47, FR48 partial)

---

## Story 1.1: Initialize Monorepo with Tauri Desktop App

**As a** developer,
**I want** a properly structured monorepo with a working Tauri desktop application,
**So that** I have a foundation to build all Etch features upon.

**Acceptance Criteria:**

**Given** a fresh clone of the repository
**When** I run `pnpm install && pnpm dev:client`
**Then** a Tauri desktop window opens with a basic React UI

**And** the project structure matches the architecture specification:
```
etch/
├── packages/
│   ├── client/          # Tauri desktop app
│   │   ├── src/         # React frontend
│   │   └── src-tauri/   # Rust backend
│   ├── server/          # Hono API server
│   └── shared/          # Shared types & utilities
├── pnpm-workspace.yaml
└── package.json
```

**And** TypeScript is configured with path aliases (`@/` for client, `@etch/shared`)
**And** Tailwind CSS is configured with the design system tokens from UX spec
**And** shadcn/ui is initialized with dark mode as default
**And** ESLint and Prettier are configured for consistent code style
**And** the app builds successfully for macOS (`pnpm build:client`)

**Prerequisites:** None (first story)

**Technical Notes:**
- Use `npx create-tauri-ui@latest` as starter (per Architecture doc)
- Select Vite + React template with pnpm
- Configure `tsconfig.base.json` for shared TypeScript settings
- Set up path aliases in both Vite and TypeScript configs
- Install Lucide icons (included with shadcn/ui)
- Configure tauri-controls for native window controls

---

## Story 1.2: Configure Hono API Server with Health Endpoint

**As a** developer,
**I want** a minimal Hono API server in the monorepo,
**So that** I have a backend ready for room management and token generation.

**Acceptance Criteria:**

**Given** the monorepo from Story 1.1
**When** I run `pnpm dev:server`
**Then** the Hono server starts on port 3000

**And** `GET /api/health` returns:
```json
{
  "status": "ok",
  "timestamp": 1732968000000
}
```
with status 200

**And** the server uses TypeScript with ES modules
**And** environment variables are loaded from `.env` file
**And** the server has structured JSON logging to stdout
**And** CORS is configured for local development

**Prerequisites:** Story 1.1

**Technical Notes:**
- Use Hono 4.x with `@hono/node-server`
- Add `zod` for request validation (used later)
- Configure environment variables: `PORT`, `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
- Create `.env.example` with placeholder values
- Server file structure per Architecture: `src/routes/`, `src/services/`, `src/middleware/`

---

## Story 1.3: Create Shared Types Package

**As a** developer,
**I want** shared TypeScript types available to both client and server,
**So that** type safety is maintained across the entire codebase.

**Acceptance Criteria:**

**Given** the monorepo structure
**When** I import from `@etch/shared` in client or server code
**Then** I have access to all shared types and constants

**And** the following types are defined:
```typescript
// Point and Stroke types
interface Point { x: number; y: number; pressure?: number; }
interface Stroke { id: string; participantId: string; tool: 'pen' | 'highlighter'; color: string; points: Point[]; createdAt: number; }

// Room and Participant types
type Role = 'host' | 'sharer' | 'annotator' | 'viewer';
interface Participant { id: string; name: string; role: Role; color: string; isLocal: boolean; }
interface RoomState { id: string; participants: Participant[]; isScreenSharing: boolean; sharerId: string | null; annotationsEnabled: boolean; }

// API types
interface CreateRoomRequest { hostName: string; }
interface CreateRoomResponse { roomId: string; token: string; livekitUrl: string; }
interface JoinRoomRequest { participantName: string; role?: Role; }
interface JoinRoomResponse { token: string; livekitUrl: string; }
interface ApiError { error: { code: string; message: string; } }
```

**And** constants are defined:
```typescript
const PARTICIPANT_COLORS = ['#f97316', '#06b6d4', '#a855f7', '#22c55e', '#ec4899'];
const MAX_STROKE_POINTS = 10000;
const MAX_PARTICIPANTS = 10;
```

**And** the package is properly configured for TypeScript with `"type": "module"`

**Prerequisites:** Story 1.1

**Technical Notes:**
- Package location: `packages/shared/`
- Export all types from `src/index.ts`
- Types match Architecture doc Section "Data Architecture"
- Colors match UX spec Section 3.1 "Annotation Colors"

---

## Story 1.4: Set Up Vitest Testing Framework

**As a** developer,
**I want** a testing framework configured across the monorepo,
**So that** I can write and run tests for all packages.

**Acceptance Criteria:**

**Given** the monorepo with client, server, and shared packages
**When** I run `pnpm test`
**Then** Vitest runs all tests across all packages

**And** each package can run tests independently:
- `pnpm test:client` - runs client tests
- `pnpm test:server` - runs server tests
- `pnpm test:shared` - runs shared tests

**And** test files are co-located with source files (`*.test.ts`)
**And** React Testing Library is configured for component tests
**And** coverage reports are generated with `pnpm test:coverage`
**And** at least one passing test exists in each package (placeholder tests)

**Prerequisites:** Story 1.1, 1.2, 1.3

**Technical Notes:**
- Use Vitest (native Vite integration)
- Configure `vitest.workspace.ts` for monorepo
- Add `@testing-library/react` and `@testing-library/jest-dom` for client
- Add `jsdom` environment for client tests
- Test file pattern: `**/*.test.ts`, `**/*.test.tsx`

**Sprint 0 Test Infrastructure Requirements:**

Per System-Level Test Design (`docs/test-design-system.md`), this story must establish:

**1. Configuration Structure:**
```
packages/
├── client/
│   ├── vitest.config.ts      # jsdom environment, React plugin
│   └── src/test/setup.ts     # RTL cleanup, window mocks
├── server/
│   └── vitest.config.ts      # node environment
├── shared/
│   └── vitest.config.ts      # node environment
└── vitest.workspace.ts       # Workspace config (runs all)
```

**2. Test Data Factories (in `@etch/shared`):**
- [ ] `createMockStroke(overrides?)` - Creates stroke with sensible defaults
- [ ] `createMockParticipant(overrides?)` - Creates participant with role
- [ ] `createMockHost()`, `createMockViewer()` - Role-specific helpers
- [ ] `createStrokeStartMessage()`, `createSyncResponseMessage()` - Message factories

**3. Mock Infrastructure (in `@etch/client`):**
- [ ] `MockLiveKitRoom` - Simulates room connection, data events, participants
- [ ] `MockDataTrackSync` - Simulates publish/subscribe with test helpers
- [ ] Store helpers: `resetAllStores()`, `seedStrokes()`, `getAnnotationState()`

**4. Coverage Thresholds:**
```typescript
// vitest.config.ts coverage settings
thresholds: {
  lines: 60,      // Initial threshold
  branches: 60,
  functions: 60,
  statements: 60,
}
// Critical paths (stores, utils): 80% target (enforced per-epic)
```

**5. Test Setup File Requirements:**
```typescript
// packages/client/src/test/setup.ts must include:
- @testing-library/jest-dom matchers
- afterEach cleanup
- window.matchMedia mock (dark mode)
- ResizeObserver mock (canvas)
```

**6. Package.json Scripts:**
```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "test:ui": "vitest --ui"
}
```

**Definition of Done Checklist:**
- [ ] `vitest.workspace.ts` configured at root
- [ ] Each package has `vitest.config.ts` with appropriate environment
- [ ] Client test setup file with all mocks
- [ ] Test factories created and exported from `@etch/shared`
- [ ] Mock infrastructure created in `@etch/client`
- [ ] Coverage thresholds configured (60% initial)
- [ ] At least one passing test per package
- [ ] `pnpm test:coverage` generates HTML report

---

## Story 1.5: Configure Development Scripts and Tooling

**As a** developer,
**I want** convenient development scripts to run the full stack,
**So that** I can develop efficiently with hot reload.

**Acceptance Criteria:**

**Given** the monorepo with all packages configured
**When** I run `pnpm dev`
**Then** both the Tauri client (with hot reload) and Hono server start concurrently

**And** the following scripts are available in root `package.json`:
```json
{
  "dev": "concurrently \"pnpm dev:client\" \"pnpm dev:server\"",
  "dev:client": "pnpm --filter client dev",
  "dev:server": "pnpm --filter server dev",
  "build": "pnpm build:client && pnpm build:server",
  "build:client": "pnpm --filter client build",
  "build:server": "pnpm --filter server build",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "typecheck": "tsc --noEmit",
  "lint": "eslint packages/*/src --ext .ts,.tsx",
  "lint:fix": "eslint packages/*/src --ext .ts,.tsx --fix",
  "format": "prettier --write \"packages/*/src/**/*.{ts,tsx,css}\""
}
```

**And** VS Code settings are configured for the project (`.vscode/settings.json`)
**And** recommended extensions are listed (`.vscode/extensions.json`)

**Prerequisites:** Story 1.1, 1.2, 1.3, 1.4

**Technical Notes:**
- Use `concurrently` for parallel script execution
- Configure VS Code for ESLint, Prettier, Tailwind CSS IntelliSense
- Recommended extensions: dbaeumer.vscode-eslint, esbenp.prettier-vscode, bradlc.vscode-tailwindcss, rust-lang.rust-analyzer, tauri-apps.tauri-vscode

---
