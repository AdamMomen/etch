#!/bin/bash

# Script to help macOS recognize Electron app for screen recording permissions
# Run this script if the Electron app doesn't appear in System Preferences > Security & Privacy > Screen Recording

echo "🔧 Fixing macOS Screen Recording Permissions for Electron"
echo ""

# Find Electron binary
ELECTRON_PATH=$(find node_modules -name "Electron.app" -type d | head -1)

if [ -z "$ELECTRON_PATH" ]; then
    echo "❌ Electron.app not found. Make sure dependencies are installed (pnpm install)"
    exit 1
fi

echo "📱 Found Electron at: $ELECTRON_PATH"
echo ""

# Method 1: Reset permissions database (requires admin)
echo "Method 1: Reset Screen Recording permissions"
echo "Run this command (requires admin password):"
echo ""
echo "sudo tccutil reset ScreenCapture"
echo ""

# Method 2: Manually add via tccutil (requires admin)
echo "Method 2: Add Electron to Screen Recording permissions"
echo "Run this command (requires admin password):"
echo ""
echo "sudo sqlite3 ~/Library/Application\\ Support/com.apple.TCC/TCC.db \"INSERT INTO access VALUES('kTCCServiceScreenRecording','$ELECTRON_PATH',1,2,4,1,NULL,NULL,NULL,'UNUSED',NULL,0,1541440109);\""
echo ""

# Method 3: Instructions for manual setup
echo "Method 3: Manual Setup (Recommended for Development)"
echo ""
echo "1. Open System Preferences > Security & Privacy > Privacy > Screen Recording"
echo "2. Click the lock icon and enter your password"
echo "3. Click the '+' button"
echo "4. Navigate to: $(pwd)/$ELECTRON_PATH"
echo "5. Select Electron.app and click 'Open'"
echo "6. Make sure the checkbox next to Electron is checked"
echo ""
echo "After adding, restart the Electron app."
echo ""

# Method 4: Use tccutil to grant permission (macOS 10.14+)
echo "Method 4: Grant permission via command line (macOS 10.14+)"
echo "Run this command (requires admin password):"
echo ""
echo "sudo tccutil reset ScreenCapture \"$ELECTRON_PATH\""
echo ""

echo "💡 Tip: After granting permissions, restart the Electron app for changes to take effect."

