# Story 1.1: Initialize Monorepo with Tauri Desktop App

Status: ready-for-dev

## Story

As a **developer**,
I want **a properly structured monorepo with a working Tauri desktop application**,
so that **I have a foundation to build all NAMELESS features upon**.

## Acceptance Criteria

1. **AC-1.1.1: Project Structure**
   - Given a fresh clone of the repository
   - When I examine the directory structure
   - Then it matches the architecture specification:
     ```
     nameless/
     ├── packages/
     │   ├── client/          # Tauri desktop app
     │   │   ├── src/         # React frontend
     │   │   └── src-tauri/   # Rust backend
     │   ├── server/          # Hono API server (placeholder)
     │   └── shared/          # Shared types & utilities (placeholder)
     ├── pnpm-workspace.yaml
     ├── tsconfig.base.json
     └── package.json
     ```

2. **AC-1.1.2: Clean Install**
   - Given a fresh clone of the repository
   - When I run `pnpm install`
   - Then all dependencies install successfully with no errors

3. **AC-1.1.3: Development Mode**
   - Given dependencies are installed
   - When I run `pnpm dev:client`
   - Then a Tauri desktop window opens with a basic React UI
   - And the window has native OS controls (close, minimize, maximize)
   - And the window displays dark mode by default

4. **AC-1.1.4: TypeScript Configuration**
   - Given the project structure exists
   - When I import using path aliases (`@/` for client internals)
   - Then TypeScript resolves the paths correctly
   - And no compilation errors occur

5. **AC-1.1.5: Styling Configuration**
   - Given the Tauri app is running
   - When I examine the UI
   - Then Tailwind CSS is configured with design system tokens from UX spec
   - And shadcn/ui is initialized with dark mode as default
   - And the background color is `#09090b` (--background)

6. **AC-1.1.6: Code Quality Tools**
   - Given the project exists
   - When I run `pnpm lint`
   - Then ESLint runs with TypeScript rules
   - And Prettier formatting is checked

7. **AC-1.1.7: Build Output**
   - Given the project is configured
   - When I run `pnpm build:client`
   - Then the app builds successfully for macOS (.dmg)
   - And the build completes in under 60 seconds

## Tasks / Subtasks

- [ ] **Task 1: Initialize Monorepo Structure** (AC: 1.1.1, 1.1.2)
  - [ ] Create root `package.json` with workspaces configuration
  - [ ] Create `pnpm-workspace.yaml` defining packages/*
  - [ ] Create `tsconfig.base.json` with shared TypeScript settings (`strict: true`)
  - [ ] Create placeholder directories: `packages/server/`, `packages/shared/`
  - [ ] Add `.gitignore` with node_modules, dist, .env, Tauri build artifacts

- [ ] **Task 2: Create Tauri Desktop Application** (AC: 1.1.3)
  - [ ] Run `npx create-tauri-ui@latest` in packages/client with Vite + React + pnpm
  - [ ] Verify Tauri 2.0 is installed (check `src-tauri/Cargo.toml`)
  - [ ] Configure `tauri.conf.json` with app name "NAMELESS"
  - [ ] Verify native window controls work via tauri-controls
  - [ ] Test `pnpm dev` opens desktop window

- [ ] **Task 3: Configure TypeScript Path Aliases** (AC: 1.1.4)
  - [ ] Update `packages/client/tsconfig.json` to extend `tsconfig.base.json`
  - [ ] Configure path alias `@/*` → `./src/*` in tsconfig.json
  - [ ] Configure same alias in `vite.config.ts` for bundler resolution
  - [ ] Verify imports like `import { x } from '@/components/x'` work

- [ ] **Task 4: Configure Tailwind CSS with Design System** (AC: 1.1.5)
  - [ ] Verify Tailwind CSS is installed (from create-tauri-ui)
  - [ ] Update `tailwind.config.ts` with UX spec color tokens:
    - `--background: #09090b`
    - `--accent: #8b5cf6`
    - `--text-primary: #fafafa`
    - Full token list from UX spec Section 3.1
  - [ ] Configure dark mode as default (`darkMode: 'class'`)
  - [ ] Update `index.css` with CSS variables

- [ ] **Task 5: Initialize shadcn/ui** (AC: 1.1.5)
  - [ ] Run `npx shadcn@latest init` in packages/client
  - [ ] Select dark theme as default
  - [ ] Install base components: Button, Input (for testing)
  - [ ] Verify Lucide icons are available
  - [ ] Update App.tsx with a test shadcn/ui Button

- [ ] **Task 6: Configure ESLint and Prettier** (AC: 1.1.6)
  - [ ] Create root `.eslintrc.cjs` with TypeScript and React rules
  - [ ] Create root `.prettierrc` with project formatting settings
  - [ ] Add `lint` and `lint:fix` scripts to root package.json
  - [ ] Add `format` script for Prettier
  - [ ] Verify `pnpm lint` runs without errors on initial code

- [ ] **Task 7: Configure Build Scripts** (AC: 1.1.7)
  - [ ] Add `dev:client` script to root package.json (`pnpm --filter client dev`)
  - [ ] Add `build:client` script (`pnpm --filter client build`)
  - [ ] Test macOS build produces .dmg in `packages/client/src-tauri/target/release/bundle/`
  - [ ] Verify build time < 60 seconds

- [ ] **Task 8: Write Smoke Tests** (AC: all)
  - [ ] Create `packages/client/src/App.test.tsx` with basic render test
  - [ ] Verify test setup works (placeholder for Story 1.4)
  - [ ] Document any manual verification steps

## Dev Notes

### Architecture Patterns

Per `docs/architecture.md`:
- **Desktop Framework**: Tauri 2.0 (ADR-001) - smaller bundles (~2MB), Rust backend
- **UI Components**: shadcn/ui + Radix primitives
- **Styling**: Tailwind CSS with utility-first approach
- **Build Tool**: Vite for fast HMR

### Initialization Command

Per Architecture doc, use the official starter:
```bash
npx create-tauri-ui@latest nameless-client
```

Select options:
- Template: **Vite + React**
- Package manager: **pnpm**

This provides: Tauri 2.0, shadcn/ui, Tailwind CSS, Vite, TypeScript, Lucide icons, tauri-controls

### Design System Tokens (from UX Spec)

Dark Theme (Default):
```css
--background: #09090b;
--background-subtle: #0a0a0c;
--card: #0c0c0e;
--card-hover: #111113;
--border: rgba(255,255,255,0.06);
--text-primary: #fafafa;
--text-secondary: #a1a1aa;
--text-muted: #71717a;
--accent: #8b5cf6;
--accent-hover: #7c3aed;
```

[Source: docs/ux-design-specification.md#3.1-Color-System]

### Project Structure Notes

Target structure aligns with Architecture doc Section "Project Structure":
- `packages/client/` - Tauri desktop application
- `packages/server/` - Hono API server (Story 1.2)
- `packages/shared/` - Shared types (Story 1.3)

Path aliases use `@/` for client-internal imports, `@nameless/shared` for cross-package.

### TypeScript Configuration

Base config (`tsconfig.base.json`):
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  }
}
```

[Source: docs/architecture.md#Consistency-Rules]

### References

- [Architecture: Project Structure](docs/architecture.md#Project-Structure)
- [Architecture: ADR-001 Tauri over Electron](docs/architecture.md#ADR-001)
- [UX Spec: Color System](docs/ux-design-specification.md#3.1-Color-System)
- [UX Spec: Design System Foundation](docs/ux-design-specification.md#1.1-Design-System-Choice)
- [Tech Spec: AC-1.1 Monorepo Structure](docs/sprint-artifacts/tech-spec-epic-1.md#AC-1.1)
- [Tech Spec: AC-1.2 Tauri Desktop Application](docs/sprint-artifacts/tech-spec-epic-1.md#AC-1.2)

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/1-1-initialize-monorepo-with-tauri-desktop-app.context.xml`

### Agent Model Used

<!-- Will be filled by dev agent -->

### Debug Log References

<!-- Will be filled by dev agent -->

### Completion Notes List

<!-- Will be filled by dev agent -->

### File List

<!-- Will be filled by dev agent -->

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-11-30 | Initial story draft | SM Agent |
