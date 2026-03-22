"use client";

import { useEffect, useState } from "react";
import { fetchSessions, deleteSession } from "@/lib/api";
import type { SessionMeta } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const statusConfig: Record<string, { classes: string; dot: string }> = {
  completed: {
    classes: "bg-[rgba(34,197,94,0.1)] text-[#4ade80] border-[rgba(34,197,94,0.3)]",
    dot: "bg-[#4ade80]",
  },
  running: {
    classes: "bg-[rgba(251,191,36,0.1)] text-[#fbbf24] border-[rgba(251,191,36,0.3)]",
    dot: "bg-[#fbbf24] animate-pulse",
  },
  pending: {
    classes: "bg-[rgba(88,101,242,0.1)] text-[#818cf8] border-[rgba(88,101,242,0.3)]",
    dot: "bg-[#818cf8]",
  },
  failed: {
    classes: "bg-[rgba(239,68,68,0.1)] text-[#f87171] border-[rgba(239,68,68,0.3)]",
    dot: "bg-[#f87171]",
  },
  cancelled: {
    classes: "bg-[rgba(156,163,175,0.1)] text-[#9ca3af] border-[rgba(156,163,175,0.2)]",
    dot: "bg-[#9ca3af]",
  },
};

export default function DashboardPage() {
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetchSessions()
      .then(setSessions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = sessions.filter((s) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      s.id.toLowerCase().includes(q) ||
      s.status.includes(q) ||
      s.repo_full_name?.toLowerCase().includes(q) ||
      s.trigger.includes(q)
    );
  });

  const formatTime = (ts: number) => {
    return new Date(ts * 1000).toLocaleString();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Sessions
          </h1>
          <p className="text-sm text-[rgba(245,245,244,0.5)] mt-1">
            Monitor and manage your Elixpo Agent sessions
          </p>
        </div>
        <a href="/dashboard/new">
          <Button className="bg-[#a3e635] text-[#0c0f0a] hover:bg-[#bef264] font-semibold rounded-xl shadow-[0_0_15px_rgba(163,230,53,0.2)]">
            New Session
          </Button>
        </a>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[rgba(245,245,244,0.3)]"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <Input
          placeholder="Filter by ID, status, repo..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="pl-10 bg-[rgba(255,255,255,0.04)] border-white/[0.08] rounded-xl focus:border-[rgba(163,230,53,0.3)] focus:ring-[rgba(163,230,53,0.1)]"
        />
      </div>

      {/* Sessions List */}
      {loading ? (
        <div className="flex items-center gap-3 text-[rgba(245,245,244,0.5)] py-12 justify-center">
          <div className="size-4 border-2 border-[#a3e635]/30 border-t-[#a3e635] rounded-full animate-spin" />
          Loading sessions...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="text-4xl opacity-20">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} className="size-12 mx-auto text-[rgba(245,245,244,0.2)]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z" />
            </svg>
          </div>
          <p className="text-[rgba(245,245,244,0.5)]">
            {sessions.length === 0
              ? "No sessions yet. Create one from the CLI or API."
              : "No sessions match your filter."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((session) => {
            const status = statusConfig[session.status] || statusConfig.cancelled;
            return (
              <a key={session.id} href={`/dashboard/${session.id}`}>
                <div className="glass-card rounded-xl px-5 py-4 flex items-center justify-between hover:border-white/15 transition-all cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <Badge
                      variant="outline"
                      className={`${status.classes} gap-1.5`}
                    >
                      <span className={`size-1.5 rounded-full ${status.dot}`} />
                      {session.status}
                    </Badge>
                    <div>
                      <p className="font-mono text-sm text-[#f5f5f4] group-hover:text-[#a3e635] transition-colors">
                        {session.id.slice(0, 12)}...
                      </p>
                      <p className="text-xs text-[rgba(245,245,244,0.4)] mt-0.5">
                        {session.repo_full_name || session.trigger} &middot;{" "}
                        {formatTime(session.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-5 text-sm text-[rgba(245,245,244,0.4)]">
                    <span className="flex items-center gap-1.5">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
                      </svg>
                      {session.current_step} steps
                    </span>
                    <span className="flex items-center gap-1.5">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5" />
                      </svg>
                      {(session.total_tokens || 0).toLocaleString()} tokens
                    </span>
                    {session.result_pr_url && (
                      <Badge variant="outline" className="bg-[rgba(34,197,94,0.1)] text-[#4ade80] border-[rgba(34,197,94,0.3)]">
                        PR
                      </Badge>
                    )}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-4 text-[rgba(245,245,244,0.2)] group-hover:text-[rgba(245,245,244,0.5)] transition-colors">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
