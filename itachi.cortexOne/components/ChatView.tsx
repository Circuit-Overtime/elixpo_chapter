import React, { useEffect, useRef } from 'react';
import { Session, Role, Message } from '../types';
import MessageComponent from './Message';
import MessageInput from './MessageInput';
import { SparklesIcon, GearIcon, SidebarOpenIcon, SidebarCloseIcon, CortexLogomarkIcon } from './icons';

interface MainContentViewProps {
  session: Session | null;
  onSendMessage: (message: string, sessionId?: string, options?: { extendedThinking?: boolean }) => void;
  isLoading: boolean;
  onContextMenu: (event: React.MouseEvent, message: Message) => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  input: string;
  setInput: (value: string) => void;
  onToggleSettings: () => void;
  hasProviders: boolean;
  onStopGeneration?: () => void;
  messageQueue?: string[];
  onConsent?: (approved: boolean, alwaysAllow?: boolean) => void;
  availableTools?: import('../types').Tool[];
  enabledToolNames?: string[];
  onToggleTool?: (toolName: string) => void;
}

const WelcomeScreen: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-gray-300 w-full max-w-4xl mx-auto p-8">
    <div className="w-full flex-grow flex flex-col justify-center items-center">
      <SparklesIcon className="h-24 w-24 text-gray-600/50 mb-8" />
      <h1 className="text-4xl font-bold text-gray-400">How can I help you today?</h1>
    </div>
  </div>
);

const OnboardingScreen: React.FC<{ onToggleSettings: () => void }> = ({ onToggleSettings }) => (
  <div className="flex flex-col items-center justify-center h-full text-gray-300 w-full max-w-4xl mx-auto p-8 text-center">
    <div className="w-full flex-grow flex flex-col justify-center items-center">
      <CortexLogomarkIcon className="h-16 w-16 text-gray-700 mb-8" />
      <h1 className="text-4xl font-bold text-gray-400 mb-4">Welcome to CortexOne</h1>
      <p className="text-gray-500 mb-8">To get started, please configure a provider and select a main model in the settings.</p>
      <button onClick={onToggleSettings} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2 px-6 rounded-lg transition-colors">
        <GearIcon className="h-5 w-5" />
        Go to Settings
      </button>
    </div>
  </div>
);


const MainContentView: React.FC<MainContentViewProps> = ({
  session,
  onSendMessage,
  isLoading,
  onContextMenu,
  isSidebarOpen,
  onToggleSidebar,
  input,
  setInput,
  onToggleSettings,
  hasProviders,
  onStopGeneration,
  messageQueue = [],
  onConsent,
  availableTools = [],
  enabledToolNames = [],
  onToggleTool,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [session?.messages, isLoading]);

  const handleSendMessage = (message: string, options?: { extendedThinking?: boolean }) => {
    onSendMessage(message, undefined, options);
  }

  const isNewChat = !session || session.messages.length === 0;

  const renderContent = () => {
    if (!hasProviders) {
      return <OnboardingScreen onToggleSettings={onToggleSettings} />;
    }
    if (isNewChat) {
      return <WelcomeScreen />;
    }
    return (
      <div className="max-w-7xl mx-auto px-4 h-full">
        {session && session.messages.map((msg, index) => {
          // Skip tool result messages as they'll be included in the tool call display
          if (msg.role === Role.TOOL) {
            return null;
          }

          // For model messages with tool calls, find the subsequent tool results
          let toolResults: Message[] = [];
          if (msg.role === Role.MODEL && msg.tool_calls) {
            // Look for tool results that come after this message
            for (let i = index + 1; i < session.messages.length; i++) {
              const nextMsg = session.messages[i];
              if (nextMsg.role === Role.TOOL) {
                toolResults.push(nextMsg);
              } else {
                break; // Stop when we hit a non-tool message
              }
            }
          }

          return (
            <MessageComponent
              key={msg.id}
              message={msg}
              onContextMenu={onContextMenu}
              toolResults={toolResults}
              onConsent={onConsent}
            />
          );
        })}
        {isLoading && session && session.messages.length > 0 && session.messages[session.messages.length - 1].role !== Role.MODEL && (
          <div className="flex gap-4 py-6 animate-fade-in">
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center">
              <SparklesIcon className="h-5 w-5 text-white" />
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse-caret"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-transparent overflow-hidden relative">
      <header className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-between">
        <button onClick={onToggleSidebar} className="p-2 rounded-full hover:bg-gray-700/50">
          {isSidebarOpen ? <SidebarCloseIcon className="h-5 w-5 text-gray-300" /> : <SidebarOpenIcon className="h-5 w-5 text-gray-300" />}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto pt-20 pb-4">
        {renderContent()}
      </div>

      {hasProviders && (
        <div className="pb-8 pt-4 bg-gradient-to-t from-black to-transparent">
          <div className={isNewChat ? 'absolute bottom-24 left-1/2 -translate-x-1/2 w-full' : 'w-full'}>
            <MessageInput
              input={input}
              setInput={setInput}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              onStopGeneration={onStopGeneration}
              availableTools={availableTools}
              enabledTools={enabledToolNames}
              onToggleTool={onToggleTool}
            />
            {messageQueue.length > 0 && (
              <div className="mt-2 text-center">
                <div className="inline-flex items-center gap-2 bg-gray-800/50 px-3 py-1 rounded-full text-xs text-gray-400">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                  {messageQueue.length} message{messageQueue.length > 1 ? 's' : ''} queued
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MainContentView;