# Story 1.4: Set Up Vitest Testing Framework

Status: review

## Story

As a **developer**,
I want **a testing framework configured across the monorepo**,
so that **I can write and run tests for all packages**.

## Acceptance Criteria

1. **AC-1.4.1: Monorepo Test Execution**
   - Given the monorepo with client, server, and shared packages
   - When I run `pnpm test`
   - Then Vitest runs all tests across all packages
   - And all existing tests pass (server: 3 tests, shared: 24 tests)

2. **AC-1.4.2: Per-Package Test Commands**
   - Given each package has tests
   - When I run package-specific test commands
   - Then each package can run tests independently:
     - `pnpm test:client` - runs client tests
     - `pnpm test:server` - runs server tests
     - `pnpm test:shared` - runs shared tests

3. **AC-1.4.3: Co-located Test Files**
   - Given the test configuration
   - When I examine the test file patterns
   - Then test files are co-located with source files (`*.test.ts`, `*.test.tsx`)
   - And the test file pattern matches `**/*.test.ts` and `**/*.test.tsx`

4. **AC-1.4.4: React Testing Library Configuration**
   - Given the client package
   - When I write component tests
   - Then React Testing Library is available and configured
   - And `@testing-library/jest-dom` matchers are available
   - And the `jsdom` environment is configured for browser-like testing

5. **AC-1.4.5: Coverage Reports**
   - Given the testing infrastructure
   - When I run `pnpm test:coverage`
   - Then coverage reports are generated for all packages
   - And HTML coverage reports are available in a coverage directory
   - And initial threshold is set to 60% for lines/branches/functions/statements

6. **AC-1.4.6: Placeholder Tests**
   - Given the test infrastructure is complete
   - When I check each package
   - Then at least one passing test exists in each package
   - And client has at least one React component test

7. **AC-1.4.7: Workspace Configuration**
   - Given the monorepo structure
   - When I examine the Vitest configuration
   - Then `vitest.workspace.ts` exists at the root
   - And it orchestrates all package tests

8. **AC-1.4.8: Test Data Factories**
   - Given the `@nameless/shared` package
   - When I write tests
   - Then test data factories are available:
     - `createMockStroke(overrides?)` - Creates Stroke with sensible defaults
     - `createMockParticipant(overrides?)` - Creates Participant with role
     - `createMockHost()`, `createMockViewer()` - Role-specific helpers

9. **AC-1.4.9: Client Test Setup**
   - Given the client package
   - When I examine the test setup
   - Then `src/test/setup.ts` exists with:
     - `@testing-library/jest-dom` matchers
     - `afterEach` cleanup
     - `window.matchMedia` mock (for dark mode)
     - `ResizeObserver` mock (for canvas)

## Tasks / Subtasks

- [x] **Task 1: Create Workspace Configuration** (AC: 1.4.7)
  - [x] Create `vitest.workspace.ts` at repository root
  - [x] Configure workspace to include all packages: client, server, shared
  - [x] Verify workspace orchestration runs all package tests

- [x] **Task 2: Configure Client Testing Environment** (AC: 1.4.4, 1.4.9)
  - [x] Create/update `packages/client/vitest.config.ts` with jsdom environment
  - [x] Install dependencies: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`
  - [x] Create `packages/client/src/test/setup.ts` with:
    - `@testing-library/jest-dom` import for matchers
    - `afterEach` with `cleanup()` from RTL
    - `window.matchMedia` mock for dark mode testing
    - `ResizeObserver` mock for canvas components
  - [x] Configure Vitest to use setup file

- [x] **Task 3: Verify Server Testing Configuration** (AC: 1.4.2)
  - [x] Verify `packages/server/vitest.config.ts` exists with node environment
  - [x] Verify server tests (3 existing) continue to pass
  - [x] Add `test` script to server package.json if missing

- [x] **Task 4: Verify Shared Testing Configuration** (AC: 1.4.2)
  - [x] Verify `packages/shared/vitest.config.ts` exists with node environment
  - [x] Verify shared tests (24 existing) continue to pass
  - [x] Add `test` script to shared package.json if missing

- [x] **Task 5: Create Test Data Factories** (AC: 1.4.8)
  - [x] Create `packages/shared/src/test-utils/factories.ts`
  - [x] Implement `createMockStroke(overrides?)` with sensible defaults
  - [x] Implement `createMockParticipant(overrides?)` with configurable role
  - [x] Implement `createMockHost()` - shorthand for host participant
  - [x] Implement `createMockViewer()` - shorthand for viewer participant
  - [x] Export factories from shared package (via `src/test-utils/index.ts`)
  - [x] Write tests for factories to verify default values

- [x] **Task 6: Create Client Placeholder Test** (AC: 1.4.6)
  - [x] Create `packages/client/src/App.test.tsx`
  - [x] Write basic smoke test that App component renders
  - [x] Verify test passes with `pnpm test:client`

- [x] **Task 7: Configure Root Test Scripts** (AC: 1.4.1, 1.4.2, 1.4.5)
  - [x] Add to root `package.json`:
    - `"test": "vitest run"`
    - `"test:watch": "vitest"`
    - `"test:coverage": "vitest run --coverage"`
    - `"test:client": "pnpm --filter client test"`
    - `"test:server": "pnpm --filter server test"`
    - `"test:shared": "pnpm --filter shared test"`

- [x] **Task 8: Configure Coverage Thresholds** (AC: 1.4.5)
  - [x] Add coverage configuration to workspace or individual configs
  - [x] Set initial thresholds to 60% for lines, branches, functions, statements
  - [x] Configure HTML reporter output to `coverage/` directory
  - [x] Verify `pnpm test:coverage` generates reports

- [x] **Task 9: Integration Verification** (AC: 1.4.1, 1.4.2)
  - [x] Run `pnpm test` from root - verify all packages' tests run
  - [x] Run `pnpm test:client` - verify client tests only
  - [x] Run `pnpm test:server` - verify server tests only
  - [x] Run `pnpm test:shared` - verify shared tests only
  - [x] Run `pnpm test:coverage` - verify coverage report generation
  - [x] Verify total test count matches expected (3 server + 24 shared + 1+ client = 28+)

## Dev Notes

### Architecture Patterns

Per `docs/architecture.md`:
- **Testing Framework**: Vitest - native Vite integration, fast, Jest-compatible
- **Component Testing**: React Testing Library for testing React components
- **Test Location**: Co-located with source files (`*.test.ts`)
- **Coverage**: 60% initial threshold, 80% target for critical paths (stores, utils)

[Source: docs/architecture.md#Testing-Strategy]

### Tech Spec Requirements

Per `docs/sprint-artifacts/tech-spec-epic-1.md`:

**Configuration Structure:**
```
packages/
├── client/
│   ├── vitest.config.ts      # jsdom environment, React plugin
│   └── src/test/setup.ts     # RTL cleanup, window mocks
├── server/
│   └── vitest.config.ts      # node environment
├── shared/
│   └── vitest.config.ts      # node environment
└── vitest.workspace.ts       # Workspace orchestration
```

**Coverage Thresholds:**
```typescript
thresholds: {
  lines: 60,
  branches: 60,
  functions: 60,
  statements: 60,
}
```

[Source: docs/sprint-artifacts/tech-spec-epic-1.md#Test-Strategy-Summary]

### Project Structure Notes

- Test files go alongside source: `src/stores/annotationStore.ts` → `src/stores/annotationStore.test.ts`
- Component tests: `src/components/AnnotationToolbar/AnnotationToolbar.test.tsx`
- Setup file at `src/test/setup.ts` for environment configuration

[Source: docs/architecture.md#Code-Organization]

### Learnings from Previous Story

**From Story 1-3-create-shared-types-package (Status: done)**

- **Vitest already configured**: Shared package has working Vitest setup - use same pattern
- **24 tests passing**: Shared package tests work, don't break them
- **TypeScript config pattern**: Extend `../../tsconfig.base.json` for consistency
- **Server has Vitest**: Server package has 3 tests passing - extend don't replace
- **Test file pattern**: Use `*.test.ts` convention established in shared package
- **File structure**: `src/` directory with subdirectories by concern

**Review Findings Applied:**
- Integration tests important - previous story had gap where package integration wasn't truly tested
- Consider adding integration test that imports from `@nameless/shared` in server/client packages

[Source: docs/sprint-artifacts/1-3-create-shared-types-package.md#Dev-Agent-Record]

### Required Dependencies

**Root (devDependencies):**
- `@vitest/coverage-v8` - Coverage provider

**Client (devDependencies):**
- `vitest` - Test runner
- `@testing-library/react` - React component testing
- `@testing-library/jest-dom` - Custom matchers
- `jsdom` - Browser environment simulation
- `@vitejs/plugin-react` - React plugin (likely already installed)

### Test Factory Examples

```typescript
// packages/shared/src/test-utils/factories.ts
import type { Stroke, Participant, Point } from '../types';
import { PARTICIPANT_COLORS } from '../constants';

export function createMockStroke(overrides?: Partial<Stroke>): Stroke {
  return {
    id: 'stroke-1',
    participantId: 'participant-1',
    tool: 'pen',
    color: PARTICIPANT_COLORS[0],
    points: [{ x: 0.5, y: 0.5 }],
    createdAt: Date.now(),
    ...overrides,
  };
}

export function createMockParticipant(overrides?: Partial<Participant>): Participant {
  return {
    id: 'participant-1',
    name: 'Test User',
    role: 'annotator',
    color: PARTICIPANT_COLORS[0],
    isLocal: false,
    ...overrides,
  };
}

export function createMockHost(): Participant {
  return createMockParticipant({ role: 'host', name: 'Host User' });
}

export function createMockViewer(): Participant {
  return createMockParticipant({ role: 'viewer', name: 'Viewer User' });
}
```

### References

- [Architecture: Testing Strategy](docs/architecture.md#Testing-Strategy)
- [Tech Spec: AC-1.5 Testing Framework](docs/sprint-artifacts/tech-spec-epic-1.md#AC-1.5)
- [Tech Spec: Test Strategy Summary](docs/sprint-artifacts/tech-spec-epic-1.md#Test-Strategy-Summary)
- [Epics: Story 1.4](docs/epics.md#Story-1.4)
- [Vitest Workspace Configuration](https://vitest.dev/guide/workspace.html)
- [React Testing Library Setup](https://testing-library.com/docs/react-testing-library/setup)

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/1-4-set-up-vitest-testing-framework.context.xml

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Implementation plan: Configure vitest workspace, enhance client setup file with mocks, create test factories, add root scripts with coverage

### Completion Notes List

- vitest.workspace.ts already existed and was properly configured - leveraged existing setup
- Enhanced client test setup with afterEach cleanup, window.matchMedia mock, and ResizeObserver mock
- Created comprehensive test data factories in @nameless/shared: createMockStroke, createMockPoint, createMockParticipant, createMockHost, createMockViewer, createMockSharer (bonus)
- Added 12 factory tests to verify default values and override behavior
- Created App.test.tsx with 4 React component tests using RTL
- Configured root package.json with test:client, test:server, test:shared, test:watch, and test:coverage scripts
- Added @vitest/coverage-v8 dependency (matched to vitest 2.x version)
- Created vitest.config.ts at root with 60% coverage thresholds and proper include/exclude patterns
- Total tests: 43 (4 client + 3 server + 36 shared) - exceeds requirement of 28+
- Coverage: 73.93% lines, 84.61% branches, 90% functions - all above 60% threshold

### File List

**New Files:**
- vitest.config.ts (root coverage configuration)
- packages/shared/src/test-utils/factories.ts
- packages/shared/src/test-utils/index.ts
- packages/shared/src/test-utils/factories.test.ts
- packages/client/src/App.test.tsx

**Modified Files:**
- package.json (added test scripts, @vitest/coverage-v8 dependency)
- packages/shared/src/index.ts (export test utilities)
- packages/client/src/test/setup.ts (added cleanup, matchMedia mock, ResizeObserver mock)

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-11-30 | Initial story draft from create-story workflow | SM Agent |
| 2025-11-30 | Completed all tasks - testing framework configured across monorepo | Dev Agent |
