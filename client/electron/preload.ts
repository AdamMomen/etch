import { ipcRenderer, contextBridge } from "electron";

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args;
    return ipcRenderer.on(channel, (event, ...args) =>
      listener(event, ...args)
    );
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args;
    return ipcRenderer.off(channel, ...omit);
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args;
    return ipcRenderer.send(channel, ...omit);
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args;
    return ipcRenderer.invoke(channel, ...omit);
  },
});

// Expose desktopCapturer API
contextBridge.exposeInMainWorld("electron", {
  desktopCapturer: {
    getSources: (options: Electron.SourcesOptions) =>
      ipcRenderer.invoke("desktop-capturer-get-sources", options),
  },
  // Listen for permission help messages from main process
  onPermissionHelp: (
    callback: (data: { bundlePath: string; executablePath: string }) => void
  ) => {
    ipcRenderer.on("show-permission-help", (_event, data) => callback(data));
  },
  onMessage: (callback: (data: { type: string; message: string }) => void) => {
    ipcRenderer.on("show-message", (_event, data) => callback(data));
  },
  removePermissionHelpListener: () => {
    ipcRenderer.removeAllListeners("show-permission-help");
  },
  removeMessageListener: () => {
    ipcRenderer.removeAllListeners("show-message");
  },
});
