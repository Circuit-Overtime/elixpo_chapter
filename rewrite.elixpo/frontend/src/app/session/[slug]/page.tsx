"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { getPaperSession, type PaperSession } from "@/lib/paperSession";
import { ScoreBadge, ScoreBar } from "@/components/ScoreBadge";
import { detectText, downloadDetectReport } from "@/lib/api";
import { showToast } from "@/components/Toast";
import type { DetectResult } from "@/lib/api";

const DOMAIN_LABELS: Record<string, string> = {
  general: "General",
  cs: "Computer Science",
  medicine: "Medicine",
  law: "Law",
  humanities: "Humanities",
};

export default function SessionDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const { loggedIn } = useAuth();

  const [session, setSession] = useState<PaperSession | null>(null);
  const [detectResult, setDetectResult] = useState<DetectResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const s = getPaperSession(slug);
    if (!s) {
      router.replace("/session");
      return;
    }
    setSession(s);
    setMounted(true);
  }, [slug, router]);

  const handleDetect = async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const result = await detectText(session.tex, true);
      setDetectResult(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!session) return;
    try {
      await downloadDetectReport(session.tex);
      showToast("Report downloaded");
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  if (!mounted || !session) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-5 h-5 rounded-full border-2 border-lime border-t-transparent animate-spin" />
      </div>
    );
  }

  const wordCount = session.tex.trim().split(/\s+/).filter(Boolean).length;
  const lineCount = session.tex.split("\n").length;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <Link href="/session" className="hover:text-text-primary transition-colors">Sessions</Link>
        <span>/</span>
        <span className="text-text-secondary">{session.filename || `Paper ${slug.slice(0, 6)}`}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-display text-text-primary">
            {session.filename || `Paper ${slug.slice(0, 6)}`}
          </h1>
          <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
            <span>{lineCount} lines</span>
            <span>{wordCount.toLocaleString()} words</span>
            <span className="px-1.5 py-0.5 rounded bg-bg-glass border border-border-light text-[10px]">
              {DOMAIN_LABELS[session.domain] || session.domain}
            </span>
            <span>{formatTimeAgo(session.createdAt)}</span>
          </div>
        </div>
        <Link href={`/paper/${slug}`} className="btn-primary px-4 py-1.5 rounded-lg text-xs shrink-0">
          Open in editor
        </Link>
      </div>

      {/* Content preview */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border-light flex items-center justify-between">
          <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Document preview</span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(session.tex);
              showToast("Copied to clipboard");
            }}
            className="btn-ghost px-2 py-0.5 rounded text-[10px]"
          >
            Copy
          </button>
        </div>
        <div className="p-5 max-h-64 overflow-y-auto">
          <pre className="text-text-secondary text-xs font-mono whitespace-pre-wrap leading-relaxed">
            {session.tex.slice(0, 3000)}{session.tex.length > 3000 ? "\n\n... (truncated)" : ""}
          </pre>
        </div>
      </div>

      {/* Detection section */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border-light">
          <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">AI Detection</span>
        </div>

        <div className="p-5">
          {!detectResult && !loading && !error && (
            <div className="text-center space-y-3 py-6">
              <p className="text-text-muted text-sm">Run a detection scan to see AI scores</p>
              <button onClick={handleDetect} className="btn-primary px-6 py-2 rounded-lg text-sm">
                Check AI %
              </button>
            </div>
          )}

          {loading && (
            <div className="text-center space-y-3 py-8">
              <div className="w-6 h-6 mx-auto rounded-full border-2 border-lime border-t-transparent animate-spin" />
              <p className="text-text-muted text-xs">Analyzing paragraphs...</p>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.25)] mb-4">
              <p className="text-error text-xs">{error}</p>
            </div>
          )}

          {detectResult && (
            <div className="space-y-5">
              {/* Overall score */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold font-display text-text-primary">Overall Score</h3>
                  <p className="text-text-muted text-xs mt-0.5">{detectResult.verdict}</p>
                </div>
                <ScoreBadge score={detectResult.score} size="lg" />
              </div>

              {/* Feature breakdown */}
              <div className="space-y-2">
                <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Signal breakdown</p>
                {Object.entries(detectResult.features)
                  .filter(([, v]) => v > 0)
                  .sort(([, a], [, b]) => b - a)
                  .map(([key, value]) => (
                    <ScoreBar key={key} label={formatFeature(key)} score={value} />
                  ))}
              </div>

              {/* Per-paragraph */}
              {detectResult.segments.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-border-light">
                  <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">
                    Per-paragraph ({detectResult.segments.filter(s => s.score > 20).length} flagged / {detectResult.segments.length} total)
                  </p>
                  <div className="space-y-1.5 max-h-72 overflow-y-auto">
                    {detectResult.segments.map((seg) => (
                      <div key={seg.index} className="flex items-start gap-2.5 py-2 px-3 rounded-lg hover:bg-bg-glass transition-colors">
                        <ScoreBadge score={seg.score} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-text-secondary text-xs leading-relaxed line-clamp-2">{seg.text}</p>
                          <p className="text-text-subtle text-[10px] mt-0.5">{seg.verdict}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-3 border-t border-border-light">
                <button onClick={handleDownloadReport} className="btn-primary px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2V10M8 10L5 7M8 10L11 7M3 13H13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Download report
                </button>
                <button onClick={handleDetect} className="btn-ghost px-4 py-1.5 rounded-lg text-xs">
                  Re-scan
                </button>
                <Link href={`/paper/${slug}`} className="btn-ghost px-4 py-1.5 rounded-lg text-xs">
                  Open in editor
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
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
