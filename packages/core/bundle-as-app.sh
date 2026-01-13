#!/bin/bash
# Bundle etch-core as macOS app bundle with icon
# This makes it show with the Etch logo in permission dialogs

set -e

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BINARY_PATH="${SCRIPT_DIR}/../../target/release/etch-core"
BUNDLE_PATH="${SCRIPT_DIR}/../../target/release/etch-core.app"

# Icon from Tauri app
ICON_SOURCE="${SCRIPT_DIR}/../client/src-tauri/icons/icon.icns"

echo "📦 Building etch-core.app bundle..."

# Remove old bundle
rm -rf "${BUNDLE_PATH}"

# Create app bundle structure
mkdir -p "${BUNDLE_PATH}/Contents/MacOS"
mkdir -p "${BUNDLE_PATH}/Contents/Resources"

# Get target triple for naming
TARGET=$(rustc -vV | grep host | cut -d' ' -f2)

# Copy binary with target triple in name (for Tauri)
cp "${BINARY_PATH}" "${BUNDLE_PATH}/Contents/MacOS/etch-core-${TARGET}"
chmod +x "${BUNDLE_PATH}/Contents/MacOS/etch-core-${TARGET}"

# Copy icon
if [ -f "${ICON_SOURCE}" ]; then
    cp "${ICON_SOURCE}" "${BUNDLE_PATH}/Contents/Resources/AppIcon.icns"
    echo "✅ Icon copied"
else
    echo "⚠️  Warning: Icon not found at ${ICON_SOURCE}"
fi

# Create Info.plist
cat > "${BUNDLE_PATH}/Contents/Info.plist" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>Etch Core</string>
    <key>CFBundleDisplayName</key>
    <string>Etch Core</string>
    <key>CFBundleIdentifier</key>
    <string>com.etch.core</string>
    <key>CFBundleVersion</key>
    <string>0.1.0</string>
    <key>CFBundleShortVersionString</key>
    <string>0.1.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleExecutable</key>
    <string>etch-core-${TARGET}</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>LSBackgroundOnly</key>
    <true/>
    <key>LSUIElement</key>
    <true/>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>NSCameraUsageDescription</key>
    <string>Etch needs camera access for video calls</string>
    <key>NSMicrophoneUsageDescription</key>
    <string>Etch needs microphone access for audio calls</string>
    <key>NSScreenCaptureUsageDescription</key>
    <string>Etch needs screen recording access to share your screen in meetings</string>
</dict>
</plist>
EOF

echo "✅ etch-core.app created at ${BUNDLE_PATH}"
echo "📋 Bundle info:"
echo "   - Name: Etch Core"
echo "   - Identifier: com.etch.core"
echo "   - Icon: AppIcon.icns"
echo "   - Background app: Yes (LSBackgroundOnly)"
