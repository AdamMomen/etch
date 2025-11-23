import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  desktopCapturer: {
    getSources: (options: Electron.SourcesOptions) =>
      ipcRenderer.invoke('desktop-capturer-get-sources', options),
  },
});

