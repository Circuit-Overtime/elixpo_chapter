"use client";

import { useEffect, useState, useCallback } from "react";
import { pollSession, resumeSession, getReportUrl, clearActiveSession } from "@/lib/api";
import type { SessionState, ParagraphProgress } from "@/lib/api";
import { ScoreBadge, scoreColor } from "./ScoreBadge";

interface SessionProgressProps {
  sessionId: string;
  onComplete?: (result: SessionState["result"]) => void;
}

export function SessionProgress({ sessionId, onComplete }: SessionProgressProps) {
  const [state, setState] = useState<SessionState | null>(null);
  const [polling, setPolling] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const poll = useCallback(async () => {
    try {
      const data = await pollSession(sessionId);
      setState(data);
      setError(null);

      if (data.status === "completed") {
        setPolling(false);
        onComplete?.(data.result);
      } else if (data.status === "failed") {
        setPolling(false);
        setError(data.error || "Job failed");
      } else if (data.status === "interrupted") {
        setPolling(false);
        setError(data.message || "Job interrupted — click Resume to continue");
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, [sessionId, onComplete]);

  useEffect(() => {
    if (!polling) return;
    poll();
    const interval = setInterval(poll, 2500);
    return () => clearInterval(interval);
  }, [polling, poll]);

  const handleResume = async () => {
    try {
      await resumeSession(sessionId);
      setError(null);
      setPolling(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleNewSession = () => {
    clearActiveSession();
    window.location.reload();
  };

  if (!state) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full bg-lime animate-pulse" />
          <span className="text-text-secondary">Connecting to session...</span>
        </div>
        <p className="text-text-subtle text-xs mt-2 font-mono">ID: {sessionId}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary font-display">
              {state.status === "completed" ? "Rewrite Complete" :
               state.status === "failed" ? "Rewrite Failed" :
               state.status === "interrupted" ? "Session Interrupted" :
               "Rewriting..."}
            </h2>
            <p className="text-text-subtle text-xs font-mono mt-1">Session: {sessionId}</p>
          </div>
          <StatusBadge status={state.status} />
        </div>

        {/* Progress bar */}
        {(state.status === "running" || state.status === "pending") && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Progress</span>
              <span className="text-lime font-mono">{state.progress.toFixed(0)}%</span>
            </div>
            <div className="progress-track h-3">
              <div className="progress-fill" style={{ width: `${state.progress}%` }} />
            </div>
          </div>
        )}

        {/* Scores for completed */}
        {state.status === "completed" && state.result && (
          <div className="flex items-center gap-6 mt-2">
            <div>
              <p className="text-text-subtle text-xs mb-1">Before</p>
              <ScoreBadge score={state.result.original_score} size="md" />
            </div>
            <span className="text-text-subtle text-2xl">→</span>
            <div>
              <p className="text-text-subtle text-xs mb-1">After</p>
              <ScoreBadge score={state.result.final_score} size="md" />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-3 p-3 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)]">
            <p className="text-error text-sm">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-4">
          {(state.status === "failed" || state.status === "interrupted") && (
            <button onClick={handleResume} className="px-4 py-2 rounded-lg bg-lime-dim text-lime border border-lime-border hover:bg-[rgba(163,230,53,0.25)] transition-all text-sm font-semibold">
              Resume
            </button>
          )}
          {state.status === "completed" && (
            <>
              <a
                href={getReportUrl(sessionId)}
                target="_blank"
                className="px-4 py-2 rounded-lg bg-lime-dim text-lime border border-lime-border hover:bg-[rgba(163,230,53,0.25)] transition-all text-sm font-semibold"
              >
                Download Report
              </a>
              <button onClick={handleNewSession} className="px-4 py-2 rounded-lg bg-bg-glass text-text-secondary border border-border-light hover:bg-bg-glass-hover transition-all text-sm">
                New Session
              </button>
            </>
          )}
        </div>
      </div>

      {/* Per-paragraph progress */}
      {state.paragraphs.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-text-secondary mb-3 font-display">
            Paragraphs ({state.paragraphs.filter(p => p.status === "done").length}/{state.paragraphs.length})
          </h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {state.paragraphs.map((p) => (
              <ParagraphRow key={p.index} para={p} />
            ))}
          </div>
        </div>
      )}

      {/* Rewritten text */}
      {state.status === "completed" && state.result?.rewritten && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text-secondary font-display">Rewritten Text</h3>
            <button
              onClick={() => navigator.clipboard.writeText(state.result!.rewritten)}
              className="text-xs px-3 py-1 rounded bg-bg-glass text-text-muted border border-border-light hover:bg-bg-glass-hover transition-all"
            >
              Copy
            </button>
          </div>
          <div className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
            {state.result.rewritten}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-[rgba(156,163,175,0.1)] text-[#d1d5db] border-[rgba(156,163,175,0.2)]",
    running: "bg-lime-dim text-lime border-lime-border",
    completed: "bg-[rgba(34,197,94,0.1)] text-success border-[rgba(34,197,94,0.3)]",
    failed: "bg-[rgba(239,68,68,0.1)] text-error border-[rgba(239,68,68,0.3)]",
    interrupted: "bg-[rgba(251,191,36,0.1)] text-warning border-[rgba(251,191,36,0.3)]",
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status] || styles.pending}`}>
      {status}
    </span>
  );
}

function ParagraphRow({ para }: { para: ParagraphProgress }) {
  const statusIcon: Record<string, string> = {
    pending: "○",
    rewriting: "◎",
    done: "●",
    failed: "✕",
  };

  return (
    <div className="flex items-center gap-3 text-sm py-1.5 px-2 rounded-lg hover:bg-bg-glass transition-all">
      <span className={`w-4 text-center ${
        para.status === "rewriting" ? "text-lime animate-pulse" :
        para.status === "done" ? "text-success" :
        para.status === "failed" ? "text-error" :
        "text-text-subtle"
      }`}>
        {statusIcon[para.status] || "○"}
      </span>
      <span className="text-text-subtle w-8 font-mono text-xs">#{para.index + 1}</span>
      <span className={`font-mono w-14 text-right ${scoreColor(para.original_score)}`}>
        {para.original_score.toFixed(0)}%
      </span>
      {para.current_score !== null && (
        <>
          <span className="text-text-subtle">→</span>
          <span className={`font-mono w-14 text-right ${scoreColor(para.current_score)}`}>
            {para.current_score.toFixed(0)}%
          </span>
        </>
      )}
    </div>
  );
}
