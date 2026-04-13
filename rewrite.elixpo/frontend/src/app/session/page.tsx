"use client";

import { useState, useEffect } from "react";
import { getActiveSessionId, setActiveSessionId } from "@/lib/api";
import { SessionProgress } from "@/components/SessionProgress";
import { startLogin } from "@/lib/auth";
import { useAuth } from "@/lib/AuthContext";

export default function SessionPage() {
  const { loggedIn } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [manualId, setManualId] = useState("");

  useEffect(() => {
    const existing = getActiveSessionId();
    if (existing) setSessionId(existing);
  }, []);

  const handleLoad = () => {
    const id = manualId.trim();
    if (id) {
      setSessionId(id);
      setActiveSessionId(id);
    }
  };

  if (!loggedIn) {
    return (
      <div className="text-center py-16 space-y-4">
        <h1 className="text-2xl font-bold font-display text-text-primary">Session History</h1>
        <p className="text-text-muted text-sm">Sign in to view your session history and resume jobs.</p>
        <button onClick={startLogin} className="btn-primary px-5 py-2 rounded-lg text-sm">Sign in</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-display text-text-primary">Session</h1>

      {!sessionId && (
        <div className="glass-card p-5 space-y-3">
          <p className="text-text-secondary text-sm">
            Enter a session ID to resume, or start a new one from the <a href="/" className="text-lime underline">editor</a>.
          </p>
          <div className="flex gap-2">
            <input
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              placeholder="Paste session ID..."
              className="flex-1 px-3 py-2 rounded-lg bg-bg-glass border border-border-light text-text-primary placeholder:text-text-subtle focus:border-lime-border focus:outline-none text-sm font-mono"
            />
            <button onClick={handleLoad} disabled={!manualId.trim()} className="btn-primary px-4 py-2 rounded-lg text-sm">
              Load
            </button>
          </div>
        </div>
      )}

      {sessionId && <SessionProgress sessionId={sessionId} />}
    </div>
  );
}
