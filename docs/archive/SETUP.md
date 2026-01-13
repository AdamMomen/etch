# Etch Setup Guide

## Prerequisites

- Node.js 18+ and pnpm installed
- LiveKit server running locally (or LiveKit Cloud credentials)

## Installation

1. Install dependencies:
```bash
pnpm install
```

2. Build shared types package:
```bash
cd shared && pnpm build
```

## Environment Setup

### Server

Create a `.env` file in the `server/` directory:

```env
PORT=3000
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
```

### Client

The client will connect to the server at `http://localhost:3000` by default.

## Running Locally

### 1. Start LiveKit Server -- SKIPPED used cloud version instead.

If running LiveKit locally, start it first:
```bash
# Follow LiveKit installation instructions
livekit-server --dev
```

Or use LiveKit Cloud and set the URL in server `.env`.

### 2. Start App Server

```bash
pnpm dev:server
# or
cd server && pnpm dev
```

Server will run on http://localhost:3000

### 3. Start Electron Client

```bash
pnpm dev:client
# or
cd client && pnpm dev
```

## Development Workflow

1. Start LiveKit server (if self-hosting)
2. Start App Server (`pnpm dev:server`)
3. Start Electron Client (`pnpm dev:client`)
4. Open multiple client windows to test multi-user functionality

## Project Structure

```
etch/
├── client/          # Electron + React desktop app
├── server/          # Node.js Express App Server
├── shared/          # Shared TypeScript types
└── docs/            # Documentation
```

## Troubleshooting

### Screen Share Not Working

- Ensure screen recording permissions are granted (macOS: System Preferences > Security & Privacy)
- Check that Electron has proper permissions

### Connection Issues

- Verify LiveKit server is running and accessible
- Check server `.env` configuration
- Ensure CORS is properly configured

### Build Errors

- Run `pnpm install -r` to ensure all dependencies are installed
- Build shared package: `cd shared && pnpm build`

