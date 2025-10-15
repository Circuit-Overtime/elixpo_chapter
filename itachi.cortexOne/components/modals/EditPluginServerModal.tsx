import React, { useState, useEffect } from 'react';
import { PluginServer } from '../../types';
import { SaveIcon } from '../icons';

interface EditPluginServerModalProps {
    server: Partial<PluginServer> | null;
    onSave: (server: Partial<PluginServer>) => void;
    onClose: () => void;
}

const EditPluginServerModal: React.FC<EditPluginServerModalProps> = ({ server, onSave, onClose }) => {
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');

    useEffect(() => {
        if (server) {
            setName(server.name || '');
            setUrl(server.url || '');
        }
    }, [server]);

    if (!server) return null;

    const handleSave = () => {
        if (name.trim() && url.trim()) {
            onSave({ ...server, name, url });
        }
    };
    
    const isEditing = !!server.id;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-[#1A1A1A] rounded-lg shadow-2xl w-full max-w-md text-gray-300" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-700/50">
                    <h2 className="text-xl font-bold">{isEditing ? 'Edit MCP Server' : 'Add MCP Server'}</h2>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label htmlFor="server-name" className="block text-sm font-medium text-gray-400 mb-1">Name</label>
                        <input
                            id="server-name"
                            type="text"
                            placeholder="e.g., Awesome Tools Server"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full bg-gray-900/50 border border-gray-700 p-2 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                    </div>
                     <div>
                        <label htmlFor="server-url" className="block text-sm font-medium text-gray-400 mb-1">Manifest URL</label>
                        <input
                            id="server-url"
                            type="text"
                            placeholder="https://example.com/mcp.json"
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            className="w-full bg-gray-900/50 border border-gray-700 p-2 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                    </div>
                </div>
                <div className="p-4 bg-black/20 flex justify-end gap-4 rounded-b-lg">
                    <button onClick={onClose} className="py-2 px-4 text-sm rounded-lg hover:bg-gray-700/50 transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleSave} disabled={!name.trim() || !url.trim()} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        <SaveIcon className="h-4 w-4" />
                        Save Server
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditPluginServerModal;