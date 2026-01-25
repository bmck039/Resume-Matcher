/**
 * Electron preload script
 * Exposes safe APIs to renderer process via contextBridge
 */

const { contextBridge, ipcRenderer } = require("electron");

// Expose safe APIs to the renderer process
contextBridge.exposeInMainWorld("electronAPI", {
  // File dialogs
  openFile: (options) => ipcRenderer.invoke("dialog:openFile", options),
  saveFile: (options) => ipcRenderer.invoke("dialog:saveFile", options),

  // App info
  getVersion: () => ipcRenderer.invoke("app:getVersion"),
  getBackendUrl: () => ipcRenderer.invoke("app:getBackendUrl"),
  getAppDataPath: () => ipcRenderer.invoke("app:getAppDataPath"),

  // System integration
  openExternal: (url) => ipcRenderer.invoke("shell:openExternal", url),
});

// Suppress console errors that are benign
if (process.env.NODE_ENV === 'production') {
  const originalError = console.error;
  console.error = function(...args) {
    const message = args[0]?.toString?.() || '';
    // Suppress Chrome protocol errors that don't affect functionality
    if (
      message.includes('Autofill') ||
      message.includes('setAddresses') ||
      message.includes('protocol_client')
    ) {
      return;
    }
    originalError.apply(console, args);
  };
}
