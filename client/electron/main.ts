import {
  app,
  BrowserWindow,
  desktopCapturer,
  ipcMain,
  shell,
  Menu,
} from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, "..");

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

// Set consistent app name so macOS recognizes it as the same app each time
app.setName("NAMELESS");
app.setAsDefaultProtocolClient("nameless");

// Create application menu
function createMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.getName(),
      submenu: [
        { role: "about", label: "About NAMELESS" },
        { type: "separator" },
        { role: "services", label: "Services", submenu: [] },
        { type: "separator" },
        { role: "hide", label: "Hide NAMELESS" },
        { role: "hideOthers", label: "Hide Others" },
        { role: "unhide", label: "Show All" },
        { type: "separator" },
        { role: "quit", label: "Quit NAMELESS" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo", label: "Undo" },
        { role: "redo", label: "Redo" },
        { type: "separator" },
        { role: "cut", label: "Cut" },
        { role: "copy", label: "Copy" },
        { role: "paste", label: "Paste" },
        { role: "selectAll", label: "Select All" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload", label: "Reload" },
        { role: "forceReload", label: "Force Reload" },
        { role: "toggleDevTools", label: "Toggle Developer Tools" },
        { type: "separator" },
        { role: "resetZoom", label: "Actual Size" },
        { role: "zoomIn", label: "Zoom In" },
        { role: "zoomOut", label: "Zoom Out" },
        { type: "separator" },
        { role: "togglefullscreen", label: "Toggle Full Screen" },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize", label: "Minimize" },
        { role: "close", label: "Close" },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Request Screen Recording Permission",
          click: async () => {
            if (process.platform === "darwin") {
              // Open System Preferences to Screen Recording page
              shell.openExternal(
                "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"
              );

              // Also show helpful message
              const appPath = app.getPath("exe");
              const appBundlePath = appPath.replace(
                /\/Contents\/MacOS\/Electron$/,
                ""
              );

              // Send message to renderer to show notification
              const windows = BrowserWindow.getAllWindows();
              windows.forEach((win) => {
                win.webContents.send("show-permission-help", {
                  bundlePath: appBundlePath,
                  executablePath: appPath,
                });
              });
            } else {
              // Not macOS
              const windows = BrowserWindow.getAllWindows();
              windows.forEach((win) => {
                win.webContents.send("show-message", {
                  type: "info",
                  message:
                    "Screen recording permissions are only required on macOS.",
                });
              });
            }
          },
        },
        {
          label: "Check Permission Status",
          click: async () => {
            if (process.platform === "darwin") {
              const hasPermission = await checkScreenRecordingPermission();
              const windows = BrowserWindow.getAllWindows();
              windows.forEach((win) => {
                win.webContents.send("show-message", {
                  type: hasPermission ? "success" : "error",
                  message: hasPermission
                    ? "✅ Screen recording permission is granted"
                    : "❌ Screen recording permission is not granted. Use 'Request Screen Recording Permission' to grant it.",
                });
              });
            }
          },
        },
        { type: "separator" },
        {
          label: "About Screen Recording",
          click: () => {
            shell.openExternal(
              "https://support.apple.com/guide/mac-help/control-access-screen-system-audio-recording-mchld6aa7d23/mac"
            );
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

let win: BrowserWindow | null;

function createWindow() {
  // Note: Dock icon is handled automatically by electron-builder in production
  // In dev mode, Electron uses its default icon (no need to set manually)

  // Window icon - electron-builder handles this automatically in production
  // In dev mode, we don't set an icon (Electron uses default)
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Test active push message to Renderer-process.
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Check screen recording permission status (macOS only)
async function checkScreenRecordingPermission(): Promise<boolean> {
  if (process.platform !== "darwin") {
    return true; // Not macOS, assume permission granted
  }

  try {
    // Try to get sources - if it works, permission is granted
    const sources = await desktopCapturer.getSources({ types: ["screen"] });
    return sources.length > 0;
  } catch (error) {
    return false;
  }
}

// Handle desktop capturer requests
ipcMain.handle("desktop-capturer-get-sources", async (_event, options) => {
  try {
    console.log("Requesting desktop sources with options:", options);
    console.log("App path:", app.getPath("exe"));
    console.log("App name:", app.getName());

    // On macOS, check and handle screen recording permission
    if (process.platform === "darwin") {
      const hasPermission = await checkScreenRecordingPermission();
      if (!hasPermission) {
        console.log("⚠️ Screen recording permission not granted");

        // Open System Preferences to Screen Recording page
        shell.openExternal(
          "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"
        );

        const appPath = app.getPath("exe");
        const appBundlePath = appPath.replace(
          /\/Contents\/MacOS\/Electron$/,
          ""
        );

        throw new Error(
          `Screen Recording Permission Required\n\n` +
            `System Preferences has been opened.\n\n` +
            `Steps:\n` +
            `1. Click the lock icon 🔒 and enter your password\n` +
            `2. Click the '+' button\n` +
            `3. Press Cmd+Shift+G (Go to Folder)\n` +
            `4. Paste this path:\n` +
            `   ${appBundlePath}\n` +
            `5. Select Electron.app and click 'Open'\n` +
            `6. Make sure the checkbox is checked ✅\n` +
            `7. Completely quit this app (Cmd+Q) and restart\n\n` +
            `After granting permission, try again.`
        );
      }
    }

    const sources = await desktopCapturer.getSources(options);
    console.log(`✅ Found ${sources.length} sources`);
    return sources;
  } catch (error) {
    const err = error as Error;
    console.error("❌ Error getting desktop sources:", err);

    // If it's already our custom error, re-throw it
    if (err.message.includes("Screen Recording Permission Required")) {
      throw err;
    }

    // Otherwise, provide helpful error message
    if (process.platform === "darwin") {
      const appPath = app.getPath("exe");
      const appBundlePath = appPath.replace(/\/Contents\/MacOS\/Electron$/, "");

      // Try to open System Preferences
      try {
        shell.openExternal(
          "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"
        );
      } catch (e) {
        console.error("Failed to open System Preferences:", e);
      }

      const helpfulError = new Error(
        `Screen Recording Permission Required\n\n` +
          `System Preferences has been opened.\n\n` +
          `Please add Electron to Screen Recording permissions:\n` +
          `1. Use Go to Folder (Cmd+Shift+G) and navigate to:\n` +
          `   ${appBundlePath}\n` +
          `2. Select Electron.app and click 'Open'\n` +
          `3. Make sure the checkbox is checked ✅\n` +
          `4. Completely quit this app (Cmd+Q) and restart\n\n` +
          `Original error: ${err?.message || String(error)}`
      );
      throw helpfulError;
    }

    throw error;
  }
});

app.whenReady().then(() => {
  createMenu();
  createWindow();
});
