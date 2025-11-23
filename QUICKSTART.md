# NAMELESS Quick Start Guide

## Current Status

✅ **Server is running** on http://localhost:3000
- Health endpoint working: `/health`
- Room API endpoints ready: `/api/rooms/*`
- ⚠️ Needs LiveKit credentials to generate tokens

## Step 1: Set Up LiveKit (Choose One)

### Option A: LiveKit Cloud (Easiest for Testing)
1. Sign up at https://cloud.livekit.io
2. Create a project
3. Get your API Key and Secret from the dashboard
4. Create `server/.env`:
```env
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
PORT=3000
```

### Option B: Self-Hosted LiveKit
1. Install LiveKit server: https://docs.livekit.io/home/self-hosting/deployment/
2. Run locally: `livekit-server --dev`
3. Create `server/.env`:
```env
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
PORT=3000
```

## Step 2: Start Server

```bash
cd server
pnpm dev
```

Server will run on http://localhost:3000

## Step 3: Start Client

```bash
cd client
pnpm dev
```

This will open the Electron app.

## Testing the Flow

1. **Create Room**: Click "Create Room" in the Electron app
2. **Join Room**: Open another Electron window and join with the room ID
3. **Screen Share**: Click "Start Screen Share" in one window
4. **Annotate**: Draw on the shared screen
5. **See Sync**: Annotations should appear in all connected windows

## Troubleshooting

### Server shows "LIVEKIT_API_KEY must be set"
- Create `server/.env` file with LiveKit credentials (see Step 1)

### Client can't connect
- Verify server is running: `curl http://localhost:3000/health`
- Check browser console in Electron DevTools for errors

### Screen share not working
- Grant screen recording permissions (macOS: System Preferences > Security & Privacy)
- Check Electron DevTools console for errors

