"use client";

import { useState, useEffect } from "react";
import { FileUpload } from "@/components/FileUpload";
import { SessionProgress } from "@/components/SessionProgress";
import { ScoreBadge, ScoreBar } from "@/components/ScoreBadge";
import {
  detectText,
  detectFile,
  startParaphrase,
  startParaphraseFile,
  getActiveSessionId,
  setActiveSessionId,
  clearActiveSession,
} from "@/lib/api";
import type { DetectResult } from "@/lib/api";

type Tab = "detect" | "rewrite";
type InputMode = "text" | "file";

export default function Home() {
  const [tab, setTab] = useState<Tab>("rewrite");
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [domain, setDomain] = useState("general");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detection results
  const [detectResult, setDetectResult] = useState<DetectResult | null>(null);

  // Session (paraphrase)
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Resume existing session on page load
  useEffect(() => {
    const existing = getActiveSessionId();
    if (existing) {
      setSessionId(existing);
      setTab("rewrite");
    }
  }, []);

  const handleDetect = async () => {
    setLoading(true);
    setError(null);
    setDetectResult(null);
    try {
      let result: DetectResult;
      if (inputMode === "file" && file) {
        result = await detectFile(file, true);
      } else {
        result = await detectText(text, true);
      }
      setDetectResult(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRewrite = async () => {
    setLoading(true);
    setError(null);
    try {
      let data;
      if (inputMode === "file" && file) {
        data = await startParaphraseFile(file, domain);
      } else {
        data = await startParaphrase(text, domain);
      }
      const sid = data.session_id || data.job_id;
      if (sid) {
        setSessionId(sid);
        setActiveSessionId(sid);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // If we have an active session, show progress
  if (sessionId) {
    return (
      <div className="space-y-6">
        <SessionProgress sessionId={sessionId} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center space-y-3 pt-6">
        <h1 className="text-4xl font-bold font-[family-name:var(--font-display)] text-gradient">
          ReWrite
        </h1>
        <p className="text-text-secondary text-lg max-w-xl mx-auto">
          Detect AI-generated content and rewrite it to read as authentically human-written
        </p>
      </div>

      {/* Tab toggle */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-xl bg-bg-glass border border-border-light p-1">
          <button
            onClick={() => { setTab("detect"); setDetectResult(null); }}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === "detect"
                ? "bg-lime-dim text-lime border border-lime-border"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            Detect
          </button>
          <button
            onClick={() => { setTab("rewrite"); setDetectResult(null); }}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === "rewrite"
                ? "bg-lime-dim text-lime border border-lime-border"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            Rewrite
          </button>
        </div>
      </div>

      {/* Input section */}
      <div className="glass-card p-6 space-y-4">
        {/* Input mode toggle */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setInputMode("text")}
            className={`text-sm ${inputMode === "text" ? "text-lime font-semibold" : "text-text-muted"}`}
          >
            Paste Text
          </button>
          <span className="text-border-light">|</span>
          <button
            onClick={() => setInputMode("file")}
            className={`text-sm ${inputMode === "file" ? "text-lime font-semibold" : "text-text-muted"}`}
          >
            Upload File
          </button>
        </div>

        {inputMode === "text" ? (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your text here (minimum 50 characters)..."
            className="w-full h-48 p-4 rounded-xl bg-bg-glass border border-border-light text-text-primary placeholder:text-text-subtle focus:border-lime-border focus:outline-none resize-y text-sm leading-relaxed"
          />
        ) : (
          <>
            <FileUpload onFile={setFile} />
            {file && (
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <span>📎</span>
                <span>{file.name}</span>
                <span className="text-text-subtle">({(file.size / 1024).toFixed(0)} KB)</span>
                <button onClick={() => setFile(null)} className="text-error ml-2">✕</button>
              </div>
            )}
          </>
        )}

        {/* Domain selector (rewrite only) */}
        {tab === "rewrite" && (
          <div className="flex items-center gap-3">
            <label className="text-text-muted text-sm">Domain:</label>
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="bg-bg-glass border border-border-light rounded-lg px-3 py-1.5 text-sm text-text-primary focus:border-lime-border focus:outline-none"
            >
              <option value="general">General</option>
              <option value="cs">Computer Science</option>
              <option value="medicine">Medicine</option>
              <option value="law">Law</option>
              <option value="humanities">Humanities</option>
            </select>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)]">
            <p className="text-error text-sm">{error}</p>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={tab === "detect" ? handleDetect : handleRewrite}
          disabled={loading || (inputMode === "text" ? text.trim().length < 50 : !file)}
          className="w-full py-3 rounded-xl bg-lime-dim text-lime border border-lime-border font-semibold hover:bg-[rgba(163,230,53,0.25)] hover:border-[rgba(163,230,53,0.5)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-lime border-t-transparent animate-spin" />
              {tab === "detect" ? "Analyzing..." : "Starting..."}
            </span>
          ) : (
            tab === "detect" ? "Analyze Text" : "Rewrite Text"
          )}
        </button>
      </div>

      {/* Detection results */}
      {detectResult && (
        <div className="space-y-4">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold font-[family-name:var(--font-display)] text-text-primary">Detection Results</h2>
              <ScoreBadge score={detectResult.score} size="lg" />
            </div>
            <p className="text-text-muted mb-4">Verdict: <span className="font-semibold text-text-primary">{detectResult.verdict}</span></p>

            {/* Feature bars */}
            <div className="space-y-2">
              {Object.entries(detectResult.features)
                .filter(([, v]) => v > 0)
                .sort(([, a], [, b]) => b - a)
                .map(([key, value]) => (
                  <ScoreBar key={key} label={formatFeature(key)} score={value} />
                ))}
            </div>
          </div>

          {/* Segments */}
          {detectResult.segments.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold text-text-secondary mb-3 font-[family-name:var(--font-display)]">
                Per-Paragraph Scores
              </h3>
              <div className="space-y-3">
                {detectResult.segments.map((seg) => (
                  <div key={seg.index} className="flex items-start gap-3 p-3 rounded-lg bg-bg-glass">
                    <ScoreBadge score={seg.score} size="sm" />
                    <p className="text-text-secondary text-sm leading-relaxed flex-1">{seg.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatFeature(key: string): string {
  const labels: Record<string, string> = {
    burstiness: "Burstiness",
    vocabulary_markers: "AI Vocabulary",
    paragraph_structure: "Paragraph Uniformity",
    n_gram_uniformity: "N-gram Uniformity",
    repetition: "Repetition",
    punctuation_diversity: "Punctuation Variety",
    perplexity: "Perplexity",
    coherence: "Coherence",
    readability: "Readability",
    entropy: "Entropy",
    type_token_ratio: "Lexical Diversity",
    sentence_starters: "Sentence Starters",
    llm_judge: "LLM Judge",
  };
  return labels[key] || key;
}
