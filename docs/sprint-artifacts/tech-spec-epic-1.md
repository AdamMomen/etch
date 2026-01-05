# Epic Technical Specification: Foundation & Project Setup

Date: 2025-11-30
Author: BMad
Epic ID: 1
Status: Draft

---

## Overview

Epic 1 establishes the foundational development infrastructure for Etch - an open-source, self-hosted meeting platform with real-time screen annotations. This epic creates the monorepo structure, initializes the Tauri desktop application shell, sets up the Hono API server, defines shared types, configures the testing framework, and establishes development tooling.

This foundation is critical as all subsequent epics (Basic Meeting, Screen Sharing, Annotations, Permissions, Connection Resilience, Self-Hosting) depend on the infrastructure established here. The architecture follows a **decoupled annotation layer** pattern where media transport flows through LiveKit SFU while annotation events synchronize through LiveKit DataTracks.

## Objectives and Scope

### In Scope
- Initialize pnpm monorepo with workspace configuration
- Create Tauri 2.0 desktop application shell with React + Vite
- Configure Hono API server with health endpoint
- Define shared TypeScript types package (`@etch/shared`)
- Set up Vitest testing framework across all packages
- Configure development scripts for concurrent client/server development
- Establish ESLint, Prettier, and TypeScript configuration
- Configure shadcn/ui with dark mode default
- Set up Tailwind CSS with design system tokens

### Out of Scope
- LiveKit integration (Epic 2)
- Meeting room functionality (Epic 2)
- Screen sharing (Epic 3)
- Annotation canvas (Epic 4)
- Any production deployment configuration (Epic 7)

## System Architecture Alignment

This epic implements the foundational layer of the architecture defined in `docs/architecture.md`:

**Components Being Established:**
- `packages/client/` - Tauri desktop application (FR47-52)
- `packages/server/` - Hono API server (FR38-41, FR53-56)
- `packages/shared/` - Shared types & utilities (enables type safety across all FRs)

**Key Architecture Decisions Applied:**
- **ADR-001**: Tauri over Electron - smaller bundles (~2MB), Rust backend
- **ADR-004**: Zustand for state management - lightweight, simple subscriptions
- **ADR-005**: No persistent database - session-based only

**Project Structure Target:**
```
etch/
├── packages/
│   ├── client/                     # Tauri desktop application
│   │   ├── src/                    # React frontend
│   │   │   ├── components/         # UI components
│   │   │   ├── hooks/              # Custom React hooks
│   │   │   ├── stores/             # Zustand stores
│   │   │   ├── lib/                # Utilities
│   │   │   └── types/              # Re-exports from shared
│   │   └── src-tauri/              # Rust backend
│   ├── server/                     # Hono API server
│   │   ├── src/
│   │   │   ├── routes/             # API endpoints
│   │   │   ├── services/           # Business logic
│   │   │   └── middleware/         # HTTP middleware
│   │   └── Dockerfile
│   └── shared/                     # Shared types & utilities
│       ├── src/
│       │   ├── types/              # TypeScript interfaces
│       │   └── constants/          # Shared constants
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json
```

## Detailed Design

### Services and Modules

| Module | Responsibility | Inputs | Outputs | Owner |
|--------|---------------|--------|---------|-------|
| `packages/client` | Tauri desktop app shell | User interactions | Desktop window, React UI | Frontend |
| `packages/server` | API server foundation | HTTP requests | JSON responses | Backend |
| `packages/shared` | Type definitions | N/A | TypeScript types | Shared |
| Root workspace | Build orchestration | npm scripts | Build artifacts | DevOps |

### Data Models and Contracts

**Core Types (from Architecture `docs/architecture.md`):**

```typescript
// packages/shared/src/types/stroke.ts
export interface Point {
  x: number;  // 0.0 - 1.0 (normalized)
  y: number;  // 0.0 - 1.0 (normalized)
  pressure?: number;
}

export interface Stroke {
  id: string;
  participantId: string;
  tool: 'pen' | 'highlighter';
  color: string;
  points: Point[];
  createdAt: number;  // Unix timestamp (ms)
}

// packages/shared/src/types/room.ts
export type Role = 'host' | 'sharer' | 'annotator' | 'viewer';

export interface Participant {
  id: string;
  name: string;
  role: Role;
  color: string;
  isLocal: boolean;
}

export interface RoomState {
  id: string;
  participants: Participant[];
  isScreenSharing: boolean;
  sharerId: string | null;
  annotationsEnabled: boolean;
}

// packages/shared/src/types/api.ts
export interface CreateRoomRequest {
  hostName: string;
}

export interface CreateRoomResponse {
  roomId: string;
  token: string;
  livekitUrl: string;
}

export interface JoinRoomRequest {
  participantName: string;
  role?: Role;
}

export interface JoinRoomResponse {
  token: string;
  livekitUrl: string;
}

export interface ApiError {
  error: {
    code: string;      // SCREAMING_SNAKE_CASE
    message: string;
  };
}

export interface HealthResponse {
  status: 'ok';
  timestamp: number;
}
```

**Shared Constants:**

```typescript
// packages/shared/src/constants/colors.ts
export const PARTICIPANT_COLORS = [
  '#f97316', // Orange
  '#06b6d4', // Cyan
  '#a855f7', // Purple
  '#22c55e', // Green
  '#ec4899', // Pink
] as const;

// packages/shared/src/constants/limits.ts
export const MAX_STROKE_POINTS = 10000;
export const MAX_PARTICIPANTS = 10;
export const TOKEN_EXPIRY_SECONDS = 3600; // 1 hour
```

### APIs and Interfaces

**Health Check Endpoint (Story 1.2):**

| Method | Path | Request | Response | Status |
|--------|------|---------|----------|--------|
| GET | `/api/health` | None | `HealthResponse` | 200 |

```typescript
// Response
{
  "status": "ok",
  "timestamp": 1732968000000
}
```

### Workflows and Sequencing

**Development Workflow:**
1. Developer clones repository
2. Runs `pnpm install` to install all workspace dependencies
3. Runs `pnpm dev` to start client and server concurrently
4. Tauri window opens with React UI
5. Server listens on port 3000
6. Changes trigger hot reload

**Build Workflow:**
1. `pnpm build` triggers builds in all packages
2. Client: Tauri builds macOS .dmg
3. Server: TypeScript compiles to dist/
4. Shared: TypeScript compiles to dist/

## Non-Functional Requirements

### Performance

| Metric | Target | Strategy |
|--------|--------|----------|
| Dev server start | < 5s | Vite's native ESM, no bundling in dev |
| Hot reload | < 500ms | Vite HMR, React Fast Refresh |
| Build time (client) | < 60s | Tauri parallel build |
| Build time (server) | < 10s | esbuild via Hono |
| Test execution | < 30s | Vitest parallel execution |

### Security

This epic establishes security foundations:

- **Environment Variables**: Sensitive values (API keys, secrets) loaded from `.env` files
- **TypeScript**: Type safety prevents common vulnerability classes
- **No Secrets in Code**: `.env.example` provides templates without values
- **CORS Configuration**: Server configured for local development only

### Reliability/Availability

| Metric | Target |
|--------|--------|
| Development environment stability | No crashes during normal development |
| Build success rate | 100% on clean install |
| Test reliability | Zero flaky tests |

### Observability

**Development:**
- Console logging with structured output
- Vite dev server logs requests
- Tauri dev tools available

**Server:**
```typescript
// Structured JSON logging
{
  "level": "info",
  "timestamp": "2025-11-30T10:00:00Z",
  "message": "Server started",
  "port": 3000
}
```

## Dependencies and Integrations

### Core Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `tauri` | 2.0.x | Desktop runtime |
| `react` | 18.x | UI framework |
| `vite` | 5.x | Build tool |
| `hono` | 4.x | API server |
| `@hono/node-server` | 1.x | Node.js adapter |
| `typescript` | 5.x | Type safety |
| `vitest` | 2.x | Testing framework |
| `zustand` | 5.x | State management |
| `tailwindcss` | 3.x | Styling |
| `zod` | 3.x | Validation |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `eslint` | 9.x | Linting |
| `prettier` | 3.x | Formatting |
| `@testing-library/react` | 16.x | Component testing |
| `@testing-library/jest-dom` | 6.x | DOM matchers |
| `jsdom` | 25.x | Browser environment for tests |
| `concurrently` | 9.x | Parallel script execution |

### Integration Points

| Integration | Package | Epic |
|-------------|---------|------|
| LiveKit Client | `livekit-client` | Epic 2 |
| LiveKit React | `@livekit/components-react` | Epic 2 |
| LiveKit Server SDK | `livekit-server-sdk` | Epic 2 |
| Perfect Freehand | `perfect-freehand` | Epic 4 |

## Acceptance Criteria (Authoritative)

### AC-1.1: Monorepo Structure
- Repository contains `packages/client`, `packages/server`, `packages/shared`
- `pnpm-workspace.yaml` correctly defines workspace packages
- `pnpm install` succeeds from clean state
- Path aliases (`@/`, `@etch/shared`) resolve correctly

### AC-1.2: Tauri Desktop Application
- `pnpm dev:client` opens a Tauri window
- Window displays React application with shadcn/ui components
- Dark mode is default theme
- Window has native OS controls (close, minimize, maximize)
- Application builds successfully: `pnpm build:client` produces .dmg on macOS

### AC-1.3: Hono API Server
- `pnpm dev:server` starts server on port 3000
- `GET /api/health` returns `{ status: "ok", timestamp: <number> }` with status 200
- Server uses structured JSON logging
- Environment variables load from `.env` file
- CORS configured for local development

### AC-1.4: Shared Types Package
- `@etch/shared` exports all defined types (Point, Stroke, Participant, etc.)
- Types are importable in both client and server
- Constants (PARTICIPANT_COLORS, MAX_STROKE_POINTS) are exported
- Package builds to CommonJS and ESM

### AC-1.5: Testing Framework
- `pnpm test` runs tests across all packages
- `pnpm test:client`, `pnpm test:server`, `pnpm test:shared` run individually
- React Testing Library configured for component tests
- Coverage reports generated with `pnpm test:coverage`
- Test factories and mocks established per test design spec
- At least one passing test exists in each package

### AC-1.6: Development Tooling
- `pnpm dev` starts both client and server concurrently
- ESLint configured with TypeScript rules
- Prettier configured for consistent formatting
- VS Code settings and recommended extensions configured
- All scripts defined in root `package.json`

## Traceability Mapping

| AC | Spec Section | Component(s) | Test Ideas |
|----|--------------|--------------|------------|
| AC-1.1 | Project Structure | `pnpm-workspace.yaml`, `tsconfig.base.json` | Run `pnpm install` on clean clone, verify imports resolve |
| AC-1.2 | Desktop Framework | `packages/client/`, `src-tauri/` | Launch dev mode, verify window opens, test build output |
| AC-1.3 | Backend Framework | `packages/server/` | HTTP request to /api/health, verify response format |
| AC-1.4 | Data Models | `packages/shared/` | Import types in client/server, verify no TS errors |
| AC-1.5 | Testing | `vitest.workspace.ts`, `*.test.ts` | Run `pnpm test`, verify all pass, check coverage |
| AC-1.6 | Development | Root `package.json`, `.vscode/` | Run `pnpm dev`, verify concurrent startup |

## Risks, Assumptions, Open Questions

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Tauri 2.0 breaking changes | Medium | High | Pin exact version, monitor release notes |
| WebView inconsistency across platforms | Medium | Medium | Test on both macOS and Windows early |
| pnpm workspace hoisting issues | Low | Medium | Use explicit dependencies, avoid version conflicts |

### Assumptions

- Development environment has Node.js 20 LTS, Rust toolchain, pnpm 8+ installed
- macOS or Windows development machine (Linux support is post-MVP)
- Git is available for version control
- Developers have basic Rust knowledge for Tauri native features

### Open Questions

1. **Q**: Should we use `create-tauri-ui` starter or manual setup?
   **A**: Use starter per Architecture doc - provides native window controls, theming out of box.

2. **Q**: What TypeScript strict mode settings?
   **A**: Enable `strict: true` in base tsconfig for maximum type safety.

3. **Q**: Should shared package be compiled or consumed as source?
   **A**: Compiled with dual CJS/ESM output for compatibility.

## Test Strategy Summary

### Test Levels

| Level | Focus | Tools | Epic 1 Coverage |
|-------|-------|-------|-----------------|
| Unit | Individual functions, stores | Vitest | Shared types, utilities |
| Component | React components | RTL + Vitest | Basic component smoke tests |
| Integration | API endpoints | Vitest + supertest | Health endpoint |

### Testing Infrastructure (per Story 1.4)

**Configuration:**
```
packages/
├── client/vitest.config.ts      # jsdom environment
├── server/vitest.config.ts      # node environment
├── shared/vitest.config.ts      # node environment
└── vitest.workspace.ts          # workspace orchestration
```

**Test Factories (in @etch/shared):**
- `createMockStroke(overrides?)` - Stroke with defaults
- `createMockParticipant(overrides?)` - Participant with role
- `createMockHost()`, `createMockViewer()` - Role-specific helpers

**Coverage Thresholds:**
- Initial: 60% lines/branches/functions/statements
- Critical paths (stores, utils): 80% target

### Frameworks & Tools

- **Vitest**: Test runner, native Vite integration
- **React Testing Library**: Component testing
- **@testing-library/jest-dom**: DOM assertions
- **jsdom**: Browser environment simulation

---

*Generated by BMad Method Epic Tech Context Workflow*
*Date: 2025-11-30*
