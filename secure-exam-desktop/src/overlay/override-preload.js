const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("overrideBridge", {
  submit: (code) => ipcRenderer.send("override:submit", code),
  cancel: () => ipcRenderer.send("override:cancel"),
  onResult: (cb) => ipcRenderer.on("override:result", (_e, ok) => cb(ok)),
});
