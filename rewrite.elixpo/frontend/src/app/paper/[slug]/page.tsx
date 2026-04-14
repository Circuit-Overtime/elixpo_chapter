"use client";

import { useState, useEffect, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { TexEditor } from "@/components/TexEditor";
import { DomainSelect } from "@/components/DomainSelect";
import { ScoreBadge, ScoreBar } from "@/components/ScoreBadge";
import { useAuth } from "@/lib/AuthContext";
import { getLimits } from "@/lib/plans";
import { getPaperSession, updatePaperSession } from "@/lib/paperSession";
import {
  streamDetect,
  startParaphrase,
  setActiveSessionId,
  clearActiveSession,
  streamSession,
  getReportUrl,
  resumeSession,
  getGuestUsageToday,
  incrementGuestUsage,
} from "@/lib/api";
import type { DetectResult, DetectParagraphEvent, SessionState, ParagraphProgress } from "@/lib/api";

export default function PaperPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const { loggedIn } = useAuth();
  const limits = getLimits(loggedIn, false);

  const [texContent, setTexContent] = useState("");
  const [filename, setFilename] = useState<string | null>(null);
  const [domain, setDomain] = useState("general");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Detection
  const [detectResult, setDetectResult] = useState<DetectResult | null>(null);
  const [detectProgress, setDetectProgress] = useState<number>(0);
  const [detectTotal, setDetectTotal] = useState<number>(0);
  const [liveSegments, setLiveSegments] = useState<DetectParagraphEvent[]>([]);
  const [paragraphScores, setParagraphScores] = useState<Array<{ startLine: number; score: number }>>([]);
  const detectCancelRef = useRef<(() => void) | null>(null);

  // Sidebar
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Session (paraphrase)
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const wordCount = texContent.trim().split(/\s+/).filter(Boolean).length;

  // Load paper session from sessionStorage
  useEffect(() => {
    const session = getPaperSession(slug);
    if (!session) {
      router.replace("/");
      return;
    }
    setTexContent(session.tex);
    setFilename(session.filename);
    setDomain(session.domain);
    setMounted(true);
  }, [slug, router]);

  // Save content back to session on changes
  useEffect(() => {
    if (mounted) updatePaperSession(slug, { tex: texContent, domain });
  }, [texContent, domain, slug, mounted]);

  // Cleanup on unmount
  useEffect(() => () => {
    cleanupRef.current?.();
    detectCancelRef.current?.();
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

  // --- Actions ---

  const handleCheck = () => {
    if (wordCount > limits.maxWords) {
      setError(`Text exceeds ${limits.maxWords.toLocaleString()} word limit.`);
      return;
    }
    if (!loggedIn) {
      const usage = getGuestUsageToday();
      if (usage >= limits.checksPerDay) {
        setError(`Daily limit reached (${limits.checksPerDay} check/day). Sign in for more.`);
        return;
      }
    }

    // Cancel any previous detection stream
    detectCancelRef.current?.();

    setLoading(true);
    setError(null);
    setDetectResult(null);
    setLiveSegments([]);
    setDetectProgress(0);
    setDetectTotal(0);
    setParagraphScores([]);
    setSidebarOpen(true);

    const texLines = texContent.split("\n");

    detectCancelRef.current = streamDetect(texContent, {
      onInit: (total) => {
        setDetectTotal(total);
      },
      onParagraph: (data) => {
        setDetectProgress(data.progress);
        setLiveSegments((prev) => [...prev, data]);

        // Map this paragraph's score to a line number in the editor
        const snippet = data.text_preview.slice(0, 30);
        const lineIdx = texLines.findIndex((line) => line.includes(snippet.slice(0, 20)));
        if (lineIdx >= 0) {
          setParagraphScores((prev) => [...prev, { startLine: lineIdx, score: data.score }]);
        }
      },
      onDone: (data) => {
        setDetectResult({
          score: data.overall_score,
          verdict: data.overall_verdict,
          features: data.features,
          segments: data.segments.map((s) => ({
            index: s.index,
            text: s.text_preview,
            score: s.score,
            verdict: s.verdict,
          })),
        });
        setLoading(false);
        if (!loggedIn) incrementGuestUsage();
      },
      onError: (err) => {
        setError(err);
        setLoading(false);
      },
    });
  };

  const handleRewrite = async () => {
    if (!loggedIn) { setError("Sign in to use the rewriter."); return; }
    if (wordCount > limits.maxWords) { setError(`Text exceeds word limit.`); return; }

    setLoading(true);
    setError(null);
    try {
      const data = await startParaphrase(texContent, domain);
      const sid = data.session_id || data.job_id;
      if (sid) {
        setSessionId(sid);
        setActiveSessionId(sid);
        startStreaming(sid);
        setSidebarOpen(true);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async () => {
    if (!sessionId) return;
    try {
      await resumeSession(sessionId);
      setError(null);
      startStreaming(sessionId);
    } catch (err: any) { setError(err.message); }
  };

  const handleNewSession = () => {
    cleanupRef.current?.();
    detectCancelRef.current?.();
    clearActiveSession();
    setSessionId(null);
    setSessionState(null);
    setDetectResult(null);
    setLiveSegments([]);
    setDetectProgress(0);
    setDetectTotal(0);
    setParagraphScores([]);
    setError(null);
  };

  const isRunning = sessionState?.status === "running" || sessionState?.status === "pending";
  const isCompleted = sessionState?.status === "completed";
  const isFailed = sessionState?.status === "failed" || sessionState?.status === "interrupted";

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-5 h-5 rounded-full border-2 border-lime border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 top-[49px] flex bg-bg-deep">
      {/* Main editor area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-border-light bg-editor-gutter">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="text-text-muted hover:text-text-primary transition-colors text-xs"
              title="Back to home"
            >
              ← Back
            </button>
            <span className="text-border-light">|</span>
            {filename && (
              <span className="text-text-subtle text-xs font-mono truncate max-w-[200px]">{filename}</span>
            )}
            <DomainSelect value={domain} onChange={setDomain} />
          </div>

          <div className="flex items-center gap-3">
            {/* Word count */}
            <span className={`text-[11px] font-mono ${wordCount > limits.maxWords ? "text-error" : "text-text-subtle"}`}>
              {wordCount.toLocaleString()}/{limits.maxWords.toLocaleString()}
            </span>

            <button
              onClick={handleCheck}
              disabled={loading || isRunning || wordCount < 10}
              className="btn-ghost px-3 py-1 rounded-lg text-xs font-semibold"
            >
              {loading && !sessionId ? "Checking..." : "Check AI %"}
            </button>
            <button
              onClick={handleRewrite}
              disabled={loading || isRunning || wordCount < 10 || !loggedIn}
              className="btn-primary px-3 py-1 rounded-lg text-xs"
              title={!loggedIn ? "Sign in to rewrite" : undefined}
            >
              {loading && sessionId ? "Starting..." : "Rewrite"}
            </button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="btn-ghost px-2 py-1 rounded-lg text-xs"
              title="Toggle results panel"
            >
              {sidebarOpen ? "▶" : "◀"}
            </button>
          </div>
        </div>

        {/* Editor — fills remaining space */}
        <div className="flex-1 overflow-auto">
          <TexEditor
            value={texContent}
            onChange={setTexContent}
            readOnly={isRunning}
            paragraphScores={paragraphScores}
          />
        </div>
      </div>

      {/* Results sidebar */}
      {sidebarOpen && (
        <div className="w-80 border-l border-border-light bg-[rgba(16,24,12,0.5)] flex flex-col overflow-y-auto shrink-0">
          <div className="p-4 space-y-4">
            {/* Error */}
            {error && (
              <div className="p-2.5 rounded-lg bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.25)]">
                <p className="text-error text-xs">{error}</p>
              </div>
            )}

            {/* Detection: live streaming progress */}
            {loading && !sessionId && liveSegments.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-text-secondary font-display">Analyzing...</h3>
                  <span className="text-lime text-xs font-mono">{detectProgress.toFixed(0)}%</span>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-text-muted">Paragraphs</span>
                    <span className="text-text-secondary font-mono">{liveSegments.length}/{detectTotal}</span>
                  </div>
                  <div className="progress-track h-1.5">
                    <div className="progress-fill" style={{ width: `${detectProgress}%` }} />
                  </div>
                </div>
                <div className="space-y-1 max-h-72 overflow-y-auto">
                  {liveSegments.map((seg) => (
                    <div key={seg.index} className="flex items-center gap-2 text-[11px] py-1 px-1.5 rounded bg-bg-glass animate-in">
                      <ScoreBadge score={seg.score} size="sm" />
                      <p className="text-text-muted leading-snug line-clamp-1 flex-1">{seg.text_preview}</p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Detection: completed results */}
            {detectResult && !sessionId && !loading && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-text-secondary font-display">Detection</h3>
                  <ScoreBadge score={detectResult.score} size="md" />
                </div>
                <p className="text-text-muted text-[11px]">
                  {detectResult.verdict}
                </p>
                <div className="space-y-1.5">
                  {Object.entries(detectResult.features)
                    .filter(([, v]) => v > 0)
                    .sort(([, a], [, b]) => b - a)
                    .map(([key, value]) => (
                      <ScoreBar key={key} label={formatFeature(key)} score={value} />
                    ))}
                </div>

                {detectResult.segments.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-border-light">
                    <h4 className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Paragraphs</h4>
                    {detectResult.segments.map((seg) => (
                      <div key={seg.index} className="flex items-start gap-2 text-xs py-1">
                        <ScoreBadge score={seg.score} size="sm" />
                        <p className="text-text-muted text-[11px] leading-snug line-clamp-2 flex-1">{seg.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Paraphrase progress */}
            {sessionId && sessionState && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-text-secondary font-display">
                    {isCompleted ? "Complete" : isFailed ? "Failed" : "Rewriting..."}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                    isRunning ? "bg-lime-dim text-lime border-lime-border" :
                    isCompleted ? "bg-[rgba(34,197,94,0.1)] text-success border-[rgba(34,197,94,0.3)]" :
                    "bg-[rgba(239,68,68,0.1)] text-error border-[rgba(239,68,68,0.3)]"
                  }`}>
                    {sessionState.status}
                  </span>
                </div>

                {isRunning && (
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-text-muted">Progress</span>
                      <span className="text-lime font-mono">{sessionState.progress.toFixed(0)}%</span>
                    </div>
                    <div className="progress-track h-1.5">
                      <div className="progress-fill" style={{ width: `${sessionState.progress}%` }} />
                    </div>
                  </div>
                )}

                {sessionState.paragraphs.length > 0 && (
                  <div className="space-y-0.5 max-h-60 overflow-y-auto">
                    {sessionState.paragraphs.map((p) => (
                      <ParaRow key={p.index} para={p} />
                    ))}
                  </div>
                )}

                {isCompleted && sessionState.result && (
                  <div className="flex items-center gap-4 pt-2 border-t border-border-light">
                    <div>
                      <p className="text-text-subtle text-[10px]">Before</p>
                      <ScoreBadge score={sessionState.result.original_score} size="sm" />
                    </div>
                    <span className="text-text-subtle">→</span>
                    <div>
                      <p className="text-text-subtle text-[10px]">After</p>
                      <ScoreBadge score={sessionState.result.final_score} size="sm" />
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  {isFailed && (
                    <button onClick={handleResume} className="btn-primary px-3 py-1 rounded-lg text-xs">Resume</button>
                  )}
                  {isCompleted && (
                    <>
                      <a href={getReportUrl(sessionId)} target="_blank" className="btn-primary px-3 py-1 rounded-lg text-xs inline-block">
                        Report
                      </a>
                      <button
                        onClick={() => sessionState.result?.rewritten && navigator.clipboard.writeText(sessionState.result.rewritten)}
                        className="btn-ghost px-3 py-1 rounded-lg text-xs"
                      >
                        Copy
                      </button>
                    </>
                  )}
                  {(isCompleted || isFailed) && (
                    <button onClick={handleNewSession} className="btn-ghost px-3 py-1 rounded-lg text-xs">New</button>
                  )}
                </div>
              </>
            )}

            {/* Empty state */}
            {!detectResult && !sessionId && !error && (
              <div className="text-center py-8">
                <p className="text-text-subtle text-xs">Click "Check AI %" to analyze this document</p>
              </div>
            )}
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
    <div className="flex items-center gap-2 text-[11px] py-1 px-1.5 rounded hover:bg-bg-glass">
      <span className={`w-3 text-center ${color}`}>{icon}</span>
      <span className="text-text-subtle w-5 font-mono">#{para.index + 1}</span>
      <span className={`font-mono w-8 text-right ${para.original_score >= 60 ? "text-error" : para.original_score >= 20 ? "text-warning" : "text-success"}`}>
        {para.original_score.toFixed(0)}%
      </span>
      {para.current_score !== null && (
        <>
          <span className="text-text-subtle">→</span>
          <span className={`font-mono w-8 text-right ${para.current_score >= 60 ? "text-error" : para.current_score >= 20 ? "text-warning" : "text-success"}`}>
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
