const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("overlayAPI", {
  setClickThrough: (value) => ipcRenderer.send("click-through", value)
});
