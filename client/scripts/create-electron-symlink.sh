#!/bin/bash

# Script to create a symlink to Electron in /Applications
# This helps macOS recognize Electron as a "real" app for permissions

set -e

echo "🔗 Creating Electron Symlink in /Applications"
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
SYMLINK_PATH="/Applications/Electron-NAMELESS.app"

echo "📱 Found Electron.app at:"
echo "   $ELECTRON_APP_ABS"
echo ""
echo "🔗 Will create symlink at:"
echo "   $SYMLINK_PATH"
echo ""

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "⚠️  This script is for macOS only"
    exit 1
fi

# Check if symlink already exists
if [ -L "$SYMLINK_PATH" ]; then
    echo "⚠️  Symlink already exists at $SYMLINK_PATH"
    read -p "Remove existing symlink and create new one? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🗑️  Removing existing symlink..."
        sudo rm "$SYMLINK_PATH"
    else
        echo "❌ Aborted"
        exit 1
    fi
fi

# Check if file exists (not symlink)
if [ -e "$SYMLINK_PATH" ]; then
    echo "⚠️  File already exists at $SYMLINK_PATH (not a symlink)"
    read -p "Remove and create symlink? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🗑️  Removing existing file..."
        sudo rm -rf "$SYMLINK_PATH"
    else
        echo "❌ Aborted"
        exit 1
    fi
fi

# Create symlink (requires admin)
echo "🔐 To create the symlink, run this command:"
echo ""
echo "   sudo ln -s \"$ELECTRON_APP_ABS\" \"$SYMLINK_PATH\""
echo ""
echo "Or run this script with sudo:"
echo ""
echo "   sudo $0"
echo ""

# Try to create symlink if we have permissions
if [ -w "/Applications" ] || [ "$EUID" -eq 0 ]; then
    echo "🔗 Creating symlink..."
    ln -s "$ELECTRON_APP_ABS" "$SYMLINK_PATH" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "✅ Symlink created successfully!"
        SYMLINK_CREATED=true
    else
        echo "⚠️  Could not create symlink automatically"
        echo "   Please run the command above manually"
        SYMLINK_CREATED=false
    fi
else
    echo "⚠️  Need admin permissions to create symlink"
    echo "   Please run the command above manually"
    SYMLINK_CREATED=false
fi

if [ "$SYMLINK_CREATED" = true ] || [ -L "$SYMLINK_PATH" ]; then
    echo ""
    echo "📋 Next steps:"
    echo ""
    echo "1. Open System Preferences > Security & Privacy > Privacy > Screen Recording"
    echo "2. Click the lock icon 🔒 and enter your password"
    echo "3. Click the '+' button"
    echo "4. Navigate to Applications folder"
    echo "5. Select 'Electron-NAMELESS.app' and click 'Open'"
    echo "6. Make sure the checkbox is checked ✅"
    echo "7. Completely quit the Electron app (Cmd+Q) and restart"
    echo ""
    echo "💡 Tip: The symlink will persist, so you only need to grant permission once!"
    echo ""
    
    # Offer to open System Preferences
    if [ -t 0 ]; then
        read -p "Open System Preferences now? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            open "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"
        fi
    else
        echo "💡 Run this to open System Preferences:"
        echo "   open 'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture'"
    fi
fi

