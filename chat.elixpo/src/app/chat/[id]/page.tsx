"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useChat } from "@/lib/chat/use-chat";
import MessageBubble from "@/components/chat/MessageBubble";
import ChatInput from "@/components/chat/ChatInput";
import ChatSidebar from "@/components/chat/ChatSidebar";
import Navbar from "@/components/landing/Navbar";

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading, login } = useAuth();
  const { messages, isLoading, sessionId, sendMessage, stopStreaming, loadSession } = useChat(id === "new" ? undefined : id);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [model, setModel] = useState("lixsearch");

  useEffect(() => { if (id !== "new" && id) loadSession(id); }, [id, loadSession]);
  useEffect(() => { if (sessionId && id === "new") router.replace(`/chat/${sessionId}`, { scroll: false }); }, [sessionId, id, router]);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

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
      {/* Left sidebar */}
      <ChatSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Navbar */}
        <div className="flex-shrink-0">
          <Navbar />
          <div className="h-[52px]" /> {/* spacer for fixed navbar */}
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6" style={{ scrollbarWidth: "thin" }}>
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center pt-[20vh]">
                <img src="/images/logo.png" alt="" width={40} height={40} className="rounded-xl mb-4 opacity-30" />
                <h2 className="text-lg font-bold text-neutral-900 mb-1">Hey {user.displayName}!</h2>
                <p className="text-sm text-neutral-400">What would you like to know?</p>
              </div>
            )}
            {messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)}
          </div>
        </div>

        {/* Input */}
        <ChatInput onSend={sendMessage} onStop={stopStreaming} isLoading={isLoading} model={model} onModelChange={setModel} />
      </div>
    </div>
  );
}
