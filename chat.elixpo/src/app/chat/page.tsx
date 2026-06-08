'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { ChatMessage } from '@/components/chat/ChatMessage';

export default function ChatPage() {
  const [tiltStyle, setTiltStyle] = useState({ transform: 'none' });
  const inputRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [input, setInput] = useState('');

  // Vercel AI SDK v6 hook
  const { messages, status, sendMessage } = useChat();

  const isLoading = status === 'submitted' || status === 'streaming';

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!inputRef.current) return;
    
    const rect = inputRef.current.getBoundingClientRect();
    
    // Calculate mouse position relative to the element (from -0.5 to 0.5)
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    
    // Calculate rotation angles (max 5 degrees)
    const rotateY = x * 10;
    const rotateX = -y * 10;
    
    setTiltStyle({
      transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`,
    });
  };

  const handleMouseLeave = () => {
    setTiltStyle({
      transform: 'rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
    });
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    sendMessage({ role: 'user', content: input } as any);
    setInput('');
  };

  // Allow Shift+Enter for new line, Enter to submit
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full items-center justify-center relative perspective-[1000px] w-full max-w-4xl mx-auto">
      
      {/* Scrollable Message History Area */}
      {messages.length > 0 ? (
        <div className="flex-1 w-full overflow-y-auto scrollbar-thin scrollbar-thumb-[rgba(240,237,230,0.1)] scrollbar-track-transparent px-6 pt-8 pb-4">
          <div className="flex flex-col w-full">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex items-center gap-2 text-[rgba(240,237,230,0.4)] text-[11px] font-mono uppercase tracking-widest pl-4">
                <div className="w-1 h-1 bg-[#6366f1] animate-ping" />
                Elixpo is typing...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      ) : (
        /* Empty state / Welcome Area */
        <div className="flex-1 flex flex-col items-center justify-end px-6 pb-8 w-full transform-style-preserve-3d">
          <div className="w-full text-center space-y-6 mb-8 animate-[fadeIn_0.5s_ease-out]">
            <h2 className="text-3xl md:text-5xl font-bold text-[#f0ede6] tracking-[-0.03em] drop-shadow-sm" style={{ fontFamily: 'system-ui' }}>
              What can I help you with?
            </h2>
          </div>
          
          {/* Action Suggestions */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-8 w-full">
            {[
              { label: 'Brainstorm ideas', query: 'Help me brainstorm some unique ideas for a new AI product.' },
              { label: 'Write something', query: 'Write a short story about a time traveler.' },
              { label: 'Research a topic', query: 'What are the key differences between React and Next.js?' },
              { label: 'Help with code', query: 'Can you write a python script to parse a CSV file?' },
            ].map((action) => (
              <button
                key={action.label}
                onClick={() => setInput(action.query)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#0a0a0a] border border-[rgba(240,237,230,0.15)] font-mono text-[11px] font-bold tracking-[0.05em] uppercase text-[rgba(240,237,230,0.5)] hover:text-[#f0ede6] hover:border-[rgba(240,237,230,0.3)] transition-all duration-300"
                style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }}
              >
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area (Pinned to bottom) */}
      <div className={`w-full px-6 ${messages.length > 0 ? 'pb-8 pt-4' : 'pb-12'}`} style={{ perspective: '1000px' }}>
        <form onSubmit={handleSendMessage}>
          <div 
            ref={inputRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="relative flex flex-col bg-[#0a0a0a] border border-[rgba(240,237,230,0.15)] p-2 shadow-[0_15px_35px_rgba(0,0,0,0.5),inset_0_1px_2px_rgba(240,237,230,0.1)] focus-within:border-[#6366f1] focus-within:shadow-[0_15px_50px_rgba(99,102,241,0.15),inset_0_1px_2px_rgba(240,237,230,0.1)] transition-[border,box-shadow] duration-300 will-change-transform"
            style={{ ...tiltStyle, clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))' }}
          >
            
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Message Elixpo..."
              rows={1}
              className="w-full bg-transparent text-[#f0ede6] placeholder:text-[rgba(240,237,230,0.3)] resize-none outline-none text-[15px] leading-relaxed p-4 max-h-60 min-h-[64px] scrollbar-thin font-mono"
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${Math.min(target.scrollHeight, 240)}px`;
              }}
            />

            {/* Bottom Toolbar inside Input */}
            <div className="flex items-center justify-between px-2 pt-2 pb-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="flex items-center gap-2 px-3 py-1.5 text-[rgba(240,237,230,0.4)] hover:text-[#f0ede6] hover:bg-[rgba(240,237,230,0.04)] transition-colors font-mono text-[11px] font-bold tracking-[0.05em] uppercase"
                  title="Focus"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  Focus
                </button>
                <button
                  type="button"
                  className="flex items-center gap-2 px-3 py-1.5 text-[rgba(240,237,230,0.4)] hover:text-[#f0ede6] hover:bg-[rgba(240,237,230,0.04)] transition-colors font-mono text-[11px] font-bold tracking-[0.05em] uppercase"
                  title="Attach file"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                  </svg>
                  Attach
                </button>
              </div>

              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="shrink-0 w-10 h-10 flex items-center justify-center bg-[#6366f1] text-[#f0ede6] disabled:opacity-20 disabled:cursor-not-allowed hover:bg-[#5b5bd6] transition-colors shadow-lg"
                title="Send message"
                style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
              </button>
            </div>
          </div>
        </form>
      </div>
      
      {/* Footer text */}
      <div className="shrink-0 p-4 w-full">
        <p className="text-center text-[10px] font-mono tracking-[0.1em] uppercase text-[rgba(240,237,230,0.25)]">
          Elixpo AI can make mistakes. Consider checking important information.
        </p>
      </div>
    </div>
  );
}
