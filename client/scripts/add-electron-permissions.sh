#!/bin/bash

# Script to help add Electron to macOS Screen Recording permissions for development
# This makes it easier to grant permissions to the dev version

set -e

echo "🔧 Adding Electron to macOS Screen Recording Permissions"
echo ""

# Get the script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLIENT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$CLIENT_DIR/.." && pwd)"

# Find Electron.app - check both client/node_modules and root node_modules (for pnpm workspace)
ELECTRON_APP=$(find "$CLIENT_DIR/node_modules" "$PROJECT_ROOT/node_modules" -name "Electron.app" -type d 2>/dev/null | head -1)

if [ -z "$ELECTRON_APP" ]; then
    echo "❌ Electron.app not found"
    echo "   Searching in:"
    echo "   - $CLIENT_DIR/node_modules"
    echo "   - $PROJECT_ROOT/node_modules"
    echo ""
    echo "   Make sure you've run 'pnpm install' first"
    exit 1
fi

# Get absolute path
ELECTRON_APP_ABS=$(cd "$(dirname "$ELECTRON_APP")" && pwd)/$(basename "$ELECTRON_APP")

echo "📱 Found Electron.app at:"
echo "   $ELECTRON_APP_ABS"
echo ""

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "⚠️  This script is for macOS only"
    exit 1
fi

echo "📋 Instructions:"
echo ""
echo "1. Open System Preferences (or System Settings on macOS Ventura+)"
echo "2. Go to Security & Privacy > Privacy > Screen Recording"
echo "3. Click the lock icon 🔒 and enter your password"
echo "4. Click the '+' button"
echo "5. Press Cmd+Shift+G (Go to Folder)"
echo "6. Paste this path:"
echo ""
echo "   $ELECTRON_APP_ABS"
echo ""
echo "7. Click 'Go'"
echo "8. Select 'Electron.app' and click 'Open'"
echo "9. Make sure the checkbox next to Electron is checked ✅"
echo ""
echo "💡 Tip: After granting permission, completely quit (Cmd+Q) and restart the Electron app"
echo ""

# Try to open System Preferences to the right page (macOS 10.15+)
if command -v open >/dev/null 2>&1; then
    echo "🔓 Opening System Preferences..."
    open "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"
    echo ""
fi

echo "✅ Once you've added Electron, restart your dev server with:"
echo "   pnpm dev"
echo ""

