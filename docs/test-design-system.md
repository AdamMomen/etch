# System-Level Test Design

**Date:** 2025-11-30
**Author:** BMad
**Project:** Etch - Open-Source Meeting Platform with Annotations
**Status:** Approved for Implementation

---

## Executive Summary

This document defines the system-level testability assessment and test strategy for Etch before entering Phase 3 (Implementation). It ensures the architecture supports comprehensive testing and identifies any concerns that could impede quality assurance.

**Assessment Result:** **PASS** - Architecture is testable with minor concerns noted.

**Key Findings:**
- Controllability: PASS
- Observability: CONCERNS (real-time timing)
- Reliability: CONCERNS (network variability)
- No blocking issues identified

---

## Testability Assessment

### Controllability: PASS

| Criterion | Assessment | Evidence |
|-----------|------------|----------|
| Control system state for testing | ✅ | Zustand stores allow direct state manipulation; `useAnnotationStore.setState()` for test setup |
| Mock external dependencies | ✅ | Architecture uses hooks/providers pattern; LiveKit can be mocked via `jest.mock('livekit-client')` |
| API seeding / data factories | ✅ | No persistent database; session-based means clean state per test |
| Trigger error conditions | ✅ | DataTrack handlers accept any message; network conditions simulatable |
| Dependency injection available | ✅ | React context for services; Hono middleware for server |

**Notes:**
- Session-based architecture (no database) simplifies test isolation
- Zustand's design allows direct store manipulation without UI interaction
- LiveKit client can be fully mocked for unit/integration tests

### Observability: CONCERNS

| Criterion | Assessment | Evidence |
|-----------|------------|----------|
| Inspect system state | ✅ | Zustand `getState()` exposes current state; structured JSON logging |
| Test results deterministic | ⚠️ | Real-time sync (<200ms target) may have timing-dependent behavior |
| Validate NFRs measurable | ✅ | Latency can be measured via timestamps; memory via DevTools |
| Logging structured | ✅ | Architecture specifies structured JSON logging to stdout |
| Metrics available | ✅ | Performance.now() for timing; LiveKit stats API |

**Concerns:**
- **Timing-dependent tests**: Tests that assert on <200ms latency may be flaky depending on test environment
- **Mitigation**: Use generous thresholds in CI (e.g., <500ms); strict timing only in performance-specific test suite

### Reliability: CONCERNS

| Criterion | Assessment | Evidence |
|-----------|------------|----------|
| Tests isolated | ✅ | No shared state between tests; Zustand stores reset |
| Parallel-safe | ✅ | No database; session isolation |
| Reproduce failures | ⚠️ | WebRTC/DataTrack has inherent network variability |
| Components loosely coupled | ✅ | Monorepo with shared types; clear package boundaries |
| Cleanup discipline | ✅ | Session-based; no persistent state to clean |

**Concerns:**
- **Network variability**: DataTrack tests may fail intermittently in CI due to network conditions
- **Mitigation**: Mock DataTrack for unit tests; use deterministic waits; retry flaky E2E tests

---

## Architecturally Significant Requirements (ASRs)

Requirements that drive architecture decisions and pose testability challenges:

| ASR ID | Requirement | Source | Probability | Impact | Score | Testing Strategy |
|--------|-------------|--------|-------------|--------|-------|------------------|
| **ASR-1** | Annotation latency <200ms | PRD NFR | 2 | 3 | **6** | Measure DataTrack round-trip; local render timing |
| **ASR-2** | 60fps canvas rendering | Architecture | 2 | 2 | 4 | Performance profiling; FPS counter |
| **ASR-3** | JWT token security | Architecture | 2 | 3 | **6** | Auth bypass tests; token validation |
| **ASR-4** | Self-hosting auto-HTTPS | PRD FR53-56 | 1 | 3 | 3 | Docker Compose integration test |
| **ASR-5** | Cross-platform (macOS/Windows) | PRD FR47-48 | 3 | 2 | **6** | CI matrix for both platforms |
| **ASR-6** | Windows transparent overlay | ADR-003 | 2 | 3 | **6** | Platform-specific validation; POC first |
| **ASR-7** | Late-joiner sync | Architecture | 2 | 2 | 4 | Multi-client test scenario |
| **ASR-8** | Memory <1GB active | Architecture | 1 | 3 | 3 | Memory profiling in long-running tests |

**High-Priority ASRs (Score ≥6):** ASR-1, ASR-3, ASR-5, ASR-6

---

## Test Levels Strategy

Based on architecture: Tauri desktop app, React UI, Hono API, LiveKit WebRTC, real-time DataTrack sync.

### Recommended Distribution

| Level | Percentage | Test Count (Est.) | Rationale |
|-------|------------|-------------------|-----------|
| **Unit** | 50% | ~150 tests | Core logic: stores, utils, serialization, coordinate transforms |
| **Integration/API** | 30% | ~90 tests | Server routes, token generation, LiveKit mock integration |
| **E2E** | 15% | ~45 tests | Critical user journeys with real Tauri app |
| **Component** | 5% | ~15 tests | UI components with React Testing Library |

### Test Distribution by Package

| Package | Unit | Integration | Component | E2E |
|---------|------|-------------|-----------|-----|
| `@etch/shared` | 30 | - | - | - |
| `@etch/server` | 40 | 60 | - | - |
| `@etch/client` | 80 | 30 | 15 | 45 |

### Framework Selection

| Level | Framework | Rationale |
|-------|-----------|-----------|
| Unit | Vitest | Native Vite integration; Jest-compatible; fast |
| Integration | Vitest + Supertest | Hono testing with HTTP assertions |
| Component | Vitest + React Testing Library | DOM testing; accessibility queries |
| E2E | Playwright | Cross-browser; Tauri support via WebDriver |

---

## NFR Testing Approach

### Performance (ASR-1, ASR-2, ASR-8)

| Metric | Target | Test Approach | Tools |
|--------|--------|---------------|-------|
| Annotation latency | <200ms | Timestamp messages; measure round-trip | Custom timing harness |
| Canvas rendering | 60fps | FPS counter during annotation stress | Performance observer |
| Memory (active) | <1GB | Long-running session with many strokes | Chrome DevTools / process monitoring |
| Memory (idle) | <500MB | Baseline measurement after startup | Process monitoring |
| CPU during share | <30% | Monitor during screen share + annotation | Process monitoring |

**Test Approach:**
1. Unit tests verify logic correctness (synchronous, fast)
2. Integration tests verify message flow (mock network)
3. Performance suite (separate, run nightly) validates timing targets

### Security (ASR-3)

| Test Type | Coverage | Tools |
|-----------|----------|-------|
| JWT validation | Token expiry, invalid signatures, tampered payload | Vitest |
| Role authorization | Host/Sharer/Annotator/Viewer permission matrix | Vitest + API tests |
| Auth bypass attempts | Direct API access without token; invalid room IDs | Supertest |
| Input validation | Malformed messages; XSS in display names | Vitest |

**Test Approach:**
1. Server-side token validation tests (unit)
2. Permission matrix tests for all role combinations (integration)
3. No OWASP top 10 vulnerabilities in API (manual review + automated)

### Reliability (ASR-7)

| Scenario | Test Approach |
|----------|---------------|
| Network disconnect/reconnect | Mock connection drop; verify state recovery |
| Late-joiner sync | Multi-client test; verify snapshot delivery |
| Message ordering | Simulate out-of-order messages; verify handling |
| Concurrent annotations | Multiple clients drawing simultaneously |

**Test Approach:**
1. Mock network conditions in integration tests
2. Multi-process E2E tests for concurrent scenarios
3. Chaos testing for reconnection (post-MVP)

### Maintainability

| Metric | Target | Enforcement |
|--------|--------|-------------|
| Code coverage (critical paths) | ≥80% | Vitest coverage report; CI gate |
| Code coverage (overall) | ≥60% | Informational |
| TypeScript strict mode | 100% | tsconfig.json `strict: true` |
| ESLint/Prettier | 0 errors | CI gate |

---

## Test Environment Requirements

### Local Development

```yaml
Environment: Local
Tools:
  - Vitest (unit, integration, component)
  - React Testing Library
  - Mock LiveKit server OR local LiveKit Docker
Requirements:
  - Node.js 20 LTS
  - pnpm 8+
  - Docker (for LiveKit)
```

### CI/CD

```yaml
Environment: GitHub Actions
Matrix:
  - OS: [macos-latest, windows-latest]
  - Node: [20]
Tools:
  - Vitest for unit/integration/component
  - Playwright for E2E
  - Docker for LiveKit (Linux runners only)
Requirements:
  - macOS runner for Tauri macOS build
  - Windows runner for Tauri Windows build
  - Self-hosted runners optional for E2E with real LiveKit
```

### E2E Test Environment

```yaml
Environment: Playwright + Tauri
Components:
  - Built Tauri app (.dmg / .msi)
  - Local or staging LiveKit server
  - Test server instance
Challenges:
  - Tauri apps require desktop environment
  - Consider headless mode limitations
  - May need self-hosted runners for reliable E2E
```

---

## Testability Concerns

### Concern 1: WebRTC/DataTrack Network Variability

**Severity:** Medium
**Impact:** Flaky E2E tests; intermittent CI failures
**Mitigation:**
1. Mock DataTrack for unit and integration tests
2. Use deterministic waits (not timing-based assertions)
3. Retry flaky E2E tests (max 2 retries)
4. Separate "network-dependent" tests into optional suite

### Concern 2: Cross-Platform Testing Complexity

**Severity:** Medium
**Impact:** Need CI runners for macOS and Windows; increased CI time
**Mitigation:**
1. GitHub Actions matrix with macos-latest and windows-latest
2. Prioritize macOS for development (more stable Tauri)
3. Run Windows tests on PR to main only (not every commit)
4. Platform-specific tests tagged and filterable

### Concern 3: Transparent Overlay Visual Testing

**Severity:** High
**Impact:** Hard to automate visual verification of overlay correctness
**Mitigation:**
1. Create manual testing checklist for overlay behavior
2. Screenshot comparison for regression (Playwright visual comparison)
3. POC validation before full implementation (per Story 3.6 update)
4. Platform-specific acceptance criteria documented

### Concern 4: Real-Time Sync Timing Assertions

**Severity:** Medium
**Impact:** Timing-dependent tests may pass locally, fail in CI
**Mitigation:**
1. Avoid asserting on exact timing in unit/integration tests
2. Performance timing tests in dedicated suite with relaxed thresholds
3. Use state-based assertions ("stroke appeared") not timing ("in <200ms")
4. Performance monitoring in production (post-MVP)

---

## Recommendations for Sprint 0 / Epic 1

### Immediate Actions

1. **Story 1.4 (Vitest Setup):**
   - Configure Vitest with coverage reporting
   - Set up path aliases for clean imports
   - Create test utilities package
   - Configure CI coverage gate (60% initial, 80% for critical paths)

2. **Test Data Factories:**
   - Create `createMockStroke()`, `createMockParticipant()` factories
   - Use Faker.js for realistic test data
   - Auto-cleanup patterns for Zustand stores

3. **Mock Infrastructure:**
   - Create `MockLiveKitRoom` for client tests
   - Create `MockDataTrack` for annotation sync tests
   - Document mock usage patterns

4. **CI Pipeline:**
   - Run `testarch/ci` workflow to generate GitHub Actions config
   - Matrix for macOS + Windows
   - Separate E2E workflow (longer timeout)

### Test Priorities for Epic 1

| Story | Test Priority | Test Focus |
|-------|---------------|------------|
| 1.1 (Monorepo) | P2 | Build verification only |
| 1.2 (Hono Server) | P1 | Health endpoint test |
| 1.3 (Shared Types) | P0 | Type validation tests |
| 1.4 (Vitest) | P0 | Framework verification |
| 1.5 (CI/CD) | P1 | Pipeline runs successfully |

---

## Quality Gate Criteria

### Before Implementation (Phase 3 Entry)

- [x] Testability assessment complete
- [x] Test levels strategy defined
- [x] NFR testing approach documented
- [x] Concerns identified with mitigations
- [x] No blocking testability issues

### Per Epic (During Implementation)

- [ ] P0 tests pass (100%)
- [ ] P1 tests pass (≥95%)
- [ ] Coverage meets targets (critical paths ≥80%)
- [ ] No high-risk items unmitigated

### Before Release (MVP)

- [ ] All P0 tests pass (100%)
- [ ] All P1 tests pass (≥95%)
- [ ] Security tests pass (100%)
- [ ] Performance targets validated
- [ ] Cross-platform tests pass (macOS + Windows)
- [ ] Manual overlay testing complete

---

## Appendix

### A. FR to Test Level Mapping

| FR Category | Recommended Test Level | Rationale |
|-------------|----------------------|-----------|
| Meeting & Room (FR1-7) | Integration + E2E | API contracts + user journeys |
| Audio & Video (FR8-14) | Integration | LiveKit mock; hard to test real media |
| Screen Sharing (FR15-20) | Integration + E2E | Platform-specific; E2E for overlay |
| Annotation System (FR21-30) | Unit + Integration | Core value; heavy unit coverage |
| Permission & Roles (FR31-37) | Unit + Integration | Permission matrix tests |
| Authentication (FR38-41) | Unit + Integration | Token validation |
| Connection & State (FR42-46) | Integration | Network condition simulation |
| Desktop App (FR47-52) | E2E | Platform-specific behavior |
| Self-Hosting (FR53-56) | Integration | Docker Compose validation |

### B. Technology Stack Testing Compatibility

| Technology | Testability | Notes |
|------------|-------------|-------|
| Tauri 2.0 | Good | WebDriver support; Playwright integration available |
| React 18 | Excellent | React Testing Library well-supported |
| Zustand | Excellent | Direct state manipulation; no provider wrapping |
| Hono | Excellent | Test client built-in; Supertest compatible |
| LiveKit | Moderate | Official test utilities limited; mocking required |
| Canvas 2D | Moderate | Visual testing challenging; mock context available |

### C. Related Documents

- PRD: `docs/prd.md`
- Architecture: `docs/architecture.md`
- Epics & Stories: `docs/epics.md`
- UX Design: `docs/ux-design-specification.md`
- Implementation Readiness: `docs/implementation-readiness-report-2025-11-30.md`

---

**Generated by:** BMad TEA Agent - Test Architect Module
**Workflow:** `.bmad/bmm/workflows/testarch/test-design`
**Version:** 4.0 (BMad v6)
