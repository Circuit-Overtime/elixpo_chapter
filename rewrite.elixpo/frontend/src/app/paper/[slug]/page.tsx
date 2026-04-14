"use client";

import { useState, useEffect, useCallback, useRef, use, useMemo } from "react";
import { useRouter } from "next/navigation";
import { TexEditor } from "@/components/TexEditor";
import { DomainSelect } from "@/components/DomainSelect";
import { ScoreBadge, ScoreBar } from "@/components/ScoreBadge";
import { useAuth } from "@/lib/AuthContext";
import { getLimits } from "@/lib/plans";
import { getPaperSession, updatePaperSession } from "@/lib/paperSession";
import { showToast } from "@/components/Toast";
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
  downloadDetectReport,
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

  // Sidebar — closed by default, opens when results arrive
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Session (paraphrase)
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Diff review state — after rewrite completes, user reviews before accepting
  const [originalBeforeRewrite, setOriginalBeforeRewrite] = useState<string | null>(null);
  const [rewrittenText, setRewrittenText] = useState<string | null>(null);
  const [reviewMode, setReviewMode] = useState(false);

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
      (data) => {
        setSessionState(data);
        setLoading(false);
        // Enter review mode — show diff, don't apply yet
        if (data.result?.rewritten) {
          setRewrittenText(data.result.rewritten);
          setReviewMode(true);
        }
      },
      (err) => { setError(err); setLoading(false); },
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

    // Cancel any previous streams
    detectCancelRef.current?.();
    cleanupRef.current?.();

    // Clear rewrite state so sidebar switches to detection view
    setSessionId(null);
    setSessionState(null);

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

    // Save original for diff review
    setOriginalBeforeRewrite(texContent);
    setRewrittenText(null);
    setReviewMode(false);

    setLoading(true);
    setError(null);
    setSidebarOpen(true);
    try {
      const data = await startParaphrase(texContent, domain);
      const sid = data.session_id || data.job_id;
      if (sid) {
        setSessionId(sid);
        setActiveSessionId(sid);
        await new Promise((r) => setTimeout(r, 500));
        startStreaming(sid);
        // Don't set loading=false here — SSE callbacks handle it when done/failed
      } else {
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message);
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
    router.push("/");
  };

  const handleAcceptRewrite = () => {
    if (rewrittenText) {
      setTexContent(rewrittenText);
      showToast("Changes applied");
    }
    setReviewMode(false);
    setOriginalBeforeRewrite(null);
    setRewrittenText(null);
  };

  const handleUndoRewrite = () => {
    if (originalBeforeRewrite) {
      setTexContent(originalBeforeRewrite);
      showToast("Changes reverted");
    }
    setReviewMode(false);
    setOriginalBeforeRewrite(null);
    setRewrittenText(null);
    setSessionId(null);
    setSessionState(null);
  };

  const isRunning = sessionState?.status === "running" || sessionState?.status === "pending";
  const isCompleted = sessionState?.status === "completed";
  const isFailed = sessionState?.status === "failed" || sessionState?.status === "interrupted";

  // Build diff chunks for the editor when in review mode
  const editorDiffs = useMemo(() => {
    if (!reviewMode || !rewrittenText || !originalBeforeRewrite) return undefined;
    // Find which lines changed between original and rewritten
    const origLines = originalBeforeRewrite.split("\n");
    const newLines = rewrittenText.split("\n");
    const chunks: Array<{ paraIndex: number; originalText: string; rewrittenText: string; startLine: number; endLine: number }> = [];

    let i = 0;
    let chunkIdx = 0;
    while (i < Math.max(origLines.length, newLines.length)) {
      const orig = origLines[i] || "";
      const rewr = newLines[i] || "";
      if (orig !== rewr) {
        const start = i;
        // Find end of changed block
        while (i < Math.max(origLines.length, newLines.length) && (origLines[i] || "") !== (newLines[i] || "")) {
          i++;
        }
        chunks.push({
          paraIndex: chunkIdx++,
          originalText: origLines.slice(start, i).join("\n"),
          rewrittenText: newLines.slice(start, i).join("\n"),
          startLine: start,
          endLine: i - 1,
        });
      } else {
        i++;
      }
    }
    return chunks;
  }, [reviewMode, rewrittenText, originalBeforeRewrite]);

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
              onClick={handleRewrite}
              disabled={loading || isRunning || reviewMode || wordCount < 10 || !loggedIn}
              className="btn-primary px-3 py-1 rounded-lg text-xs"
              title={!loggedIn ? "Sign in to rewrite" : undefined}
            >
              {loading && sessionId ? "Rewriting..." : "Rewrite"}
            </button>
            <button
              onClick={handleCheck}
              disabled={loading || isRunning || reviewMode || wordCount < 10}
              className="btn-ghost px-3 py-1 rounded-lg text-xs font-semibold"
            >
              {loading && !sessionId ? "Checking..." : "Check AI %"}
            </button>
            {!sidebarOpen && (detectResult || sessionState) && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="btn-ghost px-2 py-1 rounded-lg text-xs"
                title="Show results"
              >
                ◀ Results
              </button>
            )}
          </div>
        </div>

        {/* Review bar — shown after rewrite completes, before user accepts */}
        {reviewMode && (
          <div className="flex items-center justify-between px-4 py-2 border-b border-lime-border bg-lime-dim">
            <div className="flex items-center gap-2">
              <span className="text-lime text-xs font-semibold">Review changes</span>
              <span className="text-text-muted text-[10px]">
                {editorDiffs?.length || 0} section{(editorDiffs?.length || 0) !== 1 ? "s" : ""} modified
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleAcceptRewrite} className="px-3 py-1 rounded-lg text-xs font-semibold bg-success text-[#0c0f0a] hover:brightness-110 transition-all">
                Keep changes
              </button>
              <button onClick={handleUndoRewrite} className="px-3 py-1 rounded-lg text-xs font-semibold bg-[rgba(239,68,68,0.15)] text-error border border-[rgba(239,68,68,0.3)] hover:bg-[rgba(239,68,68,0.25)] transition-all">
                Undo
              </button>
            </div>
          </div>
        )}

        {/* Editor — fills remaining space, scroll is inside */}
        <div className="flex-1 overflow-hidden">
          <TexEditor
            value={reviewMode && rewrittenText ? rewrittenText : texContent}
            onChange={setTexContent}
            readOnly={isRunning || reviewMode}
            paragraphScores={reviewMode ? undefined : paragraphScores}
            diffs={reviewMode ? editorDiffs : undefined}
            originalValue={reviewMode ? originalBeforeRewrite || undefined : undefined}
            lockMessage={isRunning ? `Rewriting${sessionState?.paragraphs ? ` — ${sessionState.paragraphs.filter(p => p.status === "done").length}/${sessionState.paragraphs.filter(p => p.status !== "skipped").length} paragraphs` : "..."}` : undefined}
          />
        </div>
      </div>

      {/* Results sidebar — animated slide */}
      <div
        className={`border-l border-border-light bg-[rgba(16,24,12,0.5)] flex flex-col overflow-y-auto shrink-0 transition-all duration-300 ease-in-out ${
          sidebarOpen ? "w-80 opacity-100" : "w-0 opacity-0 border-l-0 overflow-hidden"
        }`}
      >
        <div className="p-4 space-y-4 min-w-[320px]">
          {/* Sidebar header with download */}
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-text-secondary font-display">
              {loading && !sessionId ? "Analyzing..." :
               detectResult && !sessionId ? "Detection" :
               sessionId ? (isCompleted ? "Rewrite Complete" : isFailed ? "Failed" : "Rewriting...") :
               "Results"}
            </h3>
            <div className="flex items-center gap-1.5">
              {/* Download button — always visible when there are results */}
              {detectResult && !sessionId && !loading && (
                <button
                  onClick={() => downloadDetectReport(texContent).then(() => showToast("Report downloaded")).catch((e) => { setError(e.message); showToast(e.message, "error"); })}
                  className="btn-ghost px-2 py-1 rounded-lg text-[10px] flex items-center gap-1"
                  title="Download PDF report"
                >
                  <DownloadIcon />
                  PDF
                </button>
              )}
              {isCompleted && sessionId && (
                <a href={getReportUrl(sessionId)} target="_blank" className="btn-ghost px-2 py-1 rounded-lg text-[10px] flex items-center gap-1">
                  <DownloadIcon />
                  PDF
                </a>
              )}
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-text-muted hover:text-text-primary transition-colors p-1"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-2.5 rounded-lg bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.25)]">
              <p className="text-error text-xs">{error}</p>
            </div>
          )}

          {/* Skeleton loading — before first data arrives */}
          {loading && !sessionId && liveSegments.length === 0 && (
            <div className="space-y-4 animate-pulse">
              {/* Score skeleton */}
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 bg-bg-glass rounded" />
                <div className="h-7 w-16 bg-bg-glass rounded-full" />
              </div>
              {/* Feature bars skeleton */}
              <div className="space-y-2.5">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-3 bg-bg-glass rounded" style={{ width: 80 }} />
                    <div className="flex-1 h-2 bg-bg-glass rounded-full" />
                    <div className="h-3 w-8 bg-bg-glass rounded" />
                  </div>
                ))}
              </div>
              {/* Paragraph skeletons */}
              <div className="pt-2 border-t border-border-light space-y-2">
                <div className="h-3 w-20 bg-bg-glass rounded" />
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="h-5 w-12 bg-bg-glass rounded-full" />
                    <div className="flex-1 h-3 bg-bg-glass rounded" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detection: live streaming progress */}
          {loading && !sessionId && liveSegments.length > 0 && (
            <>
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-text-muted">Paragraphs</span>
                  <span className="text-lime font-mono">{liveSegments.length}/{detectTotal} · {detectProgress.toFixed(0)}%</span>
                </div>
                <div className="progress-track h-1.5">
                  <div className="progress-fill" style={{ width: `${detectProgress}%` }} />
                </div>
              </div>
              <div className="space-y-1 max-h-[calc(100vh-220px)] overflow-y-auto">
                {liveSegments.map((seg) => (
                  <div key={seg.index} className="flex items-center gap-2 text-[11px] py-1.5 px-2 rounded bg-bg-glass">
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
                <span className="text-text-muted text-[11px]">{detectResult.verdict}</span>
                <ScoreBadge score={detectResult.score} size="md" />
              </div>
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
                  <div className="max-h-[calc(100vh-300px)] overflow-y-auto space-y-1">
                    {detectResult.segments.map((seg) => (
                      <div key={seg.index} className="flex items-start gap-2 text-xs py-1">
                        <ScoreBadge score={seg.score} size="sm" />
                        <p className="text-text-muted text-[11px] leading-snug line-clamp-2 flex-1">{seg.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Download report — bottom */}
              <div className="pt-2 border-t border-border-light">
                <button
                  onClick={() => downloadDetectReport(texContent).then(() => showToast("Report downloaded")).catch((e) => { setError(e.message); showToast(e.message, "error"); })}
                  className="btn-primary w-full py-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5"
                >
                  <DownloadIcon />
                  Download Full Report
                </button>
              </div>
            </>
          )}

            {/* Paraphrase progress */}
            {sessionId && sessionState && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-text-secondary font-display">
                    {isCompleted ? "Rewrite Complete" : isFailed ? "Rewrite Failed" : "Rewriting..."}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
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
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-text-muted">Overall progress</span>
                      <span className="text-lime font-mono">{sessionState.progress.toFixed(0)}%</span>
                    </div>
                    <div className="progress-track h-1.5">
                      <div className="progress-fill" style={{ width: `${sessionState.progress}%` }} />
                    </div>
                  </div>
                )}

                {/* Per-paragraph live feedback */}
                {sessionState.paragraphs.length > 0 && (
                  <div className="space-y-1 max-h-[calc(100vh-220px)] overflow-y-auto">
                    {sessionState.paragraphs
                      .filter((p) => p.status !== "skipped" && (p.original_score > 20 || p.status !== "pending"))
                      .map((p) => (
                      <ParaRow key={p.index} para={p} />
                    ))}
                  </div>
                )}

                {/* Summary + actions */}
                {isCompleted && sessionState.result && (
                  <div className="pt-3 border-t border-border-light space-y-4">
                    {/* Score comparison */}
                    <div className="bg-bg-glass rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">AI Score Reduction</span>
                        <span className="text-success text-xs font-mono font-bold">
                          ↓ {(sessionState.result.original_score - sessionState.result.final_score).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-end gap-3">
                        <div className="flex-1">
                          <p className="text-text-subtle text-[10px] mb-1">Before</p>
                          <div className="progress-track h-2.5">
                            <div className="h-full rounded-full bg-error transition-all" style={{ width: `${sessionState.result.original_score}%` }} />
                          </div>
                          <p className="text-error text-xs font-mono mt-1">{sessionState.result.original_score.toFixed(1)}%</p>
                        </div>
                        <div className="flex-1">
                          <p className="text-text-subtle text-[10px] mb-1">After</p>
                          <div className="progress-track h-2.5">
                            <div className={`h-full rounded-full transition-all ${
                              sessionState.result.final_score <= 20 ? "bg-success" : "bg-warning"
                            }`} style={{ width: `${sessionState.result.final_score}%` }} />
                          </div>
                          <p className={`text-xs font-mono mt-1 ${
                            sessionState.result.final_score <= 20 ? "text-success" : "text-warning"
                          }`}>{sessionState.result.final_score.toFixed(1)}%</p>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-2 text-center">
                      {[
                        { value: sessionState.paragraphs.filter((p) => p.current_score !== null && p.current_score <= 20).length, label: "Passed", color: "text-success" },
                        { value: sessionState.paragraphs.filter((p) => p.current_score !== null && p.current_score > 20 && p.status !== "skipped").length, label: "Review", color: "text-warning" },
                        { value: sessionState.paragraphs.filter((p) => p.status === "skipped").length, label: "Skipped", color: "text-text-subtle" },
                      ].map((s) => (
                        <div key={s.label} className="flex-1 bg-bg-glass rounded-lg py-2">
                          <p className={`text-sm font-bold font-mono ${s.color}`}>{s.value}</p>
                          <p className="text-text-subtle text-[9px]">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Action buttons — stacked */}
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          if (!sessionState.result?.rewritten) return;
                          const blob = new Blob([sessionState.result.rewritten], { type: "text/plain" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url; a.download = "rewritten.tex"; a.click();
                          URL.revokeObjectURL(url);
                          showToast("Downloaded rewritten.tex");
                        }}
                        className="btn-primary w-full py-2 rounded-lg text-xs flex items-center justify-center gap-2"
                      >
                        <DownloadIcon />
                        Download .tex
                      </button>
                      <div className="flex gap-2">
                        <a
                          href={getReportUrl(sessionId)}
                          target="_blank"
                          className="btn-ghost flex-1 py-1.5 rounded-lg text-xs text-center flex items-center justify-center gap-1.5"
                        >
                          <DownloadIcon />
                          Report PDF
                        </a>
                        <button
                          onClick={() => {
                            if (sessionState.result?.rewritten) {
                              navigator.clipboard.writeText(sessionState.result.rewritten);
                              showToast("Copied to clipboard");
                            }
                          }}
                          className="btn-ghost flex-1 py-1.5 rounded-lg text-xs"
                        >
                          Copy text
                        </button>
                      </div>
                      <button
                        onClick={handleNewSession}
                        className="btn-ghost w-full py-1.5 rounded-lg text-xs"
                      >
                        New paper
                      </button>
                    </div>
                  </div>
                )}

                {/* Failed actions */}
                {isFailed && (
                  <div className="pt-3 border-t border-border-light flex gap-2">
                    <button onClick={handleResume} className="btn-primary flex-1 py-1.5 rounded-lg text-xs">Resume</button>
                    <button onClick={handleNewSession} className="btn-ghost flex-1 py-1.5 rounded-lg text-xs">New paper</button>
                  </div>
                )}
              </>
            )}

            {/* Empty state — only if sidebar opened manually */}
            {!detectResult && !sessionId && !error && !loading && (
              <div className="text-center py-8">
                <p className="text-text-subtle text-xs">Click &ldquo;Check AI %&rdquo; to analyze this document</p>
              </div>
            )}
          </div>
        </div>
    </div>
  );
}

function ParaRow({ para }: { para: ParagraphProgress }) {
  const isActive = para.status === "rewriting";
  const isDone = para.status === "done";
  const isFailed = para.status === "failed";
  const reduction = para.reduction || 0;
  const scoreColor = (s: number) => s >= 60 ? "text-error" : s >= 20 ? "text-warning" : "text-success";

  return (
    <div className={`rounded-lg px-2.5 py-2 transition-all ${
      isActive ? "bg-lime-dim border border-lime-border" :
      isDone ? "bg-bg-glass" :
      "hover:bg-bg-glass"
    }`}>
      {/* Top row: index + scores */}
      <div className="flex items-center gap-2 text-[11px]">
        <span className={`w-3 text-center ${
          isActive ? "text-lime animate-pulse" : isDone ? "text-success" : isFailed ? "text-error" : "text-text-subtle"
        }`}>
          {isActive ? "◎" : isDone ? "●" : isFailed ? "✕" : "○"}
        </span>
        <span className="text-text-subtle font-mono">¶{para.index + 1}</span>

        <span className={`font-mono ${scoreColor(para.original_score)}`}>
          {para.original_score.toFixed(0)}%
        </span>

        {para.current_score !== null && (
          <>
            <span className="text-text-subtle">→</span>
            <span className={`font-mono font-semibold ${scoreColor(para.current_score)}`}>
              {para.current_score.toFixed(0)}%
            </span>
          </>
        )}

        {/* Reduction badge */}
        {isDone && reduction > 0 && (
          <span className="ml-auto text-[10px] font-mono text-success">
            ↓{reduction.toFixed(0)}%
          </span>
        )}
        {isDone && reduction <= 0 && para.current_score !== null && para.current_score > 20 && (
          <span className="ml-auto text-[10px] font-mono text-warning">
            needs review
          </span>
        )}
      </div>

      {/* Active: show attempt counter */}
      {isActive && para.attempts !== undefined && (
        <div className="mt-1.5 flex items-center gap-2">
          <div className="flex-1 progress-track h-1">
            <div className="progress-fill" style={{ width: `${((para.attempts || 0) / (para.max_attempts || 5)) * 100}%` }} />
          </div>
          <span className="text-[10px] text-lime font-mono">
            attempt {para.attempts}/{para.max_attempts || 5}
          </span>
        </div>
      )}

      {/* Preview text */}
      {para.text_preview && isActive && (
        <p className="text-[10px] text-text-subtle mt-1 line-clamp-1 leading-snug">
          {para.text_preview}
        </p>
      )}
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
      <path d="M8 2V10M8 10L5 7M8 10L11 7M3 13H13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
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
