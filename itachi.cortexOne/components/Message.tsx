import React, { useState } from 'react';
import { Message, Role } from '../types';
import { CopyIcon, CheckIcon, SparklesIcon, UserIcon, CubeTransparentIcon, WrenchScrewdriverIcon, ChevronDownIcon } from './icons';


interface MessageProps {
  message: Message;
  onContextMenu: (event: React.MouseEvent, message: Message) => void;
  toolResults?: Message[];
  onConsent?: (approved: boolean, alwaysAllow?: boolean) => void;
}

const CodeBlock = ({ code, language = 'code' }: { code: string, language?: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#101010] rounded-md my-2">
      <div className="flex justify-between items-center px-4 py-1 bg-[#1A1A1A] text-gray-400 text-xs rounded-t-md">
        <span>{language}</span>
        <button onClick={handleCopy} className="flex items-center gap-1 text-gray-400 hover:text-white">
          {copied ? <CheckIcon className="h-4 w-4 text-green-400" /> : <CopyIcon className="h-4 w-4" />}
          {copied ? 'Copied!' : 'Copy code'}
        </button>
      </div>
      <pre className="p-4 text-sm overflow-x-auto text-gray-200">
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  );
};

// Claude-style collapsible tool display
const ToolCallDisplay = ({ toolCall, toolResult }: { toolCall: any, toolResult?: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatToolArguments = (args: string) => {
    try {
      const parsed = JSON.parse(args);
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      return args;
    }
  };

  const formatToolResult = (result: string) => {
    try {
      const parsed = JSON.parse(result);
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      return result;
    }
  };

  return (
    <div className="my-2 border border-gray-700/50 rounded-lg bg-gray-800/30">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-700/20 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-5 h-5 bg-gray-600/50 rounded">
            <WrenchScrewdriverIcon className="h-3 w-3 text-gray-300" />
          </div>
          <span className="text-sm font-medium text-gray-200">{toolCall.function.name}</span>
        </div>
        <ChevronDownIcon 
          className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
        />
      </button>
      
      {isExpanded && (
        <div className="border-t border-gray-700/50 p-3 space-y-3">
          <div>
            <h4 className="text-xs font-semibold text-gray-400 mb-2">Request</h4>
            <CodeBlock code={formatToolArguments(toolCall.function.arguments)} language="json" />
          </div>
          
          {toolResult && (
            <div>
              <h4 className="text-xs font-semibold text-gray-400 mb-2">Response</h4>
              <CodeBlock code={formatToolResult(toolResult)} language="json" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Claude-style in-chat consent message
const ConsentMessage: React.FC<{ 
  message: Message, 
  onConsent: (approved: boolean, alwaysAllow?: boolean) => void 
}> = ({ message, onConsent }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const toolCall = message.pendingToolCalls?.[0];
  
  if (!toolCall) return null;

  const formatToolArguments = (args: string) => {
    try {
      const parsed = JSON.parse(args);
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      return args;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    console.log('Key pressed:', e.key, 'Ctrl:', e.ctrlKey); // Debug log
    e.preventDefault(); // Prevent default behavior
    e.stopPropagation(); // Stop event bubbling
    
    if (e.key === 'Escape') {
      onConsent(false);
    } else if (e.key === 'Enter' && e.ctrlKey) {
      onConsent(true, true); // Always allow
    } else if (e.key === 'Enter' && !e.ctrlKey) {
      onConsent(true); // Allow once
    }
  };

  // Auto-focus the consent message when it appears and add global keyboard listener
  const consentRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (consentRef.current) {
      consentRef.current.focus();
    }

    // Global keyboard listener for consent shortcuts
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      console.log('Global key pressed:', e.key, 'Ctrl:', e.ctrlKey); // Debug log
      
      if (e.key === 'Escape') {
        e.preventDefault();
        onConsent(false);
      } else if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        onConsent(true, true); // Always allow
      } else if (e.key === 'Enter' && !e.ctrlKey) {
        e.preventDefault();
        onConsent(true); // Allow once
      }
    };

    // Add global listener
    document.addEventListener('keydown', handleGlobalKeyDown);
    
    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [onConsent]);

  return (
    <div 
      ref={consentRef}
      className="my-2 border border-gray-700/50 rounded-lg bg-gray-800/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50" 
      onKeyDown={handleKeyDown} 
      tabIndex={0}
    >
      <div className="p-3">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center justify-center w-6 h-6 bg-gray-600/50 rounded">
            <WrenchScrewdriverIcon className="h-4 w-4 text-gray-300" />
          </div>
          <div>
            <h3 className="font-medium text-gray-200">CortexOne wants to use {toolCall.function.name}</h3>
            <p className="text-sm text-gray-400">from MCP</p>
          </div>
        </div>
        
        {/* Collapsible request details */}
        <div className="mb-3">
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
              <CodeBlock code={formatToolArguments(toolCall.function.arguments)} language="json" />
            </div>
          )}
        </div>

        {/* Security warning */}
        <p className="text-xs text-gray-400 mb-3">
          CortexOne cannot guarantee the security or privacy practices of third-party integrations.
        </p>

        {/* Action buttons with keyboard shortcuts */}
        <div className="flex gap-2">
          <button
            onClick={() => onConsent(false)}
            className="flex-1 py-2 px-3 text-sm rounded-md bg-gray-700 hover:bg-gray-600 transition-colors text-gray-300 flex items-center justify-center gap-2"
          >
            Deny
            <span className="text-xs text-gray-500">Esc</span>
          </button>
          <button
            onClick={() => onConsent(true, true)}
            className="flex-1 py-2 px-3 text-sm rounded-md bg-gray-600 hover:bg-gray-500 transition-colors text-white flex items-center justify-center gap-2"
          >
            Always allow
            <span className="text-xs text-gray-400">Ctrl Enter</span>
          </button>
          <button
            onClick={() => onConsent(true)}
            className="flex-1 py-2 px-3 text-sm rounded-md bg-white text-black hover:bg-gray-200 transition-colors font-medium flex items-center justify-center gap-2"
          >
            Allow once
            <span className="text-xs text-gray-600">Enter</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const MessageComponent: React.FC<MessageProps & { 
  toolResults?: Message[],
  onConsent?: (approved: boolean, alwaysAllow?: boolean) => void
}> = ({ 
  message, 
  onContextMenu, 
  toolResults = [],
  onConsent
}) => {
  const { role, content, tool_calls } = message;
  const isModel = role === Role.MODEL;
  const isTool = role === Role.TOOL;
  const isConsent = role === Role.CONSENT;

  const renderContent = () => {
    const codeBlockRegex = /```([\s\S]*?)```/g;
    const segments = content.split(codeBlockRegex);

    return segments.map((segment, index) => {
      if (index % 2 === 1) { // It's a code block
        const codeContent = segment.split('\n').slice(1).join('\n');
        const language = segment.split('\n')[0];
        return <React.Fragment key={index}><CodeBlock code={codeContent} language={language} /></React.Fragment>;
      } else {
        return (
          <div key={index} className="whitespace-pre-wrap">
            {renderMarkdown(segment)}
          </div>
        );
      }
    });
  };

  const renderMarkdown = (text: string) => {
    // Split text into lines to preserve line breaks
    const lines = text.split('\n');
    
    return lines.map((line, lineIndex) => {
      // Process inline markdown
      const processedLine = processInlineMarkdown(line);
      
      return (
        <React.Fragment key={`line-${lineIndex}`}>
          {processedLine.map((part, partIndex) => 
            typeof part === 'string' ? (
              <span key={`text-${lineIndex}-${partIndex}`}>{part}</span>
            ) : (
              React.cloneElement(part, { key: `element-${lineIndex}-${partIndex}` })
            )
          )}
          {lineIndex < lines.length - 1 && <br key={`br-${lineIndex}`} />}
        </React.Fragment>
      );
    });
  };

  const processInlineMarkdown = (text: string) => {
    const parts: (string | React.ReactElement)[] = [];
    let keyCounter = 0;
    
    // Regex patterns for different markdown elements
    const patterns: Array<{
      regex: RegExp;
      component: (match: string, content: string, key: number) => React.ReactElement;
    }> = [
      { regex: /\*\*(.*?)\*\*/g, component: (match: string, content: string, key: number) => <strong key={`strong-${key}`}>{content}</strong> },
      { regex: /\*(.*?)\*/g, component: (match: string, content: string, key: number) => <em key={`em-${key}`}>{content}</em> },
      { regex: /`(.*?)`/g, component: (match: string, content: string, key: number) => <code key={`code-${key}`} className="bg-gray-800 px-1 py-0.5 rounded text-sm font-mono">{content}</code> },
      { regex: /~~(.*?)~~/g, component: (match: string, content: string, key: number) => <del key={`del-${key}`}>{content}</del> },
    ];
    
    // Find all matches and their positions
    const allMatches: Array<{
      match: RegExpExecArray;
      pattern: typeof patterns[0];
      start: number;
      end: number;
    }> = [];
    
    patterns.forEach(pattern => {
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      let match;
      while ((match = regex.exec(text)) !== null) {
        allMatches.push({
          match,
          pattern,
          start: match.index,
          end: match.index + match[0].length
        });
      }
    });
    
    // Sort matches by position
    allMatches.sort((a, b) => a.start - b.start);
    
    // Process matches without overlapping
    let lastEnd = 0;
    allMatches.forEach((matchInfo, index) => {
      const { match, pattern, start, end } = matchInfo;
      
      // Skip overlapping matches
      if (start < lastEnd) return;
      
      // Add text before this match
      if (start > lastEnd) {
        const textPart = text.slice(lastEnd, start);
        if (textPart) {
          parts.push(textPart);
        }
      }
      
      // Add the formatted element with unique key
      parts.push(pattern.component(match[0], match[1], keyCounter++));
      lastEnd = end;
    });
    
    // Add remaining text
    if (lastEnd < text.length) {
      const remainingText = text.slice(lastEnd);
      if (remainingText) {
        parts.push(remainingText);
      }
    }
    
    return parts.length > 0 ? parts : [text];
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onContextMenu(e, message);
  }

  // Don't render tool result messages separately - they'll be included in the tool call display
  if (isTool) {
    return null;
  }

  // Handle consent messages
  if (isConsent && onConsent) {
    return (
      <div className="flex gap-4 py-6 animate-fade-in justify-start">
        <div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-purple-600">
          <SparklesIcon className="h-5 w-5 text-white" />
        </div>
        <div className="flex-grow text-gray-200 w-full overflow-hidden max-w-4xl">
          <ConsentMessage message={message} onConsent={onConsent} />
        </div>
      </div>
    );
  }

  return (
    <div 
        className={`flex gap-4 py-6 animate-fade-in ${isModel ? 'justify-start' : 'justify-end'}`}
        onContextMenu={handleContextMenu}
    >
      {isModel && (
          <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-purple-600`}>
              <SparklesIcon className="h-5 w-5 text-white" />
          </div>
      )}
      <div className={`flex-grow text-gray-200 w-full overflow-hidden ${isModel ? 'max-w-4xl' : 'max-w-4xl flex justify-end'}`}>
         <div className={`p-4 rounded-xl ${isModel ? 'bg-transparent' : 'bg-[#101010]'}`}>
            {/* Display images for user messages */}
            {!isModel && message.images && message.images.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {message.images.map((image, index) => (
                  <img 
                    key={index}
                    src={image.url} 
                    alt={`Attachment ${index + 1}`}
                    className="max-w-xs max-h-64 rounded-lg border border-gray-600 object-contain"
                  />
                ))}
              </div>
            )}
            
            {/* Claude-style tool calls display */}
            {tool_calls && tool_calls.map(tc => {
              // Find the corresponding tool result
              const toolResult = toolResults.find(tr => tr.tool_call_id === tc.id);
              return (
                <React.Fragment key={tc.id}>
                  <ToolCallDisplay 
                    toolCall={tc} 
                    toolResult={toolResult?.content}
                  />
                </React.Fragment>
              );
            })}
            
            {renderContent()}
         </div>
      </div>
       {!isModel && (
          <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-gray-600`}>
              <UserIcon className="h-5 w-5 text-white" />
          </div>
      )}
    </div>
  );
};

export default MessageComponent;