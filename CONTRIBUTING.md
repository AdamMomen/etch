# Contributing to Etch

## Development Setup

### Prerequisites
- Node.js >= 20.0.0
- pnpm >= 8.0.0
- Rust (for Tauri desktop builds)

### Installation
```bash
pnpm install
```

### Development
```bash
pnpm dev           # Start both client and server
pnpm dev:client    # Start client only
pnpm dev:server    # Start server only
```

## Testing

### Running Tests

All test commands automatically kill any existing vitest processes before starting to prevent memory accumulation:

```bash
pnpm test              # Run all tests once
pnpm test:client       # Run client tests
pnpm test:server       # Run server tests
pnpm test:shared       # Run shared package tests
pnpm test:watch        # Run tests in watch mode (use sparingly)
pnpm test:coverage     # Run tests with coverage report
```

### Important: Test Process Management

**Problem**: Vitest processes can consume ~4GB of memory each. Multiple zombie processes can accumulate and consume 20GB+ of RAM.

**Solution**: Each test script has a `pretest:*` hook that runs `pkill -f vitest` before starting tests. This ensures:
- Only one test process runs at a time
- Hung or orphaned test processes are cleaned up
- Memory usage stays reasonable

**Best Practices**:
1. Always use `pnpm test:*` commands (not raw `vitest`)
2. Wait for test completion before starting another test run
3. If tests seem stuck, manually run: `pkill -f vitest`
4. Monitor Activity Monitor if you suspect memory issues

### Manual Cleanup

If you notice high memory usage from vitest processes:
```bash
pkill -f vitest
```

## Building

```bash
pnpm build             # Build client (Tauri) and server
pnpm build:client      # Build client only
pnpm build:server      # Build server only
```

**Note**: Full Tauri builds create large binaries. For development iteration, prefer `pnpm dev` or `pnpm test:*`.

## Code Style

- TypeScript strict mode enabled
- ESLint + Prettier for formatting
- Run `pnpm lint` before committing
- Run `pnpm format` to auto-fix formatting

## CI/CD Guidelines

### Pre-commit Hooks

Install pre-commit hooks to catch issues locally before pushing:

```bash
pip install pre-commit
pre-commit install
```

**Hooks that run on every commit:**
- ✅ Prettier format check
- ✅ ESLint linting
- ✅ Rust formatting check

**Hooks that run on push only:**
- ✅ TypeScript type checking (requires `pnpm build:shared`)
- ✅ Rust clippy linting

**Skip hooks for WIP commits:**
```bash
git commit -m "WIP" --no-verify
```

### CI Pipeline Behavior

The CI uses path filtering to run only relevant checks:

| Change Type | What Runs | Time | Skips |
|-------------|-----------|------|-------|
| TypeScript only | Pre-commit + TS pipeline | 10-12 min | Rust pipeline |
| Rust only | Pre-commit + Rust pipeline | 18-22 min | TS pipeline |
| Both | Pre-commit + TS + Rust | 25-30 min | Nothing |
| Docs only | Pre-commit | 3-4 min | All pipelines |
| Workflow changes | Everything | 25-30 min | Nothing |

### Pipeline Requirements

All PRs must pass:

1. ✅ **Pre-commit checks**
   - ESLint (no warnings)
   - Prettier (properly formatted)
   - TypeScript compilation (no errors)
   - Rust formatting (`cargo fmt`)
   - Rust clippy (no warnings with `-D warnings`)

2. ✅ **TypeScript pipeline** (if TS files changed)
   - Lint passes
   - Type check passes
   - All tests pass
   - Production build succeeds

3. ✅ **Rust pipeline** (if Rust files changed)
   - Format check passes (Linux)
   - Clippy passes (Linux)
   - Tests pass on all platforms (Windows, macOS x86/ARM, Linux)
   - Release builds succeed on all platforms

### Platform-Specific Testing

Rust changes are tested on **4 platforms**:
- Windows (x86_64-pc-windows-msvc)
- macOS Intel (x86_64-apple-darwin)
- macOS Apple Silicon (aarch64-apple-darwin)
- Linux (x86_64-unknown-linux-gnu)

This ensures the desktop app works cross-platform.

### Manual Workflow Triggers

You can manually trigger CI workflows from the Actions tab:
- Go to **Actions** → Select workflow → **Run workflow**
- Useful for re-running failed jobs or testing specific platforms

### Local CI Simulation

Before pushing, simulate CI locally:

```bash
# Pre-commit checks
pre-commit run --all-files

# TypeScript checks
pnpm lint
pnpm typecheck
pnpm test
pnpm build

# Rust checks (in packages/core)
cd packages/core
cargo fmt --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test --all-features
cargo build --release
```

## Project Structure

```
packages/
  client/     # Tauri + React desktop app
  server/     # Hono API server
  shared/     # Shared TypeScript types
docs/         # Project documentation
```
