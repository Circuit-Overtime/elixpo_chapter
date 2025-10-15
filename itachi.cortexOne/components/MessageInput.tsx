import React, { useRef, useEffect, useState } from 'react';
import { SendIcon, StopIcon } from './icons';
import { Tool } from '../types';

interface MessageInputProps {
  input: string;
  setInput: (value: string) => void;
  onSendMessage: (message: string, options?: { extendedThinking?: boolean; images?: { url: string; mimeType: string }[] }) => void;
  isLoading: boolean;


  onStopGeneration?: () => void;
  availableTools?: Tool[];
  enabledTools?: string[];
  onToggleTool?: (toolName: string) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({
  input,
  setInput,
  onSendMessage,
  isLoading,


  onStopGeneration,
  availableTools = [],
  enabledTools = [],
  onToggleTool
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showToolsDropdown, setShowToolsDropdown] = useState(false);
  const [extendedThinking, setExtendedThinking] = useState(false);
  const [images, setImages] = useState<{ url: string; mimeType: string }[]>([]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 5 * 24;
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [input]);

  useEffect(() => {
    // Always keep focus on textarea
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isLoading]); // Refocus after loading changes

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() || images.length > 0) {
      onSendMessage(input.trim(), { extendedThinking, images });
      setInput('');
      setImages([]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: { url: string; mimeType: string }[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Check if it's an image
      if (!file.type.startsWith('image/')) {
        continue;
      }

      // Convert to base64
      const reader = new FileReader();
      const base64Promise = new Promise<{ url: string; mimeType: string }>((resolve) => {
        reader.onload = (event) => {
          const base64String = event.target?.result as string;
          resolve({
            url: base64String,
            mimeType: file.type
          });
        };
        reader.readAsDataURL(file);
      });

      newImages.push(await base64Promise);
    }

    setImages([...images, ...newImages]);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleStopClick = () => {
    if (onStopGeneration) {
      onStopGeneration();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      <form onSubmit={handleSubmit} className="w-full bg-[#101010] border border-gray-700/50 rounded-2xl shadow-lg p-4">
        {/* Image previews */}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {images.map((image, index) => (
              <div key={index} className="relative group">
                <img 
                  src={image.url} 
                  alt={`Upload ${index + 1}`}
                  className="h-20 w-20 object-cover rounded-lg border border-gray-600"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
        
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="How can I help you today?"
          rows={1}
          className="w-full bg-transparent text-gray-200 placeholder-gray-500 resize-none focus:outline-none focus:ring-0 text-base"
          disabled={false}
        />

        <div className="flex justify-between items-center mt-3">
          {/* Left side - Claude's three buttons */}
          <div className="flex items-center gap-1">
            {/* Upload button (first +) */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`p-2 rounded-lg transition-colors ${
                images.length > 0 
                  ? 'text-blue-400 bg-blue-500/10' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
              }`}
              title="Upload images"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>

            {/* Tools button (second button) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowToolsDropdown(!showToolsDropdown)}
                className={`p-2 rounded-lg transition-colors ${showToolsDropdown || availableTools.some(tool => enabledTools.includes(tool.function.name))
                  ? 'text-blue-400 bg-blue-500/10'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                  }`}
                title="Tools"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </button>

              {/* Tools Dropdown */}
              {showToolsDropdown && (
                <div className="absolute bottom-full left-0 mb-2 bg-[#1a1a1a] border border-gray-600/50 rounded-lg shadow-lg p-3 min-w-64 z-50">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-200">Tools</h3>
                    <button
                      type="button"
                      onClick={() => setShowToolsDropdown(false)}
                      className="text-gray-400 hover:text-gray-200"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Web Search Tool */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gray-800/30 hover:bg-gray-700/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/20 rounded-lg">
                        <svg className="h-4 w-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-200">Web Search</div>
                        <div className="text-xs text-gray-400">Search the web for current information</div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        onToggleTool?.('web_search');
                        setShowToolsDropdown(false);
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${enabledTools.includes('web_search')
                        ? 'bg-blue-600 hover:bg-blue-500 text-white'
                        : 'bg-gray-600 hover:bg-gray-500 text-gray-200'
                        }`}
                    >
                      {enabledTools.includes('web_search') ? 'Enabled' : 'Enable'}
                    </button>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-700/50">
                    <div className="text-xs text-gray-500 text-center">
                      More tools coming soon
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Extended thinking button (third button) */}
            <button
              type="button"
              onClick={() => setExtendedThinking(!extendedThinking)}
              className={`p-2 rounded-lg transition-colors ${extendedThinking
                ? 'text-purple-400 bg-purple-500/10'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                }`}
              title="Extended thinking - Uses sequential thinking MCP for deeper reasoning"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </button>
          </div>

          {/* Right side - Send/Stop and other controls */}
          <div className="flex items-center gap-2">


            {isLoading ? (
              <button
                type="button"
                onClick={handleStopClick}
                className="p-2 rounded-lg transition-colors duration-200 bg-red-600 hover:bg-red-500 text-white"
                title="Stop generation"
              >
                <StopIcon className="h-5 w-5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim() && images.length === 0}
                className="p-2 rounded-lg transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-orange-600 hover:bg-orange-500 enabled:text-white"
                title="Send message"
              >
                <SendIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Extended thinking indicator */}
      {extendedThinking && (
        <div className="mt-2 text-center">
          <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full text-xs text-purple-400">
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Extended thinking enabled - AI will use sequential reasoning
          </div>
          <div className="mt-1">
            <button
              onClick={() => {
                console.log('Manual tool check triggered from UI');
                console.log('Available tools:', availableTools?.map(t => t.function.name));
                console.log('Enabled tools:', enabledTools);
              }}
              className="text-xs text-purple-400 hover:text-purple-300 underline"
            >
              Debug: Check Available Tools
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageInput;