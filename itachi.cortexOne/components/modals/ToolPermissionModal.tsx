import React, { useState } from 'react';
import { ToolCall } from '../../types';
import { WrenchScrewdriverIcon, CheckIcon, ShieldCheckIcon, XIcon, ChevronDownIcon } from '../icons';

interface ToolPermissionModalProps {
    toolCalls: ToolCall[];
    onResult: (approvedCalls: ToolCall[] | null) => void;
    onAlwaysAllow: (toolName: string) => void;
}

const CodeBlock: React.FC<{ code: string }> = ({ code }) => {
    let formattedCode = code;
    try {
        const parsed = JSON.parse(code);
        formattedCode = JSON.stringify(parsed, null, 2);
    } catch (e) { /* not json, render as is */ }

    return (
        <pre className="bg-[#101010] p-3 rounded-md text-xs text-gray-300 overflow-x-auto max-h-40 font-mono">
            <code>{formattedCode}</code>
        </pre>
    );
};

// Claude-style collapsible request details
const RequestDetails: React.FC<{ toolCall: ToolCall }> = ({ toolCall }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="mt-3">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
            >
                <span>Request</span>
                <ChevronDownIcon 
                    className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                />
            </button>
            
            {isExpanded && (
                <div className="mt-2">
                    <CodeBlock code={toolCall.function.arguments} />
                </div>
            )}
        </div>
    );
};


const ToolPermissionModal: React.FC<ToolPermissionModalProps> = ({ toolCalls, onResult, onAlwaysAllow }) => {
    // For now, handle single tool call (like Claude). Multiple tools can be handled later.
    const toolCall = toolCalls[0];
    
    const handleDeny = () => {
        onResult(null);
    };

    const handleAllowOnce = () => {
        onResult([toolCall]);
    };

    const handleAlwaysAllow = () => {
        onAlwaysAllow(toolCall.function.name);
        onResult([toolCall]);
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-[#1A1A1A] rounded-lg shadow-2xl w-full max-w-md text-gray-300 border border-gray-700/50">
                {/* Header with tool info */}
                <div className="p-4 border-b border-gray-700/50">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-gray-600/50 rounded">
                            <WrenchScrewdriverIcon className="h-4 w-4 text-gray-300" />
                        </div>
                        <div>
                            <h3 className="font-medium text-gray-200">CortexOne wants to use {toolCall.function.name}</h3>
                            <p className="text-sm text-gray-400">from MCP</p>
                        </div>
                    </div>
                    
                    {/* Collapsible request details */}
                    <RequestDetails toolCall={toolCall} />
                </div>

                {/* Security warning */}
                <div className="p-4 border-b border-gray-700/50">
                    <p className="text-xs text-gray-400">
                        Claude cannot guarantee the security or privacy practices of third-party integrations.
                    </p>
                </div>

                {/* Action buttons */}
                <div className="p-4 flex gap-2">
                    <button
                        onClick={handleDeny}
                        className="flex-1 py-2 px-3 text-sm rounded-md bg-gray-700 hover:bg-gray-600 transition-colors text-gray-300"
                    >
                        Deny
                    </button>
                    <button
                        onClick={handleAlwaysAllow}
                        className="flex-1 py-2 px-3 text-sm rounded-md bg-gray-600 hover:bg-gray-500 transition-colors text-white"
                    >
                        Always allow
                    </button>
                    <button
                        onClick={handleAllowOnce}
                        className="flex-1 py-2 px-3 text-sm rounded-md bg-white text-black hover:bg-gray-200 transition-colors font-medium"
                    >
                        Allow once
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ToolPermissionModal;