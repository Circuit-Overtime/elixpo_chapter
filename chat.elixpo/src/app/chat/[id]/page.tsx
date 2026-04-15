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
  const bottomRef = useRef<HTMLDivElement>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [model, setModel] = useState("lixsearch");
  const [sharecopied, setShareCopied] = useState(false);
  // Replace /chat/new with the real session ID immediately
  useEffect(() => {
    if (id === "new" && sessionId) {
      router.replace(`/chat/${sessionId}`, { scroll: false });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Smooth auto-scroll that follows streaming
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-focus the input when response finishes
  const prevLoading = useRef(false);
  useEffect(() => {
    if (prevLoading.current && !isLoading) {
      // Response just finished — focus the textarea
      const textarea = document.querySelector<HTMLTextAreaElement>("textarea");
      textarea?.focus();
    }
    prevLoading.current = isLoading;
  }, [isLoading]);

  const handleShare = () => {
    const url = `${window.location.origin}/chat/${sessionId}`;
    navigator.clipboard.writeText(url);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (!sessionId || !confirm("Are you sure you want to delete this chat permanently?")) return;
    try {
      await fetch(`/api/chat?session_id=${sessionId}`, { method: "DELETE" });
      router.replace("/chat/new");
    } catch (e) {
      console.error("Failed to delete chat", e);
    }
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
    <div className="flex h-screen bg-[#fafafa]">
      <ChatSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-5 py-3 bg-white/80 backdrop-blur-sm border-b border-neutral-100 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/images/logo.png" alt="" width={22} height={22} className="rounded-md flex-shrink-0 opacity-40" />
            <input
              type="text"
              value={chatTitle || ""}
              onChange={(e) => setChatTitle(e.target.value)}
              placeholder="New chat"
              className="text-sm font-semibold text-neutral-700 bg-transparent outline-none border-none truncate min-w-0 hover:bg-neutral-50 focus:bg-neutral-50 rounded px-1.5 py-0.5 -ml-1.5 transition-colors"
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
            {sessionId && (
              <button
                onClick={handleDelete}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                title="Delete Chat"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              </button>
            )}
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-8" style={{ scrollbarWidth: "thin" }}>
          {isLoadingHistory ? (
            <SkeletonMessages />
          ) : (
            <div className="max-w-3xl mx-auto space-y-7">
              {messages.length === 0 && !isLoadingHistory && (
                <div className="flex flex-col items-center justify-center pt-[22vh]">
                  <img src="/images/logo.png" alt="" width={44} height={44} className="rounded-xl mb-5 opacity-25" />
                  <h2 className="text-xl font-bold text-neutral-800 mb-1.5">Hey {user.displayName}!</h2>
                  <p className="text-sm text-neutral-400">What would you like to know?</p>
                </div>
              )}
              {messages.map((msg, i) => {
                const isLastAssistant = msg.role === "assistant" && !msg.isStreaming && i === messages.length - 1;
                return (
                  <div key={msg.id} className={msg.role === "user" ? "animate-msg-user" : "animate-msg-assistant"}>
                    <MessageBubble message={msg} onRetry={isLastAssistant ? retryLast : undefined} />
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <ChatInput onSend={sendMessage} onStop={stopStreaming} isLoading={isLoading} model={model} onModelChange={setModel} />
      </div>
    </div>
  );
}
