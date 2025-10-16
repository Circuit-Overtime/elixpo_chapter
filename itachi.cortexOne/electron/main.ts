import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import Store from 'electron-store';
import { spawn, ChildProcess } from 'child_process';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The schema is no longer needed here for process management,
// but we keep the store for general purpose settings persistence.
const store = new Store();

// MCP servers will be managed in the IPC handlers



function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });

  // MCP Server Management with Auto-Installation
  const mcpServers = new Map<string, ChildProcess>();
  const serverInstallations = new Map<string, boolean>(); // Track installation status
  
  // Track active API requests for cancellation
  const activeRequests = new Map<string, AbortController>();

  // Auto-install and resolve MCP server paths
  const resolveMcpServerConfig = async (serverName: string, config: { command: string; args?: string[]; env?: Record<string, string> }) => {
    // Handle special cases for servers that need auto-installation or path resolution
    const resolvedConfig = { ...config };

    // No special handling needed - users configure their own MCP servers

    // Handle filesystem - auto-set current directory
    if (serverName === 'filesystem' && config.args?.includes('.')) {
      resolvedConfig.args = config.args.map(arg => arg === '.' ? process.cwd() : arg);
    }

    return resolvedConfig;
  };

  // Start MCP Server (Enhanced with Auto-Installation)
  ipcMain.handle('start-mcp-server', async (event, serverName: string, config: { command: string; args?: string[]; env?: Record<string, string>; workingDirectory?: string }) => {
    try {
      if (mcpServers.has(serverName)) {
        return true;
      }

      // Resolve and auto-install if needed
      const resolvedConfig = await resolveMcpServerConfig(serverName, config);

      // Use shell: true on Windows for better compatibility
      const useShell = process.platform === 'win32';

      const spawnOptions: any = {
        env: { ...process.env, ...resolvedConfig.env },
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: useShell,
        windowsHide: true
      };

      // Set working directory if specified
      if (config.workingDirectory) {
        spawnOptions.cwd = config.workingDirectory;
      }

      const child = spawn(resolvedConfig.command, resolvedConfig.args || [], spawnOptions);

      if (!child.pid) {
        console.error(`Failed to start MCP server ${serverName}`);
        return false;
      }

      mcpServers.set(serverName, child);

      // Handle process events
      child.on('error', (error) => {
        console.error(`MCP server ${serverName} error:`, error);
        mcpServers.delete(serverName);
      });

      child.on('exit', (code, signal) => {
        mcpServers.delete(serverName);
      });

      child.stderr?.on('data', (data) => {
        console.error(`[${serverName}] ${data.toString().trim()}`);
      });

      return true;
    } catch (error) {
      console.error(`Failed to start MCP server ${serverName}:`, error);
      return false;
    }
  });

  // Stop MCP Server (Claude Desktop way)
  ipcMain.handle('stop-mcp-server', async (event, serverName: string) => {
    try {
      const process = mcpServers.get(serverName);
      if (process) {
        process.kill('SIGTERM');
        mcpServers.delete(serverName);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Failed to stop MCP server ${serverName}:`, error);
      return false;
    }
  });

  // Get MCP Server Status (Claude Desktop way)
  ipcMain.handle('get-mcp-server-status', async (event, serverName: string) => {
    const process = mcpServers.get(serverName);
    if (!process) return 'stopped';
    if (process.killed || process.exitCode !== null) return 'stopped';
    return 'running';
  });



  // Send MCP Request (JSON-RPC over stdio) - Claude Desktop way
  ipcMain.handle('send-mcp-request', async (event, serverName: string, request: any) => {
    const childProcess = mcpServers.get(serverName);
    if (!childProcess) {
      throw new Error(`MCP server ${serverName} is not running`);
    }

    return new Promise((resolve, reject) => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const jsonRpcRequest = {
        jsonrpc: '2.0',
        id: requestId,
        method: request.method,
        params: request.params || {}
      };

      let responseBuffer = '';

      const onData = (data: Buffer) => {
        responseBuffer += data.toString();
        const lines = responseBuffer.split('\n');
        responseBuffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.trim()) {
            try {
              const response = JSON.parse(line.trim());
              if (response.id === requestId) {
                childProcess.stdout?.off('data', onData);
                if (response.error) {
                  console.error(`MCP error from ${serverName}:`, response.error);
                  reject(new Error(response.error.message || 'MCP request failed'));
                } else {
                  resolve(response.result);
                }
                return;
              }
            } catch (parseError) {
              console.warn(`Failed to parse MCP response from ${serverName}:`, line);
            }
          }
        }
      };

      childProcess.stdout?.on('data', onData);

      // Send request
      try {
        childProcess.stdin?.write(JSON.stringify(jsonRpcRequest) + '\n');
      } catch (writeError) {
        process.stdout?.off('data', onData);
        reject(new Error(`Failed to send request to ${serverName}: ${writeError}`));
        return;
      }

      // Timeout after 30 seconds
      setTimeout(() => {
        childProcess.stdout?.off('data', onData);
        reject(new Error(`MCP request to ${serverName} timed out`));
      }, 30000);
    });
  });

  // API Service Handlers (to avoid CORS issues)

  // Fetch models from provider
  ipcMain.handle('fetch-models', async (event, provider: { baseURL: string; apiKey: string; proxyURL?: string; headers?: Record<string, string>; modelsEndpoint?: string }) => {
    try {
      const baseUrl = provider.baseURL.replace(/\/$/, '');

      // If user provided a specific models endpoint, use ONLY that endpoint
      let modelsEndpoints: string[] = [];
      if (provider.modelsEndpoint && provider.modelsEndpoint.trim()) {
        // User provided custom endpoint - use it exclusively
        modelsEndpoints = [provider.modelsEndpoint.trim()];
      } else {
        // Try common model endpoint patterns only if no custom endpoint provided
        modelsEndpoints = [
          `${baseUrl}/v1/models`,           // OpenAI standard
          `${baseUrl}/models`,              // Some APIs omit /v1
          `${baseUrl}/v1beta/models`,       // Google Gemini
          `${baseUrl}/api/v1/models`,       // Some custom APIs
          baseUrl                           // Direct endpoint (last resort)
        ];
      }

      let lastError: Error | null = null;

      // Try each endpoint until one works
      for (const modelsUrl of modelsEndpoints) {
        try {
          const endpoint = provider.proxyURL
            ? `${provider.proxyURL.replace(/\/$/, '')}/${modelsUrl}`
            : modelsUrl;

          const response = await fetch(endpoint, {
            headers: {
              'Authorization': `Bearer ${provider.apiKey}`,
              'Content-Type': 'application/json',
              ...provider.headers
            }
          });

          if (response.ok) {
            const data = await response.json();

            // Handle different response formats
            let models = [];
            if (Array.isArray(data)) {
              // Direct array of models
              models = data;
            } else if (data.data && Array.isArray(data.data)) {
              // OpenAI format: { data: [...] }
              models = data.data;
            } else if (data.models && Array.isArray(data.models)) {
              // Alternative format: { models: [...] }
              models = data.models;
            } else if (data.model && Array.isArray(data.model)) {
              // Another format: { model: [...] }
              models = data.model;
            } else if (typeof data === 'object' && data !== null) {
              // If it's an object, try to extract model-like properties
              const keys = Object.keys(data);
              const modelArrayKey = keys.find(key =>
                Array.isArray(data[key]) &&
                data[key].length > 0 &&
                typeof data[key][0] === 'object' &&
                (data[key][0].id || data[key][0].name || data[key][0].model)
              );
              if (modelArrayKey) {
                models = data[modelArrayKey];
              } else {
                // Last resort: treat the whole object as a single model if it has id/name
                if (data.id || data.name || data.model) {
                  models = [data];
                }
              }
            }

            // Normalize model objects to ensure they have id and name
            const normalizedModels = models.map((model: any) => {
              if (typeof model === 'string') {
                return { id: model, name: model };
              } else if (typeof model === 'object' && model !== null) {
                const id = model.id || model.name || model.model || 'unknown';
                const name = model.name || model.id || model.model || id;
                return { id, name, ...model };
              }
              return { id: 'unknown', name: 'Unknown Model' };
            });

            return { success: true, data: normalizedModels };
          } else {
            // Store the error but continue trying other endpoints
            const errorText = await response.text();
            lastError = new Error(`${response.status}: ${errorText.substring(0, 100)}`);
          }
        } catch (error: any) {
          lastError = error;
          continue;
        }
      }

      // If we get here, all endpoints failed
      if (provider.modelsEndpoint && provider.modelsEndpoint.trim()) {
        // User provided a custom endpoint that failed
        throw new Error(`Failed to fetch models from user-provided endpoint: ${provider.modelsEndpoint}. Error: ${lastError?.message || 'Unknown error'}`);
      } else {
        // Auto-detection failed - provide more helpful error message
        const errorMessage = lastError?.message || 'Unknown error';
        throw new Error(`Failed to fetch models. Auto-detection tried these endpoints: ${modelsEndpoints.join(', ')}. Last error: ${errorMessage}. Try providing a custom models endpoint in provider settings.`);
      }
    } catch (error: any) {
      console.error('Error fetching models:', error);
      return { success: false, error: error.message };
    }
  });

  // Generate title
  ipcMain.handle('generate-title', async (event, provider: any, modelId: string, firstMessage: string) => {
    try {
      const prompt = `Generate a concise, 3-5 word title for a conversation starting with this prompt: "${firstMessage}". Respond with only the title text, nothing else.`;

      const { customModels, ...apiParameters } = provider.parameters || {};
      const providerType = provider.providerType || 'openai-compatible';

      let body: any;
      if (providerType === 'ollama') {
        body = {
          model: modelId,
          messages: [{ role: 'user', content: prompt }],
          stream: false,
          ...apiParameters
        };
      } else if (providerType === 'anthropic') {
        body = {
          model: modelId,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 20,
          ...apiParameters
        };
      } else {
        body = {
          ...apiParameters,
          model: modelId,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 20,
          stream: false,
        };
      }

      const endpoint = provider.proxyURL
        ? `${provider.proxyURL.replace(/\/$/, '')}/${provider.baseURL.replace(/\/$/, '')}`
        : provider.baseURL.replace(/\/$/, '');

      // Set headers based on provider type
      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...provider.headers,
      };

      if (providerType === 'anthropic') {
        headers['x-api-key'] = provider.apiKey;
        headers['anthropic-version'] = '2023-06-01';
      } else if (provider.apiKey) {
        headers['Authorization'] = `Bearer ${provider.apiKey}`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Title generation failed: ${response.statusText}`);
      }

      const data = await response.json();

      // Handle different response formats
      let content = '';
      if (data.choices && data.choices[0]?.message?.content) {
        // OpenAI format
        content = data.choices[0].message.content;
      } else if (data.message && data.message.content) {
        // Ollama format
        content = data.message.content;
      } else if (data.content) {
        // Anthropic format or direct content
        content = Array.isArray(data.content)
          ? data.content.map((c: any) => c.text || c).join('')
          : data.content;
      } else if (data.candidates && data.candidates[0]?.content) {
        // Gemini format
        const parts = data.candidates[0].content.parts || [];
        content = parts.map((part: any) => part.text || '').join('');
      } else if (data.text) {
        // Simple text response
        content = data.text;
      } else {
        // Fallback
        content = data.response || data.output || '';
      }

      const title = content.trim().replace(/"/g, '') || "Untitled Chat";
      return { success: true, title };
    } catch (error: any) {
      console.error("Error generating title:", error);
      return { success: false, title: "Untitled Chat" };
    }
  });

  // Cancel active request
  ipcMain.handle('cancel-request', async (event, requestId: string) => {
    const controller = activeRequests.get(requestId);
    if (controller) {
      controller.abort();
      activeRequests.delete(requestId);
      return { success: true };
    }
    return { success: false, error: 'Request not found' };
  });

  // Send message stream
  ipcMain.handle('send-message-stream', async (event, provider: any, modelId: string, messages: any[], tools: any[], requestId?: string) => {
    // Create abort controller for this request
    const abortController = new AbortController();
    const reqId = requestId || `req-${Date.now()}`;
    activeRequests.set(reqId, abortController);

    try {
      // Filter out error messages and consent messages
      const cleanMessages = messages.filter(msg => {
        // Filter out consent messages (UI only)
        if (msg.role === 'consent') return false;

        // Filter out error messages (only if they have content)
        if (msg.content) {
          if (msg.content.includes('I encountered an error:')) return false;
          if (msg.content.includes('API Error:')) return false;
          if (msg.content.includes('Unexpected token')) return false;
        }

        return true;
      });

      const apiMessages = cleanMessages
        .map(msg => {
          const messagePayload: any = {
            role: msg.role === 'model' ? 'assistant' 
                : msg.role === 'tool' ? 'tool' 
                : msg.role === 'system' ? 'system'
                : 'user',
            content: msg.content || '',
          };

          if (msg.tool_calls && msg.tool_calls.length > 0) {
            messagePayload.tool_calls = msg.tool_calls;
            messagePayload.content = null;
          }

          if (msg.role === 'tool' && msg.tool_call_id) {
            messagePayload.tool_call_id = msg.tool_call_id;
          }

          return messagePayload;
        })
        .filter(msg => {
          // Filter out invalid messages
          // System messages must have content
          if (msg.role === 'system') {
            return msg.content && msg.content.trim().length > 0;
          }
          // User and assistant messages must have content OR tool_calls
          if (msg.role === 'user' || msg.role === 'assistant') {
            const hasContent = msg.content && msg.content.trim().length > 0;
            const hasToolCalls = msg.tool_calls && msg.tool_calls.length > 0;
            return hasContent || hasToolCalls;
          }
          // Tool messages must have content and tool_call_id
          if (msg.role === 'tool') {
            return msg.content && msg.tool_call_id;
          }
          return true;
        });

      // Validation
      if (!apiMessages || apiMessages.length === 0) {
        throw new Error('No valid messages to send');
      }

      const hasUserMessage = apiMessages.some(msg => msg.role === 'user' && msg.content && msg.content.trim().length > 0);
      if (!hasUserMessage) {
        throw new Error('Conversation must contain at least one user message with valid content');
      }

      // Log messages being sent (for debugging)
      console.log('Sending messages to API:', apiMessages.map(m => ({ role: m.role, content: m.content?.substring(0, 100) })));
      console.log('Tools being sent:', tools.map(t => t.function.name));

      const { customModels, ...apiParameters } = provider.parameters || {};

      // Format request based on provider type
      let body: any;
      const providerType = provider.providerType || 'openai-compatible';

      if (providerType === 'ollama') {
        // Ollama format
        body = {
          model: modelId,
          messages: apiMessages,
          stream: false,
          ...apiParameters
        };
      } else if (providerType === 'anthropic') {
        // Anthropic format
        const systemMessage = apiMessages.find(msg => msg.role === 'system');
        const nonSystemMessages = apiMessages.filter(msg => msg.role !== 'system');

        body = {
          model: modelId,
          messages: nonSystemMessages,
          max_tokens: apiParameters.max_tokens || 4000,
          ...apiParameters
        };

        if (systemMessage) {
          body.system = systemMessage.content;
        }
      } else {
        // OpenAI-compatible format (default)
        body = {
          ...apiParameters,
          model: modelId,
          messages: apiMessages,
          stream: false
        };

        // Send tools if available, but validate them first
        if (tools.length > 0) {
          // Validate and clean tools
          const validTools = tools.filter(tool => {
            // Must have type and function
            if (!tool.type || tool.type !== 'function') return false;
            if (!tool.function || !tool.function.name) return false;

            // Must have valid parameters (OpenAI requires this)
            if (!tool.function.parameters || typeof tool.function.parameters !== 'object') {
              // Add default empty parameters if missing
              tool.function.parameters = { type: 'object', properties: {} };
            }

            return true;
          });

          if (validTools.length > 0) {
            body.tools = validTools;
            body.tool_choice = "auto";
          }
        }
      }

      const endpoint = provider.proxyURL
        ? `${provider.proxyURL.replace(/\/$/, '')}/${provider.baseURL.replace(/\/$/, '')}`
        : provider.baseURL.replace(/\/$/, '');

      // Set headers based on provider type
      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...provider.headers,
      };

      if (providerType === 'anthropic') {
        headers['x-api-key'] = provider.apiKey;
        headers['anthropic-version'] = '2023-06-01';
      } else if (provider.apiKey) {
        headers['Authorization'] = `Bearer ${provider.apiKey}`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorBody,
          endpoint
        });
        throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorBody}`);
      }

      // Since we disabled streaming, always handle as non-streaming
      const rawData = await response.json();

      // Handle different response formats
      let data;
      if (rawData.choices && rawData.choices[0]?.message) {
        // OpenAI format: { choices: [{ message: { content: "..." } }] }
        data = rawData;
      } else if (rawData.message && rawData.message.content) {
        // Ollama format: { message: { role: "assistant", content: "..." } }
        data = {
          choices: [{
            message: {
              role: rawData.message.role,
              content: rawData.message.content,
              tool_calls: rawData.message.tool_calls
            }
          }]
        };
      } else if (rawData.content) {
        // Anthropic format: { content: [{ text: "..." }] } or simple { content: "..." }
        const content = Array.isArray(rawData.content)
          ? rawData.content.map(c => c.text || c).join('')
          : rawData.content;
        data = {
          choices: [{
            message: {
              role: 'assistant',
              content: content
            }
          }]
        };
      } else if (rawData.candidates && rawData.candidates[0]?.content) {
        // Gemini format: { candidates: [{ content: { parts: [{ text: "..." }] } }] }
        const parts = rawData.candidates[0].content.parts || [];
        const content = parts.map((part: any) => part.text || '').join('');
        data = {
          choices: [{
            message: {
              role: 'assistant',
              content: content
            }
          }]
        };
      } else if (rawData.text) {
        // Simple text response
        data = {
          choices: [{
            message: {
              role: 'assistant',
              content: rawData.text
            }
          }]
        };
      } else {
        // Unknown format, try to extract any text content
        const content = rawData.response || rawData.output || JSON.stringify(rawData);
        data = {
          choices: [{
            message: {
              role: 'assistant',
              content: content
            }
          }]
        };
      }

      // Clean up the request from active requests
      activeRequests.delete(reqId);
      return { success: true, data, streaming: false };
    } catch (error: any) {
      // Clean up the request from active requests
      activeRequests.delete(reqId);
      
      // Check if it was aborted
      if (error.name === 'AbortError') {
        console.log('Request was aborted');
        return { success: false, error: 'Request cancelled by user', aborted: true };
      }
      
      console.error('Error in send-message-stream:', error);
      return { success: false, error: error.message };
    }
  });



  // Settings persistence handlers
  ipcMain.handle('get-settings', async () => {
    try {
      return store.get('app-settings', null);
    } catch (error) {
      console.error('Error getting settings:', error);
      return null;
    }
  });

  ipcMain.handle('save-settings', async (event, settings) => {
    try {
      store.set('app-settings', settings);
      return { success: true };
    } catch (error) {
      console.error('Error saving settings:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-sessions', async () => {
    try {
      return store.get('chat-sessions', []);
    } catch (error) {
      console.error('Error getting sessions:', error);
      return [];
    }
  });

  ipcMain.handle('save-sessions', async (event, sessions) => {
    try {
      store.set('chat-sessions', sessions);
      return { success: true };
    } catch (error) {
      console.error('Error saving sessions:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-projects', async () => {
    try {
      return store.get('chat-projects', []);
    } catch (error) {
      console.error('Error getting projects:', error);
      return [];
    }
  });

  ipcMain.handle('save-projects', async (event, projects) => {
    try {
      store.set('chat-projects', projects);
      return { success: true };
    } catch (error) {
      console.error('Error saving projects:', error);
      return { success: false, error: error.message };
    }
  });



  if (process.env?.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:8547').catch((error) => {
      console.error('Failed to load development URL:', error);
    });
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexPath).catch((error) => {
      console.error('Failed to load production file:', error);
    });
  }


  const session = mainWindow.webContents.session;

  // Allow all permissions
  session.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true);
  });

  session.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    return true;
  });

  // Set user agent to mimic Chrome (helps with Google services)
  session.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');



  // Log failed resource loads
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', validatedURL, errorDescription);
  });
}



app.whenReady().then(() => {
  createWindow();
}).catch((error) => {
  console.error('Error during app initialization:', error);
});

app.on('activate', function () {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Prevent app from quitting when there are errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
});