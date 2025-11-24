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

**Quick Setup (Recommended - One-Time):**
```bash
# Create symlink in /Applications (persists across Electron updates)
pnpm dev:symlink

# Then grant permission to "Electron-NAMELESS" in System Preferences
# This only needs to be done once!
```

**Alternative:**
```bash
# Use helper script to open System Preferences
pnpm dev:setup
# Then manually add Electron.app to Screen Recording permissions
```

**Why the symlink?** macOS recognizes apps in `/Applications` more reliably. Once you grant permission to the symlink, it persists even when Electron updates in `node_modules`. This means you don't need to rebuild or re-grant permissions every time!

See [MACOS_PERMISSIONS.md](./MACOS_PERMISSIONS.md) or [DEVELOPMENT_PERMISSIONS.md](./DEVELOPMENT_PERMISSIONS.md) for detailed instructions.

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
