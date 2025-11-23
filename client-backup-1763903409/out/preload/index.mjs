import { contextBridge, ipcRenderer } from "electron";
contextBridge.exposeInMainWorld("electron", {
  desktopCapturer: {
    getSources: (options) => ipcRenderer.invoke("desktop-capturer-get-sources", options)
  }
});
