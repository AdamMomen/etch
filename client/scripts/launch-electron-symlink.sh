#!/bin/bash

# Wrapper script to launch Electron from symlink
# This ensures macOS recognizes it for permissions

SYMLINK_PATH="/Applications/Electron-NAMELESS.app"
SYMLINK_EXECUTABLE="$SYMLINK_PATH/Contents/MacOS/Electron"

if [ ! -f "$SYMLINK_EXECUTABLE" ]; then
    echo "❌ Symlink executable not found: $SYMLINK_EXECUTABLE"
    echo "   Run 'pnpm dev:symlink' first"
    exit 1
fi

# Launch Electron with all passed arguments
exec "$SYMLINK_EXECUTABLE" "$@"

