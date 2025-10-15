import { app, BrowserWindow, ipcMain } from "electron";
import * as path from "path";
import { fileURLToPath } from "url";
import Store from "electron-store";
import { spawn } from "child_process";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const store = new Store();
function createWindow() {
  var _a;
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  });
  const mcpServers = /* @__PURE__ */ new Map();
  const activeRequests = /* @__PURE__ */ new Map();
  const resolveMcpServerConfig = async (serverName, config) => {
    var _a2;
    const resolvedConfig = { ...config };
    if (serverName === "filesystem" && ((_a2 = config.args) == null ? void 0 : _a2.includes("."))) {
      resolvedConfig.args = config.args.map((arg) => arg === "." ? process.cwd() : arg);
    }
    return resolvedConfig;
  };
  ipcMain.handle("start-mcp-server", async (event, serverName, config) => {
    var _a2;
    try {
      if (mcpServers.has(serverName)) {
        return true;
      }
      const resolvedConfig = await resolveMcpServerConfig(serverName, config);
      const useShell = process.platform === "win32";
      const spawnOptions = {
        env: { ...process.env, ...resolvedConfig.env },
        stdio: ["pipe", "pipe", "pipe"],
        shell: useShell,
        windowsHide: true
      };
      if (config.workingDirectory) {
        spawnOptions.cwd = config.workingDirectory;
      }
      const child = spawn(resolvedConfig.command, resolvedConfig.args || [], spawnOptions);
      if (!child.pid) {
        console.error(`Failed to start MCP server ${serverName}`);
        return false;
      }
      mcpServers.set(serverName, child);
      child.on("error", (error) => {
        console.error(`MCP server ${serverName} error:`, error);
        mcpServers.delete(serverName);
      });
      child.on("exit", (code, signal) => {
        mcpServers.delete(serverName);
      });
      (_a2 = child.stderr) == null ? void 0 : _a2.on("data", (data) => {
        console.error(`[${serverName}] ${data.toString().trim()}`);
      });
      return true;
    } catch (error) {
      console.error(`Failed to start MCP server ${serverName}:`, error);
      return false;
    }
  });
  ipcMain.handle("stop-mcp-server", async (event, serverName) => {
    try {
      const process2 = mcpServers.get(serverName);
      if (process2) {
        process2.kill("SIGTERM");
        mcpServers.delete(serverName);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Failed to stop MCP server ${serverName}:`, error);
      return false;
    }
  });
  ipcMain.handle("get-mcp-server-status", async (event, serverName) => {
    const process2 = mcpServers.get(serverName);
    if (!process2) return "stopped";
    if (process2.killed || process2.exitCode !== null) return "stopped";
    return "running";
  });
  ipcMain.handle("send-mcp-request", async (event, serverName, request) => {
    const childProcess = mcpServers.get(serverName);
    if (!childProcess) {
      throw new Error(`MCP server ${serverName} is not running`);
    }
    return new Promise((resolve, reject) => {
      var _a2, _b, _c;
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const jsonRpcRequest = {
        jsonrpc: "2.0",
        id: requestId,
        method: request.method,
        params: request.params || {}
      };
      let responseBuffer = "";
      const onData = (data) => {
        var _a3;
        responseBuffer += data.toString();
        const lines = responseBuffer.split("\n");
        responseBuffer = lines.pop() || "";
        for (const line of lines) {
          if (line.trim()) {
            try {
              const response = JSON.parse(line.trim());
              if (response.id === requestId) {
                (_a3 = childProcess.stdout) == null ? void 0 : _a3.off("data", onData);
                if (response.error) {
                  console.error(`MCP error from ${serverName}:`, response.error);
                  reject(new Error(response.error.message || "MCP request failed"));
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
      (_a2 = childProcess.stdout) == null ? void 0 : _a2.on("data", onData);
      try {
        (_b = childProcess.stdin) == null ? void 0 : _b.write(JSON.stringify(jsonRpcRequest) + "\n");
      } catch (writeError) {
        (_c = process.stdout) == null ? void 0 : _c.off("data", onData);
        reject(new Error(`Failed to send request to ${serverName}: ${writeError}`));
        return;
      }
      setTimeout(() => {
        var _a3;
        (_a3 = childProcess.stdout) == null ? void 0 : _a3.off("data", onData);
        reject(new Error(`MCP request to ${serverName} timed out`));
      }, 3e4);
    });
  });
  ipcMain.handle("fetch-models", async (event, provider) => {
    try {
      const baseUrl = provider.baseURL.replace(/\/$/, "");
      let modelsEndpoints = [];
      if (provider.modelsEndpoint && provider.modelsEndpoint.trim()) {
        modelsEndpoints = [provider.modelsEndpoint.trim()];
      } else {
        modelsEndpoints = [
          `${baseUrl}/v1/models`,
          // OpenAI standard
          `${baseUrl}/models`,
          // Some APIs omit /v1
          `${baseUrl}/v1beta/models`,
          // Google Gemini
          `${baseUrl}/api/v1/models`,
          // Some custom APIs
          baseUrl
          // Direct endpoint (last resort)
        ];
      }
      let lastError = null;
      for (const modelsUrl of modelsEndpoints) {
        try {
          const endpoint = provider.proxyURL ? `${provider.proxyURL.replace(/\/$/, "")}/${modelsUrl}` : modelsUrl;
          const response = await fetch(endpoint, {
            headers: {
              "Authorization": `Bearer ${provider.apiKey}`,
              "Content-Type": "application/json",
              ...provider.headers
            }
          });
          if (response.ok) {
            const data = await response.json();
            let models = [];
            if (Array.isArray(data)) {
              models = data;
            } else if (data.data && Array.isArray(data.data)) {
              models = data.data;
            } else if (data.models && Array.isArray(data.models)) {
              models = data.models;
            } else if (data.model && Array.isArray(data.model)) {
              models = data.model;
            } else if (typeof data === "object" && data !== null) {
              const keys = Object.keys(data);
              const modelArrayKey = keys.find(
                (key) => Array.isArray(data[key]) && data[key].length > 0 && typeof data[key][0] === "object" && (data[key][0].id || data[key][0].name || data[key][0].model)
              );
              if (modelArrayKey) {
                models = data[modelArrayKey];
              } else {
                if (data.id || data.name || data.model) {
                  models = [data];
                }
              }
            }
            const normalizedModels = models.map((model) => {
              if (typeof model === "string") {
                return { id: model, name: model };
              } else if (typeof model === "object" && model !== null) {
                const id = model.id || model.name || model.model || "unknown";
                const name = model.name || model.id || model.model || id;
                return { id, name, ...model };
              }
              return { id: "unknown", name: "Unknown Model" };
            });
            return { success: true, data: normalizedModels };
          } else {
            const errorText = await response.text();
            lastError = new Error(`${response.status}: ${errorText.substring(0, 100)}`);
          }
        } catch (error) {
          lastError = error;
          continue;
        }
      }
      if (provider.modelsEndpoint && provider.modelsEndpoint.trim()) {
        throw new Error(`Failed to fetch models from user-provided endpoint: ${provider.modelsEndpoint}. Error: ${(lastError == null ? void 0 : lastError.message) || "Unknown error"}`);
      } else {
        const errorMessage = (lastError == null ? void 0 : lastError.message) || "Unknown error";
        throw new Error(`Failed to fetch models. Auto-detection tried these endpoints: ${modelsEndpoints.join(", ")}. Last error: ${errorMessage}. Try providing a custom models endpoint in provider settings.`);
      }
    } catch (error) {
      console.error("Error fetching models:", error);
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("generate-title", async (event, provider, modelId, firstMessage) => {
    var _a2, _b, _c;
    try {
      const prompt = `Generate a concise, 3-5 word title for a conversation starting with this prompt: "${firstMessage}". Respond with only the title text, nothing else.`;
      const { customModels, ...apiParameters } = provider.parameters || {};
      const providerType = provider.providerType || "openai-compatible";
      let body;
      if (providerType === "ollama") {
        body = {
          model: modelId,
          messages: [{ role: "user", content: prompt }],
          stream: false,
          ...apiParameters
        };
      } else if (providerType === "anthropic") {
        body = {
          model: modelId,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 20,
          ...apiParameters
        };
      } else {
        body = {
          ...apiParameters,
          model: modelId,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 20,
          stream: false
        };
      }
      const endpoint = provider.proxyURL ? `${provider.proxyURL.replace(/\/$/, "")}/${provider.baseURL.replace(/\/$/, "")}` : provider.baseURL.replace(/\/$/, "");
      let headers = {
        "Content-Type": "application/json",
        ...provider.headers
      };
      if (providerType === "anthropic") {
        headers["x-api-key"] = provider.apiKey;
        headers["anthropic-version"] = "2023-06-01";
      } else if (provider.apiKey) {
        headers["Authorization"] = `Bearer ${provider.apiKey}`;
      }
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        throw new Error(`Title generation failed: ${response.statusText}`);
      }
      const data = await response.json();
      let content = "";
      if (data.choices && ((_b = (_a2 = data.choices[0]) == null ? void 0 : _a2.message) == null ? void 0 : _b.content)) {
        content = data.choices[0].message.content;
      } else if (data.message && data.message.content) {
        content = data.message.content;
      } else if (data.content) {
        content = Array.isArray(data.content) ? data.content.map((c) => c.text || c).join("") : data.content;
      } else if (data.candidates && ((_c = data.candidates[0]) == null ? void 0 : _c.content)) {
        const parts = data.candidates[0].content.parts || [];
        content = parts.map((part) => part.text || "").join("");
      } else if (data.text) {
        content = data.text;
      } else {
        content = data.response || data.output || "";
      }
      const title = content.trim().replace(/"/g, "") || "Untitled Chat";
      return { success: true, title };
    } catch (error) {
      console.error("Error generating title:", error);
      return { success: false, title: "Untitled Chat" };
    }
  });
  ipcMain.handle("cancel-request", async (event, requestId) => {
    const controller = activeRequests.get(requestId);
    if (controller) {
      controller.abort();
      activeRequests.delete(requestId);
      return { success: true };
    }
    return { success: false, error: "Request not found" };
  });
  ipcMain.handle("send-message-stream", async (event, provider, modelId, messages, tools, requestId) => {
    var _a2, _b;
    const abortController = new AbortController();
    const reqId = requestId || `req-${Date.now()}`;
    activeRequests.set(reqId, abortController);
    try {
      const cleanMessages = messages.filter((msg) => {
        if (msg.role === "consent") return false;
        if (msg.content) {
          if (msg.content.includes("I encountered an error:")) return false;
          if (msg.content.includes("API Error:")) return false;
          if (msg.content.includes("Unexpected token")) return false;
        }
        return true;
      });
      const apiMessages = cleanMessages.map((msg) => {
        const messagePayload = {
          role: msg.role === "model" ? "assistant" : msg.role === "tool" ? "tool" : msg.role === "system" ? "system" : "user",
          content: msg.content || ""
        };
        if (msg.tool_calls && msg.tool_calls.length > 0) {
          messagePayload.tool_calls = msg.tool_calls;
          messagePayload.content = null;
        }
        if (msg.role === "tool" && msg.tool_call_id) {
          messagePayload.tool_call_id = msg.tool_call_id;
        }
        return messagePayload;
      }).filter((msg) => {
        if (msg.role === "system") {
          return msg.content && msg.content.trim().length > 0;
        }
        if (msg.role === "user" || msg.role === "assistant") {
          const hasContent = msg.content && msg.content.trim().length > 0;
          const hasToolCalls = msg.tool_calls && msg.tool_calls.length > 0;
          return hasContent || hasToolCalls;
        }
        if (msg.role === "tool") {
          return msg.content && msg.tool_call_id;
        }
        return true;
      });
      if (!apiMessages || apiMessages.length === 0) {
        throw new Error("No valid messages to send");
      }
      const hasUserMessage = apiMessages.some((msg) => msg.role === "user" && msg.content && msg.content.trim().length > 0);
      if (!hasUserMessage) {
        throw new Error("Conversation must contain at least one user message with valid content");
      }
      console.log("Sending messages to API:", apiMessages.map((m) => {
        var _a3;
        return { role: m.role, content: (_a3 = m.content) == null ? void 0 : _a3.substring(0, 100) };
      }));
      console.log("Tools being sent:", tools.map((t) => t.function.name));
      const { customModels, ...apiParameters } = provider.parameters || {};
      let body;
      const providerType = provider.providerType || "openai-compatible";
      if (providerType === "ollama") {
        body = {
          model: modelId,
          messages: apiMessages,
          stream: false,
          ...apiParameters
        };
      } else if (providerType === "anthropic") {
        const systemMessage = apiMessages.find((msg) => msg.role === "system");
        const nonSystemMessages = apiMessages.filter((msg) => msg.role !== "system");
        body = {
          model: modelId,
          messages: nonSystemMessages,
          max_tokens: apiParameters.max_tokens || 4e3,
          ...apiParameters
        };
        if (systemMessage) {
          body.system = systemMessage.content;
        }
      } else {
        body = {
          ...apiParameters,
          model: modelId,
          messages: apiMessages,
          stream: false
        };
        if (tools.length > 0) {
          const validTools = tools.filter((tool) => {
            if (!tool.type || tool.type !== "function") return false;
            if (!tool.function || !tool.function.name) return false;
            if (!tool.function.parameters || typeof tool.function.parameters !== "object") {
              tool.function.parameters = { type: "object", properties: {} };
            }
            return true;
          });
          if (validTools.length > 0) {
            body.tools = validTools;
            body.tool_choice = "auto";
          }
        }
      }
      const endpoint = provider.proxyURL ? `${provider.proxyURL.replace(/\/$/, "")}/${provider.baseURL.replace(/\/$/, "")}` : provider.baseURL.replace(/\/$/, "");
      let headers = {
        "Content-Type": "application/json",
        ...provider.headers
      };
      if (providerType === "anthropic") {
        headers["x-api-key"] = provider.apiKey;
        headers["anthropic-version"] = "2023-06-01";
      } else if (provider.apiKey) {
        headers["Authorization"] = `Bearer ${provider.apiKey}`;
      }
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: abortController.signal
      });
      if (!response.ok) {
        const errorBody = await response.text();
        console.error("API Error Response:", {
          status: response.status,
          statusText: response.statusText,
          body: errorBody,
          endpoint
        });
        throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorBody}`);
      }
      const rawData = await response.json();
      let data;
      if (rawData.choices && ((_a2 = rawData.choices[0]) == null ? void 0 : _a2.message)) {
        data = rawData;
      } else if (rawData.message && rawData.message.content) {
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
        const content = Array.isArray(rawData.content) ? rawData.content.map((c) => c.text || c).join("") : rawData.content;
        data = {
          choices: [{
            message: {
              role: "assistant",
              content
            }
          }]
        };
      } else if (rawData.candidates && ((_b = rawData.candidates[0]) == null ? void 0 : _b.content)) {
        const parts = rawData.candidates[0].content.parts || [];
        const content = parts.map((part) => part.text || "").join("");
        data = {
          choices: [{
            message: {
              role: "assistant",
              content
            }
          }]
        };
      } else if (rawData.text) {
        data = {
          choices: [{
            message: {
              role: "assistant",
              content: rawData.text
            }
          }]
        };
      } else {
        const content = rawData.response || rawData.output || JSON.stringify(rawData);
        data = {
          choices: [{
            message: {
              role: "assistant",
              content
            }
          }]
        };
      }
      activeRequests.delete(reqId);
      return { success: true, data, streaming: false };
    } catch (error) {
      activeRequests.delete(reqId);
      if (error.name === "AbortError") {
        console.log("Request was aborted");
        return { success: false, error: "Request cancelled by user", aborted: true };
      }
      console.error("Error in send-message-stream:", error);
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("get-settings", async () => {
    try {
      return store.get("app-settings", null);
    } catch (error) {
      console.error("Error getting settings:", error);
      return null;
    }
  });
  ipcMain.handle("save-settings", async (event, settings) => {
    try {
      store.set("app-settings", settings);
      return { success: true };
    } catch (error) {
      console.error("Error saving settings:", error);
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("get-sessions", async () => {
    try {
      return store.get("chat-sessions", []);
    } catch (error) {
      console.error("Error getting sessions:", error);
      return [];
    }
  });
  ipcMain.handle("save-sessions", async (event, sessions) => {
    try {
      store.set("chat-sessions", sessions);
      return { success: true };
    } catch (error) {
      console.error("Error saving sessions:", error);
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("get-projects", async () => {
    try {
      return store.get("chat-projects", []);
    } catch (error) {
      console.error("Error getting projects:", error);
      return [];
    }
  });
  ipcMain.handle("save-projects", async (event, projects) => {
    try {
      store.set("chat-projects", projects);
      return { success: true };
    } catch (error) {
      console.error("Error saving projects:", error);
      return { success: false, error: error.message };
    }
  });
  if (((_a = process.env) == null ? void 0 : _a.NODE_ENV) === "development") {
    mainWindow.loadURL("http://localhost:8547").catch((error) => {
      console.error("Failed to load development URL:", error);
    });
  } else {
    const indexPath = path.join(__dirname, "../dist/index.html");
    mainWindow.loadFile(indexPath).catch((error) => {
      console.error("Failed to load production file:", error);
    });
  }
  const session = mainWindow.webContents.session;
  session.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true);
  });
  session.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    return true;
  });
  session.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
    console.error("Failed to load:", validatedURL, errorDescription);
  });
}
app.whenReady().then(() => {
  createWindow();
}).catch((error) => {
  console.error("Error during app initialization:", error);
});
app.on("activate", function() {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled rejection at:", promise, "reason:", reason);
});
