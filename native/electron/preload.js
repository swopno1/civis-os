const { contextBridge, ipcRenderer } = require('electron');

/**
 * CivisOS Native Preload
 * Safely exposes native APIs to the browser context.
 */

contextBridge.exposeInMainWorld('civisNative', {
  platform: process.platform,
  version: process.versions.electron,
  // Add native hooks here (e.g., direct serial access, filesystem, etc.)
});

window.addEventListener('DOMContentLoaded', () => {
  console.log('[CivisNative] Preload script injected.');
});
