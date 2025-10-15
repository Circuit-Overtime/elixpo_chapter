import { ProviderTemplate } from '../types';

export const PROVIDER_TEMPLATES: ProviderTemplate[] = [
    {
        id: 'openai-compatible',
        name: 'OpenAI Compatible',
        description: 'Generic OpenAI-compatible API (OpenAI, Together AI, Groq, etc.)',
        baseURL: 'https://api.openai.com/v1/chat/completions',
        defaultHeaders: {},
        defaultParameters: {
            temperature: 0.7,
            max_tokens: 4000,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0
        },
        authType: 'bearer',
        stream: true,
        responseFormat: 'openai',
        icon: '🤖'
    },
    {
        id: 'openai',
        name: 'OpenAI',
        description: 'Official OpenAI API (GPT-4, GPT-3.5, etc.)',
        baseURL: 'https://api.openai.com/v1/chat/completions',
        defaultHeaders: {},
        defaultParameters: {
            temperature: 0.7,
            max_tokens: 4000,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0
        },
        authType: 'bearer',
        stream: true,
        responseFormat: 'openai',
        icon: '🟢'
    },
    {
        id: 'anthropic',
        name: 'Anthropic Claude',
        description: 'Anthropic Claude API (Claude 3.5 Sonnet, Haiku, etc.)',
        baseURL: 'https://api.anthropic.com/v1/messages',
        defaultHeaders: {
            'anthropic-version': '2023-06-01'
        },
        defaultParameters: {
            max_tokens: 4000,
            temperature: 0.7
        },
        authType: 'header',
        authField: 'x-api-key',
        stream: true,
        responseFormat: 'anthropic',
        icon: '🔵'
    },
    {
        id: 'google-gemini',
        name: 'Google Gemini',
        description: 'Google Gemini API (Gemini Pro, Flash, etc.)',
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/models',
        defaultHeaders: {},
        defaultParameters: {
            temperature: 0.7,
            maxOutputTokens: 4000,
            topP: 1,
            topK: 40
        },
        authType: 'query',
        authField: 'key',
        stream: true,
        responseFormat: 'gemini',
        icon: '🔷',
        disabled: true
    },
    {
        id: 'ollama',
        name: 'Ollama',
        description: 'Ollama API (Local or Cloud)',
        baseURL: '', // Empty so user fills it
        defaultHeaders: {},
        defaultParameters: {
            temperature: 0.7,
            num_predict: 4000
        },
        authType: 'bearer',
        stream: true,
        responseFormat: 'ollama',
        icon: '🦙'
    },
    {
        id: 'groq',
        name: 'Groq',
        description: 'Groq Lightning Fast AI Inference',
        baseURL: 'https://api.groq.com/openai/v1/chat/completions',
        defaultHeaders: {},
        defaultParameters: {
            temperature: 0.7,
            max_tokens: 4000,
            top_p: 1
        },
        authType: 'bearer',
        stream: true,
        responseFormat: 'openai',
        icon: '⚡'
    },
    {
        id: 'together',
        name: 'Together AI',
        description: 'Together AI - Open Source Models',
        baseURL: 'https://api.together.xyz/v1/chat/completions',
        defaultHeaders: {},
        defaultParameters: {
            temperature: 0.7,
            max_tokens: 4000,
            top_p: 1
        },
        authType: 'bearer',
        stream: true,
        responseFormat: 'openai',
        icon: '🤝'
    },
    {
        id: 'perplexity',
        name: 'Perplexity AI',
        description: 'Perplexity AI - Search-powered AI',
        baseURL: 'https://api.perplexity.ai/chat/completions',
        defaultHeaders: {},
        defaultParameters: {
            temperature: 0.7,
            max_tokens: 4000,
            top_p: 1
        },
        authType: 'bearer',
        stream: true,
        responseFormat: 'openai',
        icon: '🔍'
    },
    {
        id: 'mistral',
        name: 'Mistral AI',
        description: 'Mistral AI - European AI Models',
        baseURL: 'https://api.mistral.ai/v1/chat/completions',
        defaultHeaders: {},
        defaultParameters: {
            temperature: 0.7,
            max_tokens: 4000,
            top_p: 1
        },
        authType: 'bearer',
        stream: true,
        responseFormat: 'openai',
        icon: '🇫🇷'
    },
    {
        id: 'cohere',
        name: 'Cohere',
        description: 'Cohere Command Models',
        baseURL: 'https://api.cohere.ai/v1/chat',
        defaultHeaders: {},
        defaultParameters: {
            temperature: 0.7,
            max_tokens: 4000,
            p: 1
        },
        authType: 'bearer',
        stream: true,
        responseFormat: 'custom',
        icon: '🧠'
    },
    {
        id: 'huggingface',
        name: 'Hugging Face',
        description: 'Hugging Face Inference API',
        baseURL: 'https://api-inference.huggingface.co/models',
        defaultHeaders: {},
        defaultParameters: {
            temperature: 0.7,
            max_new_tokens: 4000,
            top_p: 1
        },
        authType: 'bearer',
        stream: false,
        responseFormat: 'custom',
        icon: '🤗'
    },
    {
        id: 'replicate',
        name: 'Replicate',
        description: 'Replicate - Run AI Models in the Cloud',
        baseURL: 'https://api.replicate.com/v1/predictions',
        defaultHeaders: {},
        defaultParameters: {
            temperature: 0.7,
            max_tokens: 4000,
            top_p: 1
        },
        authType: 'bearer',
        stream: false,
        responseFormat: 'custom',
        icon: '🔄'
    },
    {
        id: 'deepseek',
        name: 'DeepSeek',
        description: 'DeepSeek AI Models',
        baseURL: 'https://api.deepseek.com/v1/chat/completions',
        defaultHeaders: {},
        defaultParameters: {
            temperature: 0.7,
            max_tokens: 4000,
            top_p: 1
        },
        authType: 'bearer',
        stream: true,
        responseFormat: 'openai',
        icon: '🌊'
    },
    {
        id: 'xai',
        name: 'xAI (Grok)',
        description: 'xAI Grok Models',
        baseURL: 'https://api.x.ai/v1/chat/completions',
        defaultHeaders: {},
        defaultParameters: {
            temperature: 0.7,
            max_tokens: 4000,
            top_p: 1
        },
        authType: 'bearer',
        stream: true,
        responseFormat: 'openai',
        icon: '❌'
    },
    {
        id: 'cerebras',
        name: 'Cerebras',
        description: 'Cerebras Inference - Ultra-fast AI',
        baseURL: 'https://api.cerebras.ai/v1/chat/completions',
        defaultHeaders: {},
        defaultParameters: {
            temperature: 0.7,
            max_tokens: 4000,
            top_p: 1
        },
        authType: 'bearer',
        stream: true,
        responseFormat: 'openai',
        icon: '🧠'
    },
    {
        id: 'fireworks',
        name: 'Fireworks AI',
        description: 'Fireworks AI - Fast Inference',
        baseURL: 'https://api.fireworks.ai/inference/v1/chat/completions',
        defaultHeaders: {},
        defaultParameters: {
            temperature: 0.7,
            max_tokens: 4000,
            top_p: 1
        },
        authType: 'bearer',
        stream: true,
        responseFormat: 'openai',
        icon: '🎆'
    },
    {
        id: 'nanobanana',
        name: 'NanoBanana (Gemini)',
        description: 'NanoBanana Gemini Provider - Disabled',
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/models',
        defaultHeaders: {},
        defaultParameters: {
            temperature: 0.7,
            maxOutputTokens: 4000,
            topP: 1,
            topK: 40
        },
        authType: 'query',
        authField: 'key',
        stream: true,
        responseFormat: 'gemini',
        icon: '🍌',
        disabled: true
    },
    {
        id: 'seedream',
        name: 'SeeDream',
        description: 'SeeDream Provider - Disabled',
        baseURL: 'https://api.seedream.com/v1/chat/completions',
        defaultHeaders: {},
        defaultParameters: {
            temperature: 0.7,
            max_tokens: 4000,
            top_p: 1
        },
        authType: 'bearer',
        stream: true,
        responseFormat: 'openai',
        icon: '💭',
        disabled: true
    }
];

export const getProviderTemplate = (templateId: string): ProviderTemplate | undefined => {
    return PROVIDER_TEMPLATES.find(template => template.id === templateId);
};

export const getEnabledProviderTemplates = (): ProviderTemplate[] => {
    return PROVIDER_TEMPLATES.filter(template => !template.disabled);
};

export const isProviderTypeDisabled = (providerType?: string): boolean => {
    if (!providerType) return false;
    const template = getProviderTemplate(providerType);
    return template?.disabled === true;
};

export const createProviderFromTemplate = (template: ProviderTemplate, name: string, apiKey: string): Omit<import('../types').Provider, 'id'> => {
    return {
        name,
        baseURL: template.baseURL,
        apiKey,
        headers: { ...template.defaultHeaders },
        parameters: { ...template.defaultParameters },
        stream: template.stream,
        modelsEndpoint: template.modelsEndpoint,
        providerType: template.id,
        useRandomSeed: false,
        retrySettings: {
            enabled: true,
            maxRetries: 3
        }
    };
};