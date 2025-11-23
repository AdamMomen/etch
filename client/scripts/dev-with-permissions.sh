#!/bin/bash

# Development script that checks for screen recording permissions
# and provides helpful guidance if they're not set up

set -e

echo "🚀 Starting NAMELESS Development Server"
echo ""

# Find Electron.app
ELECTRON_APP=$(find node_modules -name "Electron.app" -type d 2>/dev/null | head -1)

if [ -z "$ELECTRON_APP" ]; then
    echo "❌ Electron.app not found. Running pnpm install..."
    pnpm install
    ELECTRON_APP=$(find node_modules -name "Electron.app" -type d 2>/dev/null | head -1)
fi

if [ -z "$ELECTRON_APP" ]; then
    echo "❌ Still couldn't find Electron.app"
    exit 1
fi

ELECTRON_APP_ABS=$(cd "$(dirname "$ELECTRON_APP")" && pwd)/$(basename "$ELECTRON_APP")

echo "📱 Electron.app location:"
echo "   $ELECTRON_APP_ABS"
echo ""

# Check if on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "💡 Screen Recording Permission Tip:"
    echo ""
    echo "   If screen sharing doesn't work, make sure Electron has"
    echo "   Screen Recording permission in System Preferences."
    echo ""
    echo "   Quick setup: Run './scripts/add-electron-permissions.sh'"
    echo "   Or manually add: $ELECTRON_APP_ABS"
    echo ""
fi

echo "▶️  Starting dev server..."
echo ""

# Start the dev server
pnpm dev

