import { app, BrowserWindow, desktopCapturer, ipcMain } from "electron";
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

// Handle desktop capturer requests
ipcMain.handle("desktop-capturer-get-sources", async (_event, options) => {
  try {
    console.log("Requesting desktop sources with options:", options);
    console.log("App path:", app.getPath("exe"));
    console.log("App name:", app.getName());

    // On macOS, we need screen recording permission
    if (process.platform === "darwin") {
      console.log("macOS detected - checking screen recording permission...");
    }

    const sources = await desktopCapturer.getSources(options);
    console.log(`Found ${sources.length} sources`);
    return sources;
  } catch (error) {
    const err = error as Error;
    console.error("Error getting desktop sources:", err);
    console.error("Error details:", {
      message: err?.message,
      code: "code" in err ? String(err.code) : undefined,
      stack: err?.stack,
    });

    // Provide more helpful error message
    if (process.platform === "darwin") {
      const appPath = app.getPath("exe");
      const appBundlePath = appPath.replace(/\/Contents\/MacOS\/Electron$/, "");

      const helpfulError = new Error(
        `Screen Recording Permission Required\n\n` +
          `Please ensure:\n` +
          `1. Electron is added to System Preferences > Security & Privacy > Screen Recording\n` +
          `2. The app has been completely quit (Cmd+Q) and restarted\n` +
          `3. If Electron doesn't appear, use Go to Folder (Cmd+Shift+G) and navigate to:\n` +
          `   App Bundle: ${appBundlePath}\n` +
          `   (If that doesn't work, try the executable: ${appPath})\n\n` +
          `Original error: ${err?.message || String(error)}`
      );
      throw helpfulError;
    }

    throw error;
  }
});

app.whenReady().then(createWindow);
