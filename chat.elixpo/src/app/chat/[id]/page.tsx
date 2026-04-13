"use client";

import { useParams } from "next/navigation";
import Image from "next/image";

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-neutral-100">
        <div className="flex items-center gap-2.5">
          <Image src="/images/logo.png" alt="Elixpo" width={32} height={32} className="rounded-md" />
          <span className="font-[family-name:var(--font-parkinsans)] font-bold text-neutral-900">Elixpo Chat</span>
        </div>
        <span className="text-xs text-neutral-400 font-mono">{id === "new" ? "New session" : id}</span>
      </header>

      {/* Chat area placeholder */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <Image src="/images/logo.png" alt="Elixpo" width={64} height={64} className="rounded-2xl mx-auto mb-6 opacity-60" />
          <h2 className="font-[family-name:var(--font-parkinsans)] text-2xl font-bold text-neutral-900 mb-2">
            Chat is coming soon
          </h2>
          <p className="text-neutral-500 text-sm leading-relaxed">
            AI conversations with artifacts, multiple models, and rich formatting. This section is under development.
          </p>
        </div>
      </div>

      {/* Input bar */}
      <div className="px-6 pb-6">
        <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-neutral-50 border border-neutral-200">
          <input
            type="text"
            placeholder="Message Elixpo..."
            className="flex-1 bg-transparent outline-none text-sm text-neutral-900 placeholder:text-neutral-400"
            disabled
          />
          <div className="w-8 h-8 rounded-lg bg-neutral-300 flex items-center justify-center cursor-not-allowed">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
