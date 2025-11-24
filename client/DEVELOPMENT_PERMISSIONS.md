# Development Mode Screen Recording Permissions

## The Problem

macOS requires explicit Screen Recording permission for apps to capture the screen. In development mode, Electron runs from `node_modules`, which makes it difficult for macOS to recognize and grant permissions consistently.

## Common Solutions Used by Developers

### Solution 1: Use the Built App (Recommended)

**The easiest solution is to use the built app for development:**

```bash
cd client
pnpm build
open release/0.0.0/mac-arm64/NAMELESS.app
```

The built app has proper entitlements and macOS recognizes it correctly.

### Solution 2: Reset TCC Database (Nuclear Option)

If permissions are completely broken:

```bash
# Reset ALL screen recording permissions (requires admin)
sudo tccutil reset ScreenCapture

# Then restart your Mac
# When you run Electron again, macOS will prompt you
```

**Warning:** This resets permissions for ALL apps, not just Electron.

### Solution 3: Use Terminal to Launch Electron

Some developers find success by launching Electron directly from Terminal:

```bash
cd client
./node_modules/.bin/electron .
```

This gives Electron a consistent process identity that macOS can recognize.

### Solution 4: Create a Symlink (Recommended for Dev)

**Use the automated script:**

```bash
cd client
pnpm dev:symlink
```

Or manually:

```bash
sudo ln -s "$(pwd)/node_modules/.pnpm/electron@*/node_modules/electron/dist/Electron.app" /Applications/Electron-NAMELESS.app
```

Then grant permission to `/Applications/Electron-NAMELESS.app` in System Preferences. The symlink persists, so you only need to grant permission once!

### Solution 5: Use Electron Forge/Vite Dev Mode

Some Electron build tools handle permissions better. Consider using:
- `electron-forge` with proper entitlements
- `electron-vite` with dev entitlements configured

## What We've Implemented

1. **Automatic System Preferences Opening** - When permission is denied, the app automatically opens System Preferences to the right page
2. **Consistent App Name** - Using `app.setName("NAMELESS")` so macOS recognizes it consistently
3. **Better Error Messages** - Clear instructions with exact paths

## Why This Is Hard

- macOS uses the **TCC (Transparency, Consent, and Control) database** to track permissions
- The database uses **code signatures** and **bundle identifiers** to identify apps
- In dev mode, Electron doesn't have a proper code signature
- Each time Electron runs, macOS might see it as a slightly different process
- The TCC database is protected and can't be easily modified without admin rights

## Best Practice for Development

**Use the built app** - It's the most reliable solution. The build process is fast, and you get:
- Proper entitlements
- Consistent app identity
- Reliable permissions
- Production-like environment

## References

- [Electron Security Best Practices](https://www.electronjs.org/docs/latest/tutorial/security)
- [macOS TCC Database](https://developer.apple.com/documentation/security/tcc)
- [Common Electron Permission Issues](https://github.com/electron/electron/issues?q=screen+recording+permission)

