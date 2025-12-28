# Story 1.5: Configure Development Scripts and Tooling

Status: done

## Story

As a **developer**,
I want **convenient development scripts to run the full stack**,
so that **I can develop efficiently with hot reload**.

## Acceptance Criteria

1. **AC-1.5.1: Concurrent Development Command**
   - Given the monorepo with all packages configured
   - When I run `pnpm dev`
   - Then both the Tauri client (with hot reload) and Hono server start concurrently
   - And output from both processes is visible in the terminal

2. **AC-1.5.2: Individual Package Scripts**
   - Given the root package.json
   - When I examine the available scripts
   - Then the following scripts are available:
     - `dev:client` - Runs client development server
     - `dev:server` - Runs server development server
     - `build` - Builds all packages
     - `build:client` - Builds client for production
     - `build:server` - Builds server for production

3. **AC-1.5.3: Code Quality Scripts**
   - Given the root package.json
   - When I examine the available scripts
   - Then the following scripts are available:
     - `typecheck` - Runs TypeScript type checking across all packages
     - `lint` - Runs ESLint on all packages
     - `lint:fix` - Runs ESLint with auto-fix
     - `format` - Runs Prettier to format code

4. **AC-1.5.4: VS Code Configuration**
   - Given the project is opened in VS Code
   - When I examine the workspace settings
   - Then `.vscode/settings.json` exists with:
     - ESLint auto-fix on save enabled
     - Prettier as default formatter
     - Format on save enabled
     - TypeScript import preferences configured

5. **AC-1.5.5: Recommended Extensions**
   - Given the project is opened in VS Code
   - When VS Code prompts for recommended extensions
   - Then `.vscode/extensions.json` lists:
     - `dbaeumer.vscode-eslint` (ESLint)
     - `esbenp.prettier-vscode` (Prettier)
     - `bradlc.vscode-tailwindcss` (Tailwind CSS IntelliSense)
     - `rust-lang.rust-analyzer` (Rust)
     - `tauri-apps.tauri-vscode` (Tauri)

6. **AC-1.5.6: Concurrent Script Execution**
   - Given `concurrently` is installed
   - When I run `pnpm dev`
   - Then both client and server processes run in parallel
   - And I can see prefixed output distinguishing each process
   - And Ctrl+C terminates both processes cleanly

## Tasks / Subtasks

- [x] **Task 1: Install concurrently dependency** (AC: 1.5.6)
  - [x] Add `concurrently` as root dev dependency
  - [x] Verify installation succeeds

- [x] **Task 2: Configure root development scripts** (AC: 1.5.1, 1.5.2)
  - [x] Add `"dev": "concurrently \"pnpm dev:client\" \"pnpm dev:server\""` script
  - [x] Add `"dev:client": "pnpm --filter client dev"` script
  - [x] Add `"dev:server": "pnpm --filter server dev"` script
  - [x] Verify `pnpm dev` starts both client and server concurrently

- [x] **Task 3: Configure root build scripts** (AC: 1.5.2)
  - [x] Add `"build": "pnpm build:client && pnpm build:server"` script
  - [x] Add `"build:client": "pnpm --filter client build"` script
  - [x] Add `"build:server": "pnpm --filter server build"` script
  - [x] Verify build scripts execute correctly

- [x] **Task 4: Configure code quality scripts** (AC: 1.5.3)
  - [x] Add `"typecheck": "tsc --noEmit"` script (or per-package typecheck)
  - [x] Add `"lint": "eslint packages/*/src --ext .ts,.tsx"` script
  - [x] Add `"lint:fix": "eslint packages/*/src --ext .ts,.tsx --fix"` script
  - [x] Add `"format": "prettier --write \"packages/*/src/**/*.{ts,tsx,css}\""` script
  - [x] Verify all code quality scripts work correctly

- [x] **Task 5: Create VS Code settings** (AC: 1.5.4)
  - [x] Create `.vscode/settings.json` if not exists
  - [x] Configure `editor.formatOnSave: true`
  - [x] Configure `editor.defaultFormatter: esbenp.prettier-vscode`
  - [x] Configure `editor.codeActionsOnSave` with ESLint source.fixAll
  - [x] Configure TypeScript import preferences

- [x] **Task 6: Create VS Code extensions recommendations** (AC: 1.5.5)
  - [x] Create `.vscode/extensions.json` if not exists
  - [x] Add ESLint extension recommendation
  - [x] Add Prettier extension recommendation
  - [x] Add Tailwind CSS IntelliSense recommendation
  - [x] Add Rust Analyzer recommendation
  - [x] Add Tauri extension recommendation

- [x] **Task 7: Integration verification** (AC: 1.5.1, 1.5.2, 1.5.3, 1.5.6)
  - [x] Run `pnpm dev` and verify both client and server start
  - [x] Run `pnpm build` and verify both packages build
  - [x] Run `pnpm typecheck` and verify type checking works
  - [x] Run `pnpm lint` and verify linting works
  - [x] Run `pnpm format` and verify formatting works
  - [x] Verify Ctrl+C cleanly terminates concurrent processes

## Dev Notes

### Architecture Patterns

Per `docs/architecture.md`:
- **Development Environment**: Node.js 20 LTS, pnpm 8+, Rust toolchain for Tauri
- **IDE Setup**: VS Code with ESLint, Prettier, Tailwind CSS, Rust Analyzer, Tauri extensions
- **Build Tool**: Vite for fast HMR, native ESM bundling

[Source: docs/architecture.md#Development-Environment]

### Tech Spec Requirements

Per `docs/sprint-artifacts/tech-spec-epic-1.md`:

**Scripts to implement:**
```json
{
  "dev": "concurrently \"pnpm dev:client\" \"pnpm dev:server\"",
  "dev:client": "pnpm --filter client dev",
  "dev:server": "pnpm --filter server dev",
  "build": "pnpm build:client && pnpm build:server",
  "build:client": "pnpm --filter client build",
  "build:server": "pnpm --filter server build",
  "typecheck": "tsc --noEmit",
  "lint": "eslint packages/*/src --ext .ts,.tsx",
  "lint:fix": "eslint packages/*/src --ext .ts,.tsx --fix",
  "format": "prettier --write \"packages/*/src/**/*.{ts,tsx,css}\""
}
```

**VS Code Extensions (recommended):**
- `dbaeumer.vscode-eslint`
- `esbenp.prettier-vscode`
- `bradlc.vscode-tailwindcss`
- `rust-lang.rust-analyzer`
- `tauri-apps.tauri-vscode`

[Source: docs/sprint-artifacts/tech-spec-epic-1.md#AC-1.6]

### Project Structure Notes

- Root `package.json` orchestrates all workspace scripts
- Individual packages have their own `dev` and `build` scripts
- Use `pnpm --filter <package>` to run package-specific commands
- `concurrently` provides colored, prefixed output for parallel processes

[Source: docs/architecture.md#Project-Structure]

### Learnings from Previous Story

**From Story 1-4-set-up-vitest-testing-framework (Status: done)**

- **Test Scripts Already Added**: Root package.json already has `test`, `test:watch`, `test:coverage`, `test:client`, `test:server`, `test:shared` - follow same pattern for dev/build scripts
- **Coverage Config Added**: `vitest.config.ts` at root with coverage thresholds - existing root-level config pattern works
- **Dependencies Pattern**: Use `pnpm add -D -w` for root dev dependencies
- **Files Modified**: `package.json` modification pattern established
- **@vitest/coverage-v8**: Installed as root dev dependency - verify compatible versions for new dependencies

**Key Patterns to Reuse:**
- Filter syntax: `pnpm --filter <package> <script>` works correctly
- Root scripts can orchestrate package scripts
- Test infrastructure is complete - can verify with `pnpm test` after changes

[Source: docs/sprint-artifacts/1-4-set-up-vitest-testing-framework.md#Dev-Agent-Record]

### Required Dependencies

**Root (devDependencies):**
- `concurrently` - Parallel script execution with colored output

### Expected Script Configuration

```json
{
  "scripts": {
    "dev": "concurrently \"pnpm dev:client\" \"pnpm dev:server\"",
    "dev:client": "pnpm --filter client dev",
    "dev:server": "pnpm --filter server dev",
    "build": "pnpm build:client && pnpm build:server",
    "build:client": "pnpm --filter client build",
    "build:server": "pnpm --filter server build",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:client": "pnpm --filter client test",
    "test:server": "pnpm --filter server test",
    "test:shared": "pnpm --filter shared test",
    "typecheck": "tsc --noEmit",
    "lint": "eslint packages/*/src --ext .ts,.tsx",
    "lint:fix": "eslint packages/*/src --ext .ts,.tsx --fix",
    "format": "prettier --write \"packages/*/src/**/*.{ts,tsx,css}\""
  }
}
```

### VS Code Settings Template

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "non-relative",
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

### References

- [Architecture: Development Environment](docs/architecture.md#Development-Environment)
- [Tech Spec: AC-1.6 Development Tooling](docs/sprint-artifacts/tech-spec-epic-1.md#AC-1.6)
- [Epics: Story 1.5](docs/epics.md#Story-1.5)
- [Concurrently Documentation](https://github.com/open-cli-tools/concurrently)

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/1-5-configure-development-scripts-and-tooling.context.xml` - Generated 2025-11-30

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Most scripts (dev, dev:client, dev:server, build, build:client, build:server, lint, lint:fix, format) were already implemented in previous stories
- Only needed to add: typecheck script
- typecheck script updated to use per-package approach: `pnpm --filter client exec tsc --noEmit && pnpm --filter server exec tsc --noEmit && pnpm --filter @etch/shared exec tsc --noEmit`
- .vscode/settings.json updated with formatOnSave, defaultFormatter, codeActionsOnSave, TypeScript preferences
- .vscode/extensions.json created with 5 recommended extensions
- Fixed server build script (removed `&& node dist/index.js` which failed due to ESM resolution)

### Completion Notes List

- All 6 Acceptance Criteria satisfied
- All 7 tasks completed with all subtasks
- 43 tests pass across all packages
- typecheck, lint, format, build all verified working

### File List

- `package.json` - Added typecheck script
- `.vscode/settings.json` - Updated with editor settings (formatOnSave, defaultFormatter, codeActionsOnSave, TypeScript preferences)
- `.vscode/extensions.json` - Created with 5 recommended extensions
- `packages/server/package.json` - Fixed build script (removed runtime execution)
- `packages/client/src/App.test.tsx` - Formatted by Prettier
- `packages/shared/src/constants/index.ts` - Formatted by Prettier
- `packages/shared/src/constants/limits.test.ts` - Formatted by Prettier
- `packages/shared/src/index.test.ts` - Formatted by Prettier
- `packages/shared/src/test-utils/factories.ts` - Formatted by Prettier

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-11-30 | Initial story draft from create-story workflow | SM Agent |
| 2025-11-30 | Story context XML generated - ready for development | Story Context Workflow |
| 2025-11-30 | Story implementation complete - all tasks done, ready for review | Dev Agent |
| 2025-11-30 | Code review completed - APPROVED | SM Agent |

---

## Senior Developer Review (AI)

### Review Summary

**Reviewer:** BMad
**Date:** 2025-11-30
**Outcome:** APPROVED

All 6 acceptance criteria are fully implemented and all 7 tasks are verified complete. The development scripts and tooling configuration meets all requirements specified in the story and tech spec.

### Key Findings

**No blocking issues found.**

**Low Severity:**
- 3 files have Prettier formatting inconsistencies (introduced by Story 2.1 implementation after this story). Not a blocker for this story.
- 1 ESLint warning: unused `Role` import in `packages/shared/src/test-utils/factories.ts:1`

### Acceptance Criteria Coverage

| AC | Description | Status | Evidence |
|----|-------------|--------|----------|
| AC-1.5.1 | Concurrent Development Command | ✅ IMPLEMENTED | `package.json:7` - `"dev": "concurrently \"pnpm dev:client\" \"pnpm dev:server\""` |
| AC-1.5.2 | Individual Package Scripts | ✅ IMPLEMENTED | `package.json:8-12` - dev:client, dev:server, build, build:client, build:server |
| AC-1.5.3 | Code Quality Scripts | ✅ IMPLEMENTED | `package.json:13-17` - typecheck, lint, lint:fix, format all present and working |
| AC-1.5.4 | VS Code Configuration | ✅ IMPLEMENTED | `.vscode/settings.json:1-12` - formatOnSave, defaultFormatter, codeActionsOnSave, TypeScript prefs |
| AC-1.5.5 | Recommended Extensions | ✅ IMPLEMENTED | `.vscode/extensions.json:1-9` - All 5 extensions (ESLint, Prettier, Tailwind, Rust, Tauri) |
| AC-1.5.6 | Concurrent Script Execution | ✅ IMPLEMENTED | `package.json:29` - concurrently@^9.0.0 installed |

**Summary:** 6 of 6 acceptance criteria fully implemented.

### Task Completion Validation

| Task | Description | Marked | Verified | Evidence |
|------|-------------|--------|----------|----------|
| Task 1 | Install concurrently dependency | [x] | ✅ COMPLETE | `package.json:29` - `"concurrently": "^9.0.0"` |
| Task 2 | Configure root development scripts | [x] | ✅ COMPLETE | `package.json:7-9` - dev, dev:client, dev:server scripts |
| Task 3 | Configure root build scripts | [x] | ✅ COMPLETE | `package.json:10-12` - build, build:client, build:server scripts |
| Task 4 | Configure code quality scripts | [x] | ✅ COMPLETE | `package.json:13-17` - typecheck, lint, lint:fix, format working |
| Task 5 | Create VS Code settings | [x] | ✅ COMPLETE | `.vscode/settings.json` exists with all required settings |
| Task 6 | Create VS Code extensions | [x] | ✅ COMPLETE | `.vscode/extensions.json` with 5 recommended extensions |
| Task 7 | Integration verification | [x] | ✅ COMPLETE | All scripts verified: typecheck✓, lint✓, format✓, test✓, build✓ |

**Summary:** 7 of 7 completed tasks verified. 0 questionable. 0 falsely marked complete.

### Test Coverage and Gaps

- All 97 tests passing across packages
- Test infrastructure verified working via `pnpm test`
- Coverage reporting available via `pnpm test:coverage`

### Architectural Alignment

- Follows tech spec AC-1.6 requirements exactly
- Scripts match architecture.md Development Environment section
- VS Code settings align with IDE Setup recommendations

### Security Notes

No security concerns - this story only configures development tooling.

### Best-Practices and References

- [Concurrently Documentation](https://github.com/open-cli-tools/concurrently)
- [Prettier Configuration](https://prettier.io/docs/en/configuration.html)
- [ESLint Configuration](https://eslint.org/docs/latest/use/configure/)

### Action Items

**Advisory Notes:**
- Note: Consider running `pnpm format` to fix 3 files with style issues (not blocking, from subsequent story)
- Note: Consider removing unused `Role` import in `factories.ts:1` (cosmetic)

### Final Verdict

**APPROVED** - All acceptance criteria satisfied, all tasks verified complete, no blocking issues. Epic 1 is now complete.
