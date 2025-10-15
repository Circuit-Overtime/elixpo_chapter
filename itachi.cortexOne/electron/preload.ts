import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('desktopApi', {
  // MCP Server Management
  startMcpServer: (serverName: string, config: { command: string; args?: string[]; env?: Record<string, string> }) =>
    ipcRenderer.invoke('start-mcp-server', serverName, config),
  
  stopMcpServer: (serverName: string) =>
    ipcRenderer.invoke('stop-mcp-server', serverName),
  
  getMcpServerStatus: (serverName: string) =>
    ipcRenderer.invoke('get-mcp-server-status', serverName),
  
  sendMcpRequest: (serverName: string, request: any) =>
    ipcRenderer.invoke('send-mcp-request', serverName, request),

  // API Service (to avoid CORS)
  fetchModels: (provider: { baseURL: string; apiKey: string; proxyURL?: string; headers?: Record<string, string> }) =>
    ipcRenderer.invoke('fetch-models', provider),
  
  generateTitle: (provider: any, modelId: string, firstMessage: string) =>
    ipcRenderer.invoke('generate-title', provider, modelId, firstMessage),
  
  sendMessageStream: (provider: any, modelId: string, messages: any[], tools: any[]) =>
    ipcRenderer.invoke('send-message-stream', provider, modelId, messages, tools),



  // Settings persistence
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),
  getSessions: () => ipcRenderer.invoke('get-sessions'),
  saveSessions: (sessions: any) => ipcRenderer.invoke('save-sessions', sessions),
  getProjects: () => ipcRenderer.invoke('get-projects'),
  saveProjects: (projects: any) => ipcRenderer.invoke('save-projects', projects),
});

// Expose platform info safely
contextBridge.exposeInMainWorld('platform', {
  isElectron: true,
  getCurrentWorkingDirectory: () => '.' // Safe default for renderer process
});