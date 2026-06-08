import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { UIMessage } from 'ai';

export function ChatMessage({ message }: { message: any }) {
  const isUser = message.role === 'user';

  // AI SDK v6 uses parts-based content. Extract text from parts or fall back to string content.
  const textContent = typeof message.content === 'string'
    ? message.content
    : (message.parts
        ?.filter((p: any) => p.type === 'text')
        .map((p: any) => p.text)
        .join('\n') || '');

  return (
    <div className={`w-full flex ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
      <div 
        className={`max-w-[85%] sm:max-w-[75%] rounded-none border p-4 ${
          isUser 
            ? 'bg-[#1a1a2e] border-[rgba(99,102,241,0.2)] text-[#f0ede6]' 
            : 'bg-[#0a0a0a] border-[rgba(240,237,230,0.15)] text-[rgba(240,237,230,0.85)]'
        }`}
        style={{
          clipPath: isUser 
            ? 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' 
            : 'polygon(10px 0, 100% 0, 100% 100%, 0 100%, 0 10px)'
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          {isUser ? (
            <div className="w-5 h-5 bg-[#6366f1] flex items-center justify-center text-[9px] font-bold text-[#f0ede6]" style={{ clipPath: 'polygon(0 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 3px 100%, 0 calc(100% - 3px))' }}>
              U
            </div>
          ) : (
            <div className="w-5 h-5 bg-[#0a0a0a] border border-[rgba(240,237,230,0.3)] flex items-center justify-center text-[9px] font-bold text-[#f0ede6]">
              AI
            </div>
          )}
          <span className="font-mono text-[10px] font-bold tracking-[0.1em] uppercase text-[rgba(240,237,230,0.4)]">
            {isUser ? 'You' : 'Elixpo'}
          </span>
        </div>
        
        {isUser ? (
          <p className="text-[14px] leading-relaxed">{textContent}</p>
        ) : (
          <div className="prose prose-invert max-w-none text-[14px] leading-relaxed prose-pre:bg-[#05050a] prose-pre:border prose-pre:border-[rgba(240,237,230,0.1)] prose-pre:rounded-none prose-code:text-[#6366f1] prose-headings:text-[#f0ede6] prose-strong:text-[#f0ede6] prose-a:text-[#6366f1]">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {textContent}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
