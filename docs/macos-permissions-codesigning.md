# macOS Permissions & Code Signing Guide

## Understanding Permission Entries

When Etch runs on macOS, the Screen Recording permission dialog behavior depends on how the app is signed:

### Development (Unsigned)

You'll see **separate entries** in System Settings > Privacy & Security > Screen Recording:
- **Etch** (main app) - or your terminal if running via `pnpm dev`
- **etch-core-aarch64-apple-darwin** (sidecar binary)

This is **expected behavior** during development. macOS tracks each unsigned binary separately.

### Production (Code Signed)

With proper code signing, users see a **single "Etch" entry** that covers both the main app and etch-core.

## Development: Granting Permissions

During development, you need to grant Screen Recording permission to `etch-core`:

1. Click "Grant" in the onboarding flow
2. System Settings opens to Privacy & Security > Screen Recording
3. Find and enable **etch-core-aarch64-apple-darwin** (or similar name with your architecture)
4. You may need to restart the app after granting permission

**Note:** If you're running via terminal (`pnpm dev`), you might also need to grant permission to Terminal.app or your terminal emulator.

## Why Separate Entries Appear

`etch-core` is an external sidecar binary that handles screen capture via LiveKit. macOS treats each unsigned binary as a separate application, requiring individual permission grants.

The only way to consolidate permissions under a single app name is through **code signing** with an Apple Developer certificate.

## Solution: Code Signing (Production)

To make permissions appear under a single "Etch" entry, both the main app and `etch-core` must be **code signed with the same Apple Developer certificate**.

### Prerequisites

1. **Apple Developer Account** - You need a paid Apple Developer account ($99/year)
2. **Developer ID Application Certificate** - For distribution outside the Mac App Store
3. **Xcode Command Line Tools** - For `codesign` and `productbuild`

### Step 1: Obtain Your Signing Identity

```bash
# List available signing identities
security find-identity -v -p codesigning

# You should see something like:
# 1) ABCD1234... "Developer ID Application: Your Name (TEAM_ID)"
```

### Step 2: Configure Tauri for Code Signing

Update `packages/client/src-tauri/tauri.conf.json`:

```json
{
  "bundle": {
    "macOS": {
      "signingIdentity": "Developer ID Application: Your Name (TEAM_ID)",
      "entitlements": "Entitlements.plist",
      "infoPlist": "Info.plist"
    }
  }
}
```

### Step 3: Build with Code Signing

```bash
# Build the app (Tauri will automatically sign both the main app and etch-core)
pnpm build:client

# Verify the signature
codesign -dv --verbose=4 target/release/bundle/macos/Etch.app
codesign -dv --verbose=4 target/release/bundle/macos/Etch.app/Contents/MacOS/etch-core
```

Both should show:
- Same `Authority` (your Developer ID)
- Same `TeamIdentifier`
- Valid signature chain

### Step 4: Notarization (Required for Distribution)

For distribution outside your own machine:

```bash
# Create a signed DMG
# (Tauri does this automatically during build)

# Submit for notarization
xcrun notarytool submit \
  target/release/bundle/dmg/Etch_*.dmg \
  --apple-id "your-email@example.com" \
  --team-id "YOUR_TEAM_ID" \
  --password "app-specific-password" \
  --wait

# Staple the notarization ticket
xcrun stapler staple target/release/bundle/dmg/Etch_*.dmg
```

## Why This Matters

### Without Proper Code Signing:
- ❌ Users see two permission requests (confusing)
- ❌ macOS Gatekeeper may block the app
- ❌ App appears untrustworthy
- ❌ Screen recording permission fails or requires multiple approvals

### With Proper Code Signing:
- ✅ Single "Etch" entry in System Settings
- ✅ macOS recognizes both binaries as part of same app
- ✅ Permissions are inherited/shared
- ✅ Professional user experience
- ✅ Can be distributed outside Mac App Store

## Development vs. Production

### Development (Local Testing)
- Can use ad-hoc signing or skip signing
- Will still see duplicate permission entries
- Acceptable for local development

### Production (Distribution)
- **Must use Developer ID certificate**
- **Must notarize the app**
- Required for users outside your development team

## Entitlements Explained

The `Entitlements.plist` file declares what permissions the app needs:

- `com.apple.security.device.camera` - Camera access
- `com.apple.security.device.audio-input` - Microphone access
- `com.apple.security.network.client` - Outbound network (LiveKit)
- `com.apple.security.cs.disable-library-validation` - Load sidecar binary

## Troubleshooting

### Issue: Still seeing two permission entries

**Cause:** Code signing not applied or different signing identities used

**Fix:**
```bash
# Verify both binaries have the same TeamIdentifier
codesign -dv target/release/bundle/macos/Etch.app 2>&1 | grep TeamIdentifier
codesign -dv target/release/bundle/macos/Etch.app/Contents/MacOS/etch-core 2>&1 | grep TeamIdentifier
```

### Issue: "damaged and can't be opened"

**Cause:** Gatekeeper blocking unsigned or non-notarized app

**Fix (Development Only):**
```bash
# Remove quarantine attribute
xattr -cr target/release/bundle/macos/Etch.app

# Or allow app in System Settings
```

**Fix (Production):** Properly sign and notarize the app

## CI/CD Integration

For automated builds, store signing certificate and credentials securely:

```yaml
# Example GitHub Actions
- name: Import Code Signing Certificate
  run: |
    echo "${{ secrets.MACOS_CERTIFICATE }}" | base64 -d > certificate.p12
    security create-keychain -p "${{ secrets.KEYCHAIN_PASSWORD }}" build.keychain
    security import certificate.p12 -k build.keychain -P "${{ secrets.CERTIFICATE_PASSWORD }}"
    security set-key-partition-list -S apple-tool:,apple: -k "${{ secrets.KEYCHAIN_PASSWORD }}" build.keychain

- name: Build and Sign
  env:
    APPLE_SIGNING_IDENTITY: "Developer ID Application: Your Name (TEAM_ID)"
  run: pnpm build:client
```

## References

- [Apple Code Signing Guide](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [Tauri Signing Documentation](https://tauri.app/v1/guides/distribution/sign-macos)
- [macOS Entitlements](https://developer.apple.com/documentation/bundleresources/entitlements)
