"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useChat } from "@/lib/chat/use-chat";
import MessageBubble from "@/components/chat/MessageBubble";
import ChatInput from "@/components/chat/ChatInput";
import ChatSidebar from "@/components/chat/ChatSidebar";
import Navbar from "@/components/landing/Navbar";

function SkeletonMessages() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className={`flex ${i % 2 === 1 ? "justify-end" : "justify-start"}`}>
          <div className={`rounded-2xl ${i % 2 === 1 ? "bg-neutral-100 w-48" : "bg-neutral-50 w-80"} h-12`} />
        </div>
      ))}
    </div>
  );
}

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading, login } = useAuth();
  const { messages, isLoading, isLoadingHistory, sessionId, chatTitle, setChatTitle, sendMessage, stopStreaming, loadSession, retryLast } = useChat(id === "new" ? undefined : id);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [model, setModel] = useState("lixsearch");
  const [sharecopied, setShareCopied] = useState(false);
  // Replace /chat/new with the real session ID immediately
  useEffect(() => {
    if (id === "new" && sessionId) {
      router.replace(`/chat/${sessionId}`, { scroll: false });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

  const handleShare = () => {
    const url = `${window.location.origin}/chat/${sessionId}`;
    navigator.clipboard.writeText(url);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  if (authLoading) {
    return <div className="flex items-center justify-center h-screen bg-white"><div className="w-8 h-8 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" /></div>;
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-white px-6">
        <img src="/images/logo.png" alt="Elixpo" width={64} height={64} className="rounded-2xl mb-6 opacity-60" />
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">Sign in to chat</h2>
        <p className="text-neutral-500 text-sm leading-relaxed text-center max-w-sm mb-6">Connect with your Elixpo account to start AI conversations.</p>
        <button onClick={login} className="px-8 py-3 rounded-full text-sm font-semibold bg-neutral-900 text-white hover:bg-neutral-800 transition-colors cursor-pointer">Sign in with Elixpo</button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white">
      <ChatSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header with chat title + share */}
        <header className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-100 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/images/logo.png" alt="" width={24} height={24} className="rounded-md flex-shrink-0 opacity-50" />
            <input
              type="text"
              value={chatTitle || ""}
              onChange={(e) => setChatTitle(e.target.value)}
              placeholder="New chat"
              className="text-sm font-medium text-neutral-700 bg-transparent outline-none border-none truncate min-w-0 hover:bg-neutral-50 focus:bg-neutral-50 rounded px-1.5 py-0.5 -ml-1.5 transition-colors"
            />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {sessionId && (
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-500 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                {sharecopied ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
                    <span className="text-green-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                    <span>Share</span>
                  </>
                )}
              </button>
            )}
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6" style={{ scrollbarWidth: "thin" }}>
          {isLoadingHistory ? (
            <SkeletonMessages />
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.length === 0 && !isLoadingHistory && (
                <div className="flex flex-col items-center justify-center pt-[20vh]">
                  <img src="/images/logo.png" alt="" width={40} height={40} className="rounded-xl mb-4 opacity-30" />
                  <h2 className="text-lg font-bold text-neutral-900 mb-1">Hey {user.displayName}!</h2>
                  <p className="text-sm text-neutral-400">What would you like to know?</p>
                </div>
              )}
              {messages.map((msg, i) => {
                const isLastAssistant = msg.role === "assistant" && !msg.isStreaming && i === messages.length - 1;
                return <MessageBubble key={msg.id} message={msg} onRetry={isLastAssistant ? retryLast : undefined} />;
              })}
            </div>
          )}
        </div>

        <ChatInput onSend={sendMessage} onStop={stopStreaming} isLoading={isLoading} model={model} onModelChange={setModel} />
      </div>
    </div>
  );
}
