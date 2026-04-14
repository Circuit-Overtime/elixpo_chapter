"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DomainSelect } from "@/components/DomainSelect";
import { useAuth } from "@/lib/AuthContext";
import { getLimits } from "@/lib/plans";
import { createPaperSession } from "@/lib/paperSession";

export default function Home() {
  const router = useRouter();
  const { loggedIn } = useAuth();
  const limits = getLimits(loggedIn, false);

  const [texContent, setTexContent] = useState("");
  const [domain, setDomain] = useState("general");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const wordCount = texContent.trim().split(/\s+/).filter(Boolean).length;
  const isValid = validateTex(texContent);

  // File upload — read .tex and navigate immediately
  const handleFile = useCallback((file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setError("File too large. Max 10 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!validateTex(content)) {
        setError("This doesn't look like a valid .tex file.");
        return;
      }
      const slug = createPaperSession(content, file.name, domain);
      router.push(`/paper/${slug}`);
    };
    reader.readAsText(file);
  }, [domain, router]);

  // Paste text and navigate
  const handleCheck = () => {
    if (!isValid) {
      setError("Please paste a valid LaTeX document with at least one \\command and readable text.");
      return;
    }
    if (wordCount > limits.maxWords) {
      setError(`Text exceeds ${limits.maxWords.toLocaleString()} word limit. ${loggedIn ? "Upgrade to Pro." : "Sign in for 1,000 words."}`);
      return;
    }
    const slug = createPaperSession(texContent, null, domain);
    router.push(`/paper/${slug}`);
  };

  return (
    <div className="max-w-3xl mx-auto px-6 space-y-8 pt-12 pb-16">
      {/* Hero */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold font-display text-gradient">
          ReWrite
        </h1>
        <p className="text-text-muted text-base">
          Check your LaTeX paper for AI-generated content and rewrite flagged sections
        </p>
      </div>

      {/* Upload card */}
      <div
        className="glass-card p-8 text-center cursor-pointer group"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".tex"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        <div className="text-4xl mb-3 opacity-40 group-hover:opacity-60 transition-opacity">📄</div>
        <p className="text-text-secondary text-sm">
          Drop a <span className="text-lime font-semibold">.tex</span> file here or <span className="text-lime underline">browse</span>
        </p>
        <p className="text-text-subtle text-xs mt-1">Up to 10 MB</p>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-border-light" />
        <span className="text-text-subtle text-xs">or paste LaTeX below</span>
        <div className="flex-1 h-px bg-border-light" />
      </div>

      {/* Paste area */}
      <div className="space-y-3">
        <textarea
          value={texContent}
          onChange={(e) => { setTexContent(e.target.value); setError(null); }}
          placeholder={"% Paste your LaTeX document here...\n\\documentclass{article}\n\\begin{document}\n\nYour paper text goes here.\n\n\\end{document}"}
          className="w-full h-56 p-4 rounded-xl bg-editor-bg border border-border-light text-text-primary placeholder:text-text-subtle focus:border-lime-border focus:outline-none resize-y text-sm leading-relaxed font-mono"
          spellCheck={false}
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DomainSelect value={domain} onChange={setDomain} />
            {texContent.trim().length > 0 && (
              <span className={`text-[11px] font-mono flex items-center gap-1.5 ${
                !isValid ? "text-error" : wordCount > limits.maxWords ? "text-error" : "text-text-subtle"
              }`}>
                {!isValid ? (
                  <><span>✕</span> not valid .tex</>
                ) : (
                  <><span className="text-success">✓</span> {wordCount.toLocaleString()}/{limits.maxWords.toLocaleString()} words</>
                )}
              </span>
            )}
          </div>

          <button
            onClick={handleCheck}
            disabled={!isValid || wordCount > limits.maxWords}
            className="btn-primary px-5 py-2 rounded-lg text-sm"
          >
            Check AI %
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.25)]">
          <p className="text-error text-sm">{error}</p>
        </div>
      )}

      {/* Feature callouts */}
      <div className="grid grid-cols-3 gap-4 pt-4">
        <FeatureCard
          icon="🔍"
          title="Detect"
          desc="Ensemble scoring with 7 calibrated signals"
        />
        <FeatureCard
          icon="✏️"
          title="Rewrite"
          desc="Domain-aware paraphrasing that preserves meaning"
        />
        <FeatureCard
          icon="📊"
          title="Report"
          desc="Per-paragraph scores in a downloadable PDF"
        />
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="glass-card p-4 text-center space-y-1.5">
      <div className="text-2xl">{icon}</div>
      <h3 className="text-sm font-semibold text-text-primary font-display">{title}</h3>
      <p className="text-text-muted text-xs leading-relaxed">{desc}</p>
    </div>
  );
}

function validateTex(content: string): boolean {
  const trimmed = content.trim();
  if (trimmed.length < 50) return false;
  const hasCommand = /\\[a-zA-Z]{2,}/.test(trimmed);
  if (!hasCommand) return false;
  const textOnly = trimmed
    .replace(/%.*$/gm, "")
    .replace(/\\[a-zA-Z]+\*?\{[^}]*\}/g, "")
    .replace(/\\[a-zA-Z]+\*?/g, "")
    .replace(/[{}\[\]$&]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (textOnly.length < 30) return false;
  const words = textOnly.match(/[a-zA-Z]{3,}/g) || [];
  if (words.length < 5) return false;
  return true;
}
