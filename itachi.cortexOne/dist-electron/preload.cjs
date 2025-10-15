"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("desktopApi", {
  // MCP Server Management
  startMcpServer: (serverName, config) => electron.ipcRenderer.invoke("start-mcp-server", serverName, config),
  stopMcpServer: (serverName) => electron.ipcRenderer.invoke("stop-mcp-server", serverName),
  getMcpServerStatus: (serverName) => electron.ipcRenderer.invoke("get-mcp-server-status", serverName),
  sendMcpRequest: (serverName, request) => electron.ipcRenderer.invoke("send-mcp-request", serverName, request),
  // API Service (to avoid CORS)
  fetchModels: (provider) => electron.ipcRenderer.invoke("fetch-models", provider),
  generateTitle: (provider, modelId, firstMessage) => electron.ipcRenderer.invoke("generate-title", provider, modelId, firstMessage),
  sendMessageStream: (provider, modelId, messages, tools) => electron.ipcRenderer.invoke("send-message-stream", provider, modelId, messages, tools),
  // Settings persistence
  getSettings: () => electron.ipcRenderer.invoke("get-settings"),
  saveSettings: (settings) => electron.ipcRenderer.invoke("save-settings", settings),
  getSessions: () => electron.ipcRenderer.invoke("get-sessions"),
  saveSessions: (sessions) => electron.ipcRenderer.invoke("save-sessions", sessions),
  getProjects: () => electron.ipcRenderer.invoke("get-projects"),
  saveProjects: (projects) => electron.ipcRenderer.invoke("save-projects", projects)
});
electron.contextBridge.exposeInMainWorld("platform", {
  isElectron: true,
  getCurrentWorkingDirectory: () => "."
  // Safe default for renderer process
});
