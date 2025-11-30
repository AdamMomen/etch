# Story 1.2: Configure Hono API Server with Health Endpoint

Status: done

## Story

As a **developer**,
I want **a minimal Hono API server in the monorepo**,
so that **I have a backend ready for room management and token generation**.

## Acceptance Criteria

1. **AC-1.2.1: Server Startup**
   - Given the monorepo from Story 1.1
   - When I run `pnpm dev:server`
   - Then the Hono server starts on port 3000
   - And a log message indicates the server is listening

2. **AC-1.2.2: Health Endpoint**
   - Given the server is running
   - When I send `GET /api/health`
   - Then I receive status 200 with response:
     ```json
     {
       "status": "ok",
       "timestamp": 1732968000000
     }
     ```

3. **AC-1.2.3: TypeScript Configuration**
   - Given the server code
   - When I examine the configuration
   - Then it uses TypeScript with ES modules (`"type": "module"`)
   - And it extends the base TypeScript config

4. **AC-1.2.4: Environment Variables**
   - Given the server directory
   - When I examine the configuration
   - Then environment variables are loaded from `.env` file
   - And a `.env.example` file exists with:
     - `PORT` (default: 3000)
     - `LIVEKIT_URL` (placeholder)
     - `LIVEKIT_API_KEY` (placeholder)
     - `LIVEKIT_API_SECRET` (placeholder)

5. **AC-1.2.5: Structured Logging**
   - Given the server is running
   - When requests are processed
   - Then the server outputs structured JSON logs to stdout
   - And logs include timestamp, level, and message

6. **AC-1.2.6: CORS Configuration**
   - Given the server is running
   - When I make a request from `localhost:5173` (client)
   - Then the request is allowed (CORS headers present)
   - And credentials are supported

7. **AC-1.2.7: Project Structure**
   - Given the server package
   - When I examine the directory structure
   - Then it matches the architecture specification:
     ```
     packages/server/
     ├── src/
     │   ├── index.ts         # Server entry point
     │   ├── routes/          # API endpoints
     │   │   └── health.ts
     │   ├── services/        # Business logic (placeholder)
     │   └── middleware/      # HTTP middleware
     │       └── logger.ts
     ├── package.json
     ├── tsconfig.json
     └── .env.example
     ```

## Tasks / Subtasks

- [x] **Task 1: Initialize Server Package** (AC: 1.2.3, 1.2.7)
  - [x] Update `packages/server/package.json` with dependencies:
    - `hono` (^4.x)
    - `@hono/node-server` (^1.x)
    - `zod` (^3.x) for future validation
  - [x] Add dev dependencies: `typescript`, `tsx`, `@types/node`
  - [x] Create `tsconfig.json` extending `../../tsconfig.base.json`
  - [x] Add scripts: `dev`, `build`, `start`

- [x] **Task 2: Create Server Entry Point** (AC: 1.2.1)
  - [x] Create `src/index.ts` with Hono app initialization
  - [x] Configure `@hono/node-server` to listen on `PORT` env var (default 3000)
  - [x] Add startup log message with port number

- [x] **Task 3: Implement Health Endpoint** (AC: 1.2.2)
  - [x] Create `src/routes/health.ts` with health route handler
  - [x] Return `{ status: "ok", timestamp: Date.now() }` with status 200
  - [x] Export route for mounting in main app

- [x] **Task 4: Configure Environment Variables** (AC: 1.2.4)
  - [x] Install `dotenv` or use Node.js native env loading
  - [x] Create `.env.example` with all required variables
  - [x] Load `.env` file in development
  - [x] Add `.env` to `.gitignore` (if not already)

- [x] **Task 5: Implement Structured Logger Middleware** (AC: 1.2.5)
  - [x] Create `src/middleware/logger.ts`
  - [x] Output JSON format: `{ timestamp, level, message, method?, path?, status?, duration? }`
  - [x] Log incoming requests and response status
  - [x] Register middleware globally

- [x] **Task 6: Configure CORS Middleware** (AC: 1.2.6)
  - [x] Use Hono's built-in CORS middleware
  - [x] Allow origin: `http://localhost:5173`
  - [x] Allow credentials
  - [x] Configure allowed methods: GET, POST, PUT, DELETE, OPTIONS

- [x] **Task 7: Update Root Scripts** (AC: 1.2.1)
  - [x] Add `dev:server` script to root `package.json`
  - [x] Update `dev` script to run client only (server will be added to concurrent run later)
  - [x] Add `build:server` script

- [x] **Task 8: Write Server Tests** (AC: 1.2.2)
  - [x] Create `src/routes/health.test.ts`
  - [x] Test health endpoint returns 200 with correct format
  - [x] Test timestamp is a valid number
  - [x] Configure Vitest for server package

## Dev Notes

### Architecture Patterns

Per `docs/architecture.md`:
- **Backend Framework**: Hono 4.x (lightweight, TypeScript-first)
- **Runtime**: Node.js with `@hono/node-server`
- **Validation**: Zod for request/response validation (used in later stories)

### Hono Server Setup

```typescript
// src/index.ts
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { healthRouter } from './routes/health'
import { logger } from './middleware/logger'

const app = new Hono()

app.use('*', logger())
app.use('*', cors({
  origin: ['http://localhost:5173'],
  credentials: true,
}))

app.route('/api', healthRouter)

const port = parseInt(process.env.PORT || '3000', 10)
serve({ fetch: app.fetch, port }, (info) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: `Server started on port ${info.port}`,
  }))
})
```

[Source: docs/architecture.md#Backend-Framework]

### Environment Variables

Required variables for full system (some used in later stories):
```env
# Server
PORT=3000

# LiveKit (used in Story 2.1+)
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
```

[Source: docs/sprint-artifacts/tech-spec-epic-1.md#AC-1.3]

### Project Structure Notes

Server file structure per Architecture doc:
- `src/routes/` - API endpoint handlers (Hono routers)
- `src/services/` - Business logic (placeholder for now)
- `src/middleware/` - HTTP middleware (logger, CORS, auth later)

### Learnings from Previous Story

**From Story 1-1 (Status: done)**

- **Server placeholder exists**: `packages/server/package.json` was created as placeholder
- **Monorepo structure**: pnpm workspace configured correctly
- **TypeScript base config**: Use `"extends": "../../tsconfig.base.json"` for consistency
- **ESLint config**: Root ESLint configured, server package should follow same patterns
- **Tailwind v4 migration**: Client had to update to `@tailwindcss/postcss` - server won't use Tailwind

[Source: docs/sprint-artifacts/1-1-initialize-monorepo-with-tauri-desktop-app.md#Dev-Agent-Record]

### References

- [Architecture: Backend Framework](docs/architecture.md#Backend-Framework)
- [Tech Spec: AC-1.3 Hono API Server](docs/sprint-artifacts/tech-spec-epic-1.md#AC-1.3)
- [Tech Spec: Health Check Endpoint](docs/sprint-artifacts/tech-spec-epic-1.md#Health-Check-Endpoint)
- [Hono Documentation](https://hono.dev/)
- [Hono Node Server](https://github.com/honojs/node-server)

## Dev Agent Record

### Context Reference

N/A - Direct implementation from story draft

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

N/A

### Completion Notes List

- Implemented Hono 4.x server with @hono/node-server
- Health endpoint returns `{ status: "ok", timestamp: number }` at GET /api/health
- Structured JSON logging middleware outputs timestamp, level, message, method, path, status, duration
- CORS configured for localhost:5173 with credentials support
- All 3 unit tests passing
- Server starts on port 3000 (configurable via PORT env var)

### File List

- packages/server/package.json - Updated with dependencies
- packages/server/tsconfig.json - Created with base config extension
- packages/server/vitest.config.ts - Created for testing
- packages/server/.env.example - Created with PORT and LiveKit placeholders
- packages/server/src/index.ts - Server entry point
- packages/server/src/routes/health.ts - Health endpoint router
- packages/server/src/routes/health.test.ts - Unit tests
- packages/server/src/middleware/logger.ts - Structured logging middleware
- packages/server/src/services/.gitkeep - Placeholder for business logic

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-11-30 | Initial story draft from create-story workflow | SM Agent |
| 2025-11-30 | Story completed - all 8 tasks done, all AC verified | Dev Agent |
