"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { fetchSession } from "@/lib/api";
import { useAgentStream } from "@/hooks/use-agent-stream";
import type { SessionDetail, AgentEvent } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

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
};

export default function SessionDetailPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [followUp, setFollowUp] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { events, connected, startSession, resumeSession } =
    useAgentStream(sessionId);

  useEffect(() => {
    fetchSession(sessionId)
      .then(setSession)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sessionId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  const handleResume = () => {
    if (!followUp.trim()) return;
    resumeSession(followUp);
    setFollowUp("");
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-[rgba(245,245,244,0.5)] py-20 justify-center">
        <div className="size-4 border-2 border-[#a3e635]/30 border-t-[#a3e635] rounded-full animate-spin" />
        Loading session...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-20">
        <p className="text-[rgba(245,245,244,0.5)]">Session not found.</p>
      </div>
    );
  }

  const status = statusConfig[session.status] || statusConfig.pending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a
            href="/dashboard"
            className="flex items-center gap-1 text-sm text-[rgba(245,245,244,0.4)] hover:text-[#f5f5f4] transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Back
          </a>
          <h1
            className="text-xl font-bold font-mono text-[#f5f5f4]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {sessionId.slice(0, 12)}
          </h1>
          <Badge variant="outline" className={`${status.classes} gap-1.5`}>
            <span className={`size-1.5 rounded-full ${status.dot}`} />
            {session.status}
          </Badge>
        </div>
        <div className="text-sm text-[rgba(245,245,244,0.4)] flex items-center gap-3">
          <span>{session.current_step} steps</span>
          <span className="text-[rgba(245,245,244,0.15)]">|</span>
          <span>{session.token_usage.total_tokens.toLocaleString()} tokens</span>
        </div>
      </div>

      {/* Metadata Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Trigger", value: session.trigger, color: "#a3e635" },
          { label: "Repo", value: session.repo_full_name || "-", mono: true },
          { label: "Created", value: new Date(session.created_at * 1000).toLocaleString() },
          { label: "PR", value: session.result_pr_url ? "View PR" : "-", link: session.result_pr_url, color: session.result_pr_url ? "#4ade80" : undefined },
        ].map((item) => (
          <div key={item.label} className="glass-card rounded-xl p-4 space-y-1.5">
            <p className="text-xs text-[rgba(245,245,244,0.35)] uppercase tracking-wider font-medium">
              {item.label}
            </p>
            {item.link ? (
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium hover:underline"
                style={{ color: item.color }}
              >
                {item.value}
              </a>
            ) : (
              <p
                className={`text-sm font-medium ${item.mono ? "font-mono" : ""}`}
                style={{ color: item.color }}
              >
                {item.value}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Plan */}
      {session.plan && (
        <div className="glass-card rounded-xl p-5 space-y-3">
          <h3
            className="text-sm font-semibold text-[rgba(245,245,244,0.7)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Plan
          </h3>
          <pre className="whitespace-pre-wrap text-sm text-[rgba(245,245,244,0.55)] leading-relaxed">
            {session.plan}
          </pre>
        </div>
      )}

      {/* Activity Stream */}
      <div className="glass-card rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3
            className="text-sm font-semibold text-[rgba(245,245,244,0.7)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Activity
          </h3>
          {connected && (
            <Badge variant="outline" className="bg-[rgba(34,197,94,0.1)] text-[#4ade80] border-[rgba(34,197,94,0.3)] gap-1.5">
              <span className="size-1.5 rounded-full bg-[#4ade80] animate-pulse" />
              Live
            </Badge>
          )}
        </div>

        <ScrollArea className="h-[400px]" ref={scrollRef}>
          <div className="space-y-2 pr-4">
            {session.messages.map((msg, i) => (
              <div key={`msg-${i}`} className="text-sm">
                {msg.role === "user" && msg.content && (
                  <div className="bg-[rgba(88,101,242,0.08)] border border-[rgba(88,101,242,0.15)] rounded-xl p-3">
                    <span className="text-[#818cf8] font-medium text-xs uppercase tracking-wider">User</span>
                    <p className="text-[rgba(245,245,244,0.6)] mt-1">
                      {msg.content.slice(0, 500)}
                    </p>
                  </div>
                )}
                {msg.role === "assistant" && msg.content && (
                  <div className="bg-[rgba(163,230,53,0.05)] border border-[rgba(163,230,53,0.1)] rounded-xl p-3">
                    <span className="text-[#a3e635] font-medium text-xs uppercase tracking-wider">Agent</span>
                    <p className="text-[rgba(245,245,244,0.7)] mt-1">
                      {msg.content.slice(0, 1000)}
                    </p>
                  </div>
                )}
                {msg.role === "assistant" && msg.tool_calls && (
                  <div className="flex gap-1.5 flex-wrap">
                    {msg.tool_calls.map((tc) => (
                      <Badge
                        key={tc.id}
                        variant="outline"
                        className="bg-[rgba(251,191,36,0.08)] text-[#fbbf24] border-[rgba(251,191,36,0.2)] font-mono text-xs"
                      >
                        {tc.function.name}
                      </Badge>
                    ))}
                  </div>
                )}
                {msg.role === "tool" && msg.content && (
                  <div className="text-xs text-[rgba(245,245,244,0.4)] font-mono bg-[rgba(255,255,255,0.03)] border border-white/[0.05] rounded-lg p-2.5 max-h-20 overflow-hidden">
                    {msg.content.slice(0, 200)}
                  </div>
                )}
              </div>
            ))}

            {events.length > 0 && (
              <>
                <Separator className="my-3 bg-white/[0.06]" />
                <p className="text-xs text-[rgba(245,245,244,0.3)] uppercase tracking-wider font-medium">
                  Live events
                </p>
              </>
            )}
            {events.map((evt, i) => (
              <EventLine key={`evt-${i}`} event={evt} />
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Follow-up Input */}
      <div className="flex gap-3">
        <Input
          placeholder="Send a follow-up message..."
          value={followUp}
          onChange={(e) => setFollowUp(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleResume()}
          className="bg-[rgba(255,255,255,0.04)] border-white/[0.08] rounded-xl focus:border-[rgba(163,230,53,0.3)] focus:ring-[rgba(163,230,53,0.1)]"
        />
        <Button
          onClick={handleResume}
          disabled={!followUp.trim()}
          className="bg-[#a3e635] text-[#0c0f0a] hover:bg-[#bef264] font-semibold rounded-xl px-5 disabled:opacity-30"
        >
          Send
        </Button>
      </div>
    </div>
  );
}

function EventLine({ event }: { event: AgentEvent }) {
  const { type, ...data } = event;

  if (type === "thinking") {
    return (
      <p className="text-xs text-[rgba(245,245,244,0.3)] flex items-center gap-2">
        <div className="size-3 border border-[#a3e635]/30 border-t-[#a3e635] rounded-full animate-spin" />
        Step {String(data.step)}...
      </p>
    );
  }

  if (type === "plan" || type === "assistant_message") {
    return (
      <div className="bg-[rgba(163,230,53,0.05)] border border-[rgba(163,230,53,0.1)] rounded-xl p-3 text-sm">
        <span className="text-[#a3e635] font-medium text-xs uppercase tracking-wider">
          {type === "plan" ? "Plan" : "Agent"}
        </span>
        <p className="text-[rgba(245,245,244,0.7)] mt-1">
          {String(data.content || "").slice(0, 1000)}
        </p>
      </div>
    );
  }

  if (type === "tool_call") {
    return (
      <div className="flex items-center gap-2.5 text-sm">
        <Badge
          variant="outline"
          className="bg-[rgba(251,191,36,0.08)] text-[#fbbf24] border-[rgba(251,191,36,0.2)] font-mono text-xs"
        >
          {String(data.tool)}
        </Badge>
        <span className="text-xs text-[rgba(245,245,244,0.3)] font-mono truncate max-w-md">
          {String(data.arguments || "").slice(0, 100)}
        </span>
      </div>
    );
  }

  if (type === "tool_result") {
    const success = data.success as boolean;
    return (
      <div
        className={`text-xs font-mono rounded-lg p-2.5 max-h-16 overflow-hidden border ${
          success
            ? "bg-[rgba(34,197,94,0.05)] text-[#4ade80] border-[rgba(34,197,94,0.1)]"
            : "bg-[rgba(239,68,68,0.05)] text-[#f87171] border-[rgba(239,68,68,0.1)]"
        }`}
      >
        {success
          ? String(data.output_preview || "").slice(0, 200)
          : `Error: ${String(data.error || "")}`}
      </div>
    );
  }

  if (type === "session_complete") {
    return (
      <div className="bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.2)] rounded-xl p-3 text-sm text-[#4ade80] flex items-center gap-2">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
        Done in {String(data.steps)} steps
      </div>
    );
  }

  if (type === "error") {
    return (
      <div className="bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] rounded-xl p-3 text-sm text-[#f87171] flex items-center gap-2">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
        Error: {String(data.error)}
      </div>
    );
  }

  return null;
}
