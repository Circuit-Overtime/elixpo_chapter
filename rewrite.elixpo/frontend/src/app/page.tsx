"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { TexEditor } from "@/components/TexEditor";
import { DomainSelect } from "@/components/DomainSelect";
import { ScoreBadge, ScoreBar } from "@/components/ScoreBadge";
import {
  detectText,
  startParaphrase,
  getActiveSessionId,
  setActiveSessionId,
  clearActiveSession,
  streamSession,
  getReportUrl,
  resumeSession,
  getGuestUsageToday,
  incrementGuestUsage,
} from "@/lib/api";
import type { DetectResult, SessionState, ParagraphProgress } from "@/lib/api";
import { getLimits } from "@/lib/plans";
import { useAuth } from "@/lib/AuthContext";

export default function Home() {
  const { loggedIn } = useAuth();
  const [texContent, setTexContent] = useState("");
  const [domain, setDomain] = useState("general");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const limits = getLimits(loggedIn, false);
  const wordCount = texContent.trim().split(/\s+/).filter(Boolean).length;

  // Detection results
  const [detectResult, setDetectResult] = useState<DetectResult | null>(null);
  const [paragraphScores, setParagraphScores] = useState<Array<{ startLine: number; score: number }>>([]);

  // Session state (paraphrase)
  const [sessionId, setSessionIdState] = useState<string | null>(null);
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // File input ref
  const fileRef = useRef<HTMLInputElement>(null);

  // Resume existing session on load
  useEffect(() => {
    const existing = getActiveSessionId();
    if (existing) {
      setSessionIdState(existing);
      startStreaming(existing);
    }
  }, []);

  const startStreaming = useCallback((sid: string) => {
    cleanupRef.current?.();
    cleanupRef.current = streamSession(
      sid,
      (data) => setSessionState(data),
      (data) => setSessionState(data),
      (err) => setError(err),
    );
  }, []);

  // Cleanup SSE on unmount
  useEffect(() => () => cleanupRef.current?.(), []);

  // Handle file upload — read .tex content into editor
  const handleFile = useCallback((file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setError("File too large. Max 10 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setTexContent(content);
      setDetectResult(null);
      setError(null);
    };
    reader.readAsText(file);
  }, []);

  // Check AI score
  const handleCheck = async () => {
    // Word limit enforcement
    if (wordCount > limits.maxWords) {
      setError(`Text exceeds ${limits.maxWords.toLocaleString()} word limit. ${loggedIn ? "Upgrade to Pro for 25,000 words." : "Sign in for 1,000 words."}`);
      return;
    }

    // Daily check limit
    if (!loggedIn) {
      const usage = getGuestUsageToday();
      if (usage >= limits.checksPerDay) {
        setError(`Daily limit reached (${limits.checksPerDay} check/day). Sign in for ${getLimits(true, false).checksPerDay}/day.`);
        return;
      }
    }

    setLoading(true);
    setError(null);
    setDetectResult(null);
    try {
      // Strip LaTeX commands for detection, but send raw for context
      const result = await detectText(texContent, true);
      setDetectResult(result);

      // Map segment scores to line numbers in the editor
      if (result.segments) {
        const scores: Array<{ startLine: number; score: number }> = [];
        let searchFrom = 0;
        for (const seg of result.segments) {
          // Find first line containing segment text
          const snippet = seg.text.slice(0, 40);
          const lineIdx = texContent.split("\n").findIndex(
            (line, idx) => idx >= searchFrom && line.includes(snippet.slice(0, 20))
          );
          if (lineIdx >= 0) {
            scores.push({ startLine: lineIdx, score: seg.score });
            searchFrom = lineIdx + 1;
          }
        }
        setParagraphScores(scores);
      }

      if (!isLoggedIn()) incrementGuestUsage();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Start paraphrase
  const handleRewrite = async () => {
    if (!loggedIn) {
      setError("Sign in to use the rewriter.");
      return;
    }
    if (limits.rewritesPerDay === 0) {
      setError("Paraphrasing is not available on the Guest plan. Sign in to unlock.");
      return;
    }
    if (wordCount > limits.maxWords) {
      setError(`Text exceeds ${limits.maxWords.toLocaleString()} word limit.`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await startParaphrase(texContent, domain);
      const sid = data.session_id || data.job_id;
      if (sid) {
        setSessionIdState(sid);
        setActiveSessionId(sid);
        startStreaming(sid);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Resume
  const handleResume = async () => {
    if (!sessionId) return;
    try {
      await resumeSession(sessionId);
      setError(null);
      startStreaming(sessionId);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // New session
  const handleNew = () => {
    cleanupRef.current?.();
    clearActiveSession();
    setSessionIdState(null);
    setSessionState(null);
    setTexContent("");
    setDetectResult(null);
    setParagraphScores([]);
    setError(null);
  };

  const hasContent = texContent.trim().length >= 50;
  const isRunning = sessionState?.status === "running" || sessionState?.status === "pending";
  const isCompleted = sessionState?.status === "completed";
  const isFailed = sessionState?.status === "failed" || sessionState?.status === "interrupted";

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="text-center space-y-2 pt-4">
        <h1 className="text-3xl font-bold font-display text-gradient">
          ReWrite
        </h1>
        <p className="text-text-muted text-sm">
          Paste or upload a .tex file to check AI content and rewrite it
        </p>
      </div>

      {/* Editor area */}
      <div className="space-y-3">
        {/* Toolbar row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => fileRef.current?.click()}
              className="btn-ghost px-3 py-1.5 rounded-lg text-xs"
            >
              Upload file
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".tex,.docx"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <DomainSelect value={domain} onChange={setDomain} />
          </div>

          <div className="flex items-center gap-3">
            {/* Word count / limit */}
            <span className={`text-[11px] font-mono ${wordCount > limits.maxWords ? "text-error" : "text-text-subtle"}`}>
              {wordCount.toLocaleString()}/{limits.maxWords.toLocaleString()} words
            </span>

            {/* Check button */}
            <button
              onClick={handleCheck}
              disabled={!hasContent || loading || isRunning || wordCount > limits.maxWords}
              className="btn-ghost px-4 py-1.5 rounded-lg text-xs font-semibold"
            >
              {loading ? "Analyzing..." : "Check AI %"}
            </button>
            {/* Rewrite button */}
            <button
              onClick={handleRewrite}
              disabled={!hasContent || loading || isRunning || wordCount > limits.maxWords || !loggedIn}
              className="btn-primary px-4 py-1.5 rounded-lg text-xs"
              title={!loggedIn ? "Sign in to rewrite" : undefined}
            >
              {loading ? "Starting..." : "Rewrite"}
            </button>
          </div>
        </div>

        {/* The editor */}
        <TexEditor
          value={texContent}
          onChange={setTexContent}
          readOnly={isRunning}
          paragraphScores={paragraphScores}
        />
      </div>

      {/* Error banner */}
      {error && (
        <div className="p-3 rounded-lg bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.25)]">
          <p className="text-error text-sm">{error}</p>
        </div>
      )}

      {/* Session progress (SSE-driven) */}
      {sessionId && sessionState && (
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold font-display text-text-primary">
                {isCompleted ? "Rewrite Complete" : isFailed ? "Session Failed" : "Rewriting..."}
              </h2>
              <p className="text-text-subtle text-[10px] font-mono mt-0.5">{sessionId}</p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
              isRunning ? "bg-lime-dim text-lime border-lime-border" :
              isCompleted ? "bg-[rgba(34,197,94,0.1)] text-success border-[rgba(34,197,94,0.3)]" :
              "bg-[rgba(239,68,68,0.1)] text-error border-[rgba(239,68,68,0.3)]"
            }`}>
              {sessionState.status}
            </span>
          </div>

          {/* Progress bar */}
          {isRunning && (
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-text-muted">Progress</span>
                <span className="text-lime font-mono">{sessionState.progress.toFixed(0)}%</span>
              </div>
              <div className="progress-track h-2">
                <div className="progress-fill" style={{ width: `${sessionState.progress}%` }} />
              </div>
            </div>
          )}

          {/* Per-paragraph list */}
          {sessionState.paragraphs.length > 0 && (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {sessionState.paragraphs.map((p) => (
                <ParaRow key={p.index} para={p} />
              ))}
            </div>
          )}

          {/* Completed scores */}
          {isCompleted && sessionState.result && (
            <div className="flex items-center gap-5 pt-2 border-t border-border-light">
              <div>
                <p className="text-text-subtle text-[10px] mb-1">Before</p>
                <ScoreBadge score={sessionState.result.original_score} size="md" />
              </div>
              <span className="text-text-subtle text-lg">→</span>
              <div>
                <p className="text-text-subtle text-[10px] mb-1">After</p>
                <ScoreBadge score={sessionState.result.final_score} size="md" />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {isFailed && (
              <button onClick={handleResume} className="btn-primary px-3 py-1.5 rounded-lg text-xs">Resume</button>
            )}
            {isCompleted && (
              <>
                <a href={getReportUrl(sessionId)} target="_blank" className="btn-primary px-3 py-1.5 rounded-lg text-xs inline-block">
                  Download Report
                </a>
                <button
                  onClick={() => {
                    if (sessionState.result?.rewritten) {
                      navigator.clipboard.writeText(sessionState.result.rewritten);
                    }
                  }}
                  className="btn-ghost px-3 py-1.5 rounded-lg text-xs"
                >
                  Copy Rewritten
                </button>
              </>
            )}
            {(isCompleted || isFailed) && (
              <button onClick={handleNew} className="btn-ghost px-3 py-1.5 rounded-lg text-xs">New</button>
            )}
          </div>
        </div>
      )}

      {/* Detection results (inline below editor) */}
      {detectResult && !sessionId && (
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold font-display text-text-primary">Detection Results</h2>
            <ScoreBadge score={detectResult.score} size="lg" />
          </div>
          <p className="text-text-muted text-xs">
            Verdict: <span className="font-semibold text-text-primary">{detectResult.verdict}</span>
          </p>
          <div className="space-y-1.5">
            {Object.entries(detectResult.features)
              .filter(([, v]) => v > 0)
              .sort(([, a], [, b]) => b - a)
              .map(([key, value]) => (
                <ScoreBar key={key} label={formatFeature(key)} score={value} />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ParaRow({ para }: { para: ParagraphProgress }) {
  const icon = para.status === "rewriting" ? "◎" : para.status === "done" ? "●" : para.status === "failed" ? "✕" : "○";
  const color = para.status === "rewriting" ? "text-lime animate-pulse" : para.status === "done" ? "text-success" : para.status === "failed" ? "text-error" : "text-text-subtle";

  return (
    <div className="flex items-center gap-2 text-xs py-1 px-2 rounded hover:bg-bg-glass">
      <span className={`w-3 text-center ${color}`}>{icon}</span>
      <span className="text-text-subtle w-6 font-mono">#{para.index + 1}</span>
      <span className={`font-mono w-10 text-right ${para.original_score >= 60 ? "text-error" : para.original_score >= 20 ? "text-warning" : "text-success"}`}>
        {para.original_score.toFixed(0)}%
      </span>
      {para.current_score !== null && (
        <>
          <span className="text-text-subtle">→</span>
          <span className={`font-mono w-10 text-right ${para.current_score >= 60 ? "text-error" : para.current_score >= 20 ? "text-warning" : "text-success"}`}>
            {para.current_score.toFixed(0)}%
          </span>
        </>
      )}
    </div>
  );
}

function formatFeature(key: string): string {
  const labels: Record<string, string> = {
    burstiness: "Burstiness", vocabulary_markers: "AI Vocabulary",
    paragraph_structure: "Paragraph Uniformity", n_gram_uniformity: "N-gram Uniformity",
    repetition: "Repetition", punctuation_diversity: "Punctuation Variety",
    perplexity: "Perplexity", coherence: "Coherence", readability: "Readability",
    entropy: "Entropy", type_token_ratio: "Lexical Diversity",
    sentence_starters: "Sentence Starters", llm_judge: "LLM Judge",
  };
  return labels[key] || key;
}
