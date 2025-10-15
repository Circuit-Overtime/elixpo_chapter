



export enum Role {
  SYSTEM = "system",
  USER = "user",
  MODEL = "model",
  TOOL = "tool",
  CONSENT = "consent", // For tool consent requests
}

export interface ToolCallFunction {
    name: string;
    arguments: string; 
}

export interface ToolCall {
    id: string;
    type: 'function';
    function: ToolCallFunction;
}

export interface Tool {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: Record<string, any>; // JSON Schema object
        endpoint?: string; // The URL to call for execution, stripped before sending to model
    };
}

export interface Plugin {
    id: string;
    name: string;
    description: string;
    tools: Tool[];
}


export interface ImageAttachment {
  url: string; // base64 data URL
  mimeType: string;
}



export interface Message {
  id: string;
  role: Role;
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  timestamp: number;
  // For consent messages
  pendingToolCalls?: ToolCall[];
  images?: ImageAttachment[];
}

export interface Session {
  id: string;
  title: string;
  messages: Message[];
  isTemporary: boolean;
  projectId?: string | null;
}

export interface Project {
    id:string;
    name: string;
}

export interface Model {
    id: string;
    name: string;
}

// Claude Desktop MCP Server Configuration (exact format)
export interface McpServer {
    command: string;
    args?: string[];
    env?: Record<string, string>;
    workingDirectory?: string;
    alwaysAllowTools?: string[]; // Tools that are always allowed without asking
}

export interface ClaudeDesktopConfig {
    mcpServers: Record<string, McpServer>;
}

export interface Provider {
    id: string;
    name: string;
    baseURL: string;
    proxyURL?: string;
    apiKey: string;
    headers: Record<string, string>;
    parameters: Record<string, any>;
    stream?: boolean;
    useRandomSeed?: boolean; // Global random seed setting
    retrySettings?: {
        enabled: boolean;
        maxRetries: number;
    };
    modelsEndpoint?: string; // Optional custom models endpoint
    providerType?: string; // Template type used to create this provider
}

export interface ProviderTemplate {
    id: string;
    name: string;
    description: string;
    baseURL: string;
    defaultHeaders: Record<string, string>;
    defaultParameters: Record<string, any>;
    modelsEndpoint?: string;
    authType: 'bearer' | 'header' | 'query';
    authField?: string; // For custom auth headers
    stream: boolean;
    responseFormat: 'openai' | 'ollama' | 'anthropic' | 'gemini' | 'custom';
    icon?: string; // Optional icon identifier
    disabled?: boolean; // If true, users cannot select this provider
}

export interface ModelAssignment {
    providerId: string;
    modelId: string;
}

export interface PluginServer {
    id: string;
    name: string;
    command: string;
    args?: string[];
    env?: Record<string, string>;
    alwaysAllow?: string[];
}

export interface Settings {
    providers: Provider[];
    modelAssignments: {
        main: ModelAssignment | null;
        background: ModelAssignment | null;
    };
    claudeDesktopConfig: ClaudeDesktopConfig; // Exact Claude Desktop format
    pluginServers: PluginServer[];
    pluginSettings: Record<string, { enabled: boolean }>;
    memorySettings?: {
        enabled: boolean;
        maxMemories: number;
        retentionDays: number;
    };
}



export interface DesktopApi {
  // MCP Server Management
  startMcpServer: (serverName: string, config: McpServer) => Promise<boolean>;
  stopMcpServer: (serverName: string) => Promise<boolean>;
  getMcpServerStatus: (serverName: string) => Promise<'running' | 'stopped' | 'error'>;
  sendMcpRequest: (serverName: string, request: any) => Promise<any>;
  
  // API Service (to avoid CORS)
  fetchModels: (provider: { baseURL: string; apiKey: string; proxyURL?: string; headers?: Record<string, string>; modelsEndpoint?: string }) => Promise<{ success: boolean; data?: any[]; error?: string }>;
  generateTitle: (provider: any, modelId: string, firstMessage: string) => Promise<{ success: boolean; title: string }>;
  sendMessageStream: (provider: any, modelId: string, messages: any[], tools: any[], requestId?: string) => Promise<{ success: boolean; data?: any; error?: string; streaming: boolean; aborted?: boolean }>;
  cancelRequest: (requestId: string) => Promise<{ success: boolean; error?: string }>;

  
  // Settings persistence
  getSettings: () => Promise<any>;
  saveSettings: (settings: any) => Promise<{ success: boolean; error?: string }>;
  getSessions: () => Promise<any[]>;
  saveSessions: (sessions: any[]) => Promise<{ success: boolean; error?: string }>;
  getProjects: () => Promise<any[]>;
  saveProjects: (projects: any[]) => Promise<{ success: boolean; error?: string }>;
}

export interface ElectronAPI {
  getStoreValue: (key: string) => Promise<any>;
  setStoreValue: (key: string, value: any) => Promise<void>;
  getPluginServers: () => Promise<PluginServer[]>;
  addPluginServer: (serverConfig: PluginServer) => Promise<PluginServer[]>;
  updatePluginServer: (index: number, serverConfig: PluginServer) => Promise<PluginServer[]>;
  removePluginServer: (index: number) => Promise<PluginServer[]>;
}

declare global {
    interface Window {

        desktopApi?: DesktopApi;
        electronAPI: ElectronAPI;
    }
}