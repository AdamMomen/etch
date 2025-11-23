# NAMELESS Client

Electron + React + TypeScript desktop client for the NAMELESS meeting platform.

## Development

### Prerequisites

- Node.js 18+
- pnpm

### Setup

```bash
# Install dependencies
pnpm install

# Set up macOS screen recording permissions (macOS only)
pnpm dev:setup
```

### Running Development Server

```bash
pnpm dev
```

### macOS Screen Recording Permissions

For development mode, you need to grant Screen Recording permission to Electron:

1. Run `pnpm dev:setup` for guided setup
2. Or manually add Electron.app to System Preferences > Security & Privacy > Screen Recording

See [MACOS_PERMISSIONS.md](./MACOS_PERMISSIONS.md) for detailed instructions.

**Note:** The built app handles permissions automatically - this is only needed for development.

## Building

```bash
# Build for production
pnpm build
```

The built app will be in `release/0.0.0/`:
- **macOS**: `YourAppName-Mac-0.0.0-Installer.dmg`
- **App Bundle**: `mac-arm64/YourAppName.app`

## Project Structure

```
client/
├── electron/          # Electron main and preload processes
├── src/
│   ├── components/    # React components
│   ├── contexts/      # React contexts (LiveKit)
│   ├── hooks/         # React hooks
│   ├── services/      # API and business logic
│   └── utils/         # Utility functions
├── scripts/           # Helper scripts
└── build/             # Build configuration
```

## Tech Stack

- **Electron** - Desktop app framework
- **React** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **LiveKit Client** - Real-time media and data transport
