import { defineConfig } from "vite";
import path from "node:path";
import { existsSync } from "node:fs";
import electron from "vite-plugin-electron/simple";
import react from "@vitejs/plugin-react";

// Check if symlink exists and use it for better permissions
const SYMLINK_PATH = "/Applications/Electron-NAMELESS.app";
const SYMLINK_EXECUTABLE = path.join(SYMLINK_PATH, "Contents/MacOS/Electron");
const USE_SYMLINK =
  process.platform === "darwin" && existsSync(SYMLINK_EXECUTABLE);

if (USE_SYMLINK) {
  console.log("✅ Using Electron from symlink:", SYMLINK_PATH);
  console.log("💡 This helps macOS recognize the app for permissions");
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        // Shortcut of `build.lib.entry`.
        entry: "electron/main.ts",
      },
      preload: {
        // Shortcut of `build.rollupOptions.input`.
        // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
        input: path.join(__dirname, "electron/preload.ts"),
      },
      // Use symlink executable if available (for better macOS permissions)
      ...(USE_SYMLINK && {
        electron: SYMLINK_EXECUTABLE,
      }),
      // Ployfill the Electron and Node.js API for Renderer process.
      // If you want use Node.js in Renderer process, the `nodeIntegration` needs to be enabled in the Main process.
      // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
      renderer:
        process.env.NODE_ENV === "test"
          ? // https://github.com/electron-vite/vite-plugin-electron-renderer/issues/78#issuecomment-2053600808
            undefined
          : {},
    }),
  ],
});
