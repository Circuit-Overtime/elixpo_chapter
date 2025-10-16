import { Plugin, ToolCall } from '../types';

/**
 * Fetches the plugin manifest from a given server URL.
 * @param url The URL of the mcp.json manifest file.
 * @returns A promise that resolves with an array of plugins from the server.
 */
export const fetchPluginsFromServer = async (url: string): Promise<Plugin[]> => {
    try {
        if(!url) return [];
        // Use a proxy for CORS if necessary, or ensure servers have CORS enabled.
        // For simplicity here, we assume direct fetch is possible.
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch plugin manifest: ${response.status} ${response.statusText}`);
        }
        const manifest = await response.json();
        if (!manifest || !Array.isArray(manifest.plugins)) {
            // Support for ai-plugin.json spec
            if (manifest.name_for_model && manifest.api?.url) {
                // This is a simplified parser. A real implementation would need more robust parsing of the OpenAPI spec.
                return [{
                    id: manifest.name_for_model,
                    name: manifest.name_for_human,
                    description: manifest.description_for_human,
                    tools: [/* Parsing OpenAPI spec is complex and omitted for this example */]
                }];
            }
            throw new Error('Invalid manifest format: "plugins" array not found.');
        }
        return manifest.plugins;
    } catch (error) {
        console.error(`Error fetching or parsing plugins from ${url}:`, error);
        return []; // Return empty array on error to prevent crashing the app.
    }
};

/**
 * Executes a remote tool call by making a POST request to its specified endpoint.
 * @param toolCall The tool call object from the AI model.
 * @param endpoint The URL to which the tool call should be sent.
 * @returns A promise that resolves with the stringified result of the tool execution.
 */
export const executeToolCall = async (toolCall: ToolCall, endpoint: string): Promise<string> => {
    const { arguments: argsString } = toolCall.function;
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: argsString, // The model provides arguments as a ready-to-send JSON string.
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[PluginService] Remote tool execution failed for ${endpoint}: ${response.status} ${errorBody}`);
            return JSON.stringify({ error: `Tool execution failed with status ${response.status}`, details: errorBody });
        }
        
        // We expect the remote tool to return a JSON response.
        const result = await response.json();
        return JSON.stringify(result, null, 2);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[PluginService] Network error executing tool at ${endpoint}:`, errorMessage);
        return JSON.stringify({ error: `Failed to execute tool at ${endpoint}. Check network connectivity and CORS policy.`, details: errorMessage });
    }
};