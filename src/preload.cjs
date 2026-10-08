const { contextBridge, ipcRenderer, webUtils } = require('electron');
// Host capabilities only. Common app functionality uses the same HTTP API as browsers.
contextBridge.exposeInMainWorld('desktopHost', {
  folderPath: file => webUtils.getPathForFile(file),
  selectDirectory: () => ipcRenderer.invoke('host:select-directory'),
});
