"use client";

import { useState, useEffect } from "react";
import { getActiveSessionId, setActiveSessionId } from "@/lib/api";
import { SessionProgress } from "@/components/SessionProgress";

export default function SessionPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [manualId, setManualId] = useState("");

  useEffect(() => {
    const existing = getActiveSessionId();
    if (existing) setSessionId(existing);
  }, []);

  const handleLoadSession = () => {
    const id = manualId.trim();
    if (id) {
      setSessionId(id);
      setActiveSessionId(id);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-[family-name:var(--font-display)] text-text-primary">
        Session
      </h1>

      {/* Manual session ID input */}
      {!sessionId && (
        <div className="glass-card p-6 space-y-4">
          <p className="text-text-secondary text-sm">
            Enter a session ID to resume a previous job, or start a new one from the{" "}
            <a href="/" className="text-lime underline">home page</a>.
          </p>
          <div className="flex gap-3">
            <input
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              placeholder="Paste session ID..."
              className="flex-1 px-4 py-2 rounded-xl bg-bg-glass border border-border-light text-text-primary placeholder:text-text-subtle focus:border-lime-border focus:outline-none text-sm font-mono"
            />
            <button
              onClick={handleLoadSession}
              disabled={!manualId.trim()}
              className="px-5 py-2 rounded-xl bg-lime-dim text-lime border border-lime-border font-semibold hover:bg-[rgba(163,230,53,0.25)] disabled:opacity-40 transition-all text-sm"
            >
              Load
            </button>
          </div>
        </div>
      )}

      {/* Active session */}
      {sessionId && <SessionProgress sessionId={sessionId} />}
    </div>
  );
}
