const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("smartDesk", {
  listPorts: () => ipcRenderer.invoke("list-ports"),
  connectPort: (path) => ipcRenderer.invoke("connect-port", path),
  disconnectPort: () => ipcRenderer.invoke("disconnect-port"),
  getConnection: () => ipcRenderer.invoke("get-connection"),
  onTelemetry: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on("telemetry", handler);
    return () => ipcRenderer.removeListener("telemetry", handler);
  },
  onConnectionStatus: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on("connection-status", handler);
    return () => ipcRenderer.removeListener("connection-status", handler);
  },
});
