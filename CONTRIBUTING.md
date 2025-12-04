# Contributing to NAMELESS

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

## Project Structure

```
packages/
  client/     # Tauri + React desktop app
  server/     # Hono API server
  shared/     # Shared TypeScript types
docs/         # Project documentation
```
