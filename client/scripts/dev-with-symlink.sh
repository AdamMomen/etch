#!/bin/bash

# Dev script that uses the symlinked Electron for better permissions

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLIENT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SYMLINK_PATH="/Applications/Electron-NAMELESS.app"

echo "🚀 Starting NAMELESS Development Server (using symlink)"
echo ""

# Check if symlink exists
if [ ! -L "$SYMLINK_PATH" ]; then
    echo "⚠️  Symlink not found at $SYMLINK_PATH"
    echo "   Creating symlink..."
    "$SCRIPT_DIR/create-electron-symlink.sh"
    echo ""
fi

# Verify symlink exists
if [ -L "$SYMLINK_PATH" ]; then
    echo "✅ Using Electron from: $SYMLINK_PATH"
    echo "💡 Make sure you've granted Screen Recording permission to 'Electron-NAMELESS' in System Preferences"
    echo ""
else
    echo "⚠️  Symlink not available, using default Electron"
    echo ""
fi

# Set environment variable to use symlink if available
if [ -L "$SYMLINK_PATH" ]; then
    export ELECTRON_PATH="$SYMLINK_PATH/Contents/MacOS/Electron"
else
    # Fallback to default
    unset ELECTRON_PATH
fi

# Start dev server
cd "$CLIENT_DIR"
pnpm dev

