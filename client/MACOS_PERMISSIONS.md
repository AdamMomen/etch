# macOS Screen Recording Permissions Fix

## Problem
When running Electron in development mode, macOS may not show the Electron app in System Preferences > Security & Privacy > Screen Recording. This is because Electron runs from `node_modules` and macOS doesn't recognize it as a proper app bundle.

**Note:** The built/released app works perfectly with permissions. This guide is specifically for development mode.

## Quick Setup (Recommended)

Run this command to get step-by-step instructions:

```bash
pnpm dev:setup
```

Or manually run:
```bash
./scripts/add-electron-permissions.sh
```

This will:
- Find your Electron.app location
- Show you the exact path to add
- Open System Preferences to the right page

## Solution: Manual Setup (Recommended for Development)

### Step 1: Find Electron App Location
Run this command in your terminal from the `client` directory:

```bash
find node_modules -name "Electron.app" -type d | head -1
```

This will show you the path to Electron.app (e.g., `node_modules/.pnpm/electron@30.5.1/node_modules/electron/dist/Electron.app`)

### Step 2: Add Electron to Screen Recording Permissions

**Option A: Use App Bundle (Recommended)**
1. **Open System Preferences** (or System Settings on macOS Ventura+)
2. Go to **Security & Privacy** > **Privacy** tab
3. Select **Screen Recording** from the left sidebar
4. Click the **lock icon** 🔒 at the bottom left and enter your password
5. Click the **+** button
6. Press `Cmd + Shift + G` to open "Go to Folder" dialog
7. Paste the full path to **Electron.app** (the `.app` bundle, NOT the executable inside)
   - ✅ Correct: `/Users/adam/.ghq/github.com/adammomen/nameless/node_modules/.pnpm/electron@30.5.1/node_modules/electron/dist/Electron.app`
   - ❌ Wrong: `/Users/adam/.ghq/github.com/adammomen/nameless/node_modules/.pnpm/electron@30.5.1/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron`
8. Click **Go**
9. Select **Electron.app** and click **Open**
10. Make sure the **checkbox** next to Electron is **checked** ✅

**Option B: If Option A doesn't work, try the executable path**
Sometimes macOS needs the full executable path. Use this path instead:
- `/Users/adam/.ghq/github.com/adammomen/nameless/node_modules/.pnpm/electron@30.5.1/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron`

**Note:** Always try the `.app` bundle first (Option A). Only use the executable path if the bundle path doesn't work.

### Step 3: Restart Electron App
Close and restart your Electron app for the permissions to take effect.

## Alternative: Command Line Method (Advanced)

If you prefer using the command line:

```bash
# Find Electron path
ELECTRON_PATH=$(find node_modules -name "Electron.app" -type d | head -1)
echo "Electron found at: $ELECTRON_PATH"

# Reset Screen Recording permissions for Electron (requires admin)
sudo tccutil reset ScreenCapture "$ELECTRON_PATH"
```

Then restart the Electron app and try screen sharing again. macOS will prompt you to grant permission.

## Verify Permissions

After granting permissions, try clicking "Start Screen Share" in the app. If it still doesn't work:

1. Make sure Electron app is completely closed
2. Restart the Electron app
3. Try screen sharing again

## Troubleshooting

### Electron still doesn't appear in System Preferences
- Make sure you're using the full absolute path (not relative)
- Try restarting your Mac (sometimes macOS needs a restart to recognize new apps)
- Check that Electron.app actually exists at that path

### Permission granted but still not working
- Make sure you restarted the Electron app after granting permission
- Check Console.app for any error messages
- Try revoking and re-granting the permission

### For Production Builds
When you build the app with `electron-builder`, it will create a proper app bundle with entitlements configured. The built app will appear properly in System Preferences.

