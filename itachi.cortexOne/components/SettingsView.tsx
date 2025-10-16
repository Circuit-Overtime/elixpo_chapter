import React, { useState, useEffect, useMemo } from 'react';
import { Settings, Provider, Model, ModelAssignment, Plugin, McpServer } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { XIcon, PlusIcon, DeleteIcon, SaveIcon, CloudArrowDownIcon, CubeTransparentIcon, EditIcon, RefreshIcon, ChevronDownIcon, WrenchScrewdriverIcon, PlayIcon, StopIcon, LinkIcon } from './icons';
import { fetchModels } from '../services/apiService';
import { memoryService } from '../services/memoryService';
import { DiscoveredPluginSource } from '../App';
import { PROVIDER_TEMPLATES, createProviderFromTemplate, getProviderTemplate, getEnabledProviderTemplates, isProviderTypeDisabled } from '../services/providerTemplates';

interface SettingsViewProps {
    isOpen: boolean;
    onClose: () => void;
    settings: Settings;
    onSettingsChange: (newSettings: Settings) => void;
    discoveredPluginSources: DiscoveredPluginSource[];
    mcpServerStatus: Record<string, 'running' | 'stopped' | 'error'>;
    onStartMcpServer: (serverName: string) => Promise<boolean>;
    onStopMcpServer: (serverName: string) => Promise<boolean>;
    onRestartMcpServer: (serverName: string) => Promise<boolean>;
    onCheckMcpServerStatus: () => Promise<void>;
}

const getNewProvider = (providerCount: number): Provider => ({
    id: uuidv4(),
    name: `New Provider ${providerCount + 1}`,
    baseURL: '',
    proxyURL: '',
    apiKey: '',
    headers: {},
    parameters: { temperature: 0.7 },
    stream: true,
    modelsEndpoint: '',
});

const createProviderFromTemplateWithId = (templateId: string, providerCount: number): Provider => {
    const template = getProviderTemplate(templateId);
    if (!template) {
        return getNewProvider(providerCount);
    }
    
    const baseProvider = createProviderFromTemplate(template, template.name, '');
    return {
        id: uuidv4(),
        ...baseProvider
    };
};

const getPlaceholderForProvider = (providerType?: string): string => {
    switch (providerType) {
        case 'ollama':
            return 'https://ollama.com/api/chat or http://localhost:11434/api/chat';
        case 'openai':
            return 'https://api.openai.com/v1/chat/completions';
        case 'anthropic':
            return 'https://api.anthropic.com/v1/messages';
        case 'google-gemini':
            return 'https://generativelanguage.googleapis.com/v1beta/models/MODEL_NAME:generateContent';
        case 'groq':
            return 'https://api.groq.com/openai/v1/chat/completions';
        case 'together':
            return 'https://api.together.xyz/v1/chat/completions';
        case 'perplexity':
            return 'https://api.perplexity.ai/chat/completions';
        case 'mistral':
            return 'https://api.mistral.ai/v1/chat/completions';
        default:
            return 'https://api.example.com/v1/chat/completions';
    }
};

const getHelpTextForProvider = (providerType?: string): string => {
    switch (providerType) {
        case 'ollama':
            return 'For Ollama Cloud use: https://ollama.com/api/chat, for local use: http://localhost:11434/api/chat';
        case 'openai':
            return 'Official OpenAI API endpoint for chat completions';
        case 'anthropic':
            return 'Anthropic Claude API endpoint (note: different format than OpenAI)';
        case 'google-gemini':
            return 'Replace MODEL_NAME with your specific Gemini model (e.g., gemini-pro)';
        default:
            return 'Full API endpoint URL for chat completions';
    }
};

type SettingsTab = 'Models' | 'Providers' | 'MCP' | 'Memory';

const validateProvider = (provider: Provider): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!provider.name?.trim()) {
        errors.push('Provider name is required');
    }
    
    if (!provider.baseURL?.trim()) {
        errors.push('Base URL is required');
    } else {
        try {
            new URL(provider.baseURL);
        } catch {
            errors.push('Base URL must be a valid URL');
        }
    }
    
    if (!provider.apiKey?.trim()) {
        errors.push('API Key is required');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

const TestConnectionButton: React.FC<{ provider: Provider }> = ({ provider }) => {
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    const testConnection = async () => {
        if (!provider.baseURL || !provider.apiKey) {
            setTestResult({ success: false, message: 'Missing Base URL or API Key' });
            return;
        }

        setTesting(true);
        setTestResult(null);

        try {
            const result = await fetchModels(provider);
            setTestResult({ 
                success: true, 
                message: `Success! Found ${result.length} models` 
            });
        } catch (error: any) {
            setTestResult({ 
                success: false, 
                message: error.message || 'Connection failed' 
            });
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <button
                onClick={testConnection}
                disabled={testing || !provider.baseURL || !provider.apiKey}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-600 rounded-md hover:bg-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <LinkIcon className="h-4 w-4" />
                {testing ? 'Testing...' : 'Test Connection'}
            </button>
            {testResult && (
                <div className={`text-xs p-2 rounded ${testResult.success ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                    {testResult.message}
                </div>
            )}
        </div>
    );
};

const ModelAssignmentEditor: React.FC<{
    task: 'main' | 'background',
    label: string,
    settings: Settings,
    onSettingsChange: (newSettings: Settings) => void,
}> = ({ task, label, settings, onSettingsChange }) => {
    const { providers, modelAssignments } = settings;
    const assignment = modelAssignments[task];
    const [availableModels, setAvailableModels] = useState<Model[]>([]);
    const [isFetching, setIsFetching] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

    useEffect(() => {
        const fetchAssignedProviderModels = async () => {
            if (assignment?.providerId) {
                const provider = providers.find(p => p.id === assignment.providerId);
                if (provider && provider.baseURL && provider.apiKey) {
                    setIsFetching(true);
                    try {
                        console.log(`Fetching models for ${task} assignment from provider: ${provider.name}`);
                        const apiModels = await fetchModels(provider);
                        const customModels = provider.parameters?.customModels || [];
                        const allModels = [
                            ...apiModels.map(m => ({ id: m.id, name: m.id })),
                            ...customModels.map((m: string) => ({ id: m, name: `${m} (custom)` }))
                        ];
                        console.log(`Found ${allModels.length} models for ${task} assignment`);
                        setAvailableModels(allModels);
                        setStatusMessage({ type: 'success', text: `Found ${allModels.length} models` });
                        setTimeout(() => setStatusMessage(null), 2000);
                    } catch (error) {
                        console.error(`Failed to fetch models for ${provider.name} (${task} assignment):`, error);
                        setAvailableModels([]);
                        setStatusMessage({ type: 'error', text: `Failed to fetch models: ${(error as Error).message}` });
                    } finally {
                        setIsFetching(false);
                    }
                } else {
                    if (!provider) {
                        console.warn(`Provider ${assignment.providerId} not found for ${task} assignment - clearing assignment`);
                        setStatusMessage({ type: 'info', text: 'Cleared invalid provider assignment' });
                        // Clear the invalid assignment
                        onSettingsChange({
                            ...settings,
                            modelAssignments: {
                                ...settings.modelAssignments,
                                [task]: null
                            }
                        });
                        setTimeout(() => setStatusMessage(null), 3000);
                    } else {
                        console.warn(`Provider ${provider.name} missing credentials for ${task} assignment`);
                        setStatusMessage({ type: 'error', text: `Provider "${provider.name}" missing credentials` });
                    }
                    setAvailableModels([]);
                }
            } else {
                setAvailableModels([]);
            }
        };
        fetchAssignedProviderModels();
    }, [assignment?.providerId, providers, task, settings, onSettingsChange]); // Added dependencies

    const handleProviderChange = (providerId: string) => {
        const newAssignment: ModelAssignment = { providerId, modelId: '' };
        onSettingsChange({
            ...settings,
            modelAssignments: {
                ...settings.modelAssignments,
                [task]: newAssignment
            }
        });
    };

    const handleModelChange = (modelId: string) => {
        if (assignment) {
            const newAssignment: ModelAssignment = { ...assignment, modelId };
            onSettingsChange({
                ...settings,
                modelAssignments: {
                    ...settings.modelAssignments,
                    [task]: newAssignment
                }
            });
        }
    };

    const handleRefreshModels = async () => {
        if (assignment?.providerId) {
            const provider = providers.find(p => p.id === assignment.providerId);
            if (provider && provider.baseURL && provider.apiKey) {
                setIsFetching(true);
                try {
                    console.log(`Manually refreshing models for ${task} assignment from provider: ${provider.name}`);
                    const apiModels = await fetchModels(provider);
                    const customModels = provider.parameters?.customModels || [];
                    const allModels = [
                        ...apiModels.map(m => ({ id: m.id, name: m.id })),
                        ...customModels.map((m: string) => ({ id: m, name: `${m} (custom)` }))
                    ];
                    console.log(`Refreshed ${allModels.length} models for ${task} assignment`);
                    setAvailableModels(allModels);
                } catch (error) {
                    console.error(`Failed to refresh models for ${provider.name} (${task} assignment):`, error);
                    setAvailableModels([]);
                } finally {
                    setIsFetching(false);
                }
            }
        }
    };
    
    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-400">{label}</h3>
                {assignment?.providerId && (
                    <button
                        onClick={handleRefreshModels}
                        disabled={isFetching}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 disabled:opacity-50"
                        title="Refresh models list"
                    >
                        <RefreshIcon className="h-3 w-3" />
                        Refresh
                    </button>
                )}
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                    <select
                        value={assignment?.providerId || ''}
                        onChange={e => handleProviderChange(e.target.value)}
                        className="w-full bg-gray-900/50 border border-gray-700 p-2 rounded-md text-sm"
                    >
                        <option value="" disabled>Select Provider...</option>
                        {providers.map(p => {
                            const validation = validateProvider(p);
                            return (
                                <option key={p.id} value={p.id}>
                                    {validation.isValid ? '✓' : '✗'} {p.name}
                                </option>
                            );
                        })}
                    </select>
                    {!assignment?.providerId && providers.length > 0 && (
                        <button
                            onClick={() => {
                                const workingProvider = providers.find(p => validateProvider(p).isValid);
                                if (workingProvider) {
                                    handleProviderChange(workingProvider.id);
                                }
                            }}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-blue-400 hover:text-blue-300"
                            title="Auto-select first working provider"
                        >
                            Auto
                        </button>
                    )}
                </div>
                <div className="relative">
                    <select
                        value={assignment?.modelId || ''}
                        onChange={e => handleModelChange(e.target.value)}
                        disabled={!assignment?.providerId || isFetching}
                        className="w-full bg-gray-900/50 border border-gray-700 p-2 rounded-md text-sm disabled:opacity-50"
                    >
                        <option value="" disabled>{isFetching ? 'Loading...' : 'Select Model...'}</option>
                        {availableModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    {availableModels.length === 0 && assignment?.providerId && !isFetching && (
                        <div className="absolute top-full left-0 mt-1 text-xs text-red-400">
                            {(() => {
                                const provider = providers.find(p => p.id === assignment.providerId);
                                if (!provider) return 'Provider not found';
                                if (!provider.baseURL) return 'Provider missing Base URL';
                                if (!provider.apiKey) return 'Provider missing API Key';
                                return 'Failed to fetch models. Check provider configuration.';
                            })()}
                        </div>
                    )}
                </div>
            </div>
            {statusMessage && (
                <div className={`mt-2 p-2 rounded text-xs ${
                    statusMessage.type === 'success' ? 'bg-green-900/30 text-green-400' :
                    statusMessage.type === 'error' ? 'bg-red-900/30 text-red-400' :
                    'bg-blue-900/30 text-blue-400'
                }`}>
                    {statusMessage.text}
                </div>
            )}
        </div>
    );
};


const ProviderEditor: React.FC<{
    settings: Settings,
    onSettingsChange: (newSettings: Settings) => void,
}> = ({ settings, onSettingsChange }) => {
    const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
    const [providerDetails, setProviderDetails] = useState<Provider | null>(null);
    const [jsonError, setJsonError] = useState<string | null>(null);
    const [showTemplateSelector, setShowTemplateSelector] = useState(false);
    const [jsonText, setJsonText] = useState<string>('');

    useEffect(() => {
        const providers = settings.providers;
        const providerExists = providers.some(p => p.id === selectedProviderId);

        if (providers.length > 0 && (!selectedProviderId || !providerExists)) {
            setSelectedProviderId(providers[0].id);
        } else if (providers.length === 0) {
            setSelectedProviderId(null);
        }
    }, [settings.providers, selectedProviderId]);

    useEffect(() => {
        if (selectedProviderId) {
            const provider = settings.providers.find(p => p.id === selectedProviderId);
            if (provider) {
                setProviderDetails({ ...provider });
                setJsonText(JSON.stringify(provider.parameters || {}, null, 2));
            } else {
                setProviderDetails(null);
                setJsonText('{}');
            }
        } else {
            setProviderDetails(null);
            setJsonText('{}');
        }
    }, [selectedProviderId, settings.providers]);

    const handleAddProvider = () => {
        setShowTemplateSelector(true);
    };

    const handleCreateProviderFromTemplate = (templateId: string) => {
        const newProvider = createProviderFromTemplateWithId(templateId, settings.providers.length);
        onSettingsChange({ ...settings, providers: [...settings.providers, newProvider] });
        setSelectedProviderId(newProvider.id);
        setShowTemplateSelector(false);
    };

    const handleCreateCustomProvider = () => {
        const newProvider = getNewProvider(settings.providers.length);
        onSettingsChange({ ...settings, providers: [...settings.providers, newProvider] });
        setSelectedProviderId(newProvider.id);
        setShowTemplateSelector(false);
    };
    
    const handleDeleteProvider = (id: string) => {
        const newProviders = settings.providers.filter(p => p.id !== id);
        onSettingsChange({ ...settings, providers: newProviders });
    };

    const handleProviderChange = (field: keyof Provider | `parameters.${string}` | `headers.${string}`, value: any) => {
        if (!providerDetails) return;

        setProviderDetails(prev => {
            if (!prev) return null;
            const newDetails = { ...prev };
            if (field.startsWith('parameters.')) {
                const paramKey = field.split('.')[1];
                newDetails.parameters = { ...newDetails.parameters, [paramKey]: value };
            } else if (field.startsWith('headers.')) {
                 const headerKey = field.split('.')[1];
                newDetails.headers = { ...newDetails.headers, [headerKey]: value };
            }
            else {
                (newDetails as any)[field] = value;
            }
            return newDetails;
        });
    };

    const handleSaveProvider = () => {
        if (!providerDetails) return;
        const newProviders = settings.providers.map(p => p.id === providerDetails.id ? providerDetails : p);
        onSettingsChange({ ...settings, providers: newProviders });
    };

    return (
        <div className="flex gap-6 h-full">
            <div className="w-1/3 border-r border-gray-700/50 pr-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold">Providers</h3>
                    <button onClick={handleAddProvider} className="p-1 rounded-md hover:bg-gray-700/50"><PlusIcon className="h-5 w-5"/></button>
                </div>
                <ul className="space-y-1">
                    {settings.providers.map(p => {
                        const validation = validateProvider(p);
                        const isDisabled = isProviderTypeDisabled(p.providerType);
                        return (
                            <li key={p.id}>
                                <div className={`w-full text-left p-2 text-sm rounded-md truncate flex justify-between items-center ${selectedProviderId === p.id ? 'bg-purple-600/30' : 'hover:bg-gray-700/50'} ${isDisabled ? 'opacity-50' : ''}`}>
                                    <button 
                                        onClick={() => setSelectedProviderId(p.id)}
                                        className="flex-1 text-left flex items-center gap-2"
                                        disabled={isDisabled}
                                    >
                                        <span className={`w-2 h-2 rounded-full ${isDisabled ? 'bg-gray-500' : validation.isValid ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                        <span className={isDisabled ? 'line-through' : ''}>{p.name}</span>
                                        {isDisabled && <span className="text-xs text-gray-400">(Disabled)</span>}
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteProvider(p.id); }} className="p-1 text-gray-500 hover:text-red-400"><XIcon className="h-4 w-4"/></button>
                                </div>
                                {!validation.isValid && selectedProviderId === p.id && (
                                    <div className="ml-4 mt-1 text-xs text-red-400">
                                        {validation.errors.join(', ')}
                                    </div>
                                )}
                                {isDisabled && selectedProviderId === p.id && (
                                    <div className="ml-4 mt-1 text-xs text-yellow-400">
                                        This provider type has been disabled and cannot be used for new requests.
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </div>
            <div className="w-2/3 flex-grow flex flex-col">
                {providerDetails ? (
                    <>
                        <div className="flex-grow space-y-4 overflow-y-auto pr-2">
                             <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Provider Name</label>
                                <input type="text" value={providerDetails.name} onChange={e => handleProviderChange('name', e.target.value)} className="w-full bg-gray-900/50 border border-gray-700 p-2 rounded-md text-sm"/>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Base URL</label>
                                <input 
                                    type="text" 
                                    value={providerDetails.baseURL} 
                                    onChange={e => handleProviderChange('baseURL', e.target.value)} 
                                    placeholder={getPlaceholderForProvider(providerDetails.providerType)}
                                    className="w-full bg-gray-900/50 border border-gray-700 p-2 rounded-md text-sm"
                                />
                                <p className="text-xs text-gray-500 mt-1">{getHelpTextForProvider(providerDetails.providerType)}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Models Endpoint (Optional)</label>
                                <input type="text" value={providerDetails.modelsEndpoint || ''} onChange={e => handleProviderChange('modelsEndpoint', e.target.value)} placeholder="Auto-detected from base URL" className="w-full bg-gray-900/50 border border-gray-700 p-2 rounded-md text-sm"/>
                                <p className="text-xs text-gray-500 mt-1">When provided, this endpoint will be used exclusively (no auto-detection). Example: https://api.openai.com/v1/models</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">API Key</label>
                                <input type="password" value={providerDetails.apiKey} onChange={e => handleProviderChange('apiKey', e.target.value)} className="w-full bg-gray-900/50 border border-gray-700 p-2 rounded-md text-sm"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">CORS Proxy URL (Optional)</label>
                                <input type="text" value={providerDetails.proxyURL || ''} onChange={e => handleProviderChange('proxyURL', e.target.value)} placeholder="e.g. https://my-proxy.com" className="w-full bg-gray-900/50 border border-gray-700 p-2 rounded-md text-sm"/>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Additional Parameters (JSON)</label>
                                <textarea
                                    value={jsonText}
                                    onChange={e => {
                                        const value = e.target.value;
                                        setJsonText(value);
                                        setJsonError(null);
                                        
                                        // Try to parse and update only if valid JSON
                                        if (!value.trim()) {
                                            handleProviderChange('parameters', {});
                                            return;
                                        }
                                        
                                        try {
                                            const parsed = JSON.parse(value);
                                            if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                                                handleProviderChange('parameters', parsed);
                                                setJsonError(null);
                                            } else {
                                                setJsonError('Parameters must be a JSON object');
                                            }
                                        } catch (err) { 
                                            // Don't update parameters if JSON is invalid, just show error
                                            setJsonError(`Invalid JSON: ${(err as Error).message}`);
                                        }
                                    }}
                                    onBlur={() => {
                                        // On blur, try to format the JSON if it's valid
                                        try {
                                            const parsed = JSON.parse(jsonText);
                                            if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                                                const formatted = JSON.stringify(parsed, null, 2);
                                                setJsonText(formatted);
                                                setJsonError(null);
                                            }
                                        } catch (err) {
                                            // Keep the current text if invalid
                                        }
                                    }}
                                    placeholder='{"temperature": 0.7, "max_tokens": 2000}'
                                    className={`w-full bg-gray-900/50 border p-2 rounded-md text-sm font-mono h-24 resize-none ${
                                        jsonError ? 'border-red-500' : 'border-gray-700'
                                    }`}
                                />
                                {jsonError && (
                                    <p className="text-xs text-red-400 mt-1">{jsonError}</p>
                                )}
                                <p className="text-xs text-gray-500 mt-1">JSON object with additional API parameters (e.g., temperature, max_tokens, etc.)</p>
                            </div>
                            
                            <div className="border-t border-gray-700 pt-4">
                                <h4 className="text-sm font-medium text-gray-400 mb-3">Request Settings</h4>
                                <div className="space-y-3">
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={providerDetails.useRandomSeed || false}
                                            onChange={e => handleProviderChange('useRandomSeed', e.target.checked)}
                                            className="rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500"
                                        />
                                        <span className="text-sm">Use random seed for each request (improves response variety)</span>
                                    </label>
                                </div>
                            </div>
                            
                            <div className="border-t border-gray-700 pt-4">
                                <h4 className="text-sm font-medium text-gray-400 mb-3">Retry Settings</h4>
                                <div className="space-y-3">
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={providerDetails.retrySettings?.enabled || false}
                                            onChange={e => handleProviderChange('retrySettings', {
                                                ...providerDetails.retrySettings,
                                                enabled: e.target.checked,
                                                maxRetries: providerDetails.retrySettings?.maxRetries || 3
                                            })}
                                            className="rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500"
                                        />
                                        <span className="text-sm">Enable automatic retries on failure</span>
                                    </label>
                                    
                                    {providerDetails.retrySettings?.enabled && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1">
                                                Max Retries: {providerDetails.retrySettings?.maxRetries || 3}
                                            </label>
                                            <input
                                                type="range"
                                                min="1"
                                                max="5"
                                                value={providerDetails.retrySettings?.maxRetries || 3}
                                                onChange={e => handleProviderChange('retrySettings', {
                                                    ...providerDetails.retrySettings,
                                                    maxRetries: parseInt(e.target.value)
                                                })}
                                                className="w-full"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="pt-4 flex justify-between items-center">
                            <TestConnectionButton provider={providerDetails} />
                            <button onClick={handleSaveProvider} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                                <SaveIcon className="h-5 w-5"/>
                                Save Provider
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        <p>Select a provider to edit or add a new one.</p>
                    </div>
                )}
            </div>
            
            {/* Template Selector Modal */}
            {showTemplateSelector && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-semibold text-gray-200">Choose Provider Template</h3>
                            <button 
                                onClick={() => setShowTemplateSelector(false)}
                                className="text-gray-400 hover:text-gray-200"
                            >
                                <XIcon className="h-6 w-6" />
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                            {getEnabledProviderTemplates().map(template => (
                                <button
                                    key={template.id}
                                    onClick={() => handleCreateProviderFromTemplate(template.id)}
                                    className="p-4 border border-gray-700 rounded-lg hover:border-purple-500 hover:bg-gray-800/50 transition-colors text-left"
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-2xl">{template.icon}</span>
                                        <h4 className="font-semibold text-gray-200">{template.name}</h4>
                                    </div>
                                    <p className="text-sm text-gray-400 mb-2">{template.description}</p>
                                    <div className="text-xs text-gray-500">
                                        <div>Format: {template.responseFormat}</div>
                                        <div>Streaming: {template.stream ? 'Yes' : 'No'}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                        
                        <div className="border-t border-gray-700 pt-4">
                            <button
                                onClick={handleCreateCustomProvider}
                                className="w-full p-4 border border-gray-700 rounded-lg hover:border-gray-500 hover:bg-gray-800/50 transition-colors text-left"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-2xl">⚙️</span>
                                    <h4 className="font-semibold text-gray-200">Custom Provider</h4>
                                </div>
                                <p className="text-sm text-gray-400">Create a custom provider with manual configuration</p>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};



// MCP Settings Component
// Full-screen JSON Editor Modal
const JsonEditorModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    jsonString: string;
    onSave: (jsonString: string) => void;
}> = ({ isOpen, onClose, jsonString, onSave }) => {
    const [editedJson, setEditedJson] = useState(jsonString);
    const [jsonError, setJsonError] = useState<string | null>(null);

    useEffect(() => {
        setEditedJson(jsonString);
    }, [jsonString]);

    const validateJson = (json: string) => {
        try {
            const parsed = JSON.parse(json);
            if (typeof parsed !== 'object' || parsed === null || !parsed.mcpServers) {
                setJsonError("JSON must be a Claude Desktop config with 'mcpServers' object.");
                return false;
            }
            setJsonError(null);
            return true;
        } catch (e: any) {
            setJsonError(e.message);
            return false;
        }
    };

    const handleSave = () => {
        if (validateJson(editedJson)) {
            onSave(editedJson);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-[#1a1a1a] border border-gray-700/50 rounded-lg w-[90vw] h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
                    <h2 className="text-xl font-semibold text-gray-200">Edit MCP Configuration</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700/50">
                        <XIcon className="h-5 w-5" />
                    </button>
                </div>
                
                <div className="flex-1 p-4 flex flex-col">
                    <textarea
                        value={editedJson}
                        onChange={(e) => {
                            setEditedJson(e.target.value);
                            validateJson(e.target.value);
                        }}
                        className="flex-1 bg-gray-900/50 border border-gray-700/50 rounded-lg p-4 text-gray-200 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder={`{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "."]
    },
    "web-search": {
      "command": "npx", 
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "your-brave-api-key"
      }
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    },
    "chrome-devtools": {
      "command": "npx",
      "args": ["chrome-devtools-mcp@latest"]
    }
  }
}`}
                    />
                    {jsonError && (
                        <div className="mt-2 p-3 bg-red-900/20 border border-red-700/30 rounded-lg text-red-400 text-sm">
                            {jsonError}
                        </div>
                    )}
                </div>
                
                <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-700/50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-400 hover:text-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!!jsonError}
                        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                    >
                        <SaveIcon className="h-4 w-4" />
                        Save Configuration
                    </button>
                </div>
            </div>
        </div>
    );
};

const McpSettings: React.FC<{
    mcpJsonString: string;
    setMcpJsonString: (jsonString: string) => void;
    discoveredPluginSources: DiscoveredPluginSource[];
    mcpServerStatus: Record<string, 'running' | 'stopped' | 'error'>;
    onStartServer: (serverName: string) => Promise<boolean>;
    onStopServer: (serverName: string) => Promise<boolean>;
    onRestartServer: (serverName: string) => Promise<boolean>;
    onCheckServerStatus: () => Promise<void>;
    settings: Settings;
    onSettingsChange: (newSettings: Settings) => void;
}> = ({ mcpJsonString, setMcpJsonString, discoveredPluginSources, mcpServerStatus, onStartServer, onStopServer, onRestartServer, onCheckServerStatus, settings, onSettingsChange }) => {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="font-semibold mb-4 text-gray-400">MCP Servers</h3>
                <p className="text-sm text-gray-500 mb-4">
                    Configure Model Context Protocol servers to extend AI capabilities. Use the JSON editor below to add your own MCP servers.
                </p>
            </div>

            {/* MCP Configuration */}
            <MCPSettings 
                mcpJsonString={mcpJsonString} 
                setMcpJsonString={setMcpJsonString} 
                discoveredPluginSources={discoveredPluginSources} 
                mcpServerStatus={mcpServerStatus}
                onStartServer={onStartServer}
                onStopServer={onStopServer}
                onRestartServer={onRestartServer}
                onCheckServerStatus={onCheckServerStatus}
                settings={settings}
                onSettingsChange={onSettingsChange}
            />
        </div>
    );
};

// Memory Settings Component
const MemorySettings: React.FC<{
    settings: Settings;
    onSettingsChange: (newSettings: Settings) => void;
}> = ({ settings, onSettingsChange }) => {
    const memorySettings = settings.memorySettings || { enabled: true, maxMemories: 1000, retentionDays: 30 };
    const stats = memoryService.getStats();

    const handleMemorySettingChange = (key: keyof typeof memorySettings, value: any) => {
        const newMemorySettings = { ...memorySettings, [key]: value };
        onSettingsChange({
            ...settings,
            memorySettings: newMemorySettings
        });
    };

    const handleClearMemories = () => {
        if (confirm('Are you sure you want to clear all conversation memories? This cannot be undone.')) {
            memoryService.clearMemories();
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="font-semibold mb-4 text-gray-400">Conversation Memory</h3>
                <p className="text-sm text-gray-500 mb-4">
                    Memory helps the AI remember important information from your conversations to provide more personalized responses.
                </p>
                
                <div className="space-y-4">
                    <label className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            checked={memorySettings.enabled}
                            onChange={(e) => handleMemorySettingChange('enabled', e.target.checked)}
                            className="rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-sm">Enable conversation memory</span>
                    </label>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Maximum memories to store: {memorySettings.maxMemories}
                        </label>
                        <input
                            type="range"
                            min="100"
                            max="5000"
                            step="100"
                            value={memorySettings.maxMemories}
                            onChange={(e) => handleMemorySettingChange('maxMemories', parseInt(e.target.value))}
                            className="w-full"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Retention period: {memorySettings.retentionDays} days
                        </label>
                        <input
                            type="range"
                            min="1"
                            max="365"
                            step="1"
                            value={memorySettings.retentionDays}
                            onChange={(e) => handleMemorySettingChange('retentionDays', parseInt(e.target.value))}
                            className="w-full"
                        />
                    </div>
                </div>
            </div>

            <div className="border-t border-gray-700 pt-6">
                <h4 className="font-semibold mb-3 text-gray-400">Memory Statistics</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-gray-900/50 p-3 rounded-md">
                        <div className="text-gray-400">Stored Memories</div>
                        <div className="text-xl font-semibold text-white">{stats.memoryCount}</div>
                    </div>
                    <div className="bg-gray-900/50 p-3 rounded-md">
                        <div className="text-gray-400">Conversation Summaries</div>
                        <div className="text-xl font-semibold text-white">{stats.summaryCount}</div>
                    </div>
                </div>
                {stats.oldestMemory && (
                    <p className="text-xs text-gray-500 mt-2">
                        Oldest memory: {new Date(stats.oldestMemory).toLocaleDateString()}
                    </p>
                )}
            </div>

            <div className="border-t border-gray-700 pt-6">
                <h4 className="font-semibold mb-3 text-gray-400">Privacy Controls</h4>
                <button
                    onClick={handleClearMemories}
                    className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 font-semibold py-2 px-4 rounded-lg transition-colors border border-red-600/30"
                >
                    <DeleteIcon className="h-4 w-4" />
                    Clear All Memories
                </button>
                <p className="text-xs text-gray-500 mt-2">
                    This will permanently delete all stored conversation memories and summaries.
                </p>
            </div>
        </div>
    );
};

const MCPSettings: React.FC<{
    mcpJsonString: string;
    setMcpJsonString: (jsonString: string) => void;
    discoveredPluginSources: DiscoveredPluginSource[];
    mcpServerStatus: Record<string, 'running' | 'stopped' | 'error'>;
    onStartServer: (serverName: string) => Promise<boolean>;
    onStopServer: (serverName: string) => Promise<boolean>;
    onRestartServer: (serverName: string) => Promise<boolean>;
    onCheckServerStatus: () => Promise<void>;
    settings: Settings;
    onSettingsChange: (newSettings: Settings) => void;
}> = ({ mcpJsonString, setMcpJsonString, discoveredPluginSources, mcpServerStatus, onStartServer, onStopServer, onRestartServer, onCheckServerStatus, settings, onSettingsChange }) => {
    const [jsonError, setJsonError] = useState<string | null>(null);
    const [expandedViews, setExpandedViews] = useState<Record<string, 'tools' | null>>({});
    const [isJsonEditorOpen, setIsJsonEditorOpen] = useState(false);

    const parsedConfig = useMemo(() => {
        try {
            const config = JSON.parse(mcpJsonString);
            if (typeof config !== 'object' || config === null || !config.mcpServers) {
                setJsonError("JSON must be a Claude Desktop config with 'mcpServers' object.");
                return null;
            }
            setJsonError(null);
            return config as { mcpServers: Record<string, McpServer> };
        } catch (e: any) {
            setJsonError(e.message);
            return null;
        }
    }, [mcpJsonString]);
    
    const handleToggleExpanded = (serverName: string, view: 'tools') => {
        setExpandedViews(prev => ({
            ...prev,
            [serverName]: prev[serverName] === view ? null : view
        }));
    }

    const handleRemoveAlwaysAllowTool = (serverName: string, toolName: string) => {
        const updatedMcpServers = { ...settings.claudeDesktopConfig.mcpServers };
        if (updatedMcpServers[serverName] && updatedMcpServers[serverName].alwaysAllowTools) {
            updatedMcpServers[serverName] = {
                ...updatedMcpServers[serverName],
                alwaysAllowTools: updatedMcpServers[serverName].alwaysAllowTools!.filter(tool => tool !== toolName)
            };
        }

        onSettingsChange({
            ...settings,
            claudeDesktopConfig: {
                ...settings.claudeDesktopConfig,
                mcpServers: updatedMcpServers
            }
        });
    }

    const getStatusInfo = (status: 'running' | 'stopped' | 'error' | undefined) => {
        switch (status) {
            case 'running': return { text: 'Running', color: 'bg-green-500' };
            case 'error': return { text: 'Error', color: 'bg-red-500' };
            default: return { text: 'Stopped', color: 'bg-gray-500' };
        }
    };

    return (
        <div className="flex flex-col h-full">
            <JsonEditorModal
                isOpen={isJsonEditorOpen}
                onClose={() => setIsJsonEditorOpen(false)}
                jsonString={mcpJsonString}
                onSave={setMcpJsonString}
            />
            
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="font-semibold text-gray-200">MCP Servers</h3>
                    <p className="text-sm text-gray-500">Manage Model Context Protocol servers and their tools</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onCheckServerStatus}
                        className="flex items-center gap-2 bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-3 rounded-lg transition-colors"
                        title="Refresh server status"
                    >
                        <RefreshIcon className="h-4 w-4" />
                        Refresh
                    </button>
                    <button
                        onClick={() => setIsJsonEditorOpen(true)}
                        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                    >
                        <EditIcon className="h-4 w-4" />
                        Edit MCP Config
                    </button>
                </div>
            </div>
            
            {jsonError && (
                <div className="mb-4 p-3 bg-red-900/20 border border-red-700/30 rounded-lg text-red-400 text-sm">
                    {jsonError}
                </div>
            )}
            
            <div className="flex-1 overflow-y-auto">
                {parsedConfig && Object.keys(parsedConfig.mcpServers).length > 0 ? (
                    <div className="space-y-3">
                        {Object.entries(parsedConfig.mcpServers).map(([serverName, config]: [string, McpServer]) => {
                            const status = mcpServerStatus[serverName] || 'stopped';
                            const statusInfo = getStatusInfo(status);
                            const isExpanded = expandedViews[serverName] === 'tools';
                            
                            return (
                                <div key={serverName} className="bg-gray-900/50 rounded-lg border border-gray-700/50 transition-all duration-300">
                                    <div className="p-4">
                                        <div className="flex items-center justify-between">
                                            <button
                                                onClick={() => handleToggleExpanded(serverName, 'tools')}
                                                className="flex-1 text-left"
                                            >
                                                <h4 className="text-lg font-semibold text-gray-200 hover:text-white transition-colors">
                                                    {serverName}
                                                </h4>
                                                <p className="text-sm text-gray-500 mt-1">
                                                    {config.command} {config.args?.join(' ')}
                                                </p>
                                            </button>
                                            
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-2">
                                                    <div className={`h-2 w-2 rounded-full ${statusInfo.color}`}></div>
                                                    <span className="text-sm text-gray-400">{statusInfo.text}</span>
                                                </div>
                                                
                                                <div className="flex items-center gap-2">
                                                    {status === 'running' ? (
                                                        <button
                                                            onClick={() => onStopServer(serverName)}
                                                            className="px-3 py-1 bg-red-600/80 hover:bg-red-500/80 text-white text-sm rounded transition-colors"
                                                        >
                                                            Stop
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => onStartServer(serverName)}
                                                            className="px-3 py-1 bg-green-600/80 hover:bg-green-500/80 text-white text-sm rounded transition-colors"
                                                        >
                                                            Start
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => onRestartServer(serverName)}
                                                        className="px-3 py-1 bg-blue-600/80 hover:bg-blue-500/80 text-white text-sm rounded transition-colors"
                                                        title="Restart server"
                                                    >
                                                        Restart
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {isExpanded && (
                                            <div className="mt-4 pt-4 border-t border-gray-700/50">
                                                <h5 className="text-sm font-medium text-gray-300 mb-3">Available Tools</h5>
                                                {discoveredPluginSources.find(s => s.server.id === serverName)?.plugins.map(plugin => (
                                                    <div key={plugin.id} className="space-y-2">
                                                        {plugin.tools.map(tool => {
                                                            const isAlwaysAllowed = parsedConfig.mcpServers[serverName]?.alwaysAllowTools?.includes(tool.function.name) || false;
                                                            return (
                                                                <div key={tool.function.name} className="flex items-start gap-3 p-3 bg-gray-800/30 rounded-lg">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isAlwaysAllowed}
                                                                        onChange={(e) => {
                                                                            const updatedMcpServers = { ...settings.claudeDesktopConfig.mcpServers };
                                                                            if (updatedMcpServers[serverName]) {
                                                                                const currentTools = updatedMcpServers[serverName].alwaysAllowTools || [];
                                                                                if (e.target.checked) {
                                                                                    updatedMcpServers[serverName] = {
                                                                                        ...updatedMcpServers[serverName],
                                                                                        alwaysAllowTools: Array.from(new Set([...currentTools, tool.function.name]))
                                                                                    };
                                                                                } else {
                                                                                    updatedMcpServers[serverName] = {
                                                                                        ...updatedMcpServers[serverName],
                                                                                        alwaysAllowTools: currentTools.filter(t => t !== tool.function.name)
                                                                                    };
                                                                                }
                                                                                onSettingsChange({
                                                                                    ...settings,
                                                                                    claudeDesktopConfig: {
                                                                                        ...settings.claudeDesktopConfig,
                                                                                        mcpServers: updatedMcpServers
                                                                                    }
                                                                                });
                                                                            }
                                                                        }}
                                                                        className="mt-1 rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500"
                                                                    />
                                                                    <div className="flex-1">
                                                                        <div className="text-sm font-medium text-gray-200">{tool.function.name}</div>
                                                                        <div className="text-xs text-gray-400 mt-1 line-clamp-2">{tool.function.description}</div>
                                                                        {isAlwaysAllowed && (
                                                                            <div className="text-xs text-green-400 mt-1">✓ Always allowed</div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )) || (
                                                    <p className="text-sm text-gray-500 italic">No tools discovered yet. Make sure the server is running.</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <WrenchScrewdriverIcon className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                        <h4 className="text-lg font-medium text-gray-400 mb-2">No MCP Servers Configured</h4>
                        <p className="text-gray-500 mb-4">Click "Edit MCP Config" to add your first MCP server</p>
                        <button
                            onClick={() => setIsJsonEditorOpen(true)}
                            className="bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                        >
                            Get Started
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};


const SettingsView: React.FC<SettingsViewProps> = ({ isOpen, onClose, settings, onSettingsChange, discoveredPluginSources, mcpServerStatus, onStartMcpServer, onStopMcpServer, onRestartMcpServer, onCheckMcpServerStatus }) => {
    const [activeTab, setActiveTab] = useState<SettingsTab>('Models');
    const [mcpJsonString, setMcpJsonString] = useState('');

    // Clean up invalid model assignments on mount
    useEffect(() => {
        let needsUpdate = false;
        const updatedSettings = { ...settings };

        // Check main assignment
        if (settings.modelAssignments.main?.providerId) {
            const provider = settings.providers.find(p => p.id === settings.modelAssignments.main?.providerId);
            if (!provider) {
                console.log('Cleaning up invalid main model assignment');
                updatedSettings.modelAssignments.main = null;
                needsUpdate = true;
            }
        }

        // Check background assignment
        if (settings.modelAssignments.background?.providerId) {
            const provider = settings.providers.find(p => p.id === settings.modelAssignments.background?.providerId);
            if (!provider) {
                console.log('Cleaning up invalid background model assignment');
                updatedSettings.modelAssignments.background = null;
                needsUpdate = true;
            }
        }

        if (needsUpdate) {
            onSettingsChange(updatedSettings);
        }
    }, [settings.providers, settings.modelAssignments, onSettingsChange]);

    useEffect(() => {
        if (isOpen) {
            // Show the exact Claude Desktop format
            setMcpJsonString(JSON.stringify(settings.claudeDesktopConfig || { mcpServers: {} }, null, 2));
        }
    }, [isOpen, settings.claudeDesktopConfig]);
    
    if (!isOpen) return null;
    
    const handleSaveMCPConfig = () => {
        try {
            const parsedConfig = JSON.parse(mcpJsonString);
            if (typeof parsedConfig === 'object' && parsedConfig !== null && parsedConfig.mcpServers) {
                onSettingsChange({
                    ...settings,
                    claudeDesktopConfig: parsedConfig,
                });
            }
        } catch (e) {
            console.error("Failed to save MCP config due to invalid JSON", e);
        }
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'Models':
                return (
                    <div className="space-y-6">
                        <ModelAssignmentEditor task="main" label="Main Model" settings={settings} onSettingsChange={onSettingsChange} />
                        <ModelAssignmentEditor task="background" label="Background Model (e.g., for Titling)" settings={settings} onSettingsChange={onSettingsChange} />
                    </div>
                );
            case 'Providers':
                return <ProviderEditor settings={settings} onSettingsChange={onSettingsChange} />;
            case 'MCP':
                return <MCPSettings 
                            mcpJsonString={mcpJsonString} 
                            setMcpJsonString={setMcpJsonString} 
                            discoveredPluginSources={discoveredPluginSources} 
                            mcpServerStatus={mcpServerStatus}
                            onStartServer={onStartMcpServer}
                            onStopServer={onStopMcpServer}
                            onRestartServer={onRestartMcpServer}
                            onCheckServerStatus={onCheckMcpServerStatus}
                            settings={settings}
                            onSettingsChange={onSettingsChange}
                        />;
            case 'Memory':
                return <MemorySettings settings={settings} onSettingsChange={onSettingsChange} />;
            default:
                return null;
        }
    };
    
    const renderFooter = () => {
        if (activeTab === 'MCP') {
            return (
                 <button onClick={handleSaveMCPConfig} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                    <SaveIcon className="h-5 w-5"/>
                    Save MCP Configuration
                </button>
            )
        }
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-40 animate-fade-in" onClick={onClose}>
            <div className="bg-[#0A0A0A] border border-gray-700/50 rounded-lg shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col text-gray-300" onClick={e => e.stopPropagation()}>
                <header className="p-4 flex justify-between items-center border-b border-gray-700/50">
                    <h2 className="text-xl font-bold">Settings</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700/50"><XIcon className="h-5 w-5" /></button>
                </header>
                <div className="flex flex-grow overflow-hidden">
                    <nav className="w-48 border-r border-gray-700/50 p-4">
                        <ul className="space-y-2">
                            {(['Models', 'Providers', 'MCP', 'Memory'] as SettingsTab[]).map(tab => {
                                const Icon = tab === 'Models' ? CubeTransparentIcon : tab === 'Providers' ? CloudArrowDownIcon : tab === 'MCP' ? WrenchScrewdriverIcon : EditIcon;
                                return (
                                    <li key={tab}>
                                        <button 
                                            onClick={() => {
                                                setActiveTab(tab);
                                                // Check MCP server status only when MCP tab is opened
                                                if (tab === 'MCP') {
                                                    onCheckMcpServerStatus();
                                                }
                                            }}
                                            className={`w-full flex items-center gap-3 p-2 rounded-md text-sm font-medium ${activeTab === tab ? 'bg-purple-600/30 text-white' : 'hover:bg-gray-700/50 text-gray-400'}`}
                                        >
                                            <Icon className="h-5 w-5"/>
                                            {tab}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </nav>
                    <main className="flex-1 p-6 flex flex-col overflow-hidden">
                       <div className="flex-grow overflow-y-auto">
                         {renderTabContent()}
                       </div>
                       <footer className="pt-4 flex justify-end">
                          {renderFooter()}
                       </footer>
                    </main>
                </div>
            </div>
        </div>
    );
};

export default SettingsView;