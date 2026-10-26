// Runs sandboxed. Exposes one function to the page: compile on the main process.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("prismHost", {
  compile: (payload) => ipcRenderer.invoke("prism:compile", payload),
});
