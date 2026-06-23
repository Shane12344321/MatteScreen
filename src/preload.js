// preload.js — safe bridge between renderers and the main process.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("mattescreen", {
  // Overlay windows: receive texture + intensity pushes.
  onState: (cb) => ipcRenderer.on("mattescreen:state", (_evt, state) => cb(state)),
  // Control UIs (panel + settings): receive full UI-state pushes.
  onUi: (cb) => ipcRenderer.on("mattescreen:ui", (_evt, state) => cb(state)),
  // Queries / actions.
  getState: () => ipcRenderer.invoke("mattescreen:getState"),
  setSettings: (patch) => ipcRenderer.invoke("mattescreen:setSettings", patch),
  snooze: (minutes) => ipcRenderer.invoke("mattescreen:snooze", minutes),
  openSettings: () => ipcRenderer.invoke("mattescreen:openSettings"),
  quit: () => ipcRenderer.invoke("mattescreen:quit"),
  // Panel-only helpers.
  reportHeight: (h) => ipcRenderer.send("mattescreen:panelHeight", h),
  closePanel: () => ipcRenderer.send("mattescreen:closePanel"),
});
