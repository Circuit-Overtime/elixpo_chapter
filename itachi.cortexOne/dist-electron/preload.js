import { contextBridge, ipcRenderer } from "electron";
contextBridge.exposeInMainWorld("desktopApi", {
  // MCP Server Management
  startMcpServer: (serverName, config) => ipcRenderer.invoke("start-mcp-server", serverName, config),
  stopMcpServer: (serverName) => ipcRenderer.invoke("stop-mcp-server", serverName),
  getMcpServerStatus: (serverName) => ipcRenderer.invoke("get-mcp-server-status", serverName),
  sendMcpRequest: (serverName, request) => ipcRenderer.invoke("send-mcp-request", serverName, request),
  // API Service (to avoid CORS)
  fetchModels: (provider) => ipcRenderer.invoke("fetch-models", provider),
  generateTitle: (provider, modelId, firstMessage) => ipcRenderer.invoke("generate-title", provider, modelId, firstMessage),
  sendMessageStream: (provider, modelId, messages, tools) => ipcRenderer.invoke("send-message-stream", provider, modelId, messages, tools),
  // Settings persistence
  getSettings: () => ipcRenderer.invoke("get-settings"),
  saveSettings: (settings) => ipcRenderer.invoke("save-settings", settings),
  getSessions: () => ipcRenderer.invoke("get-sessions"),
  saveSessions: (sessions) => ipcRenderer.invoke("save-sessions", sessions),
  getProjects: () => ipcRenderer.invoke("get-projects"),
  saveProjects: (projects) => ipcRenderer.invoke("save-projects", projects)
});
contextBridge.exposeInMainWorld("platform", {
  isElectron: true,
  getCurrentWorkingDirectory: () => "."
  // Safe default for renderer process
});
