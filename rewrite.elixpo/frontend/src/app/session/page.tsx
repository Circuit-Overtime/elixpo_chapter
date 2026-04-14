"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { startLogin } from "@/lib/auth";
import { getAllPaperSessions, deletePaperSession, type PaperSession } from "@/lib/paperSession";

const DOMAIN_LABELS: Record<string, string> = {
  general: "General",
  cs: "Computer Science",
  medicine: "Medicine",
  law: "Law",
  humanities: "Humanities",
};

export default function SessionPage() {
  const { loggedIn } = useAuth();
  const [sessions, setSessions] = useState<PaperSession[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setSessions(getAllPaperSessions());
    setMounted(true);
  }, []);

  const handleDelete = (slug: string) => {
    deletePaperSession(slug);
    setSessions((prev) => prev.filter((s) => s.slug !== slug));
  };

  if (!loggedIn) {
    return (
      <div className="max-w-3xl mx-auto px-6 text-center py-20 space-y-4">
        <h1 className="text-2xl font-bold font-display text-text-primary">Sessions</h1>
        <p className="text-text-muted text-sm">Sign in to view your session history and resume jobs.</p>
        <button onClick={startLogin} className="btn-primary px-5 py-2 rounded-lg text-sm">Sign in</button>
      </div>
    );
  }

  if (!mounted) return null;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-text-primary">Sessions</h1>
          <p className="text-text-muted text-xs mt-1">{sessions.length} paper{sessions.length !== 1 ? "s" : ""} in this browser session</p>
        </div>
        <Link href="/" className="btn-primary px-4 py-1.5 rounded-lg text-xs">
          New paper
        </Link>
      </div>

      {sessions.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-3">
          <div className="text-4xl opacity-30">📄</div>
          <p className="text-text-muted text-sm">No sessions yet</p>
          <p className="text-text-subtle text-xs">Upload or paste a .tex file from the <Link href="/" className="text-lime underline">home page</Link> to get started</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {sessions.map((s) => (
            <SessionCard key={s.slug} session={s} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

function SessionCard({ session, onDelete }: { session: PaperSession; onDelete: (slug: string) => void }) {
  const wordCount = session.tex.trim().split(/\s+/).filter(Boolean).length;
  const lineCount = session.tex.split("\n").length;
  const preview = extractPreview(session.tex);
  const timeAgo = formatTimeAgo(session.createdAt);

  return (
    <Link href={`/session/${session.slug}`} className="block group">
      <div className="glass-card p-4 space-y-3 h-full hover:border-lime-border transition-all">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-text-primary truncate group-hover:text-lime transition-colors">
              {session.filename || `Paper ${session.slug.slice(0, 6)}`}
            </h3>
            <p className="text-text-subtle text-[10px] mt-0.5">{timeAgo}</p>
          </div>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(session.slug); }}
            className="text-text-subtle hover:text-error transition-colors p-1 shrink-0 opacity-0 group-hover:opacity-100"
            title="Delete"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <p className="text-text-muted text-xs leading-relaxed line-clamp-3">{preview}</p>

        <div className="flex items-center gap-3 text-[10px] text-text-subtle">
          <span>{lineCount} lines</span>
          <span>{wordCount.toLocaleString()} words</span>
          <span className="px-1.5 py-0.5 rounded bg-bg-glass border border-border-light">
            {DOMAIN_LABELS[session.domain] || session.domain}
          </span>
        </div>
      </div>
    </Link>
  );
}

function extractPreview(tex: string): string {
  const lines = tex.split("\n");
  const prose: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("\\") || trimmed.startsWith("%") || trimmed.startsWith("{") || trimmed.startsWith("}")) continue;
    const clean = trimmed.replace(/\\[a-zA-Z]+\*?(\{[^}]*\})*(\[[^\]]*\])*/g, "").replace(/[{}$\\]/g, "").trim();
    if (clean.length > 10) prose.push(clean);
    if (prose.join(" ").length > 200) break;
  }
  return prose.join(" ").slice(0, 200) || "LaTeX document";
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
