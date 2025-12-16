# Epic 7: Self-Hosting & Deployment

**Goal:** Enable teams to deploy and run their own NAMELESS instance with minimal friction - Docker Compose deployment, clear documentation, and production-ready configuration.

**User Value:** After this epic, a developer can self-host NAMELESS and run a meeting within 30 minutes (per MVP success criteria).

**FRs Addressed:** FR51, FR52, FR53, FR54, FR55, FR56

---

## Story 7.1: Create Docker Compose Deployment Configuration

**As a** system administrator,
**I want** to deploy NAMELESS with Docker Compose,
**So that** I can run the platform on my own infrastructure with minimal setup.

**Acceptance Criteria:**

**Given** a server with Docker and Docker Compose installed
**When** I run `docker compose up -d`
**Then** NAMELESS is running and accessible

**And** the Docker Compose file includes:
```yaml
services:
  nameless-server:    # Hono API server
  livekit:            # LiveKit SFU
  redis:              # LiveKit state (if needed)
```

**And** configuration is done via `.env` file:
```
# Required
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret

# Optional (with sensible defaults)
SERVER_PORT=3000
LIVEKIT_URL=ws://livekit:7880
PUBLIC_URL=https://your-domain.com
```

**And** the setup process:
  1. Clone repository
  2. Copy `.env.example` to `.env`
  3. Edit `.env` with secrets
  4. Run `docker compose up -d`
  5. Access at `http://localhost:3000`

**And** containers restart automatically on failure

**Prerequisites:** Story 1.2

**Technical Notes:**
- Create `docker-compose.yml` in repository root
- Create `docker-compose.prod.yml` for production overrides
- Use official LiveKit Docker image
- Server Dockerfile: multi-stage build for small image
- Include health checks for all services

---

## Story 7.2: Create Server Dockerfile with Multi-Stage Build

**As a** developer,
**I want** an optimized Docker image for the NAMELESS server,
**So that** deployments are fast and efficient.

**Acceptance Criteria:**

**Given** the server codebase
**When** I build the Docker image
**Then** I get a minimal, production-ready image

**And** the Dockerfile uses multi-stage build:
  - Stage 1: Build (Node.js + TypeScript compilation)
  - Stage 2: Production (Node.js runtime only)

**And** the final image:
  - Is based on `node:20-alpine` (small base)
  - Is < 200MB in size
  - Contains only production dependencies
  - Runs as non-root user
  - Exposes port 3000

**And** the build process:
```bash
docker build -t nameless-server:latest ./packages/server
```

**Prerequisites:** Story 1.2

**Technical Notes:**
- Dockerfile location: `packages/server/Dockerfile`
- Use `.dockerignore` to exclude unnecessary files
- Copy only `dist/` and `node_modules/` to final stage
- Set `NODE_ENV=production`
- Use `tini` as init process for proper signal handling

---

## Story 7.3: Implement Health Check Endpoints

**As a** system administrator,
**I want** health check endpoints for monitoring,
**So that** I can verify the system is running correctly.

**Acceptance Criteria:**

**Given** the server is running
**When** I call the health endpoints
**Then** I receive status information

**And** endpoints provided:

**`GET /api/health`** - Basic health check:
```json
{
  "status": "ok",
  "timestamp": 1732968000000,
  "version": "1.0.0"
}
```

**`GET /api/health/ready`** - Readiness check (all dependencies up):
```json
{
  "status": "ready",
  "checks": {
    "livekit": "connected",
    "server": "ok"
  }
}
```
Returns 503 if any check fails.

**`GET /api/health/live`** - Liveness check (is process alive):
```json
{
  "status": "alive"
}
```

**And** health checks are used by:
  - Docker Compose health check
  - Kubernetes probes (if used)
  - External monitoring systems

**Prerequisites:** Story 1.2

**Technical Notes:**
- Implement in `packages/server/src/routes/health.ts`
- Check LiveKit connectivity via SDK
- Version from `package.json`
- Response time should be < 100ms

---

## Story 7.4: Write Self-Hosting Documentation

**As a** developer wanting to self-host,
**I want** clear documentation to guide me through deployment,
**So that** I can set up NAMELESS without external support.

**Acceptance Criteria:**

**Given** I want to deploy NAMELESS
**When** I read the documentation
**Then** I have all information needed to succeed

**And** documentation includes:

**`README.md`** (repository root):
  - Project overview and features
  - Quick start (3-step deployment)
  - Link to full documentation
  - Screenshots/demo

**`docs/self-hosting.md`**:
  - Prerequisites (Docker, ports, resources)
  - Step-by-step deployment guide
  - Configuration options (all env vars)
  - Reverse proxy setup (nginx, Caddy examples)
  - SSL/TLS configuration
  - Troubleshooting common issues

**`docs/architecture.md`**:
  - System components overview
  - Network diagram
  - Port requirements
  - Data flow explanation

**And** documentation is:
  - Written for developers (technical but clear)
  - Tested by following steps on fresh system
  - Includes copy-pasteable commands

**Prerequisites:** Story 7.1, 7.3

**Technical Notes:**
- Use GitHub-flavored markdown
- Include diagrams (Mermaid for architecture)
- Provide configuration examples, not just descriptions
- Add FAQ section based on anticipated questions

---

## Story 7.5: Implement Update Notification System

**As a** user,
**I want** to be notified when updates are available,
**So that** I can keep my application current.

**Acceptance Criteria:**

**Given** I'm running the NAMELESS desktop app
**When** a new version is available
**Then** I see a notification about the update

**And** the notification shows:
  - "Update available: v1.1.0"
  - "What's new" link (changelog)
  - "Download" button (links to releases page)
  - "Remind me later" option

**And** notification behavior:
  - Check for updates on app launch (after 5 second delay)
  - Check daily while app is running
  - Don't interrupt meetings (show in home screen only)
  - Respect "remind me later" for 24 hours

**And** update check:
  - Compares local version with GitHub releases API
  - Works for self-hosted instances (configurable update URL)
  - Fails gracefully if offline (no error shown)

**Prerequisites:** Story 2.3

**Technical Notes:**
- Use GitHub releases API: `https://api.github.com/repos/org/nameless/releases/latest`
- Store dismissed version in settings
- Tauri can handle auto-update, but start with notification only
- Version comparison: semver

---

## Story 7.6: Implement Recent Rooms History

**As a** user,
**I want** to access my recent rooms from the application,
**So that** I can quickly rejoin rooms I've used before.

**Acceptance Criteria:**

**Given** I've joined rooms in the past
**When** I open the NAMELESS app
**Then** I see my recent rooms on the home screen

**And** recent rooms display:
  - Room name/ID
  - Last joined timestamp ("2 hours ago", "Yesterday")
  - Quick "Rejoin" button
  - Remove from history option

**And** behavior:
  - Maximum 10 recent rooms stored
  - Oldest entries removed when limit reached
  - Rooms that no longer exist show "Room ended" (can't rejoin)
  - History is stored locally only

**And** privacy:
  - Clear history option in settings
  - History not synced anywhere

**Prerequisites:** Story 2.14

**Technical Notes:**
- Store in settingsStore (localStorage)
- Structure: `{ roomId, name, lastJoined, serverUrl }`
- Check room existence before showing "Rejoin" as active
- Add to history on successful join, update on rejoin

---

## Story 7.7: Create Production Build and Release Pipeline

**As a** maintainer,
**I want** an automated build and release pipeline,
**So that** releases are consistent and easy to publish.

**Acceptance Criteria:**

**Given** code is merged to main branch
**When** a release is tagged
**Then** builds are automatically created

**And** the pipeline produces:
  - macOS DMG (Universal: Intel + Apple Silicon)
  - Windows installer (NSIS or MSI)
  - Docker images pushed to registry
  - Server build artifacts

**And** release process:
  1. Create git tag: `git tag v1.0.0`
  2. Push tag: `git push origin v1.0.0`
  3. CI builds all artifacts
  4. Draft GitHub release created with artifacts
  5. Manual review and publish

**And** build artifacts include:
  - Code signing (macOS notarization, Windows signing)
  - Version embedded in app
  - Changelog generated from commits

**Prerequisites:** Story 1.5

**Technical Notes:**
- Use GitHub Actions for CI/CD
- Tauri's GitHub Action for desktop builds
- Docker buildx for multi-arch images
- Store signing certificates in GitHub Secrets
- Use `tauri-action` for cross-platform builds

---

## Story 7.8: Implement LiveKit Integration Configuration

**As a** system administrator,
**I want** to configure NAMELESS to use my LiveKit instance,
**So that** media traffic stays within my infrastructure.

**Acceptance Criteria:**

**Given** I have a self-hosted LiveKit instance
**When** I configure NAMELESS
**Then** all media flows through my LiveKit server

**And** configuration options:
```env
# LiveKit connection
LIVEKIT_URL=wss://livekit.mycompany.com
LIVEKIT_API_KEY=APIxxxxxxxx
LIVEKIT_API_SECRET=xxxxxxxxxxxxxxxx

# Optional: separate WebSocket URL for clients
LIVEKIT_WS_URL=wss://livekit.mycompany.com

# Token settings
TOKEN_EXPIRY_SECONDS=3600
```

**And** the server validates configuration on startup:
  - Tests LiveKit connectivity
  - Logs configuration (without secrets)
  - Fails fast with clear error if LiveKit unreachable

**And** documentation covers:
  - LiveKit self-hosting guide link
  - Recommended LiveKit configuration
  - Firewall/port requirements
  - Load balancing considerations

**Prerequisites:** Story 7.1, 7.4

**Technical Notes:**
- Validate environment variables on server start
- Use LiveKit SDK to test connection
- Log: "Connected to LiveKit at wss://..."
- Error: "Failed to connect to LiveKit: [reason]"

---

## Story 7.9: Implement Auto-Update for Desktop Client

**As a** user,
**I want** the app to automatically update itself,
**So that** I always have the latest features and security fixes without manual intervention.

**Acceptance Criteria:**

**Given** a new version is available
**When** the app checks for updates (on startup and periodically)
**Then** a notification appears indicating an update is available

**And** the update flow:
  1. App checks update server for new version
  2. If update available, shows notification: "Update available (v1.2.0)"
  3. User clicks "Update Now" or "Later"
  4. If "Update Now": downloads update in background with progress
  5. Shows "Restart to complete update" when ready
  6. On restart, new version is active

**And** the update is seamless:
  - Download happens in background (non-blocking)
  - Progress indicator shows download status
  - Update is verified (signature check) before applying
  - Rollback on failure (keep current version)

**And** update settings:
  - Check frequency: configurable (default: on app launch)
  - Auto-download: optional (default: prompt before download)
  - Release channel: stable (future: beta channel)

**And** the update server is configurable for self-hosted:
  - Default: GitHub Releases
  - Self-hosted option: custom update server URL

**Prerequisites:** Story 1.1 (Tauri setup)

**Technical Notes:**
- Use Tauri's built-in updater (`tauri-plugin-updater`)
- Update manifest on GitHub Releases or self-hosted
- Signing key for update verification (code signing)
- Update JSON format:
```json
{
  "version": "1.2.0",
  "notes": "Bug fixes and improvements",
  "pub_date": "2025-01-15T12:00:00Z",
  "platforms": {
    "darwin-aarch64": { "url": "...", "signature": "..." },
    "darwin-x86_64": { "url": "...", "signature": "..." },
    "windows-x86_64": { "url": "...", "signature": "..." }
  }
}
```
- Handle: update in progress, update failed, already latest
- Research validated: auto-update is part of "premium feel"

**FRs Addressed:** FR57 (enhanced from notification to full auto-update)

---
