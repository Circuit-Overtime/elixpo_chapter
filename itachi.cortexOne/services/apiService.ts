import { Provider, Message, Role, Tool, ToolCall } from '../types';

const handleFetchError = (error: any, context: string): Error => {
    console.error(`Error in ${context}:`, error);
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
        return new Error(
            `Network Error in ${context}: This is often a CORS (Cross-Origin Resource Sharing) issue. The API provider at the specified Base URL does not seem to allow requests from this web application. Please ensure the URL is correct and the provider has enabled CORS. If not, you may need to route requests through a CORS proxy.`
        );
    }
    // Return original error if it's not the specific one we're handling
    if (error instanceof Error) {
        return error;
    }
    return new Error(String(error));
};

const constructEndpoint = (provider: Provider): string => {
    // Use the base URL as-is - user should provide the complete endpoint
    const endpoint = provider.baseURL.replace(/\/$/, '');
    if (provider.proxyURL) {
        // Prepend the proxy URL to the full API endpoint
        return `${provider.proxyURL.replace(/\/$/, '')}/${endpoint}`;
    }
    return endpoint;
};


export const fetchModels = async (provider: Provider): Promise<{ id: string }[]> => {
    if (!provider.baseURL || !provider.apiKey) {
        throw new Error("Provider details (Base URL, API Key) are not configured.");
    }

    // Use Electron API to avoid CORS issues
    if (window.desktopApi) {
        try {
            const result = await window.desktopApi.fetchModels({
                baseURL: provider.baseURL,
                apiKey: provider.apiKey,
                proxyURL: provider.proxyURL,
                headers: provider.headers,
                modelsEndpoint: provider.modelsEndpoint
            });

            if (result.success) {
                return result.data || [];
            } else {
                throw new Error(result.error || 'Failed to fetch models');
            }
        } catch (error) {
            throw handleFetchError(error, 'fetchModels');
        }
    }

    // Fallback to direct fetch for web version (shouldn't happen in Electron)
    try {
        const url = constructEndpoint(provider);
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${provider.apiKey}`
            }
        });

        if (!response.ok) {
            let errorDetails = response.statusText;
            try {
                const errorData = await response.json();
                errorDetails = errorData.error?.message || JSON.stringify(errorData);
            } catch (jsonError) {
                const textError = await response.text();
                errorDetails = textError.length > 150 ? textError.substring(0, 150) + '...' : textError;
            }
            throw new Error(`Failed to fetch models (${response.status}): ${errorDetails}`);
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const textResponse = await response.text();
            throw new Error(`Expected a JSON response, but received '${contentType}'. Response: ${textResponse.substring(0, 150)}...`);
        }

        const data = await response.json();
        return data.data || [];
    } catch (error) {
        throw handleFetchError(error, 'fetchModels');
    }
};

export const generateTitle = async (provider: Provider, modelId: string, firstMessage: string): Promise<string> => {
    if (!provider.baseURL || !provider.apiKey || !modelId) return "Untitled Chat";

    // Use Electron API to avoid CORS issues
    if (window.desktopApi) {
        try {
            const result = await window.desktopApi.generateTitle(provider, modelId, firstMessage);
            return result.title;
        } catch (error) {
            console.error("Error generating title:", handleFetchError(error, 'generateTitle').message);
            return "Untitled Chat";
        }
    }

    // Fallback to direct fetch for web version
    try {
        const prompt = `Generate a concise, 3-5 word title for a conversation starting with this prompt: "${firstMessage}". Respond with only the title text, nothing else.`;

        // Destructure out internal-only properties from parameters to ensure a clean API call.
        const { customModels, ...apiParameters } = provider.parameters || {};

        const body = {
            ...apiParameters,
            model: modelId,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 20,
            stream: false, // Explicitly disable streaming for title generation
        };

        const url = constructEndpoint(provider);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${provider.apiKey}`,
                ...provider.headers,
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            throw new Error(`Title generation failed: ${response.statusText}`);
        }

        const data = await response.json();
        const title = data.choices[0]?.message?.content?.trim().replace(/"/g, '') || "Untitled Chat";
        return title;

    } catch (error) {
        console.error("Error generating title:", handleFetchError(error, 'generateTitle').message);
        return "Untitled Chat";
    }
};

const generateRandomSeed = (): number => {
    return Math.floor(Math.random() * 2147483647); // Random int32
};

export const sendMessageStream = async (
    provider: Provider,
    modelId: string,
    messages: Message[],
    tools: Tool[],
    callbacks: {
        onChunk: (text: string) => void;
        onToolCall: (toolCalls: ToolCall[]) => void;
        onComplete: () => void;
        onError: (error: string) => void;
    },
    requestId?: string
) => {
    if (!provider.baseURL || !modelId) {
        callbacks.onError("The active provider is not configured correctly. Please check the settings.");
        return;
    }

    console.log('Processing messages for API:', JSON.stringify(messages.map(m => ({ role: m.role, content: m.content?.substring(0, 50) + '...', id: m.id }))));

    // Use Electron API to avoid CORS issues
    if (window.desktopApi) {
        try {
            const result = await window.desktopApi.sendMessageStream(provider, modelId, messages, tools, requestId);

            // Check if request was aborted
            if (result.aborted) {
                console.log('Request was cancelled');
                callbacks.onComplete();
                return;
            }

            if (result.success && result.data) {
                const data = result.data;
                const message = data.choices?.[0]?.message;

                if (message?.tool_calls) {
                    callbacks.onToolCall(message.tool_calls);
                    callbacks.onComplete();
                    return;
                }
                if (message?.content) {
                    // Simulate streaming for better UX by chunking the response
                    const content = message.content;
                    const words = content.split(' ');
                    let currentIndex = 0;

                    const streamWords = () => {
                        if (currentIndex < words.length) {
                            const chunk = words.slice(currentIndex, Math.min(currentIndex + 3, words.length)).join(' ');
                            callbacks.onChunk(currentIndex === 0 ? chunk : ' ' + chunk);
                            currentIndex += 3;
                            setTimeout(streamWords, 50); // 50ms delay between chunks
                        } else {
                            callbacks.onComplete();
                        }
                    };

                    streamWords();
                    return;
                }
            } else {
                callbacks.onError(result.error || 'Unknown error occurred');
                callbacks.onComplete();
            }
        } catch (error: any) {
            callbacks.onError(handleFetchError(error, 'sendMessageStream').message);
            callbacks.onComplete();
        }
        return;
    }

    // Fallback to direct fetch for web version (with CORS issues)
    const isStreaming = provider.stream ?? true;

    try {
        const apiMessages = messages.map(msg => {
            const messagePayload: any = {
                role: msg.role === Role.MODEL ? 'assistant' 
                    : msg.role === Role.TOOL ? 'tool' 
                    : msg.role === Role.SYSTEM ? 'system'
                    : 'user',
            };

            // Handle user messages with images (OpenAI vision format)
            if (msg.role === Role.USER && msg.images && msg.images.length > 0) {
                const contentParts: any[] = [];

                // Add text content if present
                if (msg.content && msg.content.trim()) {
                    contentParts.push({
                        type: 'text',
                        text: msg.content
                    });
                }

                // Add images
                msg.images.forEach(image => {
                    contentParts.push({
                        type: 'image_url',
                        image_url: {
                            url: image.url
                        }
                    });
                });

                messagePayload.content = contentParts;
            } else {
                messagePayload.content = msg.content;
            }

            // Handle assistant messages with tool calls
            if (msg.tool_calls && msg.tool_calls.length > 0) {
                messagePayload.tool_calls = msg.tool_calls;
                messagePayload.content = null; // Assistant messages with tool_calls should have null content
            }

            // Handle tool response messages
            if (msg.role === Role.TOOL && msg.tool_call_id) {
                messagePayload.tool_call_id = msg.tool_call_id;
            }

            return messagePayload;
        });

        console.log('Converted API messages:', JSON.stringify(apiMessages.map(m => ({ role: m.role, content: m.content?.substring(0, 50) + '...', tool_calls: m.tool_calls?.length || 0 }))));

        const { customModels, ...apiParameters } = provider.parameters || {};

        // Validate messages before sending
        if (!apiMessages || apiMessages.length === 0) {
            console.error('No messages after filtering:', { originalMessages: messages, filteredMessages: apiMessages });
            callbacks.onError('No valid messages to send. This is likely because the user input was empty or contained only invalid characters. Please provide valid input.');
            return;
        }

        // Validate that we have at least one user message
        const hasUserMessage = apiMessages.some(msg => msg.role === 'user' && msg.content && msg.content.trim().length > 0);
        if (!hasUserMessage) {
            console.error('No user messages found in conversation:', apiMessages);
            callbacks.onError('Conversation must contain at least one user message with valid content. Please try typing a message.');
            return;
        }

        console.log('Final API messages:', JSON.stringify(apiMessages.map(m => ({ role: m.role, content: m.content?.substring(0, 50) + '...', tool_calls: m.tool_calls?.length || 0 }))));

        const body: any = {
            ...apiParameters,
            model: modelId,
            messages: apiMessages,
            stream: isStreaming,
        };

        // Global random seed handling
        if (provider.useRandomSeed && (body.seed === -1 || body.seed === undefined)) {
            body.seed = generateRandomSeed();
            console.log(`Using random seed: ${body.seed}`);
        }

        if (tools.length > 0) {
            body.tools = tools;
            body.tool_choice = "auto";
        }

        const url = constructEndpoint(provider);

        console.log('API Request (fallback):', {
            url,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${provider.apiKey ? '[REDACTED]' : 'MISSING'}`,
                ...provider.headers,
            },
            bodyPreview: {
                model: body.model,
                messagesCount: body.messages?.length,
                stream: body.stream,
                toolsCount: body.tools?.length || 0,
                lastMessage: body.messages?.[body.messages.length - 1]
            }
        });

        // Additional validation
        if (!body.model) {
            callbacks.onError('Model ID is required but not provided');
            return;
        }

        if (!provider.apiKey) {
            callbacks.onError('API Key is required but not provided');
            return;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${provider.apiKey}`,
                ...provider.headers,
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('API Error Response:', {
                status: response.status,
                statusText: response.statusText,
                body: errorBody,
                url: url
            });
            throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorBody}`);
        }

        if (isStreaming) {
            if (!response.body) {
                throw new Error('Response body is null for a streaming request.');
            }
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let accumulatedToolCalls: ToolCall[] = [];

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim().startsWith('data:')) {
                        const jsonStr = line.substring(5).trim();
                        if (jsonStr === '[DONE]') continue;
                        if (!jsonStr) continue;
                        try {
                            const parsed = JSON.parse(jsonStr);
                            const delta = parsed.choices?.[0]?.delta;

                            if (delta?.content) {
                                callbacks.onChunk(delta.content);
                            }
                            if (delta?.tool_calls) {
                                for (const toolCallDelta of delta.tool_calls) {
                                    const index = toolCallDelta.index;
                                    if (!accumulatedToolCalls[index]) {
                                        accumulatedToolCalls[index] = { id: '', type: 'function', function: { name: '', arguments: '' } };
                                    }
                                    if (toolCallDelta.id) accumulatedToolCalls[index].id = toolCallDelta.id;
                                    if (toolCallDelta.function?.name) accumulatedToolCalls[index].function.name = toolCallDelta.function.name;
                                    if (toolCallDelta.function?.arguments) accumulatedToolCalls[index].function.arguments += toolCallDelta.function.arguments;
                                }
                            }
                        } catch (e) {
                            console.error("Error parsing stream chunk:", e, "Chunk:", jsonStr);
                        }
                    }
                }
            }
            if (accumulatedToolCalls.length > 0) {
                callbacks.onToolCall(accumulatedToolCalls);
                return; // Stop processing, let the app handle the tool call
            }
        } else {
            const data = await response.json();
            const message = data.choices?.[0]?.message;
            if (message?.tool_calls) {
                callbacks.onToolCall(message.tool_calls);
                return;
            }
            if (message?.content) {
                callbacks.onChunk(message.content);
            }
        }
    } catch (error: any) {
        callbacks.onError(handleFetchError(error, 'sendMessageStream').message);
    } finally {
        callbacks.onComplete();
    }
};